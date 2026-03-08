"""
Pydantic models for the Bus Tracking Backend Service
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class Bus(BaseModel):
    bus_id: str
    route_id: Optional[str] = None
    route_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    speed: Optional[float] = 0.0
    passenger_count: Optional[int] = 0
    status: Optional[str] = "active"
    last_updated: Optional[str] = None


class BusTelemetry(BaseModel):
    bus_id: str
    latitude: float
    longitude: float
    speed: Optional[float] = 0.0
    route_id: Optional[str] = None
    passenger_count: Optional[int] = 0
    total_weight: Optional[float] = 0.0
    gps_valid: Optional[bool] = True
    timestamp: Optional[str] = None


class BusLocation(BaseModel):
    bus_id: str
    latitude: float
    longitude: float
    speed: Optional[float] = 0.0
    route_id: Optional[str] = None
    route_name: Optional[str] = None
    timestamp: Optional[str] = None


class PassengerEvent(BaseModel):
    bus_id: str
    in_count: Optional[int] = 0
    out_count: Optional[int] = 0
    total_passenger_count: Optional[int] = 0
    total_weight: Optional[float] = 0.0
    route_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: Optional[str] = None


class SafeSpeedPrediction(BaseModel):
    bus_id: str
    safe_speed: float
    location_name: Optional[str] = None
    timestamp: Optional[str] = None
