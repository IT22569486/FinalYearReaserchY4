import cv2
import numpy as np
import mediapipe as mp
from scipy.spatial import distance as dist 
from tensorflow.keras.models import load_model
import joblib
import os
import sys
from ultralytics import YOLO
from db_logger import DriverBehaviorLogger
import json
import warnings
import atexit
import signal
import time

# Suppress protobuf deprecation warnings
warnings.filterwarnings('ignore', category=UserWarning, module='google.protobuf')

# -------------------- CONFIG AND FILE LOADING --------------------

# Load driver and bus configuration from JSON file
try:
    with open('config.json', 'r') as f:
        config = json.load(f)
    
    DRIVER_ID = config.get('driver_id', 'UNKNOWN')
    DRIVER_NAME = config.get('driver_name', 'Unknown Driver')
    LICENSE_NUMBER = config.get('license_number', 'N/A')
    BUS_NUMBER = config.get('bus_number', 'UNKNOWN')
    BUS_MODEL = config.get('bus_model', 'Unknown Model')
    BUS_CAPACITY = config.get('bus_capacity', 0)
    
    print(f"✓ Config loaded: Driver {DRIVER_NAME} ({DRIVER_ID}) - Bus {BUS_NUMBER}")
except FileNotFoundError:
    print("⚠ Config file not found. Using default values.")
    DRIVER_ID = "DRV_DEFAULT"
    DRIVER_NAME = "Default Driver"
    LICENSE_NUMBER = "N/A"
    BUS_NUMBER = "BUS_DEFAULT"
    BUS_MODEL = "Default"
    BUS_CAPACITY = 0
except Exception as e:
    print(f"⚠ Error loading config: {e}. Using default values.")
    DRIVER_ID = "DRV_DEFAULT"
    DRIVER_NAME = "Default Driver"
    LICENSE_NUMBER = "N/A"
    BUS_NUMBER = "BUS_DEFAULT"
    BUS_MODEL = "Default"
    BUS_CAPACITY = 0

MODEL_FILE = "dms_lstm_model.h5"
SCALER_FILE = "dms_scaler.pkl"    


# HYBRID LOGIC THRESHOLDS
HEAD_POSE_THRESHOLD = 0.15     # Horizontal distance threshold for head turn
EAR_SLEEP_THRESHOLD = 0.18     # EAR below this = eyes closed (sleep)
EAR_DROWSY_THRESHOLD = 0.25    # EAR below this = drowsy
MAR_YAWN_THRESHOLD = 0.5       # MAR above this = yawning

# Frame counters for temporal consistency - INCREASED FOR LONGER ALERT VISIBILITY
SLEEP_FRAMES_THRESHOLD = 5     # Faster detection - show alert quicker
DROWSY_FRAMES_THRESHOLD = 8    # Faster detection
YAWN_FRAMES_THRESHOLD = 3      # Faster detection
HEAD_TURN_FRAMES_THRESHOLD = 5 # Faster detection
HANDS_OFF_FRAMES_THRESHOLD = 10 # Faster detection
PHONE_USE_FRAMES_THRESHOLD = 5  # Faster detection

# Alert persistence - Keep alert visible even after behavior stops
ALERT_HOLD_FRAMES = 30  # Hold alert for 30 frames (~1 second) after behavior stops

# Behavior Logging Settings
BEHAVIOR_LOG_INTERVAL = 3.0  # Log every 3 seconds while behavior persists (prevents duplicate spam)

# YOLOv8 Phone Detection Settings
YOLO_CONFIDENCE_THRESHOLD = 0.30  # Higher threshold to reduce false positives
PHONE_CLASS_ID = 67  # 'cell phone' in COCO dataset
YOLO_DETECTION_INTERVAL = 15  # Run YOLO more frequently (was 25)
PHONE_DETECTION_DECAY = 10  # Frames to keep phone_detected=True after last detection
PHONE_MIN_SIZE = 400 # Minimum bounding box area to filter small objects

# Performance optimization settings
HAND_DETECTION_INTERVAL = 3  # Check hands every N frames
PROCESS_EVERY_N_FRAMES = 2  # Process every Nth frame (skip frames for speed)

# Prediction labels
TARGET_NAMES = ['Alert', 'Drowsy', 'Yawning', 'Head Turned']

# Frame counters
sleep_counter = 0
drowsy_counter = 0
yawn_counter = 0
head_turn_counter = 0
hands_off_counter = 0
phone_use_counter = 0

# Track last log time for each behavior (for interval-based logging)
last_log_times = {
    'sleep': 0,
    'drowsy': 0,
    'yawning': 0,
    'head_turned': 0,
    'hands_off': 0,
    'phone_use': 0
}

# Alert hold timers - Keep showing alert even after behavior stops
alert_hold_timers = {
    'sleep': 0,
    'drowsy': 0,
    'yawning': 0,
    'head_turned': 0,
    'hands_off': 0,
    'phone_use': 0
}

# Store last alert message and color for persistence
last_alert_message = "Waiting for Face..."
last_alert_color = (255, 255, 255)

try:
    # Load the trained LSTM model and the scaler
    loaded_model = load_model(MODEL_FILE)
    loaded_scaler = joblib.load(SCALER_FILE)
    print(" Model and Scaler loaded successfully.")
except FileNotFoundError:
    print(f" ERROR: Model or Scaler file not found. Ensure {MODEL_FILE} and {SCALER_FILE} are present.")
    sys.exit(1)

# Initialize MongoDB Logger
logger = None
try:
    logger = DriverBehaviorLogger(driver_id=DRIVER_ID, bus_number=BUS_NUMBER)
    logger.set_driver_info(DRIVER_ID, DRIVER_NAME, LICENSE_NUMBER)
    logger.set_bus_info(BUS_NUMBER, BUS_MODEL, BUS_CAPACITY)
    logger.start_session()
    print("MongoDB logger initialized and session started.")
except Exception as e:
    print(f"Warning: Could not initialize MongoDB logger: {e}")
    print("Continuing without database logging...")
    logger = None

# Cleanup function to ensure session is closed on exit
def cleanup_session():
    """Ensure database session is properly closed"""
    global logger
    if logger:
        try:
            import threading
            # Use thread with timeout to prevent hanging
            cleanup_thread = threading.Thread(target=lambda: logger.end_session())
            cleanup_thread.daemon = True
            cleanup_thread.start()
            cleanup_thread.join(timeout=2.0)  # Wait max 2 seconds
            
            if cleanup_thread.is_alive():
                print("\n Session cleanup timeout - forcing exit")
            else:
                print("\n Session closed on exit.")
        except Exception as e:
            print(f"\n Error closing session: {e}")

# Register cleanup handlers for various exit scenarios
atexit.register(cleanup_session)

def signal_handler(sig, frame):
    """Handle Ctrl+C and other signals"""
    print("\n\n⚠ Interrupt received, closing session...")
    
    # Release camera and close windows immediately
    try:
        cap.release()
        cv2.destroyAllWindows()
    except:
        pass
    
    # Try cleanup with timeout
    import threading
    cleanup_thread = threading.Thread(target=cleanup_session)
    cleanup_thread.daemon = True
    cleanup_thread.start()
    cleanup_thread.join(timeout=3.0)  # Wait max 3 seconds
    
    if cleanup_thread.is_alive():
        print("Cleanup taking too long - forcing exit")
    
    print(" Program terminated.")
    os._exit(0)  # Force exit immediately

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

# Load YOLOv8 model for phone detection
try:
    print(" Loading YOLOv8 model for phone detection...")
    yolo_model = YOLO('yolov8n.pt')  # Using nano model for speed
    print(" YOLOv8 model loaded successfully.")
except Exception as e:
    print(f" Warning: Could not load YOLOv8 model: {e}")
    print("Phone detection will be disabled.")
    yolo_model = None

# MediaPipe Setup
mp_face_mesh = mp.solutions.face_mesh
mp_hands = mp.solutions.hands
# Reduced detection confidence and disabled static mode for better performance
face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True, max_num_faces=1, 
                                   min_detection_confidence=0.5,  # Reduced from 0.6
                                   min_tracking_confidence=0.5,
                                   static_image_mode=False)
hands = mp_hands.Hands(static_image_mode=False, 
                       min_detection_confidence=0.5,  # Reduced from 0.6
                       min_tracking_confidence=0.5, 
                       max_num_hands=2)
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

# MP Landmark indices for 468-point model (Approximating Dlib structure)
# Indices for EAR calculation
mp_left_eye = [362, 385, 387, 263, 373, 380] 
mp_right_eye = [33, 160, 158, 133, 153, 144]

# Indices for MAR calculation (Center top/bottom, corners)
mp_mouth = [61, 291, 13, 14] 

# Indices for head pose detection using nose and face landmarks
mp_nose_tip = 1       # Nose tip
mp_face_center = 168  # Face center (approximate)
mp_left_face = 234    # Left face edge
mp_right_face = 454   # Right face edge  

# -------------------- FEATURE CALCULATION FUNCTIONS --------------------

def calculate_ear(landmarks, indices, w, h):
    """Calculates EAR using normalized MP landmarks."""
    try:
        # Note: EAR calculation requires 6 points for robust Dlib compatibility,
        # but MP indices are used here. We use the same formula structure.
        pts = [(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in indices]
        
        A = dist.euclidean(pts[1], pts[5])
        B = dist.euclidean(pts[2], pts[4])
        C = dist.euclidean(pts[0], pts[3])
        
        ear = (A + B) / (2.0 * C) if C != 0 else 0
        return float(ear)
    except Exception as e:
        print(f"EAR calculation error: {e}")
        return 0.0

def calculate_mar(landmarks, indices, w, h):
    """Calculates MAR using MP landmarks (simplified for speed)."""
    try:
        pts = [(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in indices]
        
        # Indices: 0, 1=corners (horizontal), 2, 3=top/bottom center (vertical)
        A = dist.euclidean(pts[2], pts[3]) # Vertical distance 
        C = dist.euclidean(pts[0], pts[1]) # Horizontal distance 
        
        mar = A / C if C != 0 else 0
        return float(mar)
    except Exception as e:
        print(f"MAR calculation error: {e}")
        return 0.0

def calculate_head_pose(landmarks, w, h):
    """Calculates head pose using MediaPipe landmarks only - simple and reliable."""
    try:
        # Get nose tip and face edge landmarks
        nose = landmarks[mp_nose_tip]
        left_face = landmarks[mp_left_face]
        right_face = landmarks[mp_right_face]
        
        # Calculate normalized positions
        nose_x = nose.x
        left_x = left_face.x
        right_x = right_face.x
        
        # Calculate face width and nose position relative to center
        face_width = abs(right_x - left_x)
        face_center = (left_x + right_x) / 2.0
        nose_offset = nose_x - face_center
        
        # Normalize offset by face width (0 = center, -1 = left, +1 = right)
        if face_width > 0:
            normalized_offset = nose_offset / face_width
        else:
            normalized_offset = 0.0
            
        return normalized_offset
        
    except Exception as e:
        print(f"Head pose calculation error: {e}")
        return 0.0

#  MAIN LOOP 

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("ERROR: Could not open camera.")
    sys.exit(1)

# Frame counters
sleep_counter = 0
drowsy_counter = 0
yawn_counter = 0
head_turn_counter = 0
hands_off_counter = 0
phone_use_counter = 0

# Yaw smoothing
yaw_history = []
YAW_HISTORY_SIZE = 5  # Smooth over 5 frames

# Feature sequence buffer for LSTM (needs 10 frames)
from collections import deque
feature_buffer = deque(maxlen=10)  # Store last 10 feature vectors
SEQUENCE_LENGTH = 10

# Frame counter for YOLO optimization
frame_count = 0
phone_detected = False
phone_detection_timer = 0  # Timer to maintain phone_detected state
phone_confirmation_count = 0  # Require multiple detections to confirm phone
PHONE_CONFIRMATION_THRESHOLD = 1  # Need 1 YOLO check to confirm phone (immediate detection)

# Performance: cached hand detection
last_num_hands = 0
last_hand_check_frame = 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    frame = cv2.resize(frame, (480, 360))  # Reduced resolution for better performance
    h, w = frame.shape[:2]
    frame_count += 1
    
    # Skip frames for performance (process every Nth frame)
    if frame_count % PROCESS_EVERY_N_FRAMES != 0:
        cv2.imshow("Driver Monitoring System - Press ESC to Exit", frame)
        if cv2.waitKey(5) & 0xFF == 27:
            break
        continue

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Process face mesh
    results = face_mesh.process(rgb)
    
    # Process hands detection (less frequently for performance)
    num_hands = last_num_hands  # Use cached value
    if frame_count - last_hand_check_frame >= HAND_DETECTION_INTERVAL:
        hands_results = hands.process(rgb)
        if hands_results.multi_hand_landmarks:
            num_hands = len(hands_results.multi_hand_landmarks)
            # Draw hand landmarks only when actually detected
            for hand_landmarks in hands_results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(
                    frame,
                    hand_landmarks,
                    mp_hands.HAND_CONNECTIONS,
                    mp_drawing_styles.get_default_hand_landmarks_style(),
                    mp_drawing_styles.get_default_hand_connections_style())
        else:
            num_hands = 0
        last_num_hands = num_hands
        last_hand_check_frame = frame_count
    
    # Detect phone using YOLOv8 (run every N frames for performance)
    # Use timer to persist phone_detected state between YOLO runs
    if yolo_model is not None and frame_count % YOLO_DETECTION_INTERVAL == 0:
        phone_found_this_check = False
        try:
            yolo_results = yolo_model(frame, verbose=False, imgsz=320)  # Smaller size for speed
            for result in yolo_results:
                boxes = result.boxes
                for box in boxes:
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    # Class 67 is 'cell phone' in COCO dataset
                    if cls == PHONE_CLASS_ID and conf > YOLO_CONFIDENCE_THRESHOLD:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        box_area = (x2 - x1) * (y2 - y1)
                        
                        # Filter by size but with lower threshold
                        if box_area >= PHONE_MIN_SIZE:
                            phone_found_this_check = True
                            print(f" Phone detected! Confidence: {conf:.2f}, Size: {box_area}px")
                            
                            # Draw bounding box for phone
                            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
                            cv2.putText(frame, f'Phone {conf:.2f}', (x1, y1-10), 
                                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                            break
            
            # Immediate detection (confirmation threshold = 1)
            if phone_found_this_check:
                phone_confirmation_count += 1
                if phone_confirmation_count >= PHONE_CONFIRMATION_THRESHOLD:
                    phone_detected = True
                    phone_detection_timer = PHONE_DETECTION_DECAY  # Reset timer
            else:
                phone_confirmation_count = 0
                # If no phone found in this check but timer is running, keep phone_detected=True
                if phone_detection_timer > 0:
                    phone_detection_timer -= YOLO_DETECTION_INTERVAL
                    if phone_detection_timer <= 0:
                        phone_detected = False
        except Exception as e:
            print(f"YOLO detection error: {e}")
    
    # Decay phone detection timer between YOLO runs
    elif phone_detection_timer > 0:
        phone_detection_timer -= 1
        if phone_detection_timer <= 0:
            phone_detected = False

    current_prediction = "Waiting for Face..."
    color = (255, 255, 255) # White default
    
    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            landmarks = face_landmarks.landmark
            
            try:
                # 1. Extract all necessary features (EAR, MAR, Head Pose)
                ear_avg = (calculate_ear(landmarks, mp_left_eye, w, h) + calculate_ear(landmarks, mp_right_eye, w, h)) / 2.0
                mar = calculate_mar(landmarks, mp_mouth, w, h)
                head_pose_raw = calculate_head_pose(landmarks, w, h)
                
                # Smooth head pose to reduce jitter
                yaw_history.append(head_pose_raw)
                if len(yaw_history) > YAW_HISTORY_SIZE:
                    yaw_history.pop(0)
                head_pose = np.mean(yaw_history)
                
                # For ML model compatibility, convert normalized offset to approximate yaw angle
                # Normalized offset range: -0.5 to +0.5 maps to approximately -45° to +45°
                yaw = head_pose * 90.0
                
                # ------------------ IMPROVED HYBRID LOGIC IMPLEMENTATION ------------------
                
                # Priority 1: Check for Phone Use - CRITICAL (Highest Priority)
                if phone_detected:
                    phone_use_counter += 1
                    sleep_counter = 0
                    drowsy_counter = 0
                    yawn_counter = 0
                    head_turn_counter = 0
                    hands_off_counter = 0
                    
                    if phone_use_counter >= PHONE_USE_FRAMES_THRESHOLD:
                        current_prediction = "!!! CRITICAL: PHONE DETECTED !!!"
                        color = (0, 0, 255) # Red (CRITICAL)
                        alert_hold_timers['phone_use'] = ALERT_HOLD_FRAMES  # Set hold timer
                        last_alert_message = current_prediction
                        last_alert_color = color
                        # Log to database (with time-based interval)
                        if logger:
                            current_time = time.time()
                            if current_time - last_log_times['phone_use'] >= BEHAVIOR_LOG_INTERVAL:
                                logger.log_behavior(
                                    behavior_type='phone_use',
                                    severity='critical',
                                    metrics={'ear': ear_avg, 'mar': mar, 'yaw': yaw, 'num_hands': num_hands, 'phone_detected': True}
                                )
                                last_log_times['phone_use'] = current_time
                    else:
                        current_prediction = "WARNING: Phone Detected..."
                        color = (0, 100, 255) # Orange-Red
                
                # Priority 2: Check for Sleep (Eyes Closed)
                elif ear_avg < EAR_SLEEP_THRESHOLD:
                    sleep_counter += 1
                    drowsy_counter = 0
                    yawn_counter = 0
                    head_turn_counter = 0
                    phone_use_counter = 0
                    
                    if sleep_counter >= SLEEP_FRAMES_THRESHOLD:
                        current_prediction = "!!! DANGER: DRIVER SLEEPING !!!"
                        color = (0, 0, 255) # Red (DANGER)
                        alert_hold_timers['sleep'] = ALERT_HOLD_FRAMES
                        last_alert_message = current_prediction
                        last_alert_color = color
                        # Log to database (with time-based interval)
                        if logger:
                            current_time = time.time()
                            if current_time - last_log_times['sleep'] >= BEHAVIOR_LOG_INTERVAL:
                                logger.log_behavior(
                                    behavior_type='sleep',
                                    severity='critical',
                                    metrics={'ear': ear_avg, 'mar': mar, 'yaw': yaw, 'num_hands': num_hands, 'phone_detected': phone_detected}
                                )
                                last_log_times['sleep'] = current_time
                    else:
                        current_prediction = "WARNING: Eyes Closing..."
                        color = (0, 140, 255) # Dark Orange
                
                # Priority 2: Check for Yawning
                elif mar > MAR_YAWN_THRESHOLD:
                    yawn_counter += 1
                    sleep_counter = 0
                    drowsy_counter = 0
                    head_turn_counter = 0
                    
                    if yawn_counter >= YAWN_FRAMES_THRESHOLD:
                        current_prediction = "WARNING: YAWNING DETECTED!"
                        color = (0, 255, 255) # Yellow
                        alert_hold_timers['yawning'] = ALERT_HOLD_FRAMES
                        last_alert_message = current_prediction
                        last_alert_color = color
                        # Log to database (with time-based interval)
                        if logger:
                            current_time = time.time()
                            if current_time - last_log_times['yawning'] >= BEHAVIOR_LOG_INTERVAL:
                                logger.log_behavior(
                                    behavior_type='yawning',
                                    severity='warning',
                                    metrics={'ear': ear_avg, 'mar': mar, 'yaw': yaw, 'num_hands': num_hands, 'phone_detected': phone_detected}
                                )
                                last_log_times['yawning'] = current_time
                    else:
                        current_prediction = "Mouth Opening..."
                        color = (255, 255, 0) # Cyan
                
                # Priority 4: Check for Drowsiness (Low EAR but not fully closed)
                elif ear_avg < EAR_DROWSY_THRESHOLD:
                    drowsy_counter += 1
                    sleep_counter = 0
                    yawn_counter = 0
                    head_turn_counter = 0
                    phone_use_counter = 0
                    
                    if drowsy_counter >= DROWSY_FRAMES_THRESHOLD:
                        current_prediction = "ALERT: DROWSINESS DETECTED!"
                        color = (0, 165, 255) # Orange
                        alert_hold_timers['drowsy'] = ALERT_HOLD_FRAMES
                        last_alert_message = current_prediction
                        last_alert_color = color
                        # Log to database (with time-based interval)
                        if logger:
                            current_time = time.time()
                            if current_time - last_log_times['drowsy'] >= BEHAVIOR_LOG_INTERVAL:
                                logger.log_behavior(
                                    behavior_type='drowsy',
                                    severity='warning',
                                    metrics={'ear': ear_avg, 'mar': mar, 'yaw': yaw, 'num_hands': num_hands, 'phone_detected': phone_detected}
                                )
                                last_log_times['drowsy'] = current_time
                    else:
                        current_prediction = "Notice: Low Eye Opening"
                        color = (100, 200, 255) # Light Orange
                
                # Priority 5: Check for Head Turned (using normalized offset)
                elif abs(head_pose) > HEAD_POSE_THRESHOLD:
                    head_turn_counter += 1
                    sleep_counter = 0
                    drowsy_counter = 0
                    yawn_counter = 0
                    hands_off_counter = 0
                    phone_use_counter = 0
                    
                    if head_turn_counter >= HEAD_TURN_FRAMES_THRESHOLD:
                        current_prediction = "!!! CRITICAL: HEAD TURNED !!!"
                        color = (0, 0, 255) # Red (CRITICAL)
                        alert_hold_timers['head_turned'] = ALERT_HOLD_FRAMES
                        last_alert_message = current_prediction
                        last_alert_color = color
                        # Log to database (with time-based interval)
                        if logger:
                            current_time = time.time()
                            if current_time - last_log_times['head_turned'] >= BEHAVIOR_LOG_INTERVAL:
                                logger.log_behavior(
                                    behavior_type='head_turned',
                                    severity='critical',
                                    metrics={'ear': ear_avg, 'mar': mar, 'yaw': yaw, 'num_hands': num_hands, 'phone_detected': phone_detected}
                                )
                                last_log_times['head_turned'] = current_time
                    else:
                        current_prediction = "Notice: Head Movement"
                        color = (100, 100, 255) # Light Red
                
                # Priority 6: Check for Hands Off Steering Wheel
                elif num_hands == 0:
                    hands_off_counter += 1
                    sleep_counter = 0
                    drowsy_counter = 0
                    yawn_counter = 0
                    head_turn_counter = 0
                    phone_use_counter = 0
                    
                    if hands_off_counter >= HANDS_OFF_FRAMES_THRESHOLD:
                        current_prediction = "!!! WARNING: HANDS OFF WHEEL !!!"
                        color = (0, 100, 255) # Orange-Red
                        alert_hold_timers['hands_off'] = ALERT_HOLD_FRAMES
                        last_alert_message = current_prediction
                        last_alert_color = color
                        # Log to database (with time-based interval)
                        if logger:
                            current_time = time.time()
                            if current_time - last_log_times['hands_off'] >= BEHAVIOR_LOG_INTERVAL:
                                logger.log_behavior(
                                    behavior_type='hands_off',
                                    severity='warning',
                                    metrics={'ear': ear_avg, 'mar': mar, 'yaw': yaw, 'num_hands': num_hands, 'phone_detected': phone_detected}
                                )
                                last_log_times['hands_off'] = current_time
                    else:
                        current_prediction = "Notice: No Hands Detected"
                        color = (50, 150, 255) # Light Orange
                
                # Priority 7: Use ML Model for Alert/Other States
                else:
                    # Reset all counters
                    sleep_counter = 0
                    drowsy_counter = 0
                    yawn_counter = 0
                    head_turn_counter = 0
                    hands_off_counter = 0
                    phone_use_counter = 0
                    
                    # Prepare 4-feature vector: [EAR, MAR, phone_detected, YAW]
                    phone_feature = 1 if phone_detected else 0
                    feature_vector = [ear_avg, mar, phone_feature, yaw]
                    
                    # Add to buffer (deque automatically maintains size of 10)
                    feature_buffer.append(feature_vector)
                    
                    # Only predict when we have enough frames (10 frames)
                    if len(feature_buffer) == SEQUENCE_LENGTH:
                        # Convert buffer to numpy array and reshape for LSTM: (1, 10, 4)
                        sequence = np.array(list(feature_buffer)).reshape(1, SEQUENCE_LENGTH, 4)
                        
                        # Scale the sequence using the loaded scaler
                        # Reshape to (10, 4) for scaling, then back to (1, 10, 4)
                        sequence_2d = sequence.reshape(SEQUENCE_LENGTH, 4)
                        scaled_sequence = loaded_scaler.transform(sequence_2d)
                        scaled_sequence = scaled_sequence.reshape(1, SEQUENCE_LENGTH, 4)
                        
                        # Predict
                        predictions = loaded_model.predict(scaled_sequence, verbose=0)
                        prediction_class = np.argmax(predictions[0])
                        prediction_label = TARGET_NAMES[prediction_class]
                        
                        if prediction_label == 'Drowsy':
                            current_prediction = "CAUTION: Drowsiness Detected"
                            color = (0, 165, 255) # Orange
                        elif prediction_label == 'Yawning':
                            current_prediction = "NOTICE: Yawning Detected"
                            color = (0, 255, 255) # Yellow
                        elif prediction_label == 'Head Turned':
                            current_prediction = "!!! CRITICAL: HEAD TURNED !!!"
                            color = (0, 0, 255) # Red
                        else:
                            current_prediction = "✓ Status: ALERT"
                            color = (0, 255, 0)   # Green (Alert)
                    else:
                        # Not enough frames yet, show buffering status
                        current_prediction = f"Buffering... ({len(feature_buffer)}/10)"
                        color = (200, 200, 200)  # Gray

                # Debug/Draw Info on Frame - Simple style like drowsy.py
                cv2.putText(frame, f"EAR: {ear_avg:.3f}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                cv2.putText(frame, f"MAR: {mar:.3f}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                cv2.putText(frame, f"Head Pose: {head_pose:.3f} (Yaw: {yaw:.1f}°)", (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                cv2.putText(frame, f"Hands Detected: {num_hands}", (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0) if num_hands > 0 else (0, 0, 255), 2)
                cv2.putText(frame, f"Phone Detected: {'YES' if phone_detected else 'NO'}", (10, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255) if phone_detected else (0, 255, 0), 2)
                
                # Show threshold info
                cv2.putText(frame, f"Thresholds - Sleep:{EAR_SLEEP_THRESHOLD} Drowsy:{EAR_DROWSY_THRESHOLD} Yawn:{MAR_YAWN_THRESHOLD} HeadTurn:{HEAD_POSE_THRESHOLD}", 
                           (10, h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)
                
                # Show counters when active
                counter_y = 180
                if phone_use_counter > 0:
                    cv2.putText(frame, f"Phone Use: {phone_use_counter}/{PHONE_USE_FRAMES_THRESHOLD}", (10, counter_y), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
                    counter_y += 30
                if sleep_counter > 0:
                    cv2.putText(frame, f"Sleep: {sleep_counter}/{SLEEP_FRAMES_THRESHOLD}", (10, counter_y), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
                    counter_y += 30
                if drowsy_counter > 0:
                    cv2.putText(frame, f"Drowsy: {drowsy_counter}/{DROWSY_FRAMES_THRESHOLD}", (10, counter_y), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 165, 255), 2)
                    counter_y += 30
                if yawn_counter > 0:
                    cv2.putText(frame, f"Yawn: {yawn_counter}/{YAWN_FRAMES_THRESHOLD}", (10, counter_y), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)
                    counter_y += 30
                if head_turn_counter > 0:
                    cv2.putText(frame, f"Head Turn: {head_turn_counter}/{HEAD_TURN_FRAMES_THRESHOLD}", (10, counter_y), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 255), 2)
                    counter_y += 30
                if hands_off_counter > 0:
                    cv2.putText(frame, f"Hands Off: {hands_off_counter}/{HANDS_OFF_FRAMES_THRESHOLD}", (10, counter_y), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 100, 255), 2)

            except Exception as e:
                current_prediction = f"Error: {str(e)[:30]}"
                print(f"Processing error: {e}")
    else:
        # Reset counters when no face detected, but keep hold timers active
        sleep_counter = 0
        drowsy_counter = 0
        yawn_counter = 0
        head_turn_counter = 0
        hands_off_counter = 0
        phone_use_counter = 0
    
    # Decrease all hold timers
    for key in alert_hold_timers:
        if alert_hold_timers[key] > 0:
            alert_hold_timers[key] -= 1
    
    # If any hold timer is active and current_prediction would be normal, show held alert
    if current_prediction in ["Waiting for Face...", "✓ Status: ALERT", f"Buffering... ({len(feature_buffer)}/10)"]:
        # Check if any critical alert is being held
        for behavior, timer in alert_hold_timers.items():
            if timer > 0:
                # Show the last alert message
                current_prediction = last_alert_message + f" [Hold: {timer}]"
                color = last_alert_color
                break
                
    # Display Result with simple styling like drowsy.py - NO BLINKING
    text_size = cv2.getTextSize(current_prediction, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]
    text_x = w - text_size[0] - 10
    text_y = 40
    
    # Draw background rectangle for better visibility
    cv2.rectangle(frame, (text_x - 5, text_y - 25), (w - 5, text_y + 5), (0, 0, 0), -1)
    cv2.putText(frame, current_prediction, (text_x, text_y), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

    cv2.imshow("Driver Monitoring System - Press ESC to Exit", frame)

    if cv2.waitKey(1) & 0xFF == 27:  # Changed from 5 to 1 for better responsiveness
        break

# Cleanup (cleanup_session will be called automatically via atexit)
cap.release()
cv2.destroyAllWindows()
print("\n✓ Program terminated successfully.")