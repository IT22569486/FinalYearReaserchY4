import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8001"

def test_arrival_time():
    # Build 8-step sequence (oldest -> newest)
    now = datetime.utcnow()
    seq = []
    for i in range(8):
        ts = (now).isoformat() + "Z"
        seq.append({
            "Distance_km": 1.2,
            "passenger_load": 10 + i,
            "dwell_time": 15,
            "Origin": "Athukotte",
            "Destination": "rajagiriya",
            "day_type": "weekday",
            "holiday_type": "none",
            "trip_direction": 0,
            "timestamp": ts  # server derives hour/minute/day_of_week/is_peak_hour
        })
    payload = {"sequence": seq}
    resp = requests.post(f"{BASE_URL}/predict/arrival-time", json=payload, timeout=10)
    print("Arrival status:", resp.status_code)
    print("Arrival body:", resp.text)

def test_passenger_flow():
    # Build 3-step sequence (oldest -> newest)
    seq = [
        {
            "Boarding": 5, "Alighting": 1, "Distance_km": 1.5,
            "hour": 8, "day_of_week": 1, "is_weekend": 0,
            "Origin": "Athukotte", "Route": "177 - Kaduwela - Kollupitiya",
            "trip_direction": 0, "day_type": "weekday", "holiday_type": "none",
            "passenger_load": 20
        },
        {
            "Boarding": 3, "Alighting": 2, "Distance_km": 1.1,
            "hour": 8, "day_of_week": 1, "is_weekend": 0,
            "Origin": "rajagiriya", "Route": "177 - Kaduwela - Kollupitiya",
            "trip_direction": 0, "day_type": "weekday", "holiday_type": "none",
            "passenger_load": 21
        },
        {
            "Boarding": 4, "Alighting": 1, "Distance_km": 0.9,
            "hour": 8, "day_of_week": 1, "is_weekend": 0,
            "Origin": "Borella", "Route": "177 - Kaduwela - Kollupitiya",
            "trip_direction": 0, "day_type": "weekday", "holiday_type": "none",
            "passenger_load": 24
        }
    ]
    payload = {"sequence": seq, "model": "both"}
    resp = requests.post(f"{BASE_URL}/predict/passenger-flow", json=payload, timeout=10)
    print("Passenger status:", resp.status_code)
    print("Passenger body:", resp.text)

if __name__ == "__main__":
    test_arrival_time()
    test_passenger_flow()