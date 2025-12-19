#!/usr/bin/env python3
"""
Driver Behavior Analyzer Module
For Sri Lanka CTB Bus Driver Monitoring System

Analyzes driver behavior based on:
- Objects in driving lane (vehicles ahead)
- Vehicle speed (user input)
- Traffic density
- Safe following distance

Detects violations:
- SLOW_DRIVING: Slow speed without traffic
- UNSAFE_DISTANCE: Too close at high speed
"""
import numpy as np
import cv2
from collections import deque
from typing import Dict, List, Optional, Tuple
from enum import Enum
import time

class TrafficLevel(Enum):
    """Traffic density classification."""
    NONE = "NO_TRAFFIC"
    LOW = "LOW_TRAFFIC"
    MEDIUM = "MEDIUM_TRAFFIC"
    HIGH = "HIGH_TRAFFIC"


class ViolationType(Enum):
    """Driver violation types."""
    NONE = "NONE"
    SLOW_DRIVING = "SLOW_DRIVING"
    UNSAFE_DISTANCE = "UNSAFE_DISTANCE"
    LANE_DEPARTURE = "LANE_DEPARTURE"


class DriverBehaviorAnalyzer:
    """
    Analyzes driver behavior for Sri Lanka CTB bus monitoring.
    
    Detects:
    - Objects in our driving lane (green segmented area)
    - Traffic level based on in-lane object count
    - Violations based on speed + traffic + distance
    """
    
    # Speed thresholds (km/h)
    SLOW_SPEED_THRESHOLD = 20  # Below this is considered slow
    MEDIUM_SPEED_THRESHOLD = 40  
    HIGH_SPEED_THRESHOLD = 60  # Above this needs more distance
    
    # Distance thresholds based on depth brightness (higher = closer)
    # These correspond to proximity analyzer values
    SAFE_DISTANCE_HIGH_SPEED = 50  # brightness < 50 = safe at high speed
    SAFE_DISTANCE_MEDIUM_SPEED = 70  # brightness < 70 = safe at medium speed
    SAFE_DISTANCE_LOW_SPEED = 100  # brightness < 100 = safe at low speed
    
    # Time thresholds (seconds)
    SLOW_DRIVING_TIMEOUT = 10  # Alert after 10 seconds of slow driving without traffic
    
    def __init__(self):
        """Initialize driver behavior analyzer."""
        self.current_speed = 0  # km/h from user input
        self.in_lane_objects: List[dict] = []  # Objects in our lane
        self.closest_object_brightness = 0  # Brightness of closest object
        
        # Traffic tracking
        self.traffic_history: deque = deque(maxlen=30)  # 30 frames history
        self.current_traffic = TrafficLevel.NONE
        
        # Violation tracking
        self.current_violation = ViolationType.NONE
        self.slow_driving_start_time: Optional[float] = None
        self.violation_message = ""
        
        print("✅ Driver Behavior Analyzer initialized")
        print(f"   Speed thresholds: Slow<{self.SLOW_SPEED_THRESHOLD}, Medium<{self.MEDIUM_SPEED_THRESHOLD}, High>{self.HIGH_SPEED_THRESHOLD} km/h")
    
    def set_speed(self, speed_kmh: float) -> None:
        """
        Set current vehicle speed.
        
        Args:
            speed_kmh: Speed in km/h
        """
        self.current_speed = max(0, speed_kmh)
    
    def count_objects_in_lane(self, detected_objects: List[dict], 
                               lane_polygon: Optional[np.ndarray]) -> int:
        """
        Count objects that are within our driving lane (green segment).
        
        Args:
            detected_objects: List of detected objects with 'bbox', 'class', 'brightness'
            lane_polygon: Points defining the green segmented lane area
            
        Returns:
            Number of objects in our lane
        """
        if lane_polygon is None or len(detected_objects) == 0:
            self.in_lane_objects = []
            return 0
        
        in_lane = []
        
        for obj in detected_objects:
            bbox = obj.get('bbox', [0, 0, 0, 0])
            
            # Get bottom center of bounding box (where vehicle touches road)
            x_center = (bbox[0] + bbox[2]) / 2
            y_bottom = bbox[3]
            
            # Check if this point is inside the lane polygon
            point = (int(x_center), int(y_bottom))
            
            # Use cv2.pointPolygonTest to check if point is inside polygon
            result = cv2.pointPolygonTest(lane_polygon, point, False)
            
            if result >= 0:  # Inside or on the polygon
                in_lane.append(obj)
        
        self.in_lane_objects = in_lane
        return len(in_lane)
    
    def analyze_traffic(self, in_lane_count: int) -> TrafficLevel:
        """
        Analyze traffic level based on objects in lane.
        
        Args:
            in_lane_count: Number of objects in our lane
            
        Returns:
            Traffic level classification
        """
        self.traffic_history.append(in_lane_count)
        
        # Average over recent frames for stability
        avg_count = np.mean(list(self.traffic_history))
        
        if avg_count >= 4:
            self.current_traffic = TrafficLevel.HIGH
        elif avg_count >= 2:
            self.current_traffic = TrafficLevel.MEDIUM
        elif avg_count >= 1:
            self.current_traffic = TrafficLevel.LOW
        else:
            self.current_traffic = TrafficLevel.NONE
        
        return self.current_traffic
    
    def get_closest_object_brightness(self) -> float:
        """
        Get the brightness (proximity) of the closest object in lane.
        
        Returns:
            Brightness value (higher = closer) or 0 if no objects
        """
        if not self.in_lane_objects:
            return 0
        
        # Find object with highest brightness (closest)
        max_brightness = 0
        for obj in self.in_lane_objects:
            brightness = obj.get('brightness', 0)
            if brightness > max_brightness:
                max_brightness = brightness
        
        self.closest_object_brightness = max_brightness
        return max_brightness
    
    def check_violations(self) -> Tuple[ViolationType, str]:
        """
        Check for driver violations based on speed, traffic, and distance.
        
        Returns:
            Tuple of (violation type, warning message)
        """
        speed = self.current_speed
        traffic = self.current_traffic
        closest_brightness = self.get_closest_object_brightness()
        
        # Reset violation
        self.current_violation = ViolationType.NONE
        self.violation_message = ""
        
        # Check 1: SLOW DRIVING without traffic
        if speed < self.SLOW_SPEED_THRESHOLD and traffic in [TrafficLevel.NONE, TrafficLevel.LOW]:
            if self.slow_driving_start_time is None:
                self.slow_driving_start_time = time.time()
            else:
                slow_duration = time.time() - self.slow_driving_start_time
                if slow_duration >= self.SLOW_DRIVING_TIMEOUT:
                    self.current_violation = ViolationType.SLOW_DRIVING
                    self.violation_message = f"SLOW DRIVING! No traffic - Speed: {speed:.0f}km/h for {slow_duration:.0f}s"
        else:
            self.slow_driving_start_time = None  # Reset timer
        
        # Check 2: UNSAFE DISTANCE at speed
        if speed >= self.HIGH_SPEED_THRESHOLD:
            # High speed - need more distance
            if closest_brightness > self.SAFE_DISTANCE_HIGH_SPEED and len(self.in_lane_objects) > 0:
                self.current_violation = ViolationType.UNSAFE_DISTANCE
                self.violation_message = f"TOO CLOSE! Speed: {speed:.0f}km/h - Increase distance!"
        elif speed >= self.MEDIUM_SPEED_THRESHOLD:
            # Medium speed
            if closest_brightness > self.SAFE_DISTANCE_MEDIUM_SPEED and len(self.in_lane_objects) > 0:
                self.current_violation = ViolationType.UNSAFE_DISTANCE
                self.violation_message = f"FOLLOWING TOO CLOSE! Speed: {speed:.0f}km/h"
        elif speed >= self.SLOW_SPEED_THRESHOLD:
            # Slow speed but moving
            if closest_brightness > self.SAFE_DISTANCE_LOW_SPEED and len(self.in_lane_objects) > 0:
                self.current_violation = ViolationType.UNSAFE_DISTANCE
                self.violation_message = f"Warning: Getting too close to vehicle ahead"
        
        return self.current_violation, self.violation_message
    
    def get_status_text(self) -> List[str]:
        """
        Get status text lines for display overlay.
        
        Returns:
            List of status strings
        """
        lines = [
            f"SPEED: {self.current_speed:.0f} km/h",
            f"TRAFFIC: {self.current_traffic.value}",
            f"IN-LANE OBJECTS: {len(self.in_lane_objects)}"
        ]
        
        if self.in_lane_objects:
            lines.append(f"CLOSEST: brightness={self.closest_object_brightness:.0f}")
        
        return lines
    
    def draw_overlay(self, frame: np.ndarray, lane_polygon: Optional[np.ndarray] = None) -> np.ndarray:
        """
        Draw behavior analysis overlay on frame.
        
        Args:
            frame: Frame to draw on
            lane_polygon: Lane polygon for highlighting in-lane objects
            
        Returns:
            Annotated frame
        """
        annotated = frame.copy()
        height, width = frame.shape[:2]
        
        # Draw status panel (top-right)
        status_lines = self.get_status_text()
        panel_x = width - 300
        panel_y = 10
        
        # Background
        cv2.rectangle(annotated, (panel_x - 10, panel_y - 5),
                     (width - 10, panel_y + len(status_lines) * 25 + 10),
                     (0, 0, 0), -1)
        
        for i, line in enumerate(status_lines):
            color = (0, 255, 0)  # Green default
            
            # Color based on content
            if "HIGH_TRAFFIC" in line:
                color = (0, 0, 255)  # Red
            elif "MEDIUM_TRAFFIC" in line:
                color = (0, 165, 255)  # Orange
            
            cv2.putText(annotated, line, (panel_x, panel_y + (i + 1) * 22),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        
        # Draw violation warning (bottom center)
        if self.current_violation != ViolationType.NONE:
            warning_text = self.violation_message
            
            # Get text size
            (text_w, text_h), _ = cv2.getTextSize(warning_text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)
            
            # Position at bottom center
            x = (width - text_w) // 2
            y = height - 50
            
            # Red background
            cv2.rectangle(annotated, (x - 10, y - text_h - 10),
                         (x + text_w + 10, y + 10), (0, 0, 150), -1)
            
            # White text
            cv2.putText(annotated, warning_text, (x, y),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        
        # Highlight in-lane objects with special marker
        for obj in self.in_lane_objects:
            bbox = obj.get('bbox', [0, 0, 0, 0])
            x1, y1, x2, y2 = map(int, bbox)
            
            # Draw "IN LANE" marker
            cv2.putText(annotated, "IN LANE", (x1, y2 + 20),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)
        
        return annotated
