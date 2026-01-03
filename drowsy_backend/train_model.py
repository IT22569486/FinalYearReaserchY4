# 1. INSTALL REQUIRED LIBRARIES (run separately if needed)
# pip install tensorflow numpy pandas scikit-learn kagglehub opencv-python joblib scipy

# 2. IMPORTS
import kagglehub
import os, glob
import numpy as np
from scipy.spatial import distance as dist
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, accuracy_score
import joblib
import cv2

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.callbacks import EarlyStopping

# 3. DOWNLOAD DATASET (IBUG 300W)
DATA_ROOT = kagglehub.dataset_download(
    "toxicloser/ibug-300w-large-face-landmark-dataset"
)
print("Dataset downloaded at:", DATA_ROOT)

# 4. FEATURE FUNCTIONS
L_EYE_START, L_EYE_END = 36, 42
R_EYE_START, R_EYE_END = 42, 48
MOUTH_START, MOUTH_END = 60, 68

def eye_aspect_ratio(eye):
    A = dist.euclidean(eye[1], eye[5])
    B = dist.euclidean(eye[2], eye[4])
    C = dist.euclidean(eye[0], eye[3])
    return (A + B) / (2.0 * C)

def mouth_aspect_ratio(mouth):
    A = dist.euclidean(mouth[2], mouth[6])
    C = dist.euclidean(mouth[0], mouth[4])
    return A / C if C != 0 else 0

# 5. HEAD POSE (PnP)
model_points = np.array([
    (0.0, 0.0, 0.0),
    (-225.0, 170.0, -135.0),
    (225.0, 170.0, -135.0),
    (-150.0, -150.0, -125.0),
    (150.0, -150.0, -125.0),
    (0.0, 330.0, -65.0)
], dtype=np.float32)

pnp_indices = [33, 36, 45, 48, 54, 8]

def calculate_head_pose(landmarks, w=640, h=480):
    image_points = np.array([landmarks[i] for i in pnp_indices], dtype=np.float32)
    focal_length = w
    center = (w/2, h/2)

    camera_matrix = np.array([
        [focal_length, 0, center[0]],
        [0, focal_length, center[1]],
        [0, 0, 1]
    ], dtype="double")

    _, rvec, tvec = cv2.solvePnP(
        model_points, image_points, camera_matrix, np.zeros((4,1))
    )
    rmat, _ = cv2.Rodrigues(rvec)
    proj = np.hstack((rmat, tvec))
    _, _, _, _, _, _, angles = cv2.decomposeProjectionMatrix(proj)
    pitch, yaw, _ = angles.flatten()
    return pitch, yaw

# 6. LOAD .PTS FILE
def load_pts_file(filepath):
    with open(filepath) as f:
        lines = f.readlines()

    points = []
    start = False
    for line in lines:
        if line.strip() == "{":
            start = True
            continue
        if line.strip() == "}":
            break
        if start:
            x, y = map(float, line.split())
            points.append([x, y])

    pts = np.array(points)
    pts -= pts.min(axis=0)
    pts = pts / pts.max() * 640
    return pts

# 7. FEATURE EXTRACTION + LABELING
X, y = [], []

pts_files = glob.glob(os.path.join(DATA_ROOT, "**/*.pts"), recursive=True)

for file in pts_files:
    lm = load_pts_file(file)
    if lm.shape[0] < 68:
        continue

    ear = (eye_aspect_ratio(lm[L_EYE_START:L_EYE_END]) +
           eye_aspect_ratio(lm[R_EYE_START:R_EYE_END])) / 2

    mar = mouth_aspect_ratio(lm[MOUTH_START:MOUTH_END])
    pitch, yaw = calculate_head_pose(lm)

    if abs(yaw) > 25:
        label = 3   # Head Turn
    elif mar > 0.6:
        label = 2   # Yawning
    elif ear < 0.18:
        label = 1   # Drowsy
    else:
        label = 0   # Alert

    X.append([ear, mar, pitch, yaw])
    y.append(label)

X = np.array(X)
y = np.array(y)

print("Total frames:", len(X))

# 8. CREATE SEQUENCES
SEQUENCE_LENGTH = 10
NUM_FEATURES = 4
NUM_CLASSES = 4

def create_sequences(X, y, seq_len):
    Xs, ys = [], []
    for i in range(len(X) - seq_len):
        Xs.append(X[i:i+seq_len])
        ys.append(y[i+seq_len])
    return np.array(Xs), np.array(ys)

X_seq, y_seq = create_sequences(X, y, SEQUENCE_LENGTH)
print("Sequence shape:", X_seq.shape)

# 9. TRAIN-TEST SPLIT + SCALING
X_train, X_test, y_train, y_test = train_test_split(
    X_seq, y_seq, test_size=0.2, shuffle=False
)

scaler = StandardScaler()
X_train = scaler.fit_transform(
    X_train.reshape(-1, NUM_FEATURES)
).reshape(X_train.shape)

X_test = scaler.transform(
    X_test.reshape(-1, NUM_FEATURES)
).reshape(X_test.shape)

y_train_cat = to_categorical(y_train, NUM_CLASSES)
y_test_cat = to_categorical(y_test, NUM_CLASSES)

# 10. LSTM MODEL
model = Sequential([
    LSTM(64, return_sequences=True, input_shape=(SEQUENCE_LENGTH, NUM_FEATURES)),
    Dropout(0.3),
    LSTM(32),
    Dropout(0.3),
    Dense(32, activation='relu'),
    Dense(NUM_CLASSES, activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

model.summary()

# 11. TRAIN MODEL
early_stop = EarlyStopping(
    patience=5,
    restore_best_weights=True
)

model.fit(
    X_train, y_train_cat,
    validation_split=0.2,
    epochs=30,
    batch_size=32,
    callbacks=[early_stop],
    verbose=1
)

# 12. EVALUATION (FINAL ACCURACY)
loss, accuracy = model.evaluate(X_test, y_test_cat, verbose=0)

print("\n====================================")
print(f" FINAL TEST ACCURACY: {accuracy*100:.2f}%")
print("====================================")

y_pred = np.argmax(model.predict(X_test), axis=1)
print(classification_report(y_test, y_pred))

# 13. SAVE MODEL + SCALER (using .h5 format for TensorFlow 2.13 compatibility)
model.save("dms_lstm_model.h5")
joblib.dump(scaler, "dms_scaler.pkl")

print("\nModel saved as: dms_lstm_model.h5")
print("Scaler saved as: dms_scaler.pkl")
