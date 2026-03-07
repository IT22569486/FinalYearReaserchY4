#!/usr/bin/env python3
"""
Driver Monitoring System (DMS) - Drowsiness & Distraction Detection

Detects:
  - Drowsiness (EAR-based eye closure + optional LSTM model)
  - Yawning (MAR-based mouth opening)
  - Sleeping (prolonged eye closure)
  - Head turned / distraction
  - Phone usage (ONNX YOLOv8 COCO class 67)
  - Seatbelt missing (custom ONNX YOLOv8 model)
  - Hands off steering wheel (MediaPipe Hands)

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
import threading
from pathlib import Path
from collections import deque

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
COMPONENT_DIR = Path(__file__).parent.absolute()
DEVICE_DIR = COMPONENT_DIR.parent.absolute()
MODELS_DIR = COMPONENT_DIR / "models"

# Add device dir for shared imports
if str(DEVICE_DIR) not in sys.path:
    sys.path.insert(0, str(DEVICE_DIR))

# ---------------------------------------------------------------------------
# Shared config
# ---------------------------------------------------------------------------
from shared.config import DeviceConfig

_cfg = DeviceConfig()
_comp = _cfg.get_component_config("driver_monitoring")

# ---------------------------------------------------------------------------
# Optional imports — gracefully degrade if not available
# ---------------------------------------------------------------------------
try:
    import mediapipe as mp
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

# Fallback: always try to import ultralytics regardless of onnxruntime availability
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
SHOW_GUI = _comp.get("show_gui", True)
ENABLE_PHONE = _comp.get("enable_phone_detection", True)
ENABLE_SEATBELT = _comp.get("enable_seatbelt_detection", True)
ENABLE_LSTM = _comp.get("enable_lstm_model", False)
USE_ONNX = _comp.get("use_onnx", True)
YOLO_IMGSZ = _comp.get("yolo_imgsz", 320)
CAMERA_INDEX = _cfg.camera_index
FRAME_WIDTH = _cfg.camera_width
FRAME_HEIGHT = _cfg.camera_height
SEND_INTERVAL = _cfg.send_interval

# Thresholds (mirrored from original drowsy.py)
EAR_SLEEP_THRESHOLD = 0.18
EAR_DROWSY_THRESHOLD = 0.25
MAR_YAWN_THRESHOLD = 0.5
HEAD_POSE_THRESHOLD = 0.15

SLEEP_FRAMES_THRESHOLD = 10
DROWSY_FRAMES_THRESHOLD = 15
YAWN_FRAMES_THRESHOLD = 5
HEAD_TURN_FRAMES_THRESHOLD = 8
HANDS_OFF_FRAMES_THRESHOLD = 15
PHONE_USE_FRAMES_THRESHOLD = 10
SEATBELT_FRAMES_THRESHOLD = 10

YOLO_CONFIDENCE_THRESHOLD = 0.35
PHONE_CLASS_ID = 67
YOLO_DETECTION_INTERVAL = 8
PHONE_DETECTION_DECAY = 40  # must survive ~3 detection cycles (each cycle decays by ~15)

SEATBELT_DETECTION_INTERVAL = 8
SEATBELT_CONFIDENCE_THRESHOLD = 0.30
SEATBELT_MISSING_TIMER = 15
SEATBELT_CONFIRM_FRAMES = 3

SEQUENCE_LENGTH = 10
YAW_HISTORY_SIZE = 5

TARGET_NAMES = ["Alert", "Drowsy", "Yawning", "Head Turned"]

# MediaPipe landmark indices
MP_LEFT_EYE = [362, 385, 387, 263, 373, 380]
MP_RIGHT_EYE = [33, 160, 158, 133, 153, 144]
MP_MOUTH = [61, 291, 13, 14]
MP_NOSE_TIP = 1
MP_LEFT_FACE = 234
MP_RIGHT_FACE = 454


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def calculate_ear(landmarks, indices, w, h):
    """Eye Aspect Ratio."""
    try:
        pts = [(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in indices]
        A = dist.euclidean(pts[1], pts[5])
        B = dist.euclidean(pts[2], pts[4])
        C = dist.euclidean(pts[0], pts[3])
        return (A + B) / (2.0 * C) if C != 0 else 0.0
    except Exception:
        return 0.0


def calculate_mar(landmarks, indices, w, h):
    """Mouth Aspect Ratio."""
    try:
        pts = [(int(landmarks[i].x * w), int(landmarks[i].y * h)) for i in indices]
        A = dist.euclidean(pts[2], pts[3])
        C = dist.euclidean(pts[0], pts[1])
        return A / C if C != 0 else 0.0
    except Exception:
        return 0.0


def calculate_head_pose(landmarks, w, h):
    """Normalised left-right nose offset (−0.5 … +0.5)."""
    try:
        nose = landmarks[MP_NOSE_TIP]
        left = landmarks[MP_LEFT_FACE]
        right = landmarks[MP_RIGHT_FACE]
        face_width = abs(right.x - left.x)
        face_center = (left.x + right.x) / 2.0
        return (nose.x - face_center) / face_width if face_width > 0 else 0.0
    except Exception:
        return 0.0


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------

class DriverMonitor:
    """
    Wraps the drowsiness / distraction detection pipeline.
    Publishes DMS events via MQTT.
    All configuration comes from the shared device_config.json.
    """

    def __init__(self, health_monitor=None):
        self.health_monitor = health_monitor
        self.running = False

        # Config from shared DeviceConfig
        self.device_key = _cfg.device_key
        self.bus_number = _cfg.bus_number

        # MQTT client
        self.mqtt_client = None
        self._setup_mqtt()

        # Load models
        self.lstm_model = None
        self.scaler = None
        self.yolo_model = None       # phone detection (OnnxYOLO or ultralytics)
        self.seatbelt_model = None   # seatbelt detection (OnnxYOLO or ultralytics)
        self._load_models()

        # MediaPipe
        self.face_mesh = None
        self.hands = None
        if MEDIAPIPE_AVAILABLE:
            self.face_mesh = mp.solutions.face_mesh.FaceMesh(
                refine_landmarks=True, max_num_faces=1,
                min_detection_confidence=0.6, min_tracking_confidence=0.5,
                static_image_mode=False,
            )
            self.hands = mp.solutions.hands.Hands(
                static_image_mode=False,
                min_detection_confidence=0.6, min_tracking_confidence=0.5,
                max_num_hands=2,
            )

        # State
        self._reset_counters()
        self.feature_buffer = deque(maxlen=SEQUENCE_LENGTH)
        self.yaw_history = []
        self.frame_count = 0
        self.phone_detected = False
        self.phone_timer = 0
        self.seatbelt_detected = True
        self.seatbelt_timer = 0
        self.seatbelt_missing_counter = 0
        self.seatbelt_present_counter = 0
        self.current_state = "Initializing"
        self.last_publish_time = 0
        self.last_event_type = None

    # ---- config / setup ------------------------------------------------

    def _setup_mqtt(self):
        if not MQTT_AVAILABLE:
            return
        broker = _cfg.mqtt_broker
        port = _cfg.mqtt_port
        client_id = f"{self.device_key}-DMS-{os.getpid()}"
        self.mqtt_client = mqtt.Client(client_id=client_id)
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
        # ----- LSTM drowsiness model (optional, heavy) -----
        lstm_path = MODELS_DIR / "dms_lstm_model.h5"
        scaler_path = MODELS_DIR / "dms_scaler.pkl"
        if ENABLE_LSTM and KERAS_AVAILABLE and JOBLIB_AVAILABLE:
            if lstm_path.exists() and scaler_path.exists():
                try:
                    self.lstm_model = keras_load_model(str(lstm_path))
                    self.scaler = joblib.load(str(scaler_path))
                    print("[DMS] LSTM model loaded")
                except Exception as e:
                    print(f"[DMS] LSTM model load error: {e}")

        # ----- Phone detection (ONNX preferred) -----
        if ENABLE_PHONE:
            onnx_path = MODELS_DIR / "yolov8n.onnx"
            pt_path = MODELS_DIR / "yolov8n.pt"
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

        # ----- Seatbelt detection (ONNX preferred) -----
        if ENABLE_SEATBELT:
            onnx_path = MODELS_DIR / "best.onnx"
            pt_path = MODELS_DIR / "best.pt"
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
        self.sleep_counter = 0
        self.drowsy_counter = 0
        self.yawn_counter = 0
        self.head_turn_counter = 0
        self.hands_off_counter = 0
        self.phone_use_counter = 0

    # ---- MQTT publishing -----------------------------------------------

    def _publish(self, topic_suffix, payload):
        if not self.mqtt_client or not self.device_key:
            return
        topic = f"{_cfg.mqtt_topic_base}/{self.device_key}/dms/{topic_suffix}"
        try:
            self.mqtt_client.publish(topic, json.dumps(payload), qos=1)
        except Exception as e:
            print(f"[DMS] Publish error: {e}")

    def _publish_state(self, state, details=None):
        """Publish current DMS state as telemetry."""
        now = time.time()
        if now - self.last_publish_time < SEND_INTERVAL:
            return
        self.last_publish_time = now

        payload = {
            "device_key": self.device_key,
            "bus_number": self.bus_number,
            "state": state,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "details": details or {},
        }
        self._publish("telemetry", payload)

    def _publish_event(self, event_type, severity, details=None):
        """Publish a DMS event (violation-grade alert)."""
        now = time.time()
        if event_type == self.last_event_type and now - self.last_publish_time < 5:
            return
        self.last_event_type = event_type

        payload = {
            "device_key": self.device_key,
            "bus_number": self.bus_number,
            "type": event_type,
            "severity": severity,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "details": details or {},
        }
        self._publish("event", payload)

        # Also publish as standard violation
        if self.mqtt_client and self.device_key:
            viol_topic = f"{_cfg.mqtt_topic_base}/{self.device_key}/violation"
            try:
                self.mqtt_client.publish(viol_topic, json.dumps({
                    "device_key": self.device_key,
                    "type": event_type,
                    "details": details or {},
                }), qos=1)
            except Exception:
                pass

    # ---- per-frame detection -------------------------------------------

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
                        self.phone_timer = PHONE_DETECTION_DECAY
                        break
            else:
                # ultralytics fallback
                results = self.yolo_model(frame, verbose=False, imgsz=YOLO_IMGSZ)
                for r in results:
                    for box in r.boxes:
                        if int(box.cls[0]) == PHONE_CLASS_ID and float(box.conf[0]) > YOLO_CONFIDENCE_THRESHOLD:
                            found = True
                            self.phone_detected = True
                            self.phone_timer = PHONE_DETECTION_DECAY
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
        # Non-inference frames: only age the grace timer, never touch counters
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
                    # "no_seatbelt" / "no-seatbelt" but NOT "seatbelt" alone
                    if ("no" in label and ("seatbelt" in label or "belt" in label)) or label in ("no", "noseatbelt"):
                        no_sb.append(float(conf))
                    elif "seatbelt" in label or "belt" in label:
                        sb.append(float(conf))
            else:
                # ultralytics fallback
                results = self.seatbelt_model(frame, verbose=False, imgsz=YOLO_IMGSZ)
                names = getattr(self.seatbelt_model, "names", {})
                for r in results:
                    for box in r.boxes:
                        cls = int(box.cls[0])
                        conf = float(box.conf[0])
                        label = (names.get(cls, str(cls)) if isinstance(names, dict) else str(cls)).lower()
                        if conf < SEATBELT_CONFIDENCE_THRESHOLD:
                            continue
                        if ("no" in label and ("seatbelt" in label or "belt" in label)) or label in ("no", "noseatbelt"):
                            no_sb.append(conf)
                        elif "seatbelt" in label or "belt" in label:
                            sb.append(conf)

            if no_sb:
                # Require SEATBELT_CONFIRM_FRAMES consecutive missing detections
                # before flipping state — mirrors the seatbelt-present confirm logic
                self.seatbelt_present_counter = 0
                self.seatbelt_missing_counter += 1
                if self.seatbelt_missing_counter >= SEATBELT_CONFIRM_FRAMES:
                    self.seatbelt_detected = False
            elif sb:
                self.seatbelt_missing_counter = 0
                self.seatbelt_present_counter += 1
                if self.seatbelt_present_counter >= SEATBELT_CONFIRM_FRAMES:
                    self.seatbelt_detected = True
                    self.seatbelt_timer = SEATBELT_MISSING_TIMER
            else:
                # No confident prediction either way — keep previous state;
                # let the grace timer age naturally
                if self.seatbelt_timer > 0:
                    self.seatbelt_timer -= SEATBELT_DETECTION_INTERVAL
                    if self.seatbelt_timer <= 0:
                        self.seatbelt_detected = False
                # Do NOT flip to False when timer is 0 and no detection —
                # keep last known state to avoid false startup alarms
        except Exception as e:
            print(f"[DMS] Seatbelt detection error: {e}")

    def _process_frame(self, frame):
        """Run the full DMS pipeline on a single frame and return state string."""
        h, w = frame.shape[:2]
        self.frame_count += 1
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # YOLO detections
        self._detect_phone(frame)
        self._detect_seatbelt(frame)

        # MediaPipe
        face_result = self.face_mesh.process(rgb) if self.face_mesh else None
        hands_result = self.hands.process(rgb) if self.hands else None

        num_hands = len(hands_result.multi_hand_landmarks) if hands_result and hands_result.multi_hand_landmarks else 0

        state = "No Face Detected"
        severity = "info"
        details = {}

        if face_result and face_result.multi_face_landmarks:
            landmarks = face_result.multi_face_landmarks[0].landmark

            ear = (calculate_ear(landmarks, MP_LEFT_EYE, w, h) +
                   calculate_ear(landmarks, MP_RIGHT_EYE, w, h)) / 2.0
            mar = calculate_mar(landmarks, MP_MOUTH, w, h)
            head_raw = calculate_head_pose(landmarks, w, h)

            self.yaw_history.append(head_raw)
            if len(self.yaw_history) > YAW_HISTORY_SIZE:
                self.yaw_history.pop(0)
            head_pose = float(np.mean(self.yaw_history))
            yaw = head_pose * 90.0

            details = {
                "ear": round(ear, 3),
                "mar": round(mar, 3),
                "head_pose": round(head_pose, 3),
                "yaw": round(yaw, 1),
                "hands": num_hands,
                "phone": self.phone_detected,
                "seatbelt": self.seatbelt_detected,
            }

            # ---- Priority-based hybrid logic (same order as original) ----

            # P1: Phone
            if self.phone_detected:
                self.phone_use_counter += 1
                self._zero_except("phone_use_counter")
                if self.phone_use_counter >= PHONE_USE_FRAMES_THRESHOLD:
                    state = "PHONE_USE"
                    severity = "critical"
                else:
                    state = "PHONE_WARNING"
                    severity = "warning"

            # P2: Sleep
            elif ear < EAR_SLEEP_THRESHOLD:
                self.sleep_counter += 1
                self._zero_except("sleep_counter")
                if self.sleep_counter >= SLEEP_FRAMES_THRESHOLD:
                    state = "SLEEPING"
                    severity = "danger"
                else:
                    state = "EYES_CLOSING"
                    severity = "warning"

            # P3: Yawning
            elif mar > MAR_YAWN_THRESHOLD:
                self.yawn_counter += 1
                self._zero_except("yawn_counter")
                if self.yawn_counter >= YAWN_FRAMES_THRESHOLD:
                    state = "YAWNING"
                    severity = "warning"
                else:
                    state = "MOUTH_OPEN"
                    severity = "info"

            # P4: Drowsy
            elif ear < EAR_DROWSY_THRESHOLD:
                self.drowsy_counter += 1
                self._zero_except("drowsy_counter")
                if self.drowsy_counter >= DROWSY_FRAMES_THRESHOLD:
                    state = "DROWSY"
                    severity = "warning"
                else:
                    state = "LOW_EYE_OPENING"
                    severity = "info"

            # P5: Head turned
            elif abs(head_pose) > HEAD_POSE_THRESHOLD:
                self.head_turn_counter += 1
                self._zero_except("head_turn_counter")
                if self.head_turn_counter >= HEAD_TURN_FRAMES_THRESHOLD:
                    state = "HEAD_TURNED"
                    severity = "critical"
                else:
                    state = "HEAD_MOVING"
                    severity = "info"

            # P6: Seatbelt
            elif not self.seatbelt_detected:
                self.seatbelt_missing_counter += 1
                self._reset_counters()
                if self.seatbelt_missing_counter >= SEATBELT_FRAMES_THRESHOLD:
                    state = "NO_SEATBELT"
                    severity = "critical"
                else:
                    state = "SEATBELT_WARNING"
                    severity = "warning"

            # P7: Hands off
            elif num_hands == 0:
                self.hands_off_counter += 1
                self._zero_except("hands_off_counter")
                if self.hands_off_counter >= HANDS_OFF_FRAMES_THRESHOLD:
                    state = "HANDS_OFF_WHEEL"
                    severity = "warning"
                else:
                    state = "NO_HANDS"
                    severity = "info"

            # P8: Alert (LSTM or rule-based)
            else:
                self._reset_counters()
                state = self._lstm_predict(ear, mar, yaw)
                severity = "warning" if state != "ALERT" else "info"

        else:
            # Even without a face, still count phone usage so the event fires
            if self.phone_detected:
                self.phone_use_counter += 1
                for attr in ("sleep_counter", "drowsy_counter", "yawn_counter",
                              "head_turn_counter", "hands_off_counter"):
                    setattr(self, attr, 0)
                if self.phone_use_counter >= PHONE_USE_FRAMES_THRESHOLD:
                    state = "PHONE_USE"
                    severity = "critical"
                else:
                    state = "PHONE_WARNING"
                    severity = "warning"
            else:
                self._reset_counters()

        self.current_state = state

        # Publish telemetry every interval
        self._publish_state(state, details)

        # Fire events for serious states
        if severity in ("critical", "danger"):
            self._publish_event(state, severity, details)

        return state, severity, details

    def _zero_except(self, keep):
        """Reset all frame counters except *keep*."""
        for attr in ("sleep_counter", "drowsy_counter", "yawn_counter",
                      "head_turn_counter", "hands_off_counter", "phone_use_counter"):
            if attr != keep:
                setattr(self, attr, 0)

    def _lstm_predict(self, ear, mar, yaw):
        """Run LSTM model if available, else return ALERT."""
        if self.lstm_model is None or self.scaler is None:
            return "ALERT"

        phone_feat = 1 if self.phone_detected else 0
        self.feature_buffer.append([ear, mar, phone_feat, yaw])
        if len(self.feature_buffer) < SEQUENCE_LENGTH:
            return "BUFFERING"

        try:
            seq = np.array(list(self.feature_buffer)).reshape(1, SEQUENCE_LENGTH, 4)
            seq_2d = seq.reshape(SEQUENCE_LENGTH, 4)
            scaled = self.scaler.transform(seq_2d).reshape(1, SEQUENCE_LENGTH, 4)
            pred = self.lstm_model.predict(scaled, verbose=0)
            label = TARGET_NAMES[np.argmax(pred[0])]
            return label.upper().replace(" ", "_")
        except Exception as e:
            print(f"[DMS] LSTM prediction error: {e}")
            return "ALERT"

    # ---- main loop -----------------------------------------------------

    def run(self):
        """Open camera and run detection loop."""
        if not MEDIAPIPE_AVAILABLE or not SCIPY_AVAILABLE:
            print("[DMS] ERROR: mediapipe and scipy are required.")
            return

        cap = cv2.VideoCapture(CAMERA_INDEX)
        if not cap.isOpened():
            print("[DMS] ERROR: Could not open camera.")
            self._publish_component_status("error", "Camera not available")
            return

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)

        self.running = True
        self._publish_component_status("running", "DMS active")
        print(f"[DMS] Driver Monitoring System started  (bus={self.bus_number}  show_gui={SHOW_GUI})")

        try:
            while self.running and cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    time.sleep(0.1)
                    continue

                frame = cv2.flip(frame, 1)
                frame = cv2.resize(frame, (FRAME_WIDTH, FRAME_HEIGHT))

                state, severity, details = self._process_frame(frame)

                # Camera preview window
                if SHOW_GUI:
                    color_map = {
                        "info": (0, 255, 0),
                        "warning": (0, 255, 255),
                        "critical": (0, 0, 255),
                        "danger": (0, 0, 255),
                    }
                    color = color_map.get(severity, (255, 255, 255))
                    cv2.putText(frame, state, (10, 30),
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
            "status": status,
            "details": {"message": message},
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
    # Try to use the shared health monitor for MQTT connection
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
