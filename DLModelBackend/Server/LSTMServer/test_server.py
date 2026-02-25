import requests
import json

# The base URL for your running Flask server
BASE_URL = 'http://127.0.0.1:5001'

def test_arrival_time_prediction():
    """Tests the /predict_arrival_time endpoint."""
    print("--- Testing Arrival Time Prediction ---")
    
    url = f"{BASE_URL}/predict_arrival_time"
    
    # Sample data for arrival time prediction
    data = {
        "origin": "Kothalawala",
        "destination": "Pittugala",
        "distance": 1.8,
        "hour": 15,
        "minute": 35
    }
    
    try:
        response = requests.post(url, json=data)
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("Response JSON:", json.dumps(result, indent=2))
            predicted_seconds = result.get('predicted_arrival_time_seconds')
            if predicted_seconds is not None:
                print(f"Predicted Arrival Time: {predicted_seconds / 60:.2f} minutes")
        else:
            print("Error Response:", response.text)
            
    except requests.exceptions.ConnectionError as e:
        print(f"Connection Error: Could not connect to the server at {url}.")
        print("Please ensure the Flask server is running.")
    
    print("-" * 40 + "\n")


def test_passenger_flow_prediction():
    """Tests the /predict_passenger_flow endpoint."""
    print("--- Testing Passenger Flow Prediction ---")
    
    url = f"{BASE_URL}/predict_passenger_flow"
    
    # Sample sequence of 3 events for passenger flow prediction.
    # This data needs to match the structure expected by your model's preprocessing steps.

#     4,2024-08-12 18:28:00,weekday,none,0,177 - Kaduwela - Kollupitiya,2024-08-12 18:33:00,Kothalawala,Pittugala,1.8,9,0
# 4,2024-08-12 18:28:00,weekday,none,0,177 - Kaduwela - Kollupitiya,2024-08-12 18:40:40,Pittugala,Malabe,2.3,0,1
# 4,2024-08-12 18:28:00,weekday,none,0,177 - Kaduwela - Kollupitiya,2024-08-12 18:51:00,Malabe,Koswatta,3.1,1,12
    data = {
        "sequence": [
            {
                "month": 8, "day": 12, "Distance_km": 1.8, "hour": 18, "minute": 33, "prev_load": 9,
                "holiday_type": "none", "day_type": "weekday", "trip_direction": "0", 
                "Origin": "Kothalawala", "Route": "177 - Kaduwela - Kollupitiya"
            },
            {
                "month": 8, "day": 12, "Distance_km": 2.3, "hour": 18, "minute": 40, "prev_load": 0,
                "holiday_type": "none", "day_type": "weekday", "trip_direction": "1", 
                "Origin": "Pittugala", "Route": "177 - Kaduwela - Kollupitiya"
            },
            {
                "month": 8, "day": 12, "Distance_km": 3.1, "hour": 18, "minute": 51, "prev_load": 1,
                "holiday_type": "none", "day_type": "weekday", "trip_direction": "12", 
                "Origin": "Malabe", "Route": "177 - Kaduwela - Kollupitiya"
            }
        ]
    }
    
    try:
        response = requests.post(url, json=data)
        
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("Response JSON:", json.dumps(result, indent=2))
        else:
            print("Error Response:", response.text)

    except requests.exceptions.ConnectionError as e:
        print(f"Connection Error: Could not connect to the server at {url}.")
        print("Please ensure the Flask server is running.")

    print("-" * 40 + "\n")


if __name__ == '__main__':
    test_arrival_time_prediction()
    test_passenger_flow_prediction()

