#!/usr/bin/env python3
import argparse
import os
import sys
import time
from pathlib import Path

import cv2
import numpy as np

try:
    from ultralytics import YOLO
except Exception as e:
    print("ERROR: ultralytics package is required. Install with: pip install ultralytics")
    raise

try:
    import pygame
    pygame.mixer.init()
    AUDIO_AVAILABLE = True
except ImportError:
    print("WARNING: pygame not found. Audio warnings disabled. Install: pip install pygame")
    AUDIO_AVAILABLE = False

try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    print("WARNING: onnxruntime not found. Depth estimation disabled. Install: pip install onnxruntime")
    ONNX_AVAILABLE = False

# Solid lane IDs that should trigger warnings on right side
SOLID_LANE_IDS = [4, 5, 6, 7, 8]  # solid single white, yellow, red, double white, double yellow


def get_palette(n):
    """Return a list of distinct BGR colors."""
    np.random.seed(42)
    colors = (np.random.randint(0, 255, size=(n, 3))).tolist()
    # convert rgb->bgr for OpenCV
    return [(int(c[2]), int(c[1]), int(c[0])) for c in colors]


class MiDaSDepth:
    """MiDaS depth estimation using ONNX"""
    
    def __init__(self, model_path='model-small.onnx', input_size=(256, 256)):
        """
        Initialize MiDaS depth estimator
        
        Args:
            model_path: Path to MiDaS ONNX model
            input_size: Input size for the model (width, height)
        """
        self.model_path = model_path
        self.input_size = input_size
        self.session = None
        
        if not ONNX_AVAILABLE:
            print("⚠️ ONNX Runtime not available. Depth estimation disabled.")
            return
        
        if not Path(model_path).exists():
            print(f"⚠️ MiDaS model not found: {model_path}")
            print("Download from: https://github.com/isl-org/MiDaS/releases")
            print("Recommended: model-small.onnx")
            return
        
        try:
            # Create ONNX Runtime session
            self.session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
            self.input_name = self.session.get_inputs()[0].name
            print(f"✅ MiDaS depth model loaded: {model_path}")
        except Exception as e:
            print(f"❌ Failed to load MiDaS model: {e}")
            self.session = None
    
    def estimate_depth(self, frame):
        """
        Estimate depth map from frame
        
        Args:
            frame: Input BGR frame
            
        Returns:
            Colorized depth map (BGR) or None if model not available
        """
        if self.session is None:
            return None
        
        try:
            # Prepare input
            img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img_resized = cv2.resize(img, self.input_size)
            
            # Normalize to [0, 1]
            img_input = img_resized.astype(np.float32) / 255.0
            
            # Add batch dimension and transpose to NCHW format
            img_input = np.transpose(img_input, (2, 0, 1))
            img_input = np.expand_dims(img_input, axis=0)
            
            # Run inference
            depth = self.session.run(None, {self.input_name: img_input})[0]
            
            # Post-process depth map
            depth = depth.squeeze()
            
            # Resize to original frame size
            depth_resized = cv2.resize(depth, (frame.shape[1], frame.shape[0]))
            
            # Normalize to 0-255
            depth_min = depth_resized.min()
            depth_max = depth_resized.max()
            if depth_max - depth_min > 0:
                depth_normalized = (depth_resized - depth_min) / (depth_max - depth_min)
            else:
                depth_normalized = np.zeros_like(depth_resized)
            
            depth_uint8 = (depth_normalized * 255).astype(np.uint8)
            
            # Apply colormap
            depth_colored = cv2.applyColorMap(depth_uint8, cv2.COLORMAP_MAGMA)
            
            return depth_colored
            
        except Exception as e:
            print(f"Depth estimation error: {e}")
            return None


def parse_args():
    p = argparse.ArgumentParser(description="YOLOv8-seg video inference and visualization")
    # Optional flags
    p.add_argument("--model", required=False, help="Path to YOLO model (e.g. bestV8.pt). If not provided, positional model argument will be used or defaults to 'bestV8.pt' in cwd.")
    p.add_argument("--input", required=False, help="Path to input video file (or '0' for webcam). If not provided, positional input argument will be used.")
    p.add_argument("--output", default="output_annotated.mp4", help="Path to output video file")
    p.add_argument("--device", default="cpu", help="Device to run on (cpu or 0,1 for gpu)")
    p.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    p.add_argument("--imgsz", type=int, default=640, help="Inference image size")
    p.add_argument("--show", action="store_true", help="Show annotated video in a window")
    # Positional convenience: allow calling like `python video_infer.py bestV8.pt input.mp4`
    p.add_argument("model_pos", nargs="?", help="Positional model path (optional)")
    p.add_argument("input_pos", nargs="?", help="Positional input path (optional)")
    return p.parse_args()


# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent.absolute()
MODELS_DIR = SCRIPT_DIR / 'models'
ASSETS_DIR = SCRIPT_DIR / 'assets'

def main():
    args = parse_args()
    # Resolve model path: flag -> positional -> default
    model_arg = args.model if args.model else args.model_pos
    if model_arg is None:
        model_arg = str(MODELS_DIR / 'bestV8.pt')  # default model in models folder

    model_path = Path(model_arg)
    # If model not found, prompt interactively
    while not model_path.exists():
        print(f"Model not found: {model_path}")
        user_in = input("Enter model path (or press Enter to try './bestV8.pt', or type 'q' to quit): ").strip()
        if user_in.lower() == 'q':
            print('Aborted by user')
            sys.exit(1)
        if user_in == '':
            model_path = Path('bestV8.pt')
        else:
            model_path = Path(user_in)
        # loop until found or quit

    # Load model
    print(f"Loading model: {model_path}")
    model = YOLO(str(model_path))

    # class names
    try:
        names = model.names
    except Exception:
        names = {i: str(i) for i in range(100)}

    # palette
    palette = get_palette(len(names))

    # Initialize MiDaS depth estimation
    print("\n" + "="*60)
    print("Initializing MiDaS Depth Estimation...")
    print("="*60)
    default_midas = str(MODELS_DIR / 'model-small.onnx')
    midas_model_path = input(f"Enter MiDaS ONNX model path (default: {default_midas}): ").strip()
    if not midas_model_path:
        midas_model_path = default_midas
    
    depth_estimator = MiDaSDepth(model_path=midas_model_path, input_size=(256, 256))
    depth_enabled = depth_estimator.session is not None
    
    if not depth_enabled:
        print("\n⚠️ Depth estimation will be disabled. Proceeding with lane detection only.")
        use_depth = input("Continue without depth estimation? [Y/n]: ").strip().lower()
        if use_depth == 'n':
            print("Aborted by user")
            sys.exit(1)

    # Load warning sound
    warning_sound = None
    audio_path = str(ASSETS_DIR / 'microwave-oven-beeps-36087.mp3')
    if AUDIO_AVAILABLE and Path(audio_path).exists():
        try:
            warning_sound = pygame.mixer.Sound(audio_path)
            print(f"✅ Audio warning loaded: {audio_path}")
        except Exception as e:
            print(f"⚠️ Audio load failed: {e}")
    else:
        print(f"⚠️ Audio file not found or pygame unavailable: {audio_path}")
    
    # ADAS warning state
    last_warning_time = 0
    warning_cooldown = 2.0  # seconds between warnings
    proximity_threshold = 100  # pixels - distance to trigger warning

    # Video capture: flag -> positional
    source = args.input if args.input else args.input_pos
    # If no source provided via args, prompt the user
    if source is None:
        source = input("Enter input video path (or '0' for webcam): ").strip()
        if source == '':
            print("No input provided. Aborting.")
            sys.exit(1)

    # If source provided but file not found (and not webcam '0'), allow interactive correction
    if str(source) != '0' and not Path(str(source)).exists():
        while True:
            print(f"Input not found: {source}")
            src_in = input("Enter a valid input video path (or '0' for webcam, or 'q' to quit): ").strip()
            if src_in.lower() == 'q':
                print('Aborted by user')
                sys.exit(1)
            if src_in == '0':
                source = '0'
                break
            if Path(src_in).exists():
                source = src_in
                break
            print('Path does not exist, try again.')

    # If user didn't pass --show, ask interactively whether to preview live predictions
    if not args.show and sys.stdin.isatty():
        try:
            preview_in = input("Show live preview with predictions while processing? [y/N]: ").strip().lower()
            if preview_in == 'y' or preview_in == 'yes':
                args.show = True
        except Exception:
            # non-interactive environment
            pass
    if str(source).isdigit():
        source = int(source)
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"Failed to open input: {args.input}")
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    print(f"Input: {args.input}  FPS: {fps:.2f}  Size: {width}x{height}")

    # Video writer - output will be split screen (lane + depth side by side)
    output_width = width * 2 if depth_enabled else width
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(args.output, fourcc, fps, (output_width, height))

    frame_idx = 0
    t0 = time.time()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_idx += 1

            # Inference (model accepts numpy arrays)
            # Use size and conf from args
            results = model(frame, conf=0.4, imgsz=args.imgsz)

            # results is an iterable; take first
            res = results[0]

            annotated = frame.copy()

            # If masks are available, draw them
            if getattr(res, 'masks', None) is not None and res.masks.data is not None:
                masks = res.masks.data  # list/array of masks (torch tensors or numpy)
                # boxes and class/confs
                boxes = res.boxes
                # iterate
                for i in range(len(masks)):
                    try:
                        mask = masks[i].cpu().numpy()
                    except Exception:
                        mask = np.array(masks[i])

                    # mask might be smaller/larger; resize to frame
                    try:
                        mask_resized = cv2.resize(mask, (width, height))
                    except Exception:
                        mask_resized = mask

                    mask_bool = mask_resized > 0.5

                    # class id and conf
                    try:
                        cls = int(boxes.cls[i].cpu().numpy())
                        conf = float(boxes.conf[i].cpu().numpy())
                    except Exception:
                        # fallback
                        cls = 0
                        conf = 0.0

                    color = palette[cls % len(palette)]
                    overlay = annotated.copy()
                    # color the mask area
                    overlay[mask_bool] = (overlay[mask_bool] * 0.5 + np.array(color) * 0.5).astype(np.uint8)
                    annotated = overlay

                    # draw contour
                    contours, _ = cv2.findContours(mask_bool.astype('uint8'), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    cv2.drawContours(annotated, contours, -1, color, 2)

                    # draw label at centroid
                    ys, xs = np.where(mask_bool)
                    if len(xs) and len(ys):
                        cx = int(np.mean(xs))
                        cy = int(np.mean(ys))
                        label = f"{names.get(cls, str(cls))} {conf:.2f}"
                        cv2.putText(annotated, label, (cx, cy), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)
            else:
                # Fallback: draw boxes only
                if getattr(res, 'boxes', None) is not None:
                    boxes = res.boxes
                    xyxy = boxes.xyxy.cpu().numpy() if hasattr(boxes.xyxy, 'cpu') else np.array(boxes.xyxy)
                    confs = boxes.conf.cpu().numpy() if hasattr(boxes.conf, 'cpu') else np.array(boxes.conf)
                    clss = boxes.cls.cpu().numpy() if hasattr(boxes.cls, 'cpu') else np.array(boxes.cls)
                    for (x1, y1, x2, y2), conf, cls in zip(xyxy, confs, clss):
                        x1, y1, x2, y2 = map(int, (x1, y1, x2, y2))
                        color = palette[int(cls) % len(palette)]
                        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
                        label = f"{names.get(int(cls), str(int(cls)))} {conf:.2f}"
                        cv2.putText(annotated, label, (x1, max(15, y1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2, cv2.LINE_AA)

            # Fixed center dot position (vehicle position)
            center_x = int(width * 0.5)  # move dot to the right (85% across)
            center_y = int(height * 0.85)  # 85% down from top (bottom area)
            
            # ADAS: Detect driving lane and check proximity
            warning_triggered = False
            closest_right_lane_distance = float('inf')
            left_lane_mask = None
            right_lane_mask = None
            closest_left_x = None
            closest_right_x = None
            
            if getattr(res, 'masks', None) is not None and res.masks.data is not None:
                masks = res.masks.data
                boxes = res.boxes
                
                # First pass: Find closest lanes on left and right of center dot
                for i in range(len(masks)):
                    try:
                        cls = int(boxes.cls[i].cpu().numpy())
                    except:
                        cls = 0
                    
                    try:
                        mask = masks[i].cpu().numpy()
                    except:
                        mask = np.array(masks[i])
                    
                    try:
                        mask_resized = cv2.resize(mask, (width, height))
                    except:
                        mask_resized = mask
                    
                    # Find lane pixels
                    ys, xs = np.where(mask_resized > 0.5)
                    
                    if len(xs) > 0:
                        lane_center_x = int(np.mean(xs))
                        
                        # Detect LEFT lane (closest to center dot on left side)
                        if lane_center_x < center_x:
                            if closest_left_x is None or abs(lane_center_x - center_x) < abs(closest_left_x - center_x):
                                closest_left_x = lane_center_x
                                left_lane_mask = mask_resized
                        
                        # Detect RIGHT lane (closest to center dot on right side)
                        elif lane_center_x > center_x:
                            if closest_right_x is None or abs(lane_center_x - center_x) < abs(closest_right_x - center_x):
                                closest_right_x = lane_center_x
                                right_lane_mask = mask_resized
                
                # Draw driving lane overlay (area between left and right lanes)
                if left_lane_mask is not None and right_lane_mask is not None:
                    # Create a mask for the driving lane area
                    driving_lane_mask = np.zeros((height, width), dtype=np.uint8)
                    
                    # For each row, fill between left and right lane boundaries
                    for y in range(height):
                        left_xs = np.where(left_lane_mask[y] > 0.5)[0]
                        right_xs = np.where(right_lane_mask[y] > 0.5)[0]
                        
                        if len(left_xs) > 0 and len(right_xs) > 0:
                            left_edge = int(np.max(left_xs))  # Rightmost point of left lane
                            right_edge = int(np.min(right_xs))  # Leftmost point of right lane
                            
                            if left_edge < right_edge:
                                driving_lane_mask[y, left_edge:right_edge] = 255
                    
                    # Apply blue semi-transparent overlay to driving lane
                    lane_overlay = annotated.copy()
                    lane_overlay[driving_lane_mask > 0] = (lane_overlay[driving_lane_mask > 0] * 0.7 + np.array([255, 200, 100]) * 0.3).astype(np.uint8)  # Blue-cyan color
                    annotated = lane_overlay
                
                # Second pass: Check proximity to solid lanes on RIGHT side only
                for i in range(len(masks)):
                    try:
                        cls = int(boxes.cls[i].cpu().numpy())
                    except:
                        cls = 0
                    
                    # Check only solid lane IDs on right side
                    if cls in SOLID_LANE_IDS:
                        try:
                            mask = masks[i].cpu().numpy()
                        except:
                            mask = np.array(masks[i])
                        
                        try:
                            mask_resized = cv2.resize(mask, (width, height))
                        except:
                            mask_resized = mask
                        
                        # Find lane pixels
                        ys, xs = np.where(mask_resized > 0.5)
                        
                        if len(xs) > 0:
                            # Check if lane is on RIGHT side of center dot
                            lane_center_x = int(np.mean(xs))
                            
                            if lane_center_x > center_x:  # Right side only
                                # Calculate minimum distance from center dot to lane pixels
                                distances = np.sqrt((xs - center_x)**2 + (ys - center_y)**2)
                                min_distance = float(np.min(distances))
                                
                                if min_distance < closest_right_lane_distance:
                                    closest_right_lane_distance = min_distance
                                
                                # Trigger warning if too close
                                if min_distance < proximity_threshold:
                                    warning_triggered = True
                                    
                                    # Draw warning line from dot to closest point
                                    min_idx = np.argmin(distances)
                                    closest_x = int(xs[min_idx])
                                    closest_y = int(ys[min_idx])
                                    cv2.line(annotated, (center_x, center_y), (closest_x, closest_y), (0, 0, 255), 2)
                                    cv2.circle(annotated, (closest_x, closest_y), 5, (0, 0, 255), -1)
                                    
                                    # Distance label
                                    dist_text = f"{min_distance:.0f}px"
                                    mid_x = (center_x + closest_x) // 2
                                    mid_y = (center_y + closest_y) // 2
                                    cv2.putText(annotated, dist_text, (mid_x, mid_y), 
                                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
            
            # Play audio warning
            if warning_triggered:
                current_time = time.time()
                if current_time - last_warning_time > warning_cooldown:
                    if warning_sound:
                        warning_sound.play()
                    last_warning_time = current_time
                    print(f"🔊 WARNING: Too close to solid lane on RIGHT! Distance: {closest_right_lane_distance:.0f}px")
                
                # Visual warning overlay
                red_overlay = np.zeros_like(annotated)
                red_overlay[:, width//2:] = (0, 0, 180)  # Right side red
                annotated = cv2.addWeighted(annotated, 0.85, red_overlay, 0.15, 0)
                
                # Warning text
                warning_text = "⚠️ LANE DEPARTURE WARNING RIGHT ⚠️"
                text_size = cv2.getTextSize(warning_text, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 3)[0]
                text_x = (width - text_size[0]) // 2
                cv2.rectangle(annotated, (text_x - 10, 40), (text_x + text_size[0] + 10, 80), (0, 0, 0), -1)
                cv2.putText(annotated, warning_text, (text_x, 70), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 3, cv2.LINE_AA)
            
            # Draw fixed center dot (vehicle position)
            dot_color = (0, 255, 0) if not warning_triggered else (0, 0, 255)  # Green or Red
            cv2.circle(annotated, (center_x, center_y), 10, (0, 0, 0), -1)  # Black outline
            cv2.circle(annotated, (center_x, center_y), 8, dot_color, -1)  # Green/Red center
            cv2.putText(annotated, "VEHICLE", (center_x - 35, center_y - 20), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
            # Info panel
            info_text = f"Threshold: {proximity_threshold}px | Right Lane: {closest_right_lane_distance:.0f}px"
            cv2.putText(annotated, info_text, (10, height - 20), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

            # Depth estimation
            if depth_enabled:
                depth_map = depth_estimator.estimate_depth(frame)
                
                if depth_map is not None:
                    # Add label to depth map
                    cv2.putText(depth_map, "DEPTH ESTIMATION", (10, 30), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                    
                    # Create split-screen output: Lane Detection (left) | Depth Map (right)
                    combined_frame = np.hstack([annotated, depth_map])
                else:
                    # If depth estimation failed, show black screen on right
                    black_screen = np.zeros_like(annotated)
                    cv2.putText(black_screen, "DEPTH UNAVAILABLE", (width//4, height//2), 
                               cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
                    combined_frame = np.hstack([annotated, black_screen])
            else:
                # No depth estimation, use only lane detection
                combined_frame = annotated
            
            # Add labels to split screen
            if depth_enabled:
                cv2.putText(combined_frame, "LANE DETECTION", (10, 30), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

            # write frame
            out.write(combined_frame)

            # optionally show
            if args.show:
                cv2.imshow('Lane Detection + Depth Estimation', combined_frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    print('Interrupted by user')
                    break

    finally:
        cap.release()
        out.release()
        if args.show:
            cv2.destroyAllWindows()

    t1 = time.time()
    elapsed = t1 - t0
    print(f"Processed {frame_idx} frames in {elapsed:.2f}s ({frame_idx/elapsed:.2f} FPS)")
    print(f"Output saved to: {args.output}")


if __name__ == '__main__':
    main()
