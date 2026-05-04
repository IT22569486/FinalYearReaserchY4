#!/usr/bin/env python3
"""
Driver Monitoring System (DMS) - Drowsiness & Distraction Detection

Detects:
  - Drowsiness (EAR-based eye closure)
  - Yawning (MAR-based mouth opening)
  - Sleeping (prolonged eye closure)
  - Head turned / distraction (PnP yaw)
  - Phone usage (ONNX YOLOv8 COCO class 67)
  - Seatbelt missing (custom ONNX YOLOv8 model)
  - Hands off steering wheel (MediaPipe Hands)

Detection priority for drowsiness / yawning / head pose:
  ┌──────────────────────────────────────────────────────────────────┐
  │  PRIORITY 1 — MediaPipe (always attempted first)                │
  │    FaceMesh landmarks → EAR / MAR / PnP yaw → rule thresholds  │
  │    Used whenever a face is detected in the current frame.       │
  │                                                                  │
  │  PRIORITY 2 — LSTM model (fallback only)                        │
  │    Activated when MediaPipe returns NO face landmarks.          │
  │    Predicts one of [ALERT, DROWSY, YAWNING, HEAD_TURNED]        │
  │    from a rolling 10-frame feature buffer.                      │
  │    Feature vector: [EAR, MAR, pitch_deg, yaw_deg]              │
  │                                                                  │
  │  The feature buffer is updated on EVERY frame (including        │
  │  MediaPipe frames) so the LSTM always has fresh context         │
  │  the moment it is needed.                                       │
  └──────────────────────────────────────────────────────────────────┘

Publishes events via MQTT to the backend.

Optimized for Raspberry Pi:
  - Uses onnxruntime instead of ultralytics for YOLO inference
  - Reads ALL settings from device_config.json via shared DeviceConfig
"""

import cv2
import numpy as np
import time
import json
import os
import sys
from pathlib import Path
from collections import deque

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
COMPONENT_DIR = Path(__file__).parent.absolute()
DEVICE_DIR    = COMPONENT_DIR.parent.absolute()
MODELS_DIR    = COMPONENT_DIR / "models"

if str(DEVICE_DIR) not in sys.path:
    sys.path.insert(0, str(DEVICE_DIR))

# ---------------------------------------------------------------------------
# Shared config
# ---------------------------------------------------------------------------
from shared.config import DeviceConfig

_cfg  = DeviceConfig()
_comp = _cfg.get_component_config("driver_monitoring")

# ---------------------------------------------------------------------------
# Optional imports — gracefully degrade if not available
# ---------------------------------------------------------------------------
try:
    import mediapipe as mp

    if hasattr(mp, 'solutions'):
        # Old API (mediapipe < 0.10.x)
        _FaceMeshClass = mp.solutions.face_mesh.FaceMesh
        _HandsClass    = mp.solutions.hands.Hands
    else:
        # New Tasks API (mediapipe 0.10.x+) — wrap to mimic old solutions API
        import urllib.request
        from mediapipe.tasks.python import BaseOptions
        from mediapipe.tasks.python.vision import (
            FaceLandmarker, FaceLandmarkerOptions,
            HandLandmarker, HandLandmarkerOptions,
            RunningMode,
        )

        _FACE_MODEL_URL = (
            "https://storage.googleapis.com/mediapipe-models/"
            "face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
        )
        _HAND_MODEL_URL = (
            "https://storage.googleapis.com/mediapipe-models/"
            "hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"
        )

        def _ensure_mp_model(url, model_path):
            if not Path(model_path).exists():
                Path(model_path).parent.mkdir(parents=True, exist_ok=True)
                print(f"[DMS] Downloading {Path(model_path).name} ...")
                urllib.request.urlretrieve(url, str(model_path))
                print(f"[DMS] Downloaded {Path(model_path).name}")

        class _FaceLandmarkList:
            def __init__(self, landmarks):
                self.landmark = landmarks

        class _FaceMeshResult:
            def __init__(self, tasks_result):
                self.multi_face_landmarks = (
                    [_FaceLandmarkList(lms) for lms in tasks_result.face_landmarks]
                    if tasks_result.face_landmarks else None
                )

        class _HandLandmarks:
            def __init__(self, landmarks):
                self.landmark = landmarks

        class _HandsResult:
            def __init__(self, tasks_result):
                self.multi_hand_landmarks = (
                    [_HandLandmarks(lms) for lms in tasks_result.hand_landmarks]
                    if tasks_result.hand_landmarks else None
                )

        class _FaceMeshClass:
            def __init__(self, refine_landmarks=True, max_num_faces=1,
                         min_detection_confidence=0.6, min_tracking_confidence=0.5,
                         static_image_mode=False):
                model_path = MODELS_DIR / "face_landmarker.task"
                _ensure_mp_model(_FACE_MODEL_URL, model_path)
                opts = FaceLandmarkerOptions(
                    base_options=BaseOptions(model_asset_path=str(model_path)),
                    running_mode=RunningMode.IMAGE,
                    num_faces=max_num_faces,
                    min_face_detection_confidence=min_detection_confidence,
                    min_tracking_confidence=min_tracking_confidence,
                )
                self._landmarker = FaceLandmarker.create_from_options(opts)

            def process(self, rgb_frame):
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                return _FaceMeshResult(self._landmarker.detect(mp_img))

            def __enter__(self): return self
            def __exit__(self, *args): self._landmarker.close()

        class _HandsClass:
            def __init__(self, static_image_mode=False, min_detection_confidence=0.6,
                         min_tracking_confidence=0.5, max_num_hands=2):
                model_path = MODELS_DIR / "hand_landmarker.task"
                _ensure_mp_model(_HAND_MODEL_URL, model_path)
                opts = HandLandmarkerOptions(
                    base_options=BaseOptions(model_asset_path=str(model_path)),
                    running_mode=RunningMode.IMAGE,
                    num_hands=max_num_hands,
                    min_hand_detection_confidence=min_detection_confidence,
                    min_tracking_confidence=min_tracking_confidence,
                )
                self._landmarker = HandLandmarker.create_from_options(opts)

            def process(self, rgb_frame):
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                return _HandsResult(self._landmarker.detect(mp_img))

            def __enter__(self): return self
            def __exit__(self, *args): self._landmarker.close()

    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False

try:
    from scipy.spatial import distance as dist
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

try:
    from tensorflow.keras.models import load_model as keras_load_model
    KERAS_AVAILABLE = True
except ImportError:
    KERAS_AVAILABLE = False

try:
    import joblib
    JOBLIB_AVAILABLE = True
except ImportError:
    JOBLIB_AVAILABLE = False

try:
    from shared.onnx_yolo import OnnxYOLO
    ONNX_YOLO_AVAILABLE = True
except ImportError:
    ONNX_YOLO_AVAILABLE = False

ULTRALYTICS_AVAILABLE = False
try:
    from ultralytics import YOLO
    ULTRALYTICS_AVAILABLE = True
except ImportError:
    pass

try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False

# ---------------------------------------------------------------------------
# Configuration from device_config.json
# ---------------------------------------------------------------------------
SHOW_GUI        = _comp.get("show_gui", True)
ENABLE_PHONE    = _comp.get("enable_phone_detection", True)
ENABLE_SEATBELT = _comp.get("enable_seatbelt_detection", True)
ENABLE_LSTM     = _comp.get("enable_lstm_model", True)   # fallback; default True
USE_ONNX        = _comp.get("use_onnx", True)
YOLO_IMGSZ      = _comp.get("yolo_imgsz", 320)
VIDEO_SOURCE    = _comp.get("video_source", None)
CAMERA_SOURCE   = VIDEO_SOURCE if VIDEO_SOURCE else _cfg.camera_index
IS_STREAM       = isinstance(CAMERA_SOURCE, str) and CAMERA_SOURCE.startswith("http")
FRAME_WIDTH     = _cfg.camera_width
FRAME_HEIGHT    = _cfg.camera_height
SEND_INTERVAL   = _cfg.send_interval

# ---------------------------------------------------------------------------
# Detection thresholds
# ---------------------------------------------------------------------------

# Rule-based (MediaPipe primary path)
EAR_SLEEP_THRESHOLD  = 0.18
EAR_DROWSY_THRESHOLD = 0.25
MAR_YAWN_THRESHOLD   = 0.50
YAW_TURN_THRESHOLD   = 25.0   # degrees — matches LSTM training label boundary

# Frame-count thresholds
SLEEP_FRAMES_THRESHOLD      = 10
DROWSY_FRAMES_THRESHOLD     = 15
YAWN_FRAMES_THRESHOLD       = 5
HEAD_TURN_FRAMES_THRESHOLD  = 8
HANDS_OFF_FRAMES_THRESHOLD  = 15
PHONE_USE_FRAMES_THRESHOLD  = 10
SEATBELT_FRAMES_THRESHOLD   = 10

# YOLO / seatbelt
YOLO_CONFIDENCE_THRESHOLD     = 0.35
PHONE_CLASS_ID                = 67
YOLO_DETECTION_INTERVAL       = 8
PHONE_DETECTION_DECAY         = 40
SEATBELT_DETECTION_INTERVAL   = 8
SEATBELT_CONFIDENCE_THRESHOLD = 0.30
SEATBELT_MISSING_TIMER        = 15
SEATBELT_CONFIRM_FRAMES       = 3

# LSTM — must match training script exactly
SEQUENCE_LENGTH = 10
NUM_FEATURES    = 4          # [EAR, MAR, pitch_deg, yaw_deg]

# Output label order — must match to_categorical order used during training
LSTM_TARGET_NAMES = ["ALERT", "DROWSY", "YAWNING", "HEAD_TURNED"]

# ---------------------------------------------------------------------------
# MediaPipe landmark indices (478-point FaceMesh)
# ---------------------------------------------------------------------------
MP_LEFT_EYE   = [362, 385, 387, 263, 373, 380]
MP_RIGHT_EYE  = [33,  160, 158, 133, 153, 144]
MP_MOUTH      = [61,  291, 13,  14]

# 6-point PnP subset mapped from ibug-68 training indices to MediaPipe:
#   ibug 33  (nose tip)           → MP 1
#   ibug 36  (left eye corner)    → MP 33
#   ibug 45  (right eye corner)   → MP 263
#   ibug 48  (left mouth corner)  → MP 61
#   ibug 54  (right mouth corner) → MP 291
#   ibug  8  (chin)               → MP 175
MP_PNP_INDICES = [1, 33, 263, 61, 291, 175]

# 3-D model points matching those 6 landmarks (same as training script)
_PNP_MODEL_POINTS = np.array([
    (  0.0,    0.0,    0.0),
    (-225.0,  170.0, -135.0),
    ( 225.0,  170.0, -135.0),
    (-150.0, -150.0, -125.0),
    ( 150.0, -150.0, -125.0),
    (  0.0,   330.0,  -65.0),
], dtype=np.float32)


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def calculate_ear(landmarks, indices, w, h):
    """Eye Aspect Ratio from MediaPipe landmarks."""
    try:
        pts = [(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in indices]
        A = dist.euclidean(pts[1], pts[5])
        B = dist.euclidean(pts[2], pts[4])
        C = dist.euclidean(pts[0], pts[3])
        return (A + B) / (2.0 * C) if C != 0 else 0.0
    except Exception:
        return 0.0


def calculate_mar(landmarks, indices, w, h):
    """Mouth Aspect Ratio from MediaPipe landmarks."""
    try:
        pts = [(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in indices]
        A = dist.euclidean(pts[2], pts[3])
        C = dist.euclidean(pts[0], pts[1])
        return A / C if C != 0 else 0.0
    except Exception:
        return 0.0


def calculate_head_pose_pnp(landmarks, w, h):
    """
    PnP-based head pose from MediaPipe landmarks.
    Returns (pitch_deg, yaw_deg) matching the convention used in the LSTM
    training script (ibug-300w + cv2.solvePnP + cv2.decomposeProjectionMatrix).
    Returns (0.0, 0.0) on any failure.
    """
    try:
        image_points = np.array(
            [(landmarks[i].x * w, landmarks[i].y * h) for i in MP_PNP_INDICES],
            dtype=np.float32,
        )
        focal_length  = float(w)
        camera_matrix = np.array(
            [[focal_length, 0, w / 2.0],
             [0, focal_length, h / 2.0],
             [0, 0, 1.0]],
            dtype=np.float64,
        )
        dist_coeffs = np.zeros((4, 1), dtype=np.float64)

        ok, rvec, tvec = cv2.solvePnP(
            _PNP_MODEL_POINTS, image_points,
            camera_matrix, dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE,
        )
        if not ok:
            return 0.0, 0.0

        rmat, _ = cv2.Rodrigues(rvec)
        proj     = np.hstack((rmat, tvec))
        _, _, _, _, _, _, angles = cv2.decomposeProjectionMatrix(proj)
        pitch_deg, yaw_deg, _ = angles.flatten()
        return float(pitch_deg), float(yaw_deg)
    except Exception:
        return 0.0, 0.0


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------

class DriverMonitor:
    """
    Drowsiness / distraction detection pipeline.

    Detection order for P2–P5 (sleep / yawn / drowsy / head-turned):
      1. MediaPipe FaceMesh → EAR / MAR / PnP-yaw → rule thresholds  (PRIMARY)
      2. LSTM model         → rolling feature buffer prediction        (FALLBACK,
                                                   only when no face detected)

    The LSTM feature buffer is updated on every frame with the most recent
    [EAR, MAR, pitch_deg, yaw_deg] values so it is always warm and ready.
    """

    def __init__(self, health_monitor=None):
        self.health_monitor = health_monitor
        self.running = False

        self.device_key = _cfg.device_key
        self.bus_number = _cfg.bus_number

        self.mqtt_client = None
        self._setup_mqtt()

        # Models
        self.lstm_model     = None
        self.scaler         = None
        self.yolo_model     = None
        self.seatbelt_model = None
        self._load_models()

        # MediaPipe
        self.face_mesh = None
        self.hands     = None
        if MEDIAPIPE_AVAILABLE:
            self.face_mesh = _FaceMeshClass(
                refine_landmarks=True, max_num_faces=1,
                min_detection_confidence=0.6, min_tracking_confidence=0.5,
                static_image_mode=False,
            )
            self.hands = _HandsClass(
                static_image_mode=False,
                min_detection_confidence=0.6, min_tracking_confidence=0.5,
                max_num_hands=2,
            )

        self._reset_counters()

        # LSTM feature buffer — always updated, used only when MP has no face
        self.feature_buffer = deque(maxlen=SEQUENCE_LENGTH)

        # Last-known-good features — used to keep the buffer populated
        # when face detection drops out temporarily
        self._last_ear   = 0.30   # neutral open eye
        self._last_mar   = 0.10   # neutral closed mouth
        self._last_pitch = 0.0
        self._last_yaw   = 0.0

        self.frame_count              = 0
        self.phone_detected           = False
        self.phone_timer              = 0
        self.seatbelt_detected        = True
        self.seatbelt_timer           = 0
        self.seatbelt_missing_counter = 0
        self.seatbelt_present_counter = 0
        self.current_state            = "Initializing"
        self.last_publish_time        = 0
        self.last_event_type          = None

        # Logged in telemetry for observability
        self._detection_source = "mediapipe"   # "mediapipe" | "lstm"

    # -----------------------------------------------------------------------
    # Setup
    # -----------------------------------------------------------------------

    def _setup_mqtt(self):
        if not MQTT_AVAILABLE:
            return
        broker    = _cfg.mqtt_broker
        port      = _cfg.mqtt_port
        client_id = f"{self.device_key}-DMS-{os.getpid()}"
        self.mqtt_client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
            client_id=client_id,
        )
        username = _cfg.mqtt_username
        password = _cfg.mqtt_password
        if username:
            self.mqtt_client.username_pw_set(username, password)
        try:
            self.mqtt_client.connect(broker, port, keepalive=60)
            self.mqtt_client.loop_start()
            print(f"[DMS] MQTT connected to {broker}:{port}")
        except Exception as e:
            print(f"[DMS] MQTT connect error: {e}")
            self.mqtt_client = None

    def _load_models(self):
        # --- LSTM fallback model ---
        lstm_path   = MODELS_DIR / "dms_lstm_model.h5"
        scaler_path = MODELS_DIR / "dms_scaler.pkl"
        if ENABLE_LSTM and KERAS_AVAILABLE and JOBLIB_AVAILABLE:
            if lstm_path.exists() and scaler_path.exists():
                try:
                    self.lstm_model = keras_load_model(str(lstm_path))
                    self.scaler     = joblib.load(str(scaler_path))
                    print("[DMS] LSTM fallback model loaded")
                except Exception as e:
                    print(f"[DMS] LSTM load error: {e}")
            else:
                print("[DMS] LSTM model files not found — fallback disabled")

        # --- Phone detection ---
        if ENABLE_PHONE:
            onnx_path = MODELS_DIR / "yolov8n.onnx"
            pt_path   = MODELS_DIR / "yolov8n.pt"
            if USE_ONNX and ONNX_YOLO_AVAILABLE and onnx_path.exists():
                try:
                    self.yolo_model = OnnxYOLO(str(onnx_path), imgsz=YOLO_IMGSZ)
                    print("[DMS] Phone detection loaded (ONNX)")
                except Exception as e:
                    print(f"[DMS] Phone ONNX load error: {e}")
            elif ULTRALYTICS_AVAILABLE and pt_path.exists():
                try:
                    self.yolo_model = YOLO(str(pt_path))
                    print("[DMS] Phone detection loaded (ultralytics .pt fallback)")
                except Exception as e:
                    print(f"[DMS] Phone .pt load error: {e}")

        # --- Seatbelt detection ---
        if ENABLE_SEATBELT:
            onnx_path = MODELS_DIR / "best.onnx"
            pt_path   = MODELS_DIR / "best.pt"
            if USE_ONNX and ONNX_YOLO_AVAILABLE and onnx_path.exists():
                try:
                    self.seatbelt_model = OnnxYOLO(str(onnx_path), imgsz=YOLO_IMGSZ)
                    print("[DMS] Seatbelt detection loaded (ONNX)")
                except Exception as e:
                    print(f"[DMS] Seatbelt ONNX load error: {e}")
            elif ULTRALYTICS_AVAILABLE and pt_path.exists():
                try:
                    self.seatbelt_model = YOLO(str(pt_path))
                    print("[DMS] Seatbelt detection loaded (ultralytics .pt fallback)")
                except Exception as e:
                    print(f"[DMS] Seatbelt .pt load error: {e}")

    def _reset_counters(self):
        self.sleep_counter     = 0
        self.drowsy_counter    = 0
        self.yawn_counter      = 0
        self.head_turn_counter = 0
        self.hands_off_counter = 0
        self.phone_use_counter = 0

    def _zero_except(self, keep):
        """Reset all frame counters except *keep*."""
        for attr in ("sleep_counter", "drowsy_counter", "yawn_counter",
                      "head_turn_counter", "hands_off_counter", "phone_use_counter"):
            if attr != keep:
                setattr(self, attr, 0)

    # -----------------------------------------------------------------------
    # MQTT publishing
    # -----------------------------------------------------------------------

    def _publish(self, topic_suffix, payload):
        if not self.mqtt_client or not self.device_key:
            return
        topic = f"{_cfg.mqtt_topic_base}/{self.device_key}/dms/{topic_suffix}"
        try:
            self.mqtt_client.publish(topic, json.dumps(payload), qos=1)
        except Exception as e:
            print(f"[DMS] Publish error: {e}")

    def _publish_to_esp32(self, state, severity, details=None):
        if not self.mqtt_client:
            return
        topic = f"bus/{_cfg.vehicle_id}/driver-monitor"
        payload = {
            "state":    state,
            "severity": severity,
            "phone":    self.phone_detected,
            "seatbelt": self.seatbelt_detected,
        }
        try:
            self.mqtt_client.publish(topic, json.dumps(payload), qos=0)
        except Exception:
            pass

    def _publish_state(self, state, details=None):
        now = time.time()
        if now - self.last_publish_time < SEND_INTERVAL:
            return
        self.last_publish_time = now
        payload = {
            "device_key":       self.device_key,
            "bus_number":       self.bus_number,
            "state":            state,
            "timestamp":        time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "detection_source": self._detection_source,
            "details":          details or {},
        }
        self._publish("telemetry", payload)

    def _publish_event(self, event_type, severity, details=None):
        now = time.time()
        if event_type == self.last_event_type and now - self.last_publish_time < 5:
            return
        self.last_event_type = event_type
        payload = {
            "device_key":       self.device_key,
            "bus_number":       self.bus_number,
            "type":             event_type,
            "severity":         severity,
            "timestamp":        time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "detection_source": self._detection_source,
            "details":          details or {},
        }
        self._publish("event", payload)
        if self.mqtt_client and self.device_key:
            viol_topic = f"{_cfg.mqtt_topic_base}/{self.device_key}/violation"
            try:
                self.mqtt_client.publish(viol_topic, json.dumps({
                    "device_key": self.device_key,
                    "type":       event_type,
                    "details":    details or {},
                }), qos=1)
            except Exception:
                pass

    # -----------------------------------------------------------------------
    # YOLO detections (phone + seatbelt) — unchanged from original
    # -----------------------------------------------------------------------

    def _detect_phone(self, frame):
        if self.yolo_model is None:
            return
        if self.frame_count % YOLO_DETECTION_INTERVAL != 0:
            if self.phone_timer > 0:
                self.phone_timer -= 1
                if self.phone_timer <= 0:
                    self.phone_detected = False
            return
        found = False
        try:
            if ONNX_YOLO_AVAILABLE and isinstance(self.yolo_model, OnnxYOLO):
                boxes, scores, class_ids = self.yolo_model.detect(
                    frame, conf=YOLO_CONFIDENCE_THRESHOLD)
                for cls_id in class_ids:
                    if int(cls_id) == PHONE_CLASS_ID:
                        found = True
                        self.phone_detected = True
                        self.phone_timer    = PHONE_DETECTION_DECAY
                        break
            else:
                results = self.yolo_model(frame, verbose=False, imgsz=YOLO_IMGSZ)
                for r in results:
                    for box in r.boxes:
                        if (int(box.cls[0]) == PHONE_CLASS_ID and
                                float(box.conf[0]) > YOLO_CONFIDENCE_THRESHOLD):
                            found = True
                            self.phone_detected = True
                            self.phone_timer    = PHONE_DETECTION_DECAY
                            break
                    if found:
                        break
        except Exception as e:
            print(f"[DMS] Phone detection error: {e}")

        if not found and self.phone_timer > 0:
            self.phone_timer -= YOLO_DETECTION_INTERVAL
            if self.phone_timer <= 0:
                self.phone_detected = False

    def _detect_seatbelt(self, frame):
        if self.seatbelt_model is None:
            return
        if self.frame_count % SEATBELT_DETECTION_INTERVAL != 0:
            if self.seatbelt_timer > 0:
                self.seatbelt_timer -= 1
                if self.seatbelt_timer <= 0:
                    self.seatbelt_detected = False
            return
        try:
            no_sb, sb = [], []
            if ONNX_YOLO_AVAILABLE and isinstance(self.seatbelt_model, OnnxYOLO):
                boxes, scores, class_ids = self.seatbelt_model.detect(
                    frame, conf=SEATBELT_CONFIDENCE_THRESHOLD)
                names = self.seatbelt_model.names
                for cls_id, conf in zip(class_ids, scores):
                    label = names.get(int(cls_id), str(cls_id)).lower()
                    if (("no" in label and ("seatbelt" in label or "belt" in label))
                            or label in ("no", "noseatbelt")):
                        no_sb.append(float(conf))
                    elif "seatbelt" in label or "belt" in label:
                        sb.append(float(conf))
            else:
                results = self.seatbelt_model(frame, verbose=False, imgsz=YOLO_IMGSZ)
                names   = getattr(self.seatbelt_model, "names", {})
                for r in results:
                    for box in r.boxes:
                        cls   = int(box.cls[0])
                        conf  = float(box.conf[0])
                        label = (names.get(cls, str(cls))
                                 if isinstance(names, dict) else str(cls)).lower()
                        if conf < SEATBELT_CONFIDENCE_THRESHOLD:
                            continue
                        if (("no" in label and ("seatbelt" in label or "belt" in label))
                                or label in ("no", "noseatbelt")):
                            no_sb.append(conf)
                        elif "seatbelt" in label or "belt" in label:
                            sb.append(conf)

            if no_sb:
                self.seatbelt_present_counter = 0
                self.seatbelt_missing_counter += 1
                if self.seatbelt_missing_counter >= SEATBELT_CONFIRM_FRAMES:
                    self.seatbelt_detected = False
            elif sb:
                self.seatbelt_missing_counter = 0
                self.seatbelt_present_counter += 1
                if self.seatbelt_present_counter >= SEATBELT_CONFIRM_FRAMES:
                    self.seatbelt_detected = True
                    self.seatbelt_timer    = SEATBELT_MISSING_TIMER
            else:
                if self.seatbelt_timer > 0:
                    self.seatbelt_timer -= SEATBELT_DETECTION_INTERVAL
                    if self.seatbelt_timer <= 0:
                        self.seatbelt_detected = False
        except Exception as e:
            print(f"[DMS] Seatbelt detection error: {e}")

    # -----------------------------------------------------------------------
    # Feature buffer — kept warm every frame
    # -----------------------------------------------------------------------

    def _update_feature_buffer(self, ear, mar, pitch, yaw):
        """
        Push the latest [EAR, MAR, pitch_deg, yaw_deg] into the LSTM buffer.
        Called on EVERY frame so the buffer is always ready for inference,
        even when MediaPipe is providing the primary detection.
        """
        self._last_ear   = ear
        self._last_mar   = mar
        self._last_pitch = pitch
        self._last_yaw   = yaw
        self.feature_buffer.append([ear, mar, pitch, yaw])

    # -----------------------------------------------------------------------
    # PRIMARY path — MediaPipe rule-based (P2–P7)
    # -----------------------------------------------------------------------

    def _run_mediapipe_rules(self, landmarks, w, h, num_hands):
        """
        PRIMARY detection path — called when MediaPipe detects a face.

        Computes EAR / MAR / PnP-yaw, updates the LSTM buffer with real
        values, then applies priority-ordered rule thresholds for P2–P7.

        Returns (state, severity, details).
        """
        ear               = (calculate_ear(landmarks, MP_LEFT_EYE,  w, h) +
                             calculate_ear(landmarks, MP_RIGHT_EYE, w, h)) / 2.0
        mar               = calculate_mar(landmarks, MP_MOUTH, w, h)
        pitch_deg, yaw_deg = calculate_head_pose_pnp(landmarks, w, h)

        # Always keep buffer warm with real values from MediaPipe
        self._update_feature_buffer(ear, mar, pitch_deg, yaw_deg)

        details = {
            "ear":       round(ear,       3),
            "mar":       round(mar,       3),
            "pitch_deg": round(pitch_deg, 1),
            "yaw_deg":   round(yaw_deg,   1),
            "hands":     num_hands,
            "phone":     self.phone_detected,
            "seatbelt":  self.seatbelt_detected,
            "source":    "mediapipe",
        }

        # P2: Sleep — eyes nearly shut
        if ear < EAR_SLEEP_THRESHOLD:
            self.sleep_counter += 1
            self._zero_except("sleep_counter")
            state    = "SLEEPING"     if self.sleep_counter >= SLEEP_FRAMES_THRESHOLD    else "EYES_CLOSING"
            severity = "danger"       if self.sleep_counter >= SLEEP_FRAMES_THRESHOLD    else "warning"
            return state, severity, details

        # P3: Yawning
        if mar > MAR_YAWN_THRESHOLD:
            self.yawn_counter += 1
            self._zero_except("yawn_counter")
            state    = "YAWNING"      if self.yawn_counter  >= YAWN_FRAMES_THRESHOLD     else "MOUTH_OPEN"
            severity = "warning"      if self.yawn_counter  >= YAWN_FRAMES_THRESHOLD     else "info"
            return state, severity, details

        # P4: Drowsy — eyes partially closed
        if ear < EAR_DROWSY_THRESHOLD:
            self.drowsy_counter += 1
            self._zero_except("drowsy_counter")
            state    = "DROWSY"       if self.drowsy_counter >= DROWSY_FRAMES_THRESHOLD  else "LOW_EYE_OPENING"
            severity = "warning"      if self.drowsy_counter >= DROWSY_FRAMES_THRESHOLD  else "info"
            return state, severity, details

        # P5: Head turned — PnP yaw in degrees (matches training labels ±25°)
        if abs(yaw_deg) > YAW_TURN_THRESHOLD:
            self.head_turn_counter += 1
            self._zero_except("head_turn_counter")
            state    = "HEAD_TURNED"  if self.head_turn_counter >= HEAD_TURN_FRAMES_THRESHOLD else "HEAD_MOVING"
            severity = "critical"     if self.head_turn_counter >= HEAD_TURN_FRAMES_THRESHOLD else "info"
            return state, severity, details

        # P6: Seatbelt missing
        if not self.seatbelt_detected:
            self.seatbelt_missing_counter += 1
            self._reset_counters()
            state    = "NO_SEATBELT"  if self.seatbelt_missing_counter >= SEATBELT_FRAMES_THRESHOLD else "SEATBELT_WARNING"
            severity = "critical"     if self.seatbelt_missing_counter >= SEATBELT_FRAMES_THRESHOLD else "warning"
            return state, severity, details

        # P7: Hands off wheel
        if num_hands == 0:
            self.hands_off_counter += 1
            self._zero_except("hands_off_counter")
            state    = "HANDS_OFF_WHEEL" if self.hands_off_counter >= HANDS_OFF_FRAMES_THRESHOLD else "NO_HANDS"
            severity = "warning"         if self.hands_off_counter >= HANDS_OFF_FRAMES_THRESHOLD else "info"
            return state, severity, details

        # All clear
        self._reset_counters()
        return "ALERT", "info", details

    # -----------------------------------------------------------------------
    # SECONDARY path — LSTM fallback (no face detected by MediaPipe)
    # -----------------------------------------------------------------------

    def _run_lstm_fallback(self, num_hands):
        """
        SECONDARY / fallback detection path.
        Called ONLY when MediaPipe returns no face landmarks in this frame.

        Pushes last-known-good features into the buffer to keep it alive,
        then runs the LSTM model to predict the driver state from the
        rolling 10-frame history.

        Returns (state, severity, details).
        """
        # Push last-known-good values to keep buffer populated during face loss
        self._update_feature_buffer(
            self._last_ear, self._last_mar,
            self._last_pitch, self._last_yaw,
        )

        details = {
            "ear":       round(self._last_ear,   3),
            "mar":       round(self._last_mar,   3),
            "pitch_deg": round(self._last_pitch, 1),
            "yaw_deg":   round(self._last_yaw,   1),
            "hands":     num_hands,
            "phone":     self.phone_detected,
            "seatbelt":  self.seatbelt_detected,
            "source":    "lstm",
        }

        # LSTM not loaded — report no face and bail
        if self.lstm_model is None or self.scaler is None:
            self._reset_counters()
            return "NO_FACE_DETECTED", "info", details

        # Buffer not yet full — too early to predict
        if len(self.feature_buffer) < SEQUENCE_LENGTH:
            self._reset_counters()
            return "BUFFERING", "info", details

        # Run LSTM inference
        try:
            seq    = np.array(list(self.feature_buffer))                        # (10, 4)
            scaled = self.scaler.transform(seq).reshape(1, SEQUENCE_LENGTH, NUM_FEATURES)
            pred   = self.lstm_model.predict(scaled, verbose=0)                 # (1, 4)
            label  = LSTM_TARGET_NAMES[int(np.argmax(pred[0]))]
            conf   = float(np.max(pred[0]))
            details["lstm_confidence"] = round(conf, 3)
        except Exception as e:
            print(f"[DMS] LSTM prediction error: {e}")
            self._reset_counters()
            return "NO_FACE_DETECTED", "info", details

        # Apply the same frame-counter hysteresis as the MediaPipe path so
        # transient LSTM mispredictions don't fire events immediately.
        if label == "DROWSY":
            self.drowsy_counter += 1
            self._zero_except("drowsy_counter")
            state    = "DROWSY"          if self.drowsy_counter    >= DROWSY_FRAMES_THRESHOLD    else "LOW_EYE_OPENING"
            severity = "warning"         if self.drowsy_counter    >= DROWSY_FRAMES_THRESHOLD    else "info"

        elif label == "YAWNING":
            self.yawn_counter += 1
            self._zero_except("yawn_counter")
            state    = "YAWNING"         if self.yawn_counter      >= YAWN_FRAMES_THRESHOLD      else "MOUTH_OPEN"
            severity = "warning"         if self.yawn_counter      >= YAWN_FRAMES_THRESHOLD      else "info"

        elif label == "HEAD_TURNED":
            self.head_turn_counter += 1
            self._zero_except("head_turn_counter")
            state    = "HEAD_TURNED"     if self.head_turn_counter >= HEAD_TURN_FRAMES_THRESHOLD else "HEAD_MOVING"
            severity = "critical"        if self.head_turn_counter >= HEAD_TURN_FRAMES_THRESHOLD else "info"

        else:   # ALERT
            self._reset_counters()
            state    = "ALERT"
            severity = "info"

        return state, severity, details

    # -----------------------------------------------------------------------
    # Per-frame entry point
    # -----------------------------------------------------------------------

    def _process_frame(self, frame):
        """
        Run the full DMS pipeline on a single frame.

        Priority order:
          P1  Phone use        — YOLO (always, regardless of face)
          P2  Sleep            ─┐
          P3  Yawning           │  MediaPipe PRIMARY
          P4  Drowsy            │  → LSTM FALLBACK (only when MP has no face)
          P5  Head turned      ─┘
          P6  Seatbelt missing — YOLO (always)
          P7  Hands off wheel  — MediaPipe Hands (always)
          P8  Alert baseline
        """
        h, w = frame.shape[:2]
        self.frame_count += 1
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Always run YOLO detections
        self._detect_phone(frame)
        self._detect_seatbelt(frame)

        # Always run hands detection
        hands_result = self.hands.process(rgb) if self.hands else None
        num_hands    = (len(hands_result.multi_hand_landmarks)
                        if hands_result and hands_result.multi_hand_landmarks else 0)

        # Face detection
        face_result = self.face_mesh.process(rgb) if self.face_mesh else None
        face_found  = bool(face_result and face_result.multi_face_landmarks)

        state    = "NO_FACE_DETECTED"
        severity = "info"
        details  = {}

        # ── P1: Phone — highest priority, runs regardless of face ────────────
        if self.phone_detected:
            self.phone_use_counter += 1
            self._zero_except("phone_use_counter")
            state    = "PHONE_USE"    if self.phone_use_counter >= PHONE_USE_FRAMES_THRESHOLD else "PHONE_WARNING"
            severity = "critical"     if self.phone_use_counter >= PHONE_USE_FRAMES_THRESHOLD else "warning"
            details  = {
                "phone":    True,
                "seatbelt": self.seatbelt_detected,
                "hands":    num_hands,
                "source":   "yolo",
            }
            # Still update the buffer with last-known-good so LSTM stays warm
            self._update_feature_buffer(
                self._last_ear, self._last_mar,
                self._last_pitch, self._last_yaw,
            )

        # ── P2–P7: PRIMARY — MediaPipe face detected ─────────────────────────
        elif face_found:
            self._detection_source = "mediapipe"
            landmarks = face_result.multi_face_landmarks[0].landmark
            state, severity, details = self._run_mediapipe_rules(landmarks, w, h, num_hands)

        # ── P2–P5: FALLBACK — no face, use LSTM ──────────────────────────────
        else:
            self._detection_source = "lstm"
            state, severity, details = self._run_lstm_fallback(num_hands)

            # Override with phone event if detected without a face
            if self.phone_detected:
                self.phone_use_counter += 1
                self._zero_except("phone_use_counter")
                if self.phone_use_counter >= PHONE_USE_FRAMES_THRESHOLD:
                    state    = "PHONE_USE"
                    severity = "critical"

        self.current_state = state

        # Publish telemetry and events
        self._publish_state(state, details)
        self._publish_to_esp32(state, severity, details)
        if severity in ("critical", "danger"):
            self._publish_event(state, severity, details)

        return state, severity, details

    # -----------------------------------------------------------------------
    # Main loop
    # -----------------------------------------------------------------------

    def run(self):
        if not MEDIAPIPE_AVAILABLE or not SCIPY_AVAILABLE:
            print("[DMS] ERROR: mediapipe and scipy are required.")
            return

        source_candidates = [CAMERA_SOURCE]
        local_camera_index = _cfg.camera_index
        if local_camera_index not in source_candidates:
            source_candidates.append(local_camera_index)

        cap = None
        active_source = None
        for source in source_candidates:
            candidate = cv2.VideoCapture(source)
            if candidate.isOpened():
                cap = candidate
                active_source = source
                break
            candidate.release()

        if cap is None:
            print(f"[DMS] ERROR: Could not open camera/stream: {CAMERA_SOURCE}")
            self._publish_component_status("error", "Camera not available")
            return

        if active_source != CAMERA_SOURCE:
            print(
                f"[DMS] WARNING: Falling back from {CAMERA_SOURCE} to local camera index {active_source}"
            )

        active_is_stream = isinstance(active_source, str) and active_source.startswith("http")

        if not active_is_stream:
            cap.set(cv2.CAP_PROP_FRAME_WIDTH,  FRAME_WIDTH)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

        self.running = True
        self._publish_component_status("running", "DMS active")
        lstm_status = "enabled" if self.lstm_model else "disabled (model not found)"
        print(
            f"[DMS] Driver Monitoring System started  "
            f"(bus={self.bus_number}  show_gui={SHOW_GUI}  "
            f"lstm_fallback={lstm_status})"
        )

        try:
            while self.running and cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    time.sleep(0.1)
                    continue

                frame = cv2.flip(frame, 1)
                frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))

                state, severity, details = self._process_frame(frame)

                if SHOW_GUI:
                    color_map = {
                        "info":     (0, 255, 0),
                        "warning":  (0, 255, 255),
                        "critical": (0, 0, 255),
                        "danger":   (0, 0, 255),
                    }
                    color  = color_map.get(severity, (255, 255, 255))
                    source = details.get("source", self._detection_source)
                    label  = f"{state}  [{source}]"
                    cv2.putText(frame, label, (10, 30),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
                    for i, (k, v) in enumerate(details.items()):
                        cv2.putText(frame, f"{k}: {v}", (10, 60 + i * 25),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
                    cv2.imshow("DMS - Driver Monitoring", frame)
                    if cv2.waitKey(5) & 0xFF == 27:
                        break

        except KeyboardInterrupt:
            print("[DMS] Stopped by user")
        finally:
            self.running = False
            cap.release()
            if SHOW_GUI:
                cv2.destroyAllWindows()
            self._publish_component_status("stopped", "DMS stopped")
            if self.mqtt_client:
                self.mqtt_client.loop_stop()
                self.mqtt_client.disconnect()
            print("[DMS] Driver Monitoring System stopped")

    def _publish_component_status(self, status, message=""):
        if not self.mqtt_client or not self.device_key:
            return
        topic = f"{_cfg.mqtt_topic_base}/{self.device_key}/component"
        payload = {
            "component": "Driver Monitoring",
            "status":    status,
            "details":   {"message": message},
        }
        try:
            self.mqtt_client.publish(topic, json.dumps(payload), qos=1)
        except Exception:
            pass

    def stop(self):
        self.running = False


# ---------------------------------------------------------------------------
# Stand-alone entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parent_dir = str(Path(__file__).parent.parent)
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)

    health_monitor = None
    try:
        from device_health_monitor import get_health_monitor
        health_monitor = get_health_monitor()
        health_monitor.start()
        time.sleep(2)
    except Exception as e:
        print(f"[DMS] Health monitor not available: {e}")

    monitor = DriverMonitor(health_monitor=health_monitor)
    monitor.run()