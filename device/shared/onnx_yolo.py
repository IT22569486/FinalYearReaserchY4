"""
Lightweight ONNX-based YOLOv8 Inference Wrapper.

Replaces the heavy `ultralytics` library for inference-only
use on Raspberry Pi.  Loads an exported .onnx model and runs
detection with onnxruntime (CPU).

Usage:
    from shared import OnnxYOLO
    model = OnnxYOLO("models/yolov8n.onnx", imgsz=320)
    boxes, scores, class_ids = model.detect(frame, conf=0.35)
"""

import cv2
import numpy as np

try:
    import onnxruntime as ort
except ImportError:
    raise ImportError("onnxruntime is required: pip install onnxruntime")


class OnnxYOLO:
    """
    Minimal YOLOv8 detector using an ONNX model.

    Supports arbitrary numbers of classes (COCO-80, custom-2, etc.).
    Output format expected from ``yolo export format=onnx``:
        [1, 4+num_classes, num_predictions]   (YOLOv8 default)
    """

    def __init__(self, model_path: str, imgsz: int = 640, providers=None):
        """
        Args:
            model_path: Path to the .onnx file.
            imgsz:      Input size (square) for model inference.
            providers:  ONNX Runtime execution providers list.
        """
        if providers is None:
            providers = ["CPUExecutionProvider"]

        self.session = ort.InferenceSession(model_path, providers=providers)
        self.imgsz = imgsz

        inp = self.session.get_inputs()[0]
        self.input_name = inp.name
        # Infer expected height/width from the model graph when possible
        shape = inp.shape  # e.g. [1, 3, 640, 640]
        if shape and len(shape) == 4 and isinstance(shape[2], int):
            self.imgsz = shape[2]

        # Try to read class names from metadata
        meta = self.session.get_modelmeta().custom_metadata_map
        self.names = {}
        if "names" in meta:
            import ast
            try:
                self.names = ast.literal_eval(meta["names"])
            except Exception:
                pass

        out_shape = self.session.get_outputs()[0].shape  # e.g. [1, 84, 8400]
        self.num_classes = (out_shape[1] - 4) if (out_shape and len(out_shape) == 3 and isinstance(out_shape[1], int)) else 80

        print(f"[OnnxYOLO] Loaded {model_path}  imgsz={self.imgsz}  classes={self.num_classes}")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def detect(self, frame: np.ndarray, conf: float = 0.25, iou: float = 0.45):
        """
        Run detection on a BGR frame.

        Returns:
            boxes      – np.ndarray  shape (N, 4)  in xyxy pixel coords
            scores     – np.ndarray  shape (N,)
            class_ids  – np.ndarray  shape (N,)    int
        """
        img, ratio, (pad_w, pad_h) = self._preprocess(frame)
        output = self.session.run(None, {self.input_name: img})[0]  # (1, 4+C, P)

        boxes, scores, class_ids = self._postprocess(
            output, ratio, pad_w, pad_h, conf, iou,
            orig_shape=frame.shape[:2],
        )
        return boxes, scores, class_ids

    # ------------------------------------------------------------------
    # Preprocessing – letterbox + normalise
    # ------------------------------------------------------------------

    def _preprocess(self, frame: np.ndarray):
        """Letterbox resize, BGR→RGB, normalise, NCHW."""
        h0, w0 = frame.shape[:2]
        sz = self.imgsz
        ratio = min(sz / h0, sz / w0)
        new_w, new_h = int(w0 * ratio), int(h0 * ratio)

        resized = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

        pad_w = (sz - new_w) // 2
        pad_h = (sz - new_h) // 2
        canvas = np.full((sz, sz, 3), 114, dtype=np.uint8)
        canvas[pad_h:pad_h + new_h, pad_w:pad_w + new_w] = resized

        img = canvas[:, :, ::-1].astype(np.float32) / 255.0  # BGR→RGB, 0-1
        img = np.transpose(img, (2, 0, 1))  # HWC→CHW
        img = np.expand_dims(img, 0)         # add batch
        return img, ratio, (pad_w, pad_h)

    # ------------------------------------------------------------------
    # Postprocessing – decode, threshold, NMS
    # ------------------------------------------------------------------

    def _postprocess(self, output, ratio, pad_w, pad_h, conf_thr, iou_thr, orig_shape):
        """
        Decode YOLOv8 ONNX output.

        output shape: (1, 4+C, P)  where C = num_classes, P = num_predictions
        Each prediction column: [cx, cy, w, h, cls0_score, cls1_score, ...]
        """
        preds = output[0]  # (4+C, P)

        # Transpose to (P, 4+C)
        if preds.shape[0] < preds.shape[1]:
            preds = preds.T

        cx = preds[:, 0]
        cy = preds[:, 1]
        w  = preds[:, 2]
        h  = preds[:, 3]
        cls_scores = preds[:, 4:]  # (P, C)

        # Best class per prediction
        class_ids = np.argmax(cls_scores, axis=1)
        scores = cls_scores[np.arange(len(class_ids)), class_ids]

        # Confidence filter
        mask = scores >= conf_thr
        cx, cy, w, h = cx[mask], cy[mask], w[mask], h[mask]
        scores = scores[mask]
        class_ids = class_ids[mask]

        if len(scores) == 0:
            return np.empty((0, 4)), np.empty(0), np.empty(0, dtype=int)

        # Convert cxcywh → xyxy in letterboxed coords
        x1 = cx - w / 2
        y1 = cy - h / 2
        x2 = cx + w / 2
        y2 = cy + h / 2

        # Remove letterbox padding and scale back to original image
        x1 = (x1 - pad_w) / ratio
        y1 = (y1 - pad_h) / ratio
        x2 = (x2 - pad_w) / ratio
        y2 = (y2 - pad_h) / ratio

        # Clip to original image bounds
        oh, ow = orig_shape
        x1 = np.clip(x1, 0, ow)
        y1 = np.clip(y1, 0, oh)
        x2 = np.clip(x2, 0, ow)
        y2 = np.clip(y2, 0, oh)

        boxes = np.stack([x1, y1, x2, y2], axis=1).astype(np.float32)
        scores = scores.astype(np.float32)

        # NMS
        keep = self._nms(boxes, scores, iou_thr)
        return boxes[keep], scores[keep], class_ids[keep]

    @staticmethod
    def _nms(boxes, scores, iou_thr):
        """Simple greedy NMS."""
        if len(boxes) == 0:
            return np.array([], dtype=int)

        x1, y1, x2, y2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
        areas = (x2 - x1) * (y2 - y1)
        order = scores.argsort()[::-1]

        keep = []
        while order.size > 0:
            i = order[0]
            keep.append(i)
            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])
            inter = np.maximum(0.0, xx2 - xx1) * np.maximum(0.0, yy2 - yy1)
            iou = inter / (areas[i] + areas[order[1:]] - inter + 1e-6)
            inds = np.where(iou <= iou_thr)[0]
            order = order[inds + 1]

        return np.array(keep, dtype=int)
