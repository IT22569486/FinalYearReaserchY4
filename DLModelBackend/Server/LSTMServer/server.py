import os
os.environ['PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION'] = 'python'
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import pandas as pd
import tensorflow as tf
import joblib

app = Flask(__name__)
CORS(app)

# Get the directory of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))

# --- Configuration ---
SEQ_LEN_PASSENGER = 3
SEQ_LEN_ARRIVAL = 4

# --- Load Models and Artifacts ---
try:
    # Passenger Flow Model
    passenger_model_path = os.path.join(script_dir, "best_passenger_flow_lstm.keras")
    passenger_model = tf.keras.models.load_model(passenger_model_path, safe_mode=False)
    
    numeric_scaler_path = os.path.join(script_dir, "numeric_scaler.save")
    numeric_scaler = joblib.load(numeric_scaler_path)
    
    feature_cols_path = os.path.join(script_dir, "passenger_flow_features.save")
    passenger_feature_cols = joblib.load(feature_cols_path)
    
    print("Passenger flow model and artifacts loaded successfully.")
    
except Exception as e:
    print(f"Error loading passenger flow model components: {e}")
    import traceback
    traceback.print_exc()
    passenger_model = None

try:
    # Arrival Time Model
    arrival_model_path = os.path.join(script_dir, "best_arrival_time_lstm.keras")
    arrival_model = tf.keras.models.load_model(arrival_model_path, safe_mode=False)
    
    stop_encoder_path = os.path.join(script_dir, "arrival_time_stop_encoder.save")
    stop_encoder = joblib.load(stop_encoder_path)
    
    x_scaler_path = os.path.join(script_dir, "arrival_time_x_scaler.save")
    x_scaler = joblib.load(x_scaler_path)
    
    y_scaler_path = os.path.join(script_dir, "arrival_time_y_scaler.save")
    y_scaler = joblib.load(y_scaler_path)
    
    print("Arrival time model and artifacts loaded successfully.")

except Exception as e:
    print(f"Error loading arrival time model components: {e}")
    import traceback
    traceback.print_exc()
    arrival_model = None

# --- Helper Functions ---
def prepare_passenger_input(sequence_data):
    """Prepares the input tensor for the passenger flow model from a sequence of events."""
    # Create a DataFrame from the sequence
    df = pd.DataFrame(sequence_data)
    
    # --- Recreate features like in the notebook ---
    df["time_of_day"] = df["hour"] + df["minute"] / 60
    
    # One-hot encode categorical features first
    cat_cols = ["holiday_type", "day_type", "trip_direction", "Origin", "Route"]
    df_dummies = pd.get_dummies(df, columns=cat_cols)

    # Align columns with the training feature set
    df_aligned = df_dummies.reindex(columns=passenger_feature_cols, fill_value=0)

    # Scale numeric features after alignment
    numeric_cols_to_scale = ["month", "day", "Distance_km", "hour", "minute", "time_of_day", "prev_load"]
    df_aligned[numeric_cols_to_scale] = numeric_scaler.transform(df_aligned[numeric_cols_to_scale])
    
    # Ensure all feature columns are present
    X = df_aligned[passenger_feature_cols].values.astype("float32")
    
    # Reshape for LSTM
    return X.reshape(1, SEQ_LEN_PASSENGER, -1)

# --- API Endpoints ---
@app.route('/predict_passenger_flow', methods=['POST'])
def predict_passenger_flow():
    if passenger_model is None:
        return jsonify({'error': 'Passenger flow model is not loaded'}), 500

    data = request.get_json()
    if not data or 'sequence' not in data or len(data['sequence']) != SEQ_LEN_PASSENGER:
        return jsonify({'error': f'Invalid input. Provide a "sequence" of {SEQ_LEN_PASSENGER} events.'}), 400

    try:
        # Prepare the input tensor
        input_tensor = prepare_passenger_input(data['sequence'])
        
        # Make prediction
        pred = passenger_model.predict(input_tensor)
        
        # Return result
        result = {
            'boarding': round(float(pred[0][0]), 2),
            'alighting': round(float(pred[0][1]), 2),
            'net_change': round(float(pred[0][2]), 2)
        }
        return jsonify(result)

    except Exception as e:
        return jsonify({'error': f'An error occurred during prediction: {e}'}), 500


@app.route('/predict_arrival_time', methods=['POST'])
def predict_arrival():
    if arrival_model is None:
        return jsonify({'error': 'Arrival time model is not loaded'}), 500

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid input'}), 400

    try:
        origin = data['origin']
        destination = data['destination']
        distance = data['distance']
        hour = data['hour']
        minute = data['minute']
        
        origin_id = stop_encoder.transform([origin])[0]
        dest_id = stop_encoder.transform([destination])[0]

        num = x_scaler.transform([[distance, hour, minute]])

        num_seq = np.repeat(num[np.newaxis, :, :], SEQ_LEN_ARRIVAL, axis=1)
        origin_seq = np.full((1, SEQ_LEN_ARRIVAL), origin_id)
        dest_seq = np.full((1, SEQ_LEN_ARRIVAL), dest_id)

        pred = arrival_model.predict([num_seq, origin_seq, dest_seq])
        pred = y_scaler.inverse_transform(pred)
        pred = np.expm1(pred)

        predicted_time_sec = float(pred[0][0])

        return jsonify({'predicted_arrival_time_seconds': predicted_time_sec})

    except KeyError as e:
        return jsonify({'error': f'Missing key in input: {e}'}), 400
    except Exception as e:
        return jsonify({'error': f'An error occurred: {e}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
