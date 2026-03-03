import pandas as pd
import joblib
import os

try:
    # Construct the path to the CSV file relative to this script's location
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, "..", "..", "..", "SyntheticdataCreating", "final_dataset.csv")
    
    print(f"Attempting to load CSV from: {csv_path}")

    # Check if the file exists before trying to read it
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"The file was not found at the specified path: {csv_path}")

    df = pd.read_csv(csv_path, parse_dates=["Stamp", "Trip_Start_Time"])

    # --- Recreate feature engineering steps from the notebook ---
    df["Boarding"] = pd.to_numeric(df["Boarding"], errors="coerce").fillna(0)
    df["Alighting"] = pd.to_numeric(df["Alighting"], errors="coerce").fillna(0)
    df["Distance_km"] = pd.to_numeric(df["Distance_km"], errors="coerce").fillna(0)

    df["month"] = df["Stamp"].dt.month
    df["day"] = df["Stamp"].dt.day
    df["hour"] = df["Stamp"].dt.hour
    df["minute"] = df["Stamp"].dt.minute
    df["time_of_day"] = df["hour"] + df["minute"] / 60

    df = df.sort_values(["Trip_ID", "Stamp"])
    df["net"] = df["Boarding"] - df["Alighting"]
    df["passenger_load"] = df.groupby("Trip_ID")["net"].cumsum()
    df["passenger_load"] = df["passenger_load"].clip(lower=0)
    df['prev_load'] = df.groupby('Trip_ID')['passenger_load'].shift(1).fillna(0)

    cat_cols = ["holiday_type", "day_type", "trip_direction", "Origin", "Route"]
    df = pd.get_dummies(df, columns=cat_cols, drop_first=False)

    target_cols = ["Boarding", "Alighting", "net"]
    drop_cols = ["Stamp", "Trip_Start_Time", "Destination", "Trip_ID", "passenger_load", "record_type"] + target_cols
    feature_cols = [c for c in df.columns if c not in drop_cols]

    # Save the feature columns to the file
    save_path = os.path.join(base_dir, "passenger_flow_features.save")
    joblib.dump(feature_cols, save_path)

    print(f"Successfully created 'passenger_flow_features.save' with {len(feature_cols)} features.")
    print(f"File saved at: {save_path}")

except Exception as e:
    print(f"An error occurred: {e}")
