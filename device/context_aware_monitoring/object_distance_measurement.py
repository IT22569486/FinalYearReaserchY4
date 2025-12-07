#!/usr/bin/env python3
"""
Road Object Detection with Distance Measurement
Combines YOLOv8 object detection with MiDaS depth estimation
to measure distances to detected objects

Includes CTB Device Health Monitoring for IoT deployment
"""
import sys
import time
from pathlib import Path

import cv2
import numpy as np

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent.absolute()
MODELS_DIR = SCRIPT_DIR / 'models'
ASSETS_DIR = SCRIPT_DIR / 'assets'

try:
    from ultralytics import YOLO
except ImportError:
    print("ERROR: ultralytics required. Install: pip install ultralytics")
    sys.exit(1)

try:
    import onnxruntime as ort
    ONNX_AVAILABLE = True
except ImportError:
    print("ERROR: onnxruntime required for depth estimation. Install: pip install onnxruntime")
    ONNX_AVAILABLE = False
    sys.exit(1)

# Import Device Health Monitor for CTB IoT system
try:
    from device_health_monitor import get_health_monitor
    HEALTH_MONITOR_AVAILABLE = True
except ImportError:
    print("WARNING: Device health monitor not available. Install: pip install paho-mqtt psutil")
    HEALTH_MONITOR_AVAILABLE = False


def get_palette(n):
    """Return distinct BGR colors for visualization"""
    np.random.seed(42)
    colors = (np.random.randint(0, 255, size=(n, 3))).tolist()
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
        
        if not Path(model_path).exists():
            print(f"⚠️ MiDaS model not found: {model_path}")
            return
        
        try:
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
            depth_map: Raw depth values (numpy array) or None
            depth_colored: Colorized depth map (BGR) or None
        """
        if self.session is None:
            return None, None
        
        try:
            # Prepare input
            img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img_resized = cv2.resize(img, self.input_size)
            img_input = img_resized.astype(np.float32) / 255.0
            img_input = np.transpose(img_input, (2, 0, 1))
            img_input = np.expand_dims(img_input, axis=0)
            
            # Run inference
            depth = self.session.run(None, {self.input_name: img_input})[0]
            depth = depth.squeeze()
            
            # Resize to original frame size
            depth_resized = cv2.resize(depth, (frame.shape[1], frame.shape[0]))
            
            # Store raw depth values for distance calculation
            raw_depth = depth_resized.copy()
            
            # Normalize for visualization
            # MiDaS outputs inverse depth: high values = close, low values = far
            # Keep it as-is so visualization shows: dark = far, bright = close
            depth_min = depth_resized.min()
            depth_max = depth_resized.max()
            if depth_max - depth_min > 0:
                # Direct normalization: close objects = bright, far objects = dark
                depth_normalized = (depth_resized - depth_min) / (depth_max - depth_min)
            else:
                depth_normalized = np.zeros_like(depth_resized)
            
            depth_uint8 = (depth_normalized * 255).astype(np.uint8)
            depth_colored = cv2.applyColorMap(depth_uint8, cv2.COLORMAP_MAGMA)
            
            return raw_depth, depth_colored
            
        except Exception as e:
            print(f"Depth estimation error: {e}")
            return None, None


class ObjectProximityAnalyzer:
    """Analyze object proximity by checking depth map brightness in bounding box"""
    
    def __init__(self):
        """
        Initialize proximity analyzer
        Analyzes normalized depth map pixels to determine if object is close/medium/far
        """
        print(f"Proximity analyzer initialized:")
        print(f"  - Light pixels in depth map = Close objects")
        print(f"  - Dark pixels in depth map = Far objects")
        print(f"  - Orange/Red pixels = Medium distance")
    
    def analyze_proximity(self, depth_map_normalized, bbox):
        """
        Analyze object proximity by checking depth map brightness
        
        Logic:
        - Light/Bright pixels (high values) = Close object
        - Dark pixels (low values) = Far object  
        - Orange/Red/Medium brightness = Medium distance
        
        Args:
            depth_map_normalized: Normalized depth map (0-255, where bright=close)
            bbox: Bounding box (x1, y1, x2, y2)
            
        Returns:
            proximity: "Close" / "Medium" / "Far"
            avg_brightness: Average brightness value (0-255)
        """
        x1, y1, x2, y2 = map(int, bbox)
        
        # Extract region inside bounding box
        y1 = max(0, y1)
        y2 = min(depth_map_normalized.shape[0], y2)
        x1 = max(0, x1)
        x2 = min(depth_map_normalized.shape[1], x2)
        
        if y1 >= y2 or x1 >= x2:
            return "Unknown", 0
        
        # Get depth region inside box
        depth_region = depth_map_normalized[y1:y2, x1:x2]
        
        # Calculate average brightness (0-255)
        # Bright = Close, Dark = Far
        avg_brightness = float(np.mean(depth_region))
        
        # More granular brightness levels (0-255, bright=close)
        if avg_brightness > 100:
            proximity = "Very Close"
        elif avg_brightness > 70:
            proximity = "Close"
        elif avg_brightness > 50:
            proximity = "Near"
        elif avg_brightness > 30:
            proximity = "Medium"
        else:
            proximity = "Far"
        
        return proximity, avg_brightness


def main():
    """Main application"""
    print("=" * 60)
    print("Road Object Detection with Distance Measurement")
    print("YOLOv8 + MiDaS Depth Estimation")
    print("CTB Bus Rule Violation Detection System")
    print("=" * 60)
    
    # Initialize Health Monitor for CTB IoT
    health_monitor = None
    if HEALTH_MONITOR_AVAILABLE:
        print("\n[0] CTB Device Health Monitor")
        enable_health = input("Enable CTB health monitoring? [Y/n]: ").strip().lower()
        if enable_health != 'n':
            health_monitor = get_health_monitor()
            health_monitor.start()
            print(f"   Device Key: {health_monitor.device_key}")
    
    # Get object detection model
    print("\n[1] Object Detection Model")
    default_obj_model = str(MODELS_DIR / 'roadObjectDetectionYoloV8.pt')
    obj_model_path = input(f"Enter YOLOv8 object detection model path (default: {default_obj_model}): ").strip()
    if not obj_model_path:
        obj_model_path = default_obj_model
    
    while not Path(obj_model_path).exists():
        print(f"Model not found: {obj_model_path}")
        obj_model_path = input("Enter valid model path (or 'q' to quit): ").strip()
        if obj_model_path.lower() == 'q':
            return
    
    print(f"Loading object detection model: {obj_model_path}")
    obj_model = YOLO(obj_model_path)
    
    try:
        obj_names = obj_model.names
        print(f"Object classes: {obj_names}")
    except:
        obj_names = {i: str(i) for i in range(100)}
    
    obj_palette = get_palette(len(obj_names))
    
    # Get depth model
    print("\n[2] Depth Estimation Model")
    default_depth_model = str(MODELS_DIR / 'model-small.onnx')
    depth_model_path = input(f"Enter MiDaS ONNX model path (default: {default_depth_model}): ").strip()
    if not depth_model_path:
        depth_model_path = default_depth_model
    
    depth_estimator = MiDaSDepth(model_path=depth_model_path, input_size=(256, 256))
    
    if depth_estimator.session is None:
        print("❌ Failed to load depth model. Cannot analyze proximity.")
        return
    
    # Initialize proximity analyzer using depth map brightness
    proximity_analyzer = ObjectProximityAnalyzer()
    
    # Get lane detection model (optional)
    print("\n[Lane Detection - Optional]")
    use_lane = input("Enable lane detection and ADAS warnings? [y/N]: ").strip().lower()
    lane_model = None
    lane_names = None
    lane_palette = None
    SOLID_LANE_IDS = [4, 5, 6, 7, 8]  # solid lanes for warnings
    
    if use_lane == 'y':
        default_lane_model = str(MODELS_DIR / 'bestV8.pt')
        lane_model_path = input(f"Enter lane detection model path (default: {default_lane_model}): ").strip()
        if not lane_model_path:
            lane_model_path = default_lane_model
        
        if Path(lane_model_path).exists():
            print(f"Loading lane detection model: {lane_model_path}")
            lane_model = YOLO(lane_model_path)
            try:
                lane_names = lane_model.names
                print(f"Lane classes: {lane_names}")
            except:
                lane_names = {i: str(i) for i in range(100)}
            lane_palette = get_palette(len(lane_names))
        else:
            print(f"Lane model not found: {lane_model_path}")
            lane_model = None
    
    # Audio warnings for lanes
    warning_sound = None
    if lane_model is not None:
        try:
            import pygame
            pygame.mixer.init()
            audio_path = str(ASSETS_DIR / 'microwave-oven-beeps-36087.mp3')
            if Path(audio_path).exists():
                warning_sound = pygame.mixer.Sound(audio_path)
                print(f"✅ Audio warning loaded: {audio_path}")
        except:
            print("⚠️ Audio warnings disabled")
    
    last_warning_time = 0
    warning_cooldown = 2.0
    proximity_threshold = 100
    
    # Get video input
    print("\n[3] Video Input")
    video_path = input("Enter video path (or '0' for webcam): ").strip()
    if not video_path:
        print("No video provided")
        return
    
    if video_path != '0':
        while not Path(video_path).exists():
            print(f"Video not found: {video_path}")
            video_path = input("Enter valid video path (or 'q' to quit): ").strip()
            if video_path.lower() == 'q':
                return
    
    # Open video
    if video_path == '0':
        cap = cv2.VideoCapture(0)
    else:
        cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        print(f"Failed to open video: {video_path}")
        return
    
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    print(f"\nVideo: {video_path}")
    print(f"Resolution: {width}x{height} @ {fps:.1f} FPS")
    print(f"\nProcessing... Press 'q' to quit\n")
    
    # Update health monitor with initial detection status
    if health_monitor:
        health_monitor.update_detection_status(
            lane=lane_model is not None,
            objects=True,
            depth=depth_estimator.session is not None,
            camera=True
        )
    
    # Video writer - triple panel (original | depth | combined)
    output_width = width * 2
    output_path = 'object_distance_output.mp4'
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (output_width, height))
    
    frame_count = 0
    start_time = time.time()
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            
            # Run object detection
            obj_results = obj_model(frame, conf=0.4, imgsz=640)
            obj_res = obj_results[0]
            
            # Run lane detection if enabled
            lane_warning = False
            if lane_model is not None:
                lane_results = lane_model(frame, conf=0.4, imgsz=640)
                lane_res = lane_results[0]
            else:
                lane_res = None
            
            # Estimate depth
            depth_map, depth_colored = depth_estimator.estimate_depth(frame)
            
            # Create annotated frame
            annotated = frame.copy()
            
            # Draw lane segmentation and check warnings
            if lane_res is not None and hasattr(lane_res, 'masks') and lane_res.masks is not None:
                masks = lane_res.masks.data
                boxes = lane_res.boxes
                
                center_x = width // 2
                center_y = int(height * 0.85)
                
                # Draw lanes
                for i in range(len(masks)):
                    try:
                        mask = masks[i].cpu().numpy()
                        mask_resized = cv2.resize(mask, (width, height))
                    except:
                        continue
                    
                    mask_bool = mask_resized > 0.5
                    
                    try:
                        cls = int(boxes.cls[i].cpu().numpy())
                        conf = float(boxes.conf[i].cpu().numpy())
                    except:
                        cls = 0
                        conf = 0.0
                    
                    color = lane_palette[cls % len(lane_palette)]
                    
                    # Semi-transparent overlay
                    overlay = annotated.copy()
                    overlay[mask_bool] = (overlay[mask_bool] * 0.7 + np.array(color) * 0.3).astype(np.uint8)
                    annotated = overlay
                    
                    # Contours
                    contours, _ = cv2.findContours(mask_bool.astype('uint8'), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    thickness = 3 if cls in SOLID_LANE_IDS else 2
                    cv2.drawContours(annotated, contours, -1, color, thickness)
                    
                    # Check solid lane proximity (right side only)
                    if cls in SOLID_LANE_IDS:
                        ys, xs = np.where(mask_bool)
                        if len(xs) > 0:
                            lane_center_x = int(np.mean(xs))
                            if lane_center_x > center_x:  # Right side
                                distances = np.sqrt((xs - center_x)**2 + (ys - center_y)**2)
                                min_distance = float(np.min(distances))
                                
                                if min_distance < proximity_threshold:
                                    lane_warning = True
                                    current_time = time.time()
                                    if warning_sound and (current_time - last_warning_time) > warning_cooldown:
                                        warning_sound.play()
                                        last_warning_time = current_time
                                    
                                    # Report lane violation to CTB system
                                    if health_monitor:
                                        health_monitor.send_violation('lane_departure', {
                                            'lane_type': lane_names.get(cls, 'unknown') if lane_names else 'solid',
                                            'distance': min_distance,
                                            'frame': frame_count
                                        })
                
                # Draw vehicle position dot
                dot_color = (0, 0, 255) if lane_warning else (0, 255, 0)
                cv2.circle(annotated, (center_x, center_y), 10, (0, 0, 0), -1)
                cv2.circle(annotated, (center_x, center_y), 8, dot_color, -1)
                cv2.putText(annotated, "VEHICLE", (center_x - 35, center_y - 20), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
                
                # Lane warning overlay
                if lane_warning:
                    red_overlay = np.zeros_like(annotated)
                    red_overlay[:, width//2:] = (0, 0, 180)
                    annotated = cv2.addWeighted(annotated, 0.85, red_overlay, 0.15, 0)
                    cv2.putText(annotated, "LANE DEPARTURE WARNING", (width//2 - 150, 50),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            
            # Draw object detection with proximity analysis
            if depth_map is not None and depth_colored is not None and obj_res.boxes is not None:
                boxes = obj_res.boxes
                
                # Convert depth_colored to grayscale for brightness analysis
                depth_gray = cv2.cvtColor(depth_colored, cv2.COLOR_BGR2GRAY)
                
                for i in range(len(boxes)):
                    # Get box info
                    bbox = boxes.xyxy[i].cpu().numpy()
                    cls = int(boxes.cls[i].cpu().numpy())
                    conf = float(boxes.conf[i].cpu().numpy())
                    
                    x1, y1, x2, y2 = map(int, bbox)
                    
                    # Get object class name
                    obj_name = obj_names.get(cls, 'vehicle fallback')
                    
                    # Analyze proximity by checking depth map brightness in box
                    proximity, avg_brightness = proximity_analyzer.analyze_proximity(depth_gray, bbox)
                    
                    # Draw bounding box with color based on proximity
                    # Red = Close (bright in depth map)
                    # Orange = Medium
                    # Green = Far (dark in depth map)
                    if proximity == "Close":
                        box_color = (0, 0, 255)  # Red - close (bright pixels)
                    elif proximity == "Medium":
                        box_color = (0, 165, 255)  # Orange - medium
                    else:
                        box_color = (0, 255, 0)  # Green - far (dark pixels)
                    
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), box_color, 3)
                    
                    # Draw center point
                    cx = (x1 + x2) // 2
                    cy = (y1 + y2) // 2
                    cv2.circle(annotated, (cx, cy), 5, box_color, -1)
                    
                    # Prepare label with proximity
                    label = f"{obj_name} {conf:.2f}"
                    proximity_label = f"{proximity} (bright:{avg_brightness:.0f})"
                    
                    # Draw labels
                    cv2.putText(annotated, label, (x1, max(15, y1 - 25)), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                    
                    # Proximity label with background
                    prox_text_size = cv2.getTextSize(proximity_label, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)[0]
                    cv2.rectangle(annotated, 
                                 (x1, y1 - 10), 
                                 (x1 + prox_text_size[0] + 10, y1 - 10 - prox_text_size[1] - 5),
                                 (0, 0, 0), -1)
                    cv2.putText(annotated, proximity_label, (x1 + 5, y1 - 15), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
                    
                    # Mark same object in depth map with colored box
                    cv2.rectangle(depth_colored, (x1, y1), (x2, y2), box_color, 3)
                    cv2.putText(depth_colored, proximity_label, (x1, y1 - 10),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # Add titles
            cv2.putText(annotated, "OBJECT DETECTION + PROXIMITY", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            
            if depth_colored is not None:
                cv2.putText(depth_colored, "DEPTH MAP", (10, 30), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                
                # Create split-screen
                combined_frame = np.hstack([annotated, depth_colored])
            else:
                combined_frame = annotated
            
            # Add frame info
            info_text = f"Frame: {frame_count} | FPS: {frame_count / (time.time() - start_time):.1f}"
            cv2.putText(combined_frame, info_text, (10, height - 20),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # Write and display
            out.write(combined_frame)
            cv2.imshow('Object Distance Measurement', combined_frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print("\nInterrupted by user")
                break
    
    finally:
        cap.release()
        out.release()
        cv2.destroyAllWindows()
        
        # Stop health monitor
        if health_monitor:
            health_monitor.update_detection_status(camera=False)
            health_monitor.stop()
    
    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"Processed {frame_count} frames in {elapsed:.1f}s ({frame_count/elapsed:.1f} FPS)")
    print(f"Output saved: {output_path}")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
