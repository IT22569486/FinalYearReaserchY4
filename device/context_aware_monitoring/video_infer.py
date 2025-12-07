#!/usr/bin/env python3
import argparse
import sys
import time
from pathlib import Path

import cv2
import numpy as np

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent.absolute()
MODELS_DIR = SCRIPT_DIR / 'models'

try:
    from ultralytics import YOLO
except Exception as e:
    print("ERROR: ultralytics package is required. Install with: pip install ultralytics")
    raise


def get_palette(n):
    """Return a list of distinct BGR colors."""
    np.random.seed(42)
    colors = (np.random.randint(0, 255, size=(n, 3))).tolist()
    return [(int(c[2]), int(c[1]), int(c[0])) for c in colors]


def parse_args():
    p = argparse.ArgumentParser(description="YOLOv8-seg video inference with tracking")
    p.add_argument("--model", required=False, help="Path to YOLO model")
    p.add_argument("--input", required=False, help="Path to input video file")
    p.add_argument("--output", default="output_annotated.mp4", help="Path to output video file")
    p.add_argument("--device", default="cpu", help="Device to run on")
    p.add_argument("--conf", type=float, default=0.3, help="Confidence threshold (higher = fewer false detections)")
    p.add_argument("--iou", type=float, default=0.5, help="IoU threshold for NMS")
    p.add_argument("--imgsz", type=int, default=640, help="Inference image size")
    p.add_argument("--max-det", type=int, default=50, help="Maximum detections per image")
    p.add_argument("--min-area", type=float, default=0.0, help="Minimum mask area ratio (0.0-1.0) to filter large detections")
    p.add_argument("--show", action="store_true", help="Show annotated video")
    p.add_argument("--track", action="store_true", help="Use tracking for stability")
    p.add_argument("model_pos", nargs="?", help="Positional model path")
    p.add_argument("input_pos", nargs="?", help="Positional input path")
    return p.parse_args()


def main():
    args = parse_args()
    
    # Resolve model path
    model_arg = args.model if args.model else args.model_pos
    if model_arg is None:
        model_arg = str(MODELS_DIR / 'old_models' / 'cartruck.pt')
    
    model_path = Path(model_arg)
    while not model_path.exists():
        print(f"Model not found: {model_path}")
        user_in = input("Enter model path (or 'q' to quit): ").strip()
        if user_in.lower() == 'q':
            sys.exit(1)
        model_path = Path(user_in) if user_in else Path(str(MODELS_DIR / 'old_models' / 'cartruck.pt'))
    
    # Load model
    print(f"Loading model: {model_path}")
    model = YOLO(str(model_path))
    
    # Class names
    try:
        names = model.names
    except Exception:
        names = {i: str(i) for i in range(100)}
    
    palette = get_palette(len(names))
    
    # Video source
    source = args.input if args.input else args.input_pos
    if source is None:
        source = input("Enter input video path (or '0' for webcam): ").strip()
        if source == '':
            print("No input provided. Aborting.")
            sys.exit(1)
    
    if str(source) != '0' and not Path(str(source)).exists():
        print(f"Input not found: {source}")
        sys.exit(1)
    
    # Ask about preview if --show not specified
    if not args.show:
        try:
            preview_in = input("Show live preview with predictions while processing? [y/N]: ").strip().lower()
            if preview_in == 'y' or preview_in == 'yes':
                args.show = True
                print("✓ Live preview enabled. Press 'q' in the window to stop.\n")
        except Exception:
            pass
    
    if str(source).isdigit():
        source = int(source)
    
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"Failed to open input: {source}")
        sys.exit(1)
    
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    print(f"Input: {source}")
    print(f"FPS: {fps:.2f}, Size: {width}x{height}")
    print(f"Settings: conf={args.conf}, iou={args.iou}, track={args.track}")
    print(f"Preview: {'YES' if args.show else 'NO'}")
    print("-" * 60)
    
    # Video writer
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(args.output, fourcc, fps, (width, height))
    
    frame_idx = 0
    t0 = time.time()
    
    # Create window if showing
    if args.show:
        cv2.namedWindow('YOLOv8 Video Inference', cv2.WINDOW_NORMAL)
        cv2.resizeWindow('YOLOv8 Video Inference', min(1280, width), min(720, height))
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_idx += 1
            
            # Inference
            if args.track:
                results = model.track(
                    frame, 
                    conf=args.conf,
                    iou=args.iou,
                    imgsz=args.imgsz,
                    max_det=args.max_det,
                    persist=True,
                    tracker="bytetrack.yaml",
                    verbose=False
                )
            else:
                results = model(
                    frame,
                    conf=args.conf,
                    iou=args.iou,
                    imgsz=args.imgsz,
                    max_det=args.max_det,
                    verbose=False
                )
            
            res = results[0]
            annotated = frame.copy()
            
            # Calculate frame area for filtering
            frame_area = width * height
            
            # Draw masks with area filtering
            if getattr(res, 'masks', None) is not None and res.masks.data is not None:
                masks = res.masks.data
                boxes = res.boxes
                
                for i in range(len(masks)):
                    try:
                        mask = masks[i].cpu().numpy()
                    except Exception:
                        mask = np.array(masks[i])
                    
                    # Resize mask to frame size
                    mask_resized = cv2.resize(mask, (width, height))
                    mask_bool = mask_resized > 0.5
                    
                    # Calculate mask area
                    mask_area = np.sum(mask_bool)
                    area_ratio = mask_area / frame_area
                    
                    # Filter out detections that are too large (likely background/road)
                    if args.min_area > 0 and area_ratio > args.min_area:
                        continue  # Skip this detection
                    
                    # Get class and confidence
                    try:
                        cls = int(boxes.cls[i].cpu().numpy())
                        conf = float(boxes.conf[i].cpu().numpy())
                    except Exception:
                        cls = 0
                        conf = 0.0
                    
                    # Additional filter: skip "truck" if it covers > 40% of frame
                    class_name = names.get(cls, '').lower()
                    if 'truck' in class_name and area_ratio > 0.4:
                        continue  # Skip large truck detections (likely road)
                    
                    color = palette[cls % len(palette)]
                    
                    # Draw colored mask
                    overlay = annotated.copy()
                    overlay[mask_bool] = (overlay[mask_bool] * 0.6 + np.array(color) * 0.4).astype(np.uint8)
                    annotated = overlay
                    
                    # Draw contour
                    contours, _ = cv2.findContours(
                        mask_bool.astype('uint8'),
                        cv2.RETR_EXTERNAL,
                        cv2.CHAIN_APPROX_SIMPLE
                    )
                    cv2.drawContours(annotated, contours, -1, color, 2)
                    
                    # Label position
                    ys, xs = np.where(mask_bool)
                    if len(xs) > 0 and len(ys) > 0:
                        cx = int(np.mean(xs))
                        cy = int(np.mean(ys))
                    else:
                        cx, cy = 50, 50
                    
                    # Create label
                    label = f"{names.get(cls, str(cls))} {conf:.2f}"
                    
                    # Add tracking ID if available
                    if args.track and hasattr(boxes, 'id') and boxes.id is not None:
                        try:
                            track_id = int(boxes.id[i].cpu().numpy())
                            label = f"ID{track_id} {label}"
                        except Exception:
                            pass
                    
                    # Draw label with background
                    (text_w, text_h), baseline = cv2.getTextSize(
                        label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
                    )
                    cv2.rectangle(
                        annotated, 
                        (cx - 2, cy - text_h - 8), 
                        (cx + text_w + 2, cy + 2), 
                        (0, 0, 0), 
                        -1
                    )
                    cv2.putText(
                        annotated, label, (cx, cy), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA
                    )
            
            # Add info overlay
            if args.show:
                elapsed = time.time() - t0
                fps_proc = frame_idx / elapsed if elapsed > 0 else 0
                num_objects = len(masks) if getattr(res, 'masks', None) and res.masks.data is not None else 0
                
                info_text = f"Frame: {frame_idx} | FPS: {fps_proc:.1f} | Objects: {num_objects}"
                cv2.rectangle(annotated, (5, 5), (550, 40), (0, 0, 0), -1)
                cv2.putText(
                    annotated, info_text, (10, 28), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA
                )
                
                # Instructions
                cv2.putText(
                    annotated, "Press 'q' to quit", (10, height - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA
                )
            
            # Write to output file
            out.write(annotated)
            
            # Show preview window
            if args.show:
                cv2.imshow('YOLOv8 Video Inference', annotated)
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q') or key == 27:  # 'q' or ESC
                    print('\n\nStopped by user (pressed q)')
                    break
            else:
                # Show progress in terminal
                if frame_idx % 30 == 0:
                    elapsed = time.time() - t0
                    fps_proc = frame_idx / elapsed if elapsed > 0 else 0
                    print(f"Processing... Frame {frame_idx}, {fps_proc:.1f} FPS", end='\r')
    
    except KeyboardInterrupt:
        print('\n\nInterrupted by Ctrl+C')
    
    finally:
        cap.release()
        out.release()
        if args.show:
            cv2.destroyAllWindows()
    
    t1 = time.time()
    elapsed = t1 - t0
    print(f"\n{'-' * 60}")
    print(f"✓ Processed {frame_idx} frames in {elapsed:.2f}s ({frame_idx/elapsed:.2f} FPS)")
    print(f"✓ Output saved to: {args.output}")


if __name__ == '__main__':
    main()