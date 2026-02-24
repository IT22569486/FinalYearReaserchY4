import math
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Literal

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
ARRIVAL_DIR = BASE_DIR.parent.parent / "ModelOptions" / "ArrivalTime" / "LightBGM"
PASSENGER_DIR = BASE_DIR.parent.parent / "ModelOptions" / "PassengerCount" / "LightGBM"

SEQ_LEN_ARRIVAL = 8
SEQ_LEN_PASSENGER = 3
ARRIVAL_NUM_FEATURES = [
    "Distance_km",
    "passenger_load",
    "dwell_time",
    "hour_sin",
    "hour_cos",
    "minute_sin",
    "minute_cos",
    "day_of_week",
    "is_peak_hour",
]
ARRIVAL_CAT_FEATURES = ["Origin", "Destination", "day_type", "holiday_type", "trip_direction"]
ARRIVAL_ALL_FEATURES = ARRIVAL_NUM_FEATURES + ARRIVAL_CAT_FEATURES
PASSENGER_FEATURE_COLS = [
    "Boarding",
    "Alighting",
    "Distance_km",
    "hour",
    "day_of_week",
    "is_weekend",
    "Origin",
    "Route",
    "trip_direction",
    "day_type",
    "holiday_type",
    "passenger_load",
]
PASSENGER_TARGETS = ["Boarding", "Alighting", "passenger_load"]
PASSENGER_CAT_COLS = ["Origin", "Route", "trip_direction", "day_type", "holiday_type"]


def _load_required(path: Path, description: str):
    if not path.exists():
        raise RuntimeError(f"Missing {description}: {path}")
    return joblib.load(path)


try:
    arrival_model = _load_required(ARRIVAL_DIR / "lgbm_arrival_model.save", "arrival model")
    arrival_scaler = _load_required(ARRIVAL_DIR / "lgbm_arrival_x_scaler.save", "arrival scaler")
    arrival_encoders = _load_required(ARRIVAL_DIR / "lgbm_arrival_encoders.save", "arrival encoders")

    passenger_xgb_models = {
        target: _load_required(PASSENGER_DIR / f"xgb_{target}.save", f"xgb model for {target}")
        for target in PASSENGER_TARGETS
    }
    passenger_lgb_models = {
        target: _load_required(PASSENGER_DIR / f"lgb_{target}.save", f"lgb model for {target}")
        for target in PASSENGER_TARGETS
    }
    passenger_encoders = {
        col: _load_required(PASSENGER_DIR / f"le_{col}.save", f"encoder for {col}")
        for col in PASSENGER_CAT_COLS
    }
except Exception as exc:  # pragma: no cover - fail fast on startup
    raise RuntimeError(f"Failed to load model artifacts: {exc}") from exc


class ArrivalStep(BaseModel):
    Distance_km: float
    passenger_load: float = 0
    dwell_time: float = 0
    hour: Optional[int] = None
    minute: Optional[int] = None
    day_of_week: Optional[int] = None
    is_peak_hour: Optional[int] = None
    Origin: str
    Destination: str
    day_type: str = "weekday"
    holiday_type: str = "none"
    trip_direction: int = 0
    timestamp: Optional[str] = Field(
        None,
        description="Optional ISO timestamp; if provided, hour/minute/day_of_week/is_peak_hour will be derived",
    )


class ArrivalRequest(BaseModel):
    sequence: List[ArrivalStep] = Field(..., description=f"At least {SEQ_LEN_ARRIVAL} recent steps (oldest->newest)")


class PassengerStep(BaseModel):
    Boarding: float
    Alighting: float
    Distance_km: float
    hour: int
    day_of_week: int
    is_weekend: int
    Origin: str
    Route: str
    trip_direction: int
    day_type: str
    holiday_type: str
    passenger_load: float


class PassengerRequest(BaseModel):
    sequence: List[PassengerStep] = Field(..., description=f"At least {SEQ_LEN_PASSENGER} steps (oldest->newest)")
    model: Literal["xgb", "lgb", "both"] = "both"


app = FastAPI(title="LightGBM Inference Server", version="1.0.0")


@app.get("/")
def health():
    return {"ok": True}


def _encode_label(encoder, value: str, field: str):
    try:
        return int(encoder.transform([value])[0])
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Unknown value for {field}: {value}") from exc


def _prepare_arrival_features(sequence: List[ArrivalStep]) -> np.ndarray:
    if len(sequence) < SEQ_LEN_ARRIVAL:
        raise HTTPException(status_code=400, detail=f"Need at least {SEQ_LEN_ARRIVAL} steps")

    seq = sequence[-SEQ_LEN_ARRIVAL:]
    cat_enc = arrival_encoders
    num_matrix = []
    cat_matrix = []
    peak_hours = {7, 8, 9, 16, 17, 18}

    for step in seq:
        if step.timestamp:
            dt = datetime.fromisoformat(step.timestamp.replace("Z", "+00:00"))
            hour = dt.hour
            minute = dt.minute
            day_of_week = dt.weekday()
        else:
            hour = step.hour if step.hour is not None else datetime.utcnow().hour
            minute = step.minute if step.minute is not None else datetime.utcnow().minute
            day_of_week = step.day_of_week if step.day_of_week is not None else datetime.utcnow().weekday()

        is_peak = step.is_peak_hour if step.is_peak_hour is not None else int(hour in peak_hours)

        hour_sin = math.sin(2 * math.pi * hour / 23.0)
        hour_cos = math.cos(2 * math.pi * hour / 23.0)
        minute_sin = math.sin(2 * math.pi * minute / 59.0)
        minute_cos = math.cos(2 * math.pi * minute / 59.0)

        num_row = [
            step.Distance_km,
            step.passenger_load,
            step.dwell_time,
            hour_sin,
            hour_cos,
            minute_sin,
            minute_cos,
            day_of_week,
            is_peak,
        ]
        num_matrix.append(num_row)

        cat_row = [
            _encode_label(cat_enc["Origin"], step.Origin, "Origin"),
            _encode_label(cat_enc["Destination"], step.Destination, "Destination"),
            _encode_label(cat_enc["day_type"], step.day_type, "day_type"),
            _encode_label(cat_enc["holiday_type"], step.holiday_type, "holiday_type"),
            _encode_label(cat_enc["trip_direction"], str(step.trip_direction), "trip_direction"),
        ]
        cat_matrix.append(cat_row)

    num_array = arrival_scaler.transform(np.array(num_matrix))
    full = np.hstack([num_array, np.array(cat_matrix)])
    return full.flatten().reshape(1, -1)


def _prepare_passenger_features(sequence: List[PassengerStep]) -> np.ndarray:
    if len(sequence) < SEQ_LEN_PASSENGER:
        raise HTTPException(status_code=400, detail=f"Need at least {SEQ_LEN_PASSENGER} steps")

    seq = sequence[-SEQ_LEN_PASSENGER:]
    rows = []
    for step in seq:
        row = [
            step.Boarding,
            step.Alighting,
            step.Distance_km,
            step.hour,
            step.day_of_week,
            step.is_weekend,
            _encode_label(passenger_encoders["Origin"], step.Origin, "Origin"),
            _encode_label(passenger_encoders["Route"], step.Route, "Route"),
            _encode_label(passenger_encoders["trip_direction"], str(step.trip_direction), "trip_direction"),
            _encode_label(passenger_encoders["day_type"], step.day_type, "day_type"),
            _encode_label(passenger_encoders["holiday_type"], step.holiday_type, "holiday_type"),
            step.passenger_load,
        ]
        rows.append(row)

    return np.array(rows).flatten().reshape(1, -1)


@app.post("/predict/arrival-time")
def predict_arrival(payload: ArrivalRequest):
    features = _prepare_arrival_features(payload.sequence)
    prediction = float(arrival_model.predict(features)[0])
    return {"predicted_travel_time_seconds": prediction}


@app.post("/predict/passenger-flow")
def predict_passenger(payload: PassengerRequest):
    features = _prepare_passenger_features(payload.sequence)
    results = {}

    # if payload.model in ("xgb", "both"):
    #     results["xgb"] = {
    #         target: float(passenger_xgb_models[target].predict(features)[0])
    #         for target in PASSENGER_TARGETS
    #     }

    if payload.model in ("lgb", "both"):
        results["lgb"] = {
            target: float(passenger_lgb_models[target].predict(features, num_iteration=passenger_lgb_models[target].best_iteration)[0])
            for target in PASSENGER_TARGETS
        }

    return results


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="172.20.10.4", port=int(5003))
