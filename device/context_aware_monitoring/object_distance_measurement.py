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
# Need to add parent directory to path since device_health_monitor.py is in parent folder
import sys
from pathlib import Path
DEVICE_DIR = Path(__file__).parent.parent  # device/ folder
if str(DEVICE_DIR) not in sys.path:
    sys.path.insert(0, str(DEVICE_DIR))

try:
    from device_health_monitor import get_health_monitor
    HEALTH_MONITOR_AVAILABLE = True
    print(" Device health monitor imported successfully")
except ImportError as e:
    print(f"WARNING: Device health monitor not available: {e}")
    HEALTH_MONITOR_AVAILABLE = False

# Import Lane Memory Tracker for temporal lane tracking
try:
    from lane_memory_tracker import LaneMemoryTracker
    LANE_MEMORY_AVAILABLE = True
except ImportError:
    print("WARNING: Lane memory tracker not available")
    LANE_MEMORY_AVAILABLE = False

# Import Driver Behavior Analyzer for CTB bus monitoring
try:
    from driver_behavior_analyzer import DriverBehaviorAnalyzer
    BEHAVIOR_ANALYZER_AVAILABLE = True
except ImportError:
    print("WARNING: Driver behavior analyzer not available")
    BEHAVIOR_ANALYZER_AVAILABLE = False

# Import Adaptive Processor for performance optimizations
try:
    from adaptive_processor import AdaptiveProcessor, ProcessingLevel
    ADAPTIVE_PROCESSOR_AVAILABLE = True
    print(" Adaptive processor imported successfully")
except ImportError:
    print("WARNING: Adaptive processor not available")
    ADAPTIVE_PROCESSOR_AVAILABLE = False


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
            print(f" MiDaS model not found: {model_path}")
            return
        
        try:
            self.session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
            self.input_name = self.session.get_inputs()[0].name
            print(f" MiDaS depth model loaded: {model_path}")
        except Exception as e:
            print(f" Failed to load MiDaS model: {e}")
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
        
        IMPROVED: 
        - Uses BOTTOM HALF of bounding box (where object touches road)
        - Uses MEDIAN instead of mean (more robust to outliers)
        - Compares to ground reference depth
        
        Logic:
        - Light/Bright pixels (high values) = Close object
        - Dark pixels (low values) = Far object  
        - Orange/Red/Medium brightness = Medium distance
        
        Args:
            depth_map_normalized: Normalized depth map (0-255, where bright=close)
            bbox: Bounding box (x1, y1, x2, y2)
            
        Returns:
            proximity: "Close" / "Medium" / "Far"
            avg_brightness: Median brightness value (0-255)
        """
        x1, y1, x2, y2 = map(int, bbox)
        frame_height, frame_width = depth_map_normalized.shape[:2]
        
        # Clamp to frame bounds
        y1 = max(0, y1)
        y2 = min(frame_height, y2)
        x1 = max(0, x1)
        x2 = min(frame_width, x2)
        
        if y1 >= y2 or x1 >= x2:
            return "Unknown", 0
        
        # IMPROVEMENT 1: Use only BOTTOM HALF of bounding box
        # This is where the object touches the road - most reliable for distance
        box_height = y2 - y1
        bottom_start = y1 + int(box_height * 0.5)  # Start from middle
        
        # Get depth region from bottom half of box
        depth_region = depth_map_normalized[bottom_start:y2, x1:x2]
        
        if depth_region.size == 0:
            return "Unknown", 0
        
        # IMPROVEMENT 2: Use MEDIAN instead of mean (robust to sky pixels and outliers)
        median_brightness = float(np.median(depth_region))
        
        # IMPROVEMENT 3: Get ground reference depth (bottom center of frame)
        ground_y_start = int(frame_height * 0.85)
        ground_x_start = int(frame_width * 0.4)
        ground_x_end = int(frame_width * 0.6)
        ground_region = depth_map_normalized[ground_y_start:frame_height, ground_x_start:ground_x_end]
        ground_brightness = float(np.median(ground_region)) if ground_region.size > 0 else 100
        
        # Compare object depth to ground depth
        # If object brightness is close to ground brightness, it's on the road (close)
        depth_diff = abs(median_brightness - ground_brightness)
        
        # Classify based on brightness AND depth difference from ground
        if median_brightness > 90 or depth_diff < 20:
            proximity = "Very Close"
        elif median_brightness > 65:
            proximity = "Close"
        elif median_brightness > 45:
            proximity = "Near"
        elif median_brightness > 25:
            proximity = "Medium"
        else:
            proximity = "Far"
        
        return proximity, median_brightness


def main():
    """Main application"""
    print("=" * 60)
    print("Road Object Detection with Distance Measurement")
    print("YOLOv8 + MiDaS Depth Estimation")
    print("CTB Bus Rule Violation Detection System")
    print("=" * 60)
    
    # Initialize Health Monitor for violation reporting
    # Each process now has unique MQTT client ID (device_key + process_id)
    health_monitor = None
    device_config_path = str(DEVICE_DIR / 'device_config.json')  # Use parent folder config
    if HEALTH_MONITOR_AVAILABLE:
        health_monitor = get_health_monitor(config_path=device_config_path)
        if not health_monitor.running:
            health_monitor.start()
        print(f"✅ Violation reporter ready (Device: {health_monitor.device_key})")
    
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
        default_lane_model = str(MODELS_DIR / 'rlmdFilteredModelNov9.pt')
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
    
    # Initialize Lane Memory Tracker
    lane_tracker = None
    if lane_model is not None and LANE_MEMORY_AVAILABLE:
        lane_tracker = LaneMemoryTracker(max_history=30, decay_rate=0.95, smoothing_factor=0.3)
        print("✅ Lane Memory Tracker initialized")
    
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
    
    # Wrong-side driving detection (Option 1: Lane geometry based)
    wrong_side_start_time = None  # When wrong-side driving started
    WRONG_SIDE_DURATION_THRESHOLD = 3.0  # Must be on wrong side for 3 seconds to trigger
    wrong_side_warning_active = False
    
    # Get health_monitor for violation reporting
    health_monitor = None
    if HEALTH_MONITOR_AVAILABLE:
        # Use config from parent device/ folder to avoid creating duplicate device
        config_path = str(DEVICE_DIR / 'device_config.json')
        health_monitor = get_health_monitor(config_path=config_path)
        print(f"✅ Health monitor available for violation reporting (config: {config_path})")
    
    # Initialize Driver Behavior Analyzer
    behavior_analyzer = None
    vehicle_speed = 0
    if BEHAVIOR_ANALYZER_AVAILABLE:
        print("\n[Driver Behavior Analysis]")
        enable_behavior = input("Enable driver behavior analysis? [Y/n]: ").strip().lower()
        if enable_behavior != 'n':
            behavior_analyzer = DriverBehaviorAnalyzer(health_monitor=health_monitor)
            
            # Get vehicle speed for simulation
            speed_input = input("Enter simulated vehicle speed (km/h, default: 40): ").strip()
            try:
                vehicle_speed = float(speed_input) if speed_input else 40
            except ValueError:
                vehicle_speed = 40
            
            behavior_analyzer.set_speed(vehicle_speed)
            print(f"   Vehicle speed set to: {vehicle_speed} km/h")
    
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
    
    # Initialize Adaptive Processor for performance optimizations
    adaptive_processor = None
    if ADAPTIVE_PROCESSOR_AVAILABLE:
        print("\n[4] Adaptive Processing Optimization")
        enable_adaptive = input("Enable adaptive processing optimization? [Y/n]: ").strip().lower()
        if enable_adaptive != 'n':
            adaptive_processor = AdaptiveProcessor(width, height)
            adaptive_processor.set_speed(vehicle_speed)  # Use the speed from behavior analyzer
            print(f"✅ Adaptive processor enabled (Speed: {vehicle_speed} km/h)")
            print("   Optimizations: Frame skip, Conditional MiDaS, ROI crop, Resolution scaling, Similarity skip")
    
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
    
    # Fixed display size for consistent preview
    DISPLAY_WIDTH = 1280
    DISPLAY_HEIGHT = 360
    
    frame_count = 0
    start_time = time.time()
    
    # Cached results for adaptive processing
    cached_obj_res = None
    cached_depth_map = None
    cached_depth_colored = None
    cached_lane_res = None
    cached_combined_frame = None  # For fast skip mode
    
    # Tracking counters for status display
    yolo_runs_count = 0
    midas_runs_count = 0
    frames_skipped_count = 0
    midas_active = True  # Current MiDaS status
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_count += 1
            
            # =====================================================================
            # ADAPTIVE PROCESSING OPTIMIZATION
            # =====================================================================
            should_run_yolo = True
            should_run_midas = True
            should_run_lane = True
            processing_frame = frame
            roi_bounds = None
            scale_factor = 1.0
            frame_completely_skipped = False
            
            if adaptive_processor is not None:
                # Preprocess frame with all optimizations
                preprocess_result = adaptive_processor.preprocess_frame(frame)
                
                should_run_yolo = preprocess_result['should_run_yolo']
                should_run_midas = preprocess_result['should_run_midas']
                should_run_lane = should_run_yolo  # Lane follows YOLO
                processing_frame = preprocess_result['processed_frame']
                roi_bounds = preprocess_result['roi_bounds']
                scale_factor = preprocess_result['scale']
                
                # FAST SKIP MODE: If both YOLO and MiDaS are skipped, use cached combined frame
                if not should_run_yolo and not should_run_midas:
                    frame_completely_skipped = True
                    frames_skipped_count += 1
                    midas_active = False
                    if cached_combined_frame is not None:
                        # Update status overlay on cached frame
                        skip_display = cached_combined_frame.copy()
                        skip_rate = (frames_skipped_count / frame_count * 100) if frame_count > 0 else 0
                        status_text = f"YOLO:{yolo_runs_count} MiDaS:{midas_runs_count} SKIP:{skip_rate:.0f}% | MIDAS:FROZEN"
                        cv2.rectangle(skip_display, (5, 5), (450, 35), (0, 0, 0), -1)
                        cv2.putText(skip_display, status_text, (10, 25),
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 200, 255), 1)
                        
                        display_frame = cv2.resize(skip_display, (DISPLAY_WIDTH, DISPLAY_HEIGHT))
                        cv2.imshow('Object Distance Measurement', display_frame)
                        if cv2.waitKey(1) & 0xFF == ord('q'):
                            print("\nInterrupted by user")
                            break
                        continue  # Skip all processing for this frame
                
                # If frame was skipped, use cached results
                if not should_run_yolo:
                    obj_res = cached_obj_res
                    lane_res = cached_lane_res
                if not should_run_midas:
                    depth_map = cached_depth_map
                    depth_colored = cached_depth_colored
            
            # =====================================================================
            # RUN OBJECT DETECTION (conditional)
            # =====================================================================
            if should_run_yolo:
                # Use fixed low resolution for FAST inference (YOLO handles resize)
                # 320 is fast, 416 is balanced, 640 is slow but accurate
                infer_size = 384  # Balance between speed and accuracy
                
                obj_results = obj_model(processing_frame, conf=0.4, imgsz=infer_size)
                obj_res = obj_results[0]
                cached_obj_res = obj_res
                yolo_runs_count += 1  # Track YOLO runs
                
                # Update adaptive processor with detection state
                if adaptive_processor is not None:
                    has_objects = obj_res.boxes is not None and len(obj_res.boxes) > 0
                    adaptive_processor.set_detection_state(has_objects, 0)
            
            # Run lane detection if enabled (conditional)
            lane_warning = False
            detected_lane_masks = []  # Collect lane info for memory tracker
            
            if lane_model is not None and should_run_lane:
                # Use fixed low resolution for lane detection too
                lane_results = lane_model(processing_frame, conf=0.4, imgsz=384)
                lane_res = lane_results[0]
                cached_lane_res = lane_res
            elif lane_model is not None and not should_run_lane:
                lane_res = cached_lane_res
            else:
                lane_res = None
            
            # =====================================================================
            # RUN DEPTH ESTIMATION (conditional MiDaS)
            # =====================================================================
            if should_run_midas:
                depth_map, depth_colored = depth_estimator.estimate_depth(frame)
                cached_depth_map = depth_map
                cached_depth_colored = depth_colored
                midas_runs_count += 1  # Track MiDaS runs
                midas_active = True  # MiDaS is running
                
                # Cache result in adaptive processor
                if adaptive_processor is not None and depth_map is not None:
                    adaptive_processor.cache_midas_result(depth_map)
            else:
                midas_active = False  # MiDaS is frozen (using cache)
                # Use cached MiDaS result
                if adaptive_processor is not None:
                    cached = adaptive_processor.get_cached_midas_result()
                    if cached is not None:
                        depth_map = cached
                        # Regenerate colored version from cached depth
                        depth_min = depth_map.min()
                        depth_max = depth_map.max()
                        if depth_max - depth_min > 0:
                            depth_normalized = (depth_map - depth_min) / (depth_max - depth_min)
                        else:
                            depth_normalized = np.zeros_like(depth_map)
                        depth_uint8 = (depth_normalized * 255).astype(np.uint8)
                        depth_colored = cv2.applyColorMap(depth_uint8, cv2.COLORMAP_MAGMA)
                        cached_depth_colored = depth_colored
            
            # Create annotated frame
            annotated = frame.copy()
            
            # Draw lane segmentation and check warnings
            if lane_res is not None and hasattr(lane_res, 'masks') and lane_res.masks is not None:
                masks = lane_res.masks.data
                boxes = lane_res.boxes
                
                # Vehicle position: for left-side driving country, vehicle drives on left side of road
                # Position the reference dot at 70% from left (right portion of frame represents vehicle position)
                center_x = int(width * 0.5)
                center_y = int(height * 0.8)
                
                # Collect lane information for wrong-side detection
                left_lanes = []   # Lanes on left side of vehicle dot
                right_lanes = []  # Lanes on right side of vehicle dot
                
                # First pass: categorize lanes by position relative to vehicle
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
                    
                    ys, xs = np.where(mask_bool)
                    if len(xs) > 0:
                        lane_center_x = int(np.mean(xs))
                        lane_info = {
                            'mask_bool': mask_bool,
                            'cls': cls,
                            'conf': conf,
                            'center_x': lane_center_x,
                            'xs': xs,
                            'ys': ys,
                            'index': i
                        }
                        
                        # Add to detected lanes for memory tracker
                        detected_lane_masks.append(lane_info)
                        
                        if lane_center_x < center_x:  # Left side of vehicle
                            left_lanes.append(lane_info)
                        else:  # Right side of vehicle
                            right_lanes.append(lane_info)
                
                # Update Lane Memory Tracker with detected lanes
                if lane_tracker is not None:
                    tracked_lanes = lane_tracker.update(detected_lane_masks, frame.shape, center_x)
                    
                    # Draw lane segmentation overlay (filled area between lanes)
                    seg_overlay, seg_confidence = lane_tracker.get_segmented_lane_overlay(frame.shape)
                    if seg_overlay is not None:
                        # Apply segmentation overlay with transparency based on confidence
                        alpha = 0.30 * seg_confidence  # Increased visibility
                        annotated = cv2.addWeighted(annotated, 1.0, seg_overlay, alpha, 0)
                    
                    # Draw road structure prediction (STRAIGHT/CURVE)
                    annotated = lane_tracker.draw_road_structure(annotated)
                
                # NOTE: Wrong-side driving detection removed due to false positives
                # The simple heuristic (2+ lanes on left) was not reliable enough
                
                # Second pass: draw lanes and check warnings
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
                    
                    # Draw lane type label
                    if len(contours) > 0 and lane_names:
                        # Find topmost point of the largest contour for label placement
                        largest_contour = max(contours, key=cv2.contourArea)
                        if len(largest_contour) > 0:
                            topmost = tuple(largest_contour[largest_contour[:, :, 1].argmin()][0])
                            lane_type = lane_names.get(cls, f'Lane {cls}')
                            label_text = f"{lane_type} ({conf:.2f})"
                            
                            # Draw label with background
                            (text_w, text_h), baseline = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                            label_x = max(5, topmost[0] - text_w // 2)
                            label_y = max(text_h + 10, topmost[1] - 10)
                            
                            cv2.rectangle(annotated, 
                                        (label_x - 5, label_y - text_h - 5),
                                        (label_x + text_w + 5, label_y + baseline + 5),
                                        (0, 0, 0), -1)
                            cv2.putText(annotated, label_text, (label_x, label_y),
                                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                    
                    # Lane departure warning logic for left-side driving country
                    # Check if vehicle dot crosses any solid lane [4,5,6,7,8]
                    if cls in SOLID_LANE_IDS:
                        ys, xs = np.where(mask_bool)
                        if len(xs) > 0:
                            lane_center_x = int(np.mean(xs))
                            
                            # Calculate distance from vehicle dot to lane
                            distances = np.sqrt((xs - center_x)**2 + (ys - center_y)**2)
                            min_distance = float(np.min(distances))
                            
                            # Check if vehicle dot is crossing/touching the lane mask
                            vehicle_touching_lane = mask_bool[center_y, center_x] if (0 <= center_y < height and 0 <= center_x < width) else False
                            
                            should_warn = False
                            warning_type = ""
                            
                            # Case 1: Normal driving - warn if crossing middle lane (left side solid line)
                            # In left-side driving, the middle lane is on the LEFT of vehicle
                            if lane_center_x < center_x:  # Lane is on left side (middle lane for left-driving)
                                if vehicle_touching_lane or min_distance < proximity_threshold:
                                    should_warn = True
                                    warning_type = "LEFT_LANE_DEPARTURE"
                            
                            # Case 2: Crossing right-side solid lane
                            elif lane_center_x > center_x:  # Lane is on right side
                                if vehicle_touching_lane or min_distance < proximity_threshold:
                                    should_warn = True
                                    warning_type = "RIGHT_LANE_DEPARTURE"
                            
                            # NOTE: Case 3 (wrong-side driving) removed - too many false positives
                            
                            if should_warn:
                                lane_warning = True
                                current_time = time.time()
                                if warning_sound and (current_time - last_warning_time) > warning_cooldown:
                                    warning_sound.play()
                                    last_warning_time = current_time
                                
                                # Report lane violation to CTB system
                                if health_monitor:
                                    health_monitor.send_violation('lane_departure', {
                                        'lane_type': lane_names.get(cls, 'unknown') if lane_names else 'solid',
                                        'warning_type': warning_type,
                                        'distance': min_distance,
                                        'frame': frame_count
                                    })
                
                # Wrong-side driving detection using lane geometry
                # For left-side driving countries (Sri Lanka), if vehicle is to the RIGHT
                # of the right lane boundary, they're in oncoming traffic lane
                is_on_wrong_side = False
                if lane_tracker is not None and lane_tracker.right_lane_points is not None:
                    right_lane_pts = lane_tracker.right_lane_points
                    
                    # Get the right lane x-position at the vehicle's y-position (center_y)
                    # Find the closest point on the right lane to the vehicle's y-position
                    if len(right_lane_pts) > 0:
                        # Find y-values closest to center_y
                        y_vals = right_lane_pts[:, 1]
                        closest_idx = np.argmin(np.abs(y_vals - center_y))
                        right_lane_x_at_vehicle = right_lane_pts[closest_idx, 0]
                        
                        # If vehicle center_x is significantly to the RIGHT of the right lane
                        # (with a margin to avoid false positives)
                        margin = 50  # pixels of tolerance
                        if center_x > right_lane_x_at_vehicle + margin:
                            is_on_wrong_side = True
                
                # Temporal filtering: only warn after sustained wrong-side driving
                if is_on_wrong_side:
                    if wrong_side_start_time is None:
                        wrong_side_start_time = time.time()
                    
                    duration_on_wrong_side = time.time() - wrong_side_start_time
                    
                    if duration_on_wrong_side >= WRONG_SIDE_DURATION_THRESHOLD:
                        wrong_side_warning_active = True
                        
                        # Draw warning
                        cv2.putText(annotated, "WARNING: WRONG SIDE DRIVING!", (width//2 - 200, 80),
                                   cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 3)
                        
                        # Report violation (with cooldown)
                        if health_monitor and (time.time() - last_warning_time) > 10:  # 10s cooldown
                            health_monitor.send_violation('wrong_side_driving', {
                                'duration_seconds': duration_on_wrong_side,
                                'severity': 'HIGH',
                                'description': f'Wrong side driving for {duration_on_wrong_side:.1f}s'
                            })
                            last_warning_time = time.time()
                else:
                    # Reset timer if vehicle is back in correct lane
                    wrong_side_start_time = None
                    wrong_side_warning_active = False
                
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
            
            # Handle case when lane model exists but no masks detected - use memory
            elif lane_model is not None and lane_tracker is not None:
                center_x = int(width * 0.5)
                center_y = int(height * 0.8)
                
                # Update tracker with empty detections (will use memory)
                tracked_lanes = lane_tracker.update([], frame.shape, center_x)
                
                # Draw tracked lanes from memory if available
                if tracked_lanes:
                    seg_overlay, seg_confidence = lane_tracker.get_segmented_lane_overlay(frame.shape)
                    if seg_overlay is not None:
                        alpha = 0.25 * seg_confidence  # Slightly dimmer for memory
                        annotated = cv2.addWeighted(annotated, 1.0, seg_overlay, alpha, 0)
                    
                    # Draw road structure prediction
                    annotated = lane_tracker.draw_road_structure(annotated)
                    
                    # Show memory indicator
                    cv2.putText(annotated, "LANE MEMORY ACTIVE", (10, 60),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 200, 255), 2)
                
                # Draw vehicle position dot
                cv2.circle(annotated, (center_x, center_y), 10, (0, 0, 0), -1)
                cv2.circle(annotated, (center_x, center_y), 8, (0, 255, 0), -1)
                cv2.putText(annotated, "VEHICLE", (center_x - 35, center_y - 20), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            
            # Draw object detection with proximity analysis
            detected_objects = []  # Collect objects for behavior analyzer
            
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
                    
                    # Collect object info for behavior analyzer
                    if behavior_analyzer is not None:
                        detected_objects.append({
                            'bbox': [x1, y1, x2, y2],
                            'class': obj_name,
                            'cls_id': cls,
                            'conf': conf,
                            'brightness': avg_brightness,
                            'proximity': proximity
                        })
                    
                    # Draw bounding box with color based on proximity
                    # Dark Red = Very Close/Close (bright in depth map) - DANGER
                    # Orange = Near
                    # Yellow = Medium
                    # Green = Far (dark in depth map) - Safe
                    if proximity in ["Very Close", "Close"]:
                        box_color = (0, 0, 139)  # Dark Red - very close (danger!)
                    elif proximity == "Near":
                        box_color = (0, 0, 255)  # Red - near
                    elif proximity == "Medium":
                        box_color = (0, 165, 255)  # Orange - medium
                    else:  # Far
                        box_color = (0, 255, 0)  # Green - far (safe)
                    
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
            
            # Run driver behavior analysis
            if behavior_analyzer is not None:
                # Get lane polygon from lane tracker for in-lane detection
                lane_polygon = None
                if lane_tracker is not None:
                    # Build lane polygon from left and right lane points
                    left_pts = lane_tracker.left_lane_points
                    right_pts = lane_tracker.right_lane_points
                    
                    if left_pts is not None and right_pts is not None:
                        # Create polygon: left points (bottom to top) + right points reversed (top to bottom)
                        lane_polygon = np.vstack([left_pts, right_pts[::-1]])
                
                # Count objects in our driving lane
                in_lane_count = behavior_analyzer.count_objects_in_lane(detected_objects, lane_polygon)
                
                # Analyze traffic level
                behavior_analyzer.analyze_traffic(in_lane_count)
                
                # Check for violations
                violation, message = behavior_analyzer.check_violations()
                
                # Draw behavior overlay
                annotated = behavior_analyzer.draw_overlay(annotated, lane_polygon)
            
            if depth_colored is not None:
                cv2.putText(depth_colored, "DEPTH MAP", (10, 30), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                
                # Create split-screen
                combined_frame = np.hstack([annotated, depth_colored])
            else:
                combined_frame = annotated
            
            # =====================================================================
            # ADAPTIVE PROCESSOR UPDATE (skip overlay for speed)
            # =====================================================================
            if adaptive_processor is not None and detected_objects:
                max_brightness = max(obj.get('brightness', 0) for obj in detected_objects)
                adaptive_processor.set_detection_state(True, max_brightness)
            
            # =====================================================================
            # STATUS BAR: Detection rates and MiDaS status
            # =====================================================================
            fps = frame_count / (time.time() - start_time) if (time.time() - start_time) > 0 else 0
            skip_rate = (frames_skipped_count / frame_count * 100) if frame_count > 0 else 0
            midas_status = "ACTIVE" if midas_active else "FROZEN"
            midas_color = (0, 255, 0) if midas_active else (0, 200, 255)  # Green if active, Orange if frozen
            
            # Draw status bar background
            cv2.rectangle(combined_frame, (5, 5), (500, 40), (0, 0, 0), -1)
            
            # Status text
            status_text = f"F:{frame_count} FPS:{fps:.0f} | YOLO:{yolo_runs_count} MiDaS:{midas_runs_count} SKIP:{skip_rate:.0f}%"
            cv2.putText(combined_frame, status_text, (10, 25),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # MiDaS status indicator (separate for visibility)
            cv2.putText(combined_frame, f"MIDAS:{midas_status}", (380, 25),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, midas_color, 2)
            
            # Cache combined frame for fast skip mode
            cached_combined_frame = combined_frame
            
            # Write and display
            out.write(combined_frame)
            
            # Resize to fixed display size for consistent preview
            display_frame = cv2.resize(combined_frame, (DISPLAY_WIDTH, DISPLAY_HEIGHT))
            cv2.imshow('Object Distance Measurement', display_frame)
            
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
    
    # Print adaptive processor statistics
    if adaptive_processor is not None:
        stats = adaptive_processor.get_stats()
        print(f"\n📊 ADAPTIVE PROCESSING STATISTICS:")
        print(f"   Total frames: {stats['total_frames']}")
        print(f"   Frames skipped: {stats['frames_skipped']} ({stats['skip_rate_percent']:.1f}%)")
        print(f"   YOLO inferences: {stats['yolo_runs']}")
        print(f"   MiDaS inferences: {stats['midas_runs']}")
        print(f"   Avg preprocessing time: {stats['avg_preprocessing_ms']:.2f}ms")
        
        # Calculate savings
        savings_yolo = (1 - stats['yolo_runs'] / max(1, stats['total_frames'])) * 100
        savings_midas = (1 - stats['midas_runs'] / max(1, stats['total_frames'])) * 100
        print(f"\n💡 PROCESSING SAVINGS:")
        print(f"   YOLO savings: {savings_yolo:.1f}% fewer inferences")
        print(f"   MiDaS savings: {savings_midas:.1f}% fewer inferences")
    
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
