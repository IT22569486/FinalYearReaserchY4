import cv2
import numpy as np
import mediapipe as mp
from scipy.spatial import distance as dist 
from tensorflow.keras.models import load_model
import joblib
import os
import sys
from ultralytics import YOLO

# -------------------- CONFIG AND FILE LOADING --------------------

MODEL_FILE = "dms_lstm_model.h5"
SCALER_FILE = "dms_scaler.pkl"    


# HYBRID LOGIC THRESHOLDS
HEAD_POSE_THRESHOLD = 0.15     # Horizontal distance threshold for head turn
EAR_SLEEP_THRESHOLD = 0.18     # EAR below this = eyes closed (sleep)
EAR_DROWSY_THRESHOLD = 0.25    # EAR below this = drowsy
MAR_YAWN_THRESHOLD = 0.5       # MAR above this = yawning

# Frame counters for temporal consistency
SLEEP_FRAMES_THRESHOLD = 10    # Consecutive frames to confirm sleep
DROWSY_FRAMES_THRESHOLD = 15   # Consecutive frames to confirm drowsiness
YAWN_FRAMES_THRESHOLD = 5      # Consecutive frames to confirm yawning
HEAD_TURN_FRAMES_THRESHOLD = 8 # Consecutive frames to confirm head turn
HANDS_OFF_FRAMES_THRESHOLD = 15 # Consecutive frames to confirm hands off wheel
PHONE_USE_FRAMES_THRESHOLD = 10 # Consecutive frames to confirm phone use

# YOLOv8 Phone Detection Settings
YOLO_CONFIDENCE_THRESHOLD = 0.35  # Lower threshold for better detection
PHONE_CLASS_ID = 67  # 'cell phone' in COCO dataset
YOLO_DETECTION_INTERVAL = 8  # Run YOLO every N frames for better performance
PHONE_DETECTION_DECAY = 15  # Frames to keep phone_detected=True after last detection

# Seatbelt detection settings (custom model 'best.pt')
SEATBELT_DETECTION_INTERVAL = 8  # Run seatbelt detection every N frames
SEATBELT_CONFIDENCE_THRESHOLD = 0.30
SEATBELT_FRAMES_THRESHOLD = 10  # Frames of continuous missing seatbelt to trigger critical
SEATBELT_MISSING_TIMER = 15  # Frames to keep seatbelt_detected=True after last positive
SEATBELT_CONFIRM_FRAMES = 3  # Consecutive frames required to confirm a positive 'seatbelt' detection

# Prediction labels
TARGET_NAMES = ['Alert', 'Drowsy', 'Yawning', 'Head Turned']

# Frame counters
sleep_counter = 0
drowsy_counter = 0
yawn_counter = 0
head_turn_counter = 0
hands_off_counter = 0
phone_use_counter = 0

try:
    # Load the trained LSTM model and the scaler
    loaded_model = load_model(MODEL_FILE)
    loaded_scaler = joblib.load(SCALER_FILE)
    print(" Model and Scaler loaded successfully.")
except FileNotFoundError:
    print(f" ERROR: Model or Scaler file not found. Ensure {MODEL_FILE} and {SCALER_FILE} are present.")
    sys.exit(1)

# Load YOLOv8 model for phone detection
try:
    print(" Loading YOLOv8 model for phone detection...")
    yolo_model = YOLO('yolov8n.pt')  # Using nano model for speed
    print(" YOLOv8 model loaded successfully.")
except Exception as e:
    print(f" Warning: Could not load YOLOv8 model: {e}")
    print("Phone detection will be disabled.")
    yolo_model = None

# Load custom seatbelt detection model (trained with `model=yolov8n.pt ...`) 
try:
    print(" Loading seatbelt detection model (best.pt)...")
    seatbelt_model = YOLO('best.pt')
    print(" Seatbelt model loaded successfully.")
except Exception as e:
    print(f" Warning: Could not load seatbelt model: {e}")
    print("Seatbelt detection will be disabled.")
    seatbelt_model = None

# MediaPipe Setup
mp_face_mesh = mp.solutions.face_mesh
mp_hands = mp.solutions.hands
# Use min_detection_confidence=0.6 and static_image_mode=False for better performance
face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True, max_num_faces=1, 
                                   min_detection_confidence=0.6, 
                                   min_tracking_confidence=0.5,
                                   static_image_mode=False)
hands = mp_hands.Hands(static_image_mode=False, 
                       min_detection_confidence=0.6, 
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

# -------------------- MAIN LOOP --------------------

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
# Seatbelt state
seatbelt_detected = True
seatbelt_timer = 0
seatbelt_missing_counter = 0
seatbelt_present_counter = 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    frame = cv2.resize(frame, (640, 480))  # Resize for faster processing
    h, w = frame.shape[:2]
    frame_count += 1

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Process face mesh
    results = face_mesh.process(rgb)
    
    # Process hands
    hands_results = hands.process(rgb)
    
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
                        phone_found_this_check = True
                        phone_detected = True
                        phone_detection_timer = PHONE_DETECTION_DECAY  # Reset timer
                        # Draw bounding box for phone
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
                        cv2.putText(frame, f'Phone {conf:.2f}', (x1, y1-10), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
                        break
            
            # If no phone found in this check but timer is running, keep phone_detected=True
            if not phone_found_this_check and phone_detection_timer > 0:
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

    # Detect seatbelt using custom YOLO model (run every N frames)
    if seatbelt_model is not None and frame_count % SEATBELT_DETECTION_INTERVAL == 0:
        try:
            sb_results = seatbelt_model(frame, verbose=False, imgsz=320)
            names = getattr(seatbelt_model, 'names', {})

            # Collect ALL relevant detections (both seatbelt and no-seatbelt)
            no_seatbelt_detections = []
            seatbelt_detections = []
            
            for res in sb_results:
                boxes = res.boxes
                for box in boxes:
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    label = names.get(cls, str(cls)) if isinstance(names, dict) else str(cls)
                    label_l = label.lower()
                    
                    if conf >= SEATBELT_CONFIDENCE_THRESHOLD:
                        bbox = tuple(map(int, box.xyxy[0]))
                        # Classify detection type
                        if 'no' in label_l or 'no-seatbelt' in label_l or 'no_seatbelt' in label_l:
                            no_seatbelt_detections.append((conf, label_l, bbox))
                        elif 'seatbelt' in label_l or 'seat' in label_l or 'belt' in label_l:
                            seatbelt_detections.append((conf, label_l, bbox))

            # Priority 1: If ANY no-seatbelt detected with reasonable confidence, mark as missing
            if no_seatbelt_detections:
                best_no_sb = max(no_seatbelt_detections, key=lambda x: x[0])
                conf, label, bbox = best_no_sb
                seatbelt_present_counter = 0
                seatbelt_detected = False
                seatbelt_missing_counter += 1
                x1, y1, x2, y2 = bbox
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
                cv2.putText(frame, f'{label} {conf:.2f}', (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            
            # Priority 2: If seatbelt detected and NO no-seatbelt, mark as present
            elif seatbelt_detections:
                best_sb = max(seatbelt_detections, key=lambda x: x[0])
                conf, label, bbox = best_sb
                seatbelt_missing_counter = 0
                seatbelt_present_counter += 1
                if seatbelt_present_counter >= SEATBELT_CONFIRM_FRAMES:
                    seatbelt_detected = True
                    seatbelt_timer = SEATBELT_MISSING_TIMER
                    seatbelt_present_counter = SEATBELT_CONFIRM_FRAMES
                x1, y1, x2, y2 = bbox
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 3)
                cv2.putText(frame, f'{label} {conf:.2f}', (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            
            # No relevant detection: decay timer
            else:
                seatbelt_present_counter = 0
                if seatbelt_timer > 0:
                    seatbelt_timer -= SEATBELT_DETECTION_INTERVAL
                    if seatbelt_timer <= 0:
                        seatbelt_detected = False
                else:
                    seatbelt_detected = False

        except Exception as e:
            print(f"Seatbelt detection error: {e}")
    elif seatbelt_timer > 0:
        # Decay between checks
        seatbelt_present_counter = 0
        seatbelt_timer -= 1
        if seatbelt_timer <= 0:
            seatbelt_detected = False

    current_prediction = "Waiting for Face..."
    color = (255, 255, 255) # White default
    
    # Count detected hands
    num_hands = 0
    if hands_results.multi_hand_landmarks:
        num_hands = len(hands_results.multi_hand_landmarks)
        # Draw hand landmarks on frame
        for hand_landmarks in hands_results.multi_hand_landmarks:
            mp_drawing.draw_landmarks(
                frame,
                hand_landmarks,
                mp_hands.HAND_CONNECTIONS,
                mp_drawing_styles.get_default_hand_landmarks_style(),
                mp_drawing_styles.get_default_hand_connections_style())
    
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
                    seatbelt_missing_counter = 0
                    
                    if head_turn_counter >= HEAD_TURN_FRAMES_THRESHOLD:
                        current_prediction = "!!! CRITICAL: HEAD TURNED !!!"
                        color = (0, 0, 255) # Red (CRITICAL)
                    else:
                        current_prediction = "Notice: Head Movement"
                        color = (100, 100, 255) # Light Red
                
                # Priority 6: Check for Seatbelt - CRITICAL
                elif not seatbelt_detected:
                    seatbelt_missing_counter += 1
                    sleep_counter = 0
                    drowsy_counter = 0
                    yawn_counter = 0
                    head_turn_counter = 0
                    hands_off_counter = 0
                    phone_use_counter = 0

                    if seatbelt_missing_counter >= SEATBELT_FRAMES_THRESHOLD:
                        current_prediction = "!!! CRITICAL: NO SEATBELT !!!"
                        color = (0, 0, 255)  # Red (CRITICAL)
                    else:
                        current_prediction = "WARNING: No Seatbelt Detected..."
                        color = (0, 100, 255)  # Orange-Red
                
                # Priority 7: Check for Hands Off Steering Wheel
                elif num_hands == 0:
                    hands_off_counter += 1
                    sleep_counter = 0
                    drowsy_counter = 0
                    yawn_counter = 0
                    head_turn_counter = 0
                    phone_use_counter = 0
                    seatbelt_missing_counter = 0
                    
                    if hands_off_counter >= HANDS_OFF_FRAMES_THRESHOLD:
                        current_prediction = "!!! WARNING: HANDS OFF WHEEL !!!"
                        color = (0, 100, 255) # Orange-Red
                    else:
                        current_prediction = "Notice: No Hands Detected"
                        color = (50, 150, 255) # Light Orange
                
                # Priority 8: Use ML Model for Alert/Other States
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

                # Debug/Draw Info on Frame
                cv2.putText(frame, f"EAR: {ear_avg:.3f}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                cv2.putText(frame, f"MAR: {mar:.3f}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                cv2.putText(frame, f"Head Pose: {head_pose:.3f} (Yaw: {yaw:.1f}°)", (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                cv2.putText(frame, f"Hands Detected: {num_hands}", (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0) if num_hands > 0 else (0, 0, 255), 2)
                cv2.putText(frame, f"Phone Detected: {'YES' if phone_detected else 'NO'}", (10, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255) if phone_detected else (0, 255, 0), 2)
                
                # Show threshold info
                cv2.putText(frame, f"Thresholds - Sleep:{EAR_SLEEP_THRESHOLD} Drowsy:{EAR_DROWSY_THRESHOLD} Yawn:{MAR_YAWN_THRESHOLD} HeadTurn:{HEAD_POSE_THRESHOLD}", 
                           (10, h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)
                
                # Show counters when active
                # Seatbelt debug display
                cv2.putText(frame, f"Seatbelt Detected: {'YES' if seatbelt_detected else 'NO'}", (10, 180),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0) if seatbelt_detected else (0, 0, 255), 2)
                # Show seatbelt missing/count info when relevant
                if seatbelt_missing_counter > 0:
                    cv2.putText(frame, f"Seatbelt Missing: {seatbelt_missing_counter}/{SEATBELT_FRAMES_THRESHOLD}", (10, 210),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
                if seatbelt_timer > 0:
                    cv2.putText(frame, f"Seatbelt Timer: {seatbelt_timer}", (10, 235), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

                # Start counters lower to avoid overlap with seatbelt debug
                counter_y = 260
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
        # Reset counters when no face detected
        sleep_counter = 0
        drowsy_counter = 0
        yawn_counter = 0
        head_turn_counter = 0
        hands_off_counter = 0
        phone_use_counter = 0
                
    # Display Result with better positioning
    text_size = cv2.getTextSize(current_prediction, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)[0]
    text_x = w - text_size[0] - 10
    text_y = 40
    
    # Draw background rectangle for better visibility
    cv2.rectangle(frame, (text_x - 5, text_y - 25), (w - 5, text_y + 5), (0, 0, 0), -1)
    cv2.putText(frame, current_prediction, (text_x, text_y), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
 
    cv2.imshow("Driver Monitoring System - Press ESC to Exit", frame)

    if cv2.waitKey(5) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()