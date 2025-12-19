#!/usr/bin/env python3
"""
Lane Memory and Tracking Module
Provides temporal lane memory using Kalman filtering and polynomial fitting
for robust lane detection even when markings are temporarily obscured.

Includes Road Structure Prediction (STRAIGHT/CURVE) based on lane curvature.
"""
import numpy as np
import cv2
from collections import deque
from typing import Dict, List, Optional, Tuple
from enum import Enum

# Try to import scipy for advanced smoothing
try:
    from scipy.ndimage import uniform_filter1d
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False


class RoadStructure(Enum):
    """Road structure classification."""
    UNKNOWN = "UNKNOWN"
    STRAIGHT = "STRAIGHT"
    LEFT_CURVE = "LEFT_CURVE"
    RIGHT_CURVE = "RIGHT_CURVE"
    S_CURVE = "S_CURVE"


class RoadStructurePredictor:
    """
    Predicts road structure (straight, curve) by analyzing lane polynomial coefficients.
    
    Uses the quadratic coefficient (a in ax² + bx + c) to determine curvature:
    - |a| < threshold → STRAIGHT
    - a > threshold → curving one direction
    - a < -threshold → curving opposite direction
    """
    
    def __init__(self, curvature_threshold: float = 0.0003, history_frames: int = 5):
        """
        Initialize road structure predictor.
        
        Args:
            curvature_threshold: Threshold for classifying as curve vs straight
            history_frames: Number of frames to average for stable prediction
        """
        self.curvature_threshold = curvature_threshold
        self.history_frames = history_frames
        self.curvature_history: deque = deque(maxlen=history_frames)
        self.current_structure = RoadStructure.UNKNOWN
    
    def update(self, left_poly: Optional[np.ndarray], right_poly: Optional[np.ndarray]) -> RoadStructure:
        """
        Update road structure prediction based on lane polynomials.
        
        Args:
            left_poly: Left lane polynomial coefficients [a, b, c] or None
            right_poly: Right lane polynomial coefficients [a, b, c] or None
            
        Returns:
            Predicted road structure
        """
        curvatures = []
        
        # Get curvature from available lanes
        if left_poly is not None and len(left_poly) >= 3:
            curvatures.append(left_poly[0])  # quadratic coefficient
        
        if right_poly is not None and len(right_poly) >= 3:
            curvatures.append(right_poly[0])
        
        if not curvatures:
            return self.current_structure
        
        avg_curvature = np.mean(curvatures)
        self.curvature_history.append(avg_curvature)
        
        # Average over history for stability
        if len(self.curvature_history) < 2:
            return self.current_structure
        
        smoothed_curvature = np.mean(list(self.curvature_history))
        
        # Classify road structure
        if abs(smoothed_curvature) < self.curvature_threshold:
            self.current_structure = RoadStructure.STRAIGHT
        elif smoothed_curvature > self.curvature_threshold:
            # Positive curvature = lane curves left (for x = f(y) polynomial)
            self.current_structure = RoadStructure.LEFT_CURVE
        else:
            self.current_structure = RoadStructure.RIGHT_CURVE
        
        return self.current_structure
    
    def get_curvature_radius(self) -> Optional[float]:
        """
        Estimate curvature radius in pixels.
        
        Returns:
            Estimated radius or None if no data
        """
        if not self.curvature_history:
            return None
        
        avg_a = np.mean(list(self.curvature_history))
        if abs(avg_a) < 1e-6:
            return float('inf')  # Straight road
        
        # Radius of curvature approximation
        return abs(1.0 / (2 * avg_a))


class TrackedLane:
    """Represents a single tracked lane with history and Kalman filtering."""
    
    def __init__(self, lane_id: str, max_history: int = 30, decay_rate: float = 0.95):
        """
        Initialize a tracked lane.
        
        Args:
            lane_id: Unique identifier for this lane ('left', 'right', 'middle', etc.)
            max_history: Maximum frames of history to keep
            decay_rate: Confidence decay per frame when not detected
        """
        self.lane_id = lane_id
        self.max_history = max_history
        self.decay_rate = decay_rate
        
        # Lane history: store polynomial coefficients and points
        self.point_history: deque = deque(maxlen=max_history)
        self.poly_coeffs: Optional[np.ndarray] = None
        
        # Confidence tracking
        self.confidence = 0.0
        self.frames_since_detection = 0
        self.last_class_id = -1
        self.last_class_conf = 0.0
        
        # Kalman filter for lane position smoothing
        # State: [x_offset, dx_offset, curvature, d_curvature]
        self.kalman = cv2.KalmanFilter(4, 2)
        self.kalman.measurementMatrix = np.array([
            [1, 0, 0, 0],
            [0, 0, 1, 0]
        ], np.float32)
        self.kalman.transitionMatrix = np.array([
            [1, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 1],
            [0, 0, 0, 1]
        ], np.float32)
        self.kalman.processNoiseCov = np.eye(4, dtype=np.float32) * 0.03
        self.kalman.measurementNoiseCov = np.eye(2, dtype=np.float32) * 0.1
        self.kalman.errorCovPost = np.eye(4, dtype=np.float32)
        self.kalman_initialized = False
    
    def update(self, points: np.ndarray, class_id: int, class_conf: float) -> None:
        """
        Update lane with new detection.
        
        Args:
            points: Array of (x, y) points defining the lane
            class_id: Class ID from YOLO detection
            class_conf: Detection confidence from YOLO
        """
        if len(points) < 3:
            return
        
        self.frames_since_detection = 0
        self.last_class_id = class_id
        self.last_class_conf = class_conf
        self.confidence = min(1.0, self.confidence + 0.3)  # Quick confidence boost
        
        # Store points
        self.point_history.append(points.copy())
        
        # Fit polynomial (2nd degree)
        try:
            # Sort points by y (bottom to top of image)
            sorted_idx = np.argsort(points[:, 1])[::-1]
            sorted_points = points[sorted_idx]
            
            # Fit polynomial: x = f(y)
            self.poly_coeffs = np.polyfit(sorted_points[:, 1], sorted_points[:, 0], 2)
            
            # Update Kalman filter
            x_offset = self.poly_coeffs[2]  # x at y=0
            curvature = self.poly_coeffs[0]  # a in ax^2 + bx + c
            
            measurement = np.array([[x_offset], [curvature]], np.float32)
            
            if not self.kalman_initialized:
                self.kalman.statePost = np.array([[x_offset], [0], [curvature], [0]], np.float32)
                self.kalman_initialized = True
            else:
                self.kalman.correct(measurement)
            
            self.kalman.predict()
            
        except np.linalg.LinAlgError:
            pass  # Keep previous coefficients on fitting error
    
    def predict(self) -> None:
        """Predict lane position when not detected."""
        self.frames_since_detection += 1
        self.confidence *= self.decay_rate
        
        if self.kalman_initialized:
            state = self.kalman.predict()
            if self.poly_coeffs is not None:
                # Update polynomial with predicted values
                self.poly_coeffs[2] = state[0, 0]  # x_offset
                self.poly_coeffs[0] = state[2, 0]  # curvature
    
    def get_points(self, height: int, num_points: int = 50) -> Optional[np.ndarray]:
        """
        Get lane points from polynomial.
        
        Args:
            height: Frame height
            num_points: Number of points to generate
            
        Returns:
            Array of (x, y) points or None
        """
        if self.poly_coeffs is None or self.confidence < 0.1:
            return None
        
        y_vals = np.linspace(height * 0.4, height, num_points)
        x_vals = np.polyval(self.poly_coeffs, y_vals)
        
        return np.column_stack((x_vals, y_vals)).astype(np.int32)
    
    def is_valid(self) -> bool:
        """Check if lane is still valid for rendering."""
        return self.confidence >= 0.1 and self.poly_coeffs is not None


class LaneMemoryTracker:
    """
    Tracks multiple lanes with memory and temporal smoothing.
    Provides lane segmentation visualization.
    """
    
    def __init__(self, max_history: int = 30, decay_rate: float = 0.95, 
                 smoothing_factor: float = 0.3):
        """
        Initialize lane memory tracker.
        
        Args:
            max_history: Maximum frames of history per lane
            decay_rate: Confidence decay rate per frame (0-1)
            smoothing_factor: Smoothing factor for temporal averaging (0-1)
        """
        self.max_history = max_history
        self.decay_rate = decay_rate
        self.smoothing_factor = smoothing_factor
        
        # Track lanes by position relative to vehicle
        self.tracked_lanes: Dict[str, TrackedLane] = {}
        
        # Store the last valid left/right lane for segmentation
        self.left_lane_points: Optional[np.ndarray] = None
        self.right_lane_points: Optional[np.ndarray] = None
        
        # Road structure predictor
        self.road_predictor = RoadStructurePredictor(
            curvature_threshold=0.0003, 
            history_frames=5
        )
        self.current_road_structure = RoadStructure.UNKNOWN
        
        # Store last 3 frame polynomial coefficients for averaging
        self.left_poly_history: deque = deque(maxlen=3)
        self.right_poly_history: deque = deque(maxlen=3)
        
    def update(self, detected_masks: List[dict], frame_shape: Tuple[int, int, int],
               vehicle_center_x: int) -> Dict[str, dict]:
        """
        Update tracked lanes with new detections.
        
        Args:
            detected_masks: List of dicts with 'mask_bool', 'cls', 'conf', 'xs', 'ys'
            frame_shape: (height, width, channels)
            vehicle_center_x: X position of vehicle reference dot
            
        Returns:
            Dict of tracked lane info with 'points', 'confidence', 'is_memory', 'cls', 'conf'
        """
        height, width = frame_shape[:2]
        
        # Separate detected lanes into left/right relative to vehicle
        left_detections = []
        right_detections = []
        
        for lane_info in detected_masks:
            xs = lane_info.get('xs')
            if xs is None or len(xs) == 0:
                continue
            
            lane_center_x = np.mean(xs)
            
            if lane_center_x < vehicle_center_x:
                left_detections.append(lane_info)
            else:
                right_detections.append(lane_info)
        
        # Sort by distance to vehicle (closest first)
        left_detections.sort(key=lambda l: abs(np.mean(l['xs']) - vehicle_center_x))
        right_detections.sort(key=lambda l: abs(np.mean(l['xs']) - vehicle_center_x))
        
        # Update or create tracked lanes
        self._update_side_lanes('left', left_detections, width, height)
        self._update_side_lanes('right', right_detections, width, height)
        
        # Predict for lanes that weren't updated
        for lane_id, tracked_lane in self.tracked_lanes.items():
            if tracked_lane.frames_since_detection > 0:
                tracked_lane.predict()
        
        # Collect polynomial coefficients for road structure prediction
        left_poly = None
        right_poly = None
        
        # Build result
        result = {}
        for lane_id, tracked_lane in self.tracked_lanes.items():
            if tracked_lane.is_valid():
                points = tracked_lane.get_points(height)
                if points is not None:
                    result[lane_id] = {
                        'points': points,
                        'confidence': tracked_lane.confidence,
                        'is_memory': tracked_lane.frames_since_detection > 0,
                        'cls': tracked_lane.last_class_id,
                        'conf': tracked_lane.last_class_conf
                    }
                    
                    # Store for segmentation and road structure
                    if 'left_0' == lane_id:  # Primary left lane
                        self.left_lane_points = points
                        left_poly = tracked_lane.poly_coeffs
                        if left_poly is not None:
                            self.left_poly_history.append(left_poly.copy())
                    elif 'right_0' == lane_id:  # Primary right lane
                        self.right_lane_points = points
                        right_poly = tracked_lane.poly_coeffs
                        if right_poly is not None:
                            self.right_poly_history.append(right_poly.copy())
        
        # Average polynomial coefficients over last 3 frames for stability
        if len(self.left_poly_history) >= 2:
            left_poly = np.mean(list(self.left_poly_history), axis=0)
        if len(self.right_poly_history) >= 2:
            right_poly = np.mean(list(self.right_poly_history), axis=0)
        
        # Update road structure prediction
        self.current_road_structure = self.road_predictor.update(left_poly, right_poly)
        
        return result
    
    def _update_side_lanes(self, side: str, detections: List[dict], 
                           width: int, height: int) -> None:
        """Update tracked lanes for one side (left or right)."""
        for i, lane_info in enumerate(detections[:2]):  # Track up to 2 lanes per side
            lane_id = f"{side}_{i}"
            
            if lane_id not in self.tracked_lanes:
                self.tracked_lanes[lane_id] = TrackedLane(
                    lane_id, self.max_history, self.decay_rate
                )
            
            # Extract lane centerline from mask using row-wise median
            centerline_points = self._extract_lane_centerline(lane_info, height)
            
            if centerline_points is not None and len(centerline_points) >= 5:
                self.tracked_lanes[lane_id].update(
                    centerline_points,
                    lane_info.get('cls', 0),
                    lane_info.get('conf', 0.0)
                )
    
    def _extract_lane_centerline(self, lane_info: dict, height: int) -> Optional[np.ndarray]:
        """
        Extract clean lane centerline from mask by computing median x for each y row.
        
        This produces a smooth, single-pixel-wide lane line instead of scattered points.
        
        Args:
            lane_info: Dict with 'xs', 'ys', 'mask_bool'
            height: Frame height
            
        Returns:
            Array of (x, y) centerline points sorted by y, or None
        """
        xs = lane_info.get('xs')
        ys = lane_info.get('ys')
        
        if xs is None or ys is None or len(xs) < 10:
            return None
        
        # Check minimum lane length - must span at least 20% of frame height
        # This filters out short segments like zebra crossings
        y_min, y_max = np.min(ys), np.max(ys)
        lane_vertical_span = y_max - y_min
        min_lane_length = height * 0.20  # 20% of frame height
        
        if lane_vertical_span < min_lane_length:
            # Lane is too short - likely a zebra crossing or short marking
            return None
        
        # Group points by y-coordinate and find median x for each row
        # This gives us the lane centerline
        y_to_x = {}
        for x, y in zip(xs, ys):
            if y not in y_to_x:
                y_to_x[y] = []
            y_to_x[y].append(x)
        
        # Compute median x for each y (this is the centerline)
        centerline_y = []
        centerline_x = []
        for y in sorted(y_to_x.keys()):
            median_x = np.median(y_to_x[y])
            centerline_x.append(median_x)
            centerline_y.append(y)
        
        if len(centerline_x) < 5:
            return None
        
        centerline_x = np.array(centerline_x)
        centerline_y = np.array(centerline_y)
        
        # Apply smoothing filter to x-coordinates for cleaner curve
        if SCIPY_AVAILABLE and len(centerline_x) > 10:
            # Uniform filter (moving average) for smoothing
            window_size = min(11, len(centerline_x) // 3)
            if window_size >= 3:
                centerline_x = uniform_filter1d(centerline_x, size=window_size, mode='nearest')
        else:
            # Simple moving average fallback
            if len(centerline_x) > 5:
                kernel_size = 5
                kernel = np.ones(kernel_size) / kernel_size
                centerline_x = np.convolve(centerline_x, kernel, mode='same')
        
        # Sample evenly to reduce points but maintain shape
        # Keep ~30 evenly spaced points
        if len(centerline_x) > 30:
            indices = np.linspace(0, len(centerline_x) - 1, 30).astype(int)
            centerline_x = centerline_x[indices]
            centerline_y = centerline_y[indices]
        
        centerline = np.column_stack((centerline_x.astype(int), centerline_y.astype(int)))
        
        return centerline
    
    def get_segmented_lane_overlay(self, frame_shape: Tuple[int, int, int],
                                   fill_color: Tuple[int, int, int] = (0, 180, 0),
                                   memory_color: Tuple[int, int, int] = (0, 180, 180)
                                   ) -> Tuple[Optional[np.ndarray], float]:
        """
        Generate filled polygon overlay between left and right lanes.
        
        Args:
            frame_shape: (height, width, channels)
            fill_color: BGR color for fresh detection
            memory_color: BGR color when using memory
            
        Returns:
            Tuple of (overlay image, average confidence)
        """
        height, width = frame_shape[:2]
        
        # Get left and right lane info
        left_info = None
        right_info = None
        
        for lane_id, tracked in self.tracked_lanes.items():
            if 'left' in lane_id and tracked.is_valid():
                if left_info is None or tracked.confidence > left_info['confidence']:
                    points = tracked.get_points(height)
                    if points is not None:
                        left_info = {
                            'points': points,
                            'confidence': tracked.confidence,
                            'is_memory': tracked.frames_since_detection > 0
                        }
            elif 'right' in lane_id and tracked.is_valid():
                if right_info is None or tracked.confidence > right_info['confidence']:
                    points = tracked.get_points(height)
                    if points is not None:
                        right_info = {
                            'points': points,
                            'confidence': tracked.confidence,
                            'is_memory': tracked.frames_since_detection > 0
                        }
        
        if left_info is None or right_info is None:
            return None, 0.0
        
        # Create overlay
        overlay = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Build polygon points
        left_pts = left_info['points']
        right_pts = right_info['points']
        
        # Create closed polygon: left points + reversed right points
        polygon_pts = np.vstack([left_pts, right_pts[::-1]])
        
        # Determine color based on memory status
        is_memory = left_info['is_memory'] or right_info['is_memory']
        color = memory_color if is_memory else fill_color
        
        # Adjust alpha based on confidence
        avg_confidence = (left_info['confidence'] + right_info['confidence']) / 2
        
        # Fill polygon
        cv2.fillPoly(overlay, [polygon_pts], color)
        
        return overlay, avg_confidence
    
    def draw_tracked_lanes(self, frame: np.ndarray, 
                           lane_names: Optional[dict] = None,
                           show_confidence: bool = True) -> np.ndarray:
        """
        Draw tracked lanes on frame with confidence visualization.
        
        Args:
            frame: Frame to draw on
            lane_names: Dict mapping class IDs to names
            show_confidence: Whether to show confidence percentages
            
        Returns:
            Annotated frame
        """
        height, width = frame.shape[:2]
        annotated = frame.copy()
        
        for lane_id, tracked_lane in self.tracked_lanes.items():
            if not tracked_lane.is_valid():
                continue
            
            points = tracked_lane.get_points(height)
            if points is None or len(points) < 2:
                continue
            
            # Color based on confidence and memory status
            is_memory = tracked_lane.frames_since_detection > 0
            conf = tracked_lane.confidence
            
            if is_memory:
                # Yellow tint for memorized lanes
                base_color = np.array([0, 200, 255])  # Yellow in BGR
            else:
                # Green for fresh detection
                base_color = np.array([0, 255, 0])  # Green in BGR
            
            # Fade color based on confidence
            color = tuple((base_color * conf).astype(int).tolist())
            
            # Draw lane line
            thickness = max(2, int(4 * conf))
            cv2.polylines(annotated, [points], False, color, thickness)
            
            # Draw confidence label
            if show_confidence:
                label_point = points[len(points) // 4]  # 1/4 from bottom
                label = f"{int(conf * 100)}%"
                if is_memory:
                    label = f"MEM {label}"
                
                cv2.putText(annotated, label, tuple(label_point),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
                cv2.putText(annotated, label, tuple(label_point),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
        
        return annotated
    
    def get_lane_for_departure_check(self, side: str) -> Optional[dict]:
        """
        Get the closest lane on specified side for departure checking.
        
        Args:
            side: 'left' or 'right'
            
        Returns:
            Dict with lane info or None
        """
        best_lane = None
        best_confidence = 0.0
        
        for lane_id, tracked_lane in self.tracked_lanes.items():
            if side in lane_id and tracked_lane.is_valid():
                if tracked_lane.confidence > best_confidence:
                    best_confidence = tracked_lane.confidence
                    height = 720  # Default, will be overridden
                    points = tracked_lane.get_points(height)
                    if points is not None:
                        best_lane = {
                            'lane_id': lane_id,
                            'points': points,
                            'confidence': tracked_lane.confidence,
                            'cls': tracked_lane.last_class_id,
                            'is_memory': tracked_lane.frames_since_detection > 0
                        }
        
        return best_lane
    
    def get_road_structure(self) -> dict:
        """
        Get current road structure prediction.
        
        Returns:
            Dict with:
                - 'structure': RoadStructure enum value
                - 'structure_name': String name (STRAIGHT, LEFT_CURVE, etc.)
                - 'curvature_radius': Estimated curvature radius in pixels
                - 'is_curve': Boolean, True if road is curved
        """
        radius = self.road_predictor.get_curvature_radius()
        
        return {
            'structure': self.current_road_structure,
            'structure_name': self.current_road_structure.value,
            'curvature_radius': radius,
            'is_curve': self.current_road_structure in [
                RoadStructure.LEFT_CURVE, 
                RoadStructure.RIGHT_CURVE,
                RoadStructure.S_CURVE
            ]
        }
    
    def draw_road_structure(self, frame: np.ndarray) -> np.ndarray:
        """
        Draw road structure indicator on frame.
        
        Args:
            frame: Frame to draw on
            
        Returns:
            Annotated frame
        """
        annotated = frame.copy()
        road_info = self.get_road_structure()
        
        # Position for road structure display
        x, y = 10, 90
        
        # Background
        structure_name = road_info['structure_name']
        (text_w, text_h), _ = cv2.getTextSize(f"ROAD: {structure_name}", 
                                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
        cv2.rectangle(annotated, (x - 5, y - text_h - 5), 
                     (x + text_w + 10, y + 10), (0, 0, 0), -1)
        
        # Color based on road type
        if road_info['structure'] == RoadStructure.STRAIGHT:
            color = (0, 255, 0)  # Green
        elif road_info['structure'] == RoadStructure.LEFT_CURVE:
            color = (0, 165, 255)  # Orange
        elif road_info['structure'] == RoadStructure.RIGHT_CURVE:
            color = (255, 165, 0)  # Blue-ish
        else:
            color = (128, 128, 128)  # Gray for unknown
        
        cv2.putText(annotated, f"ROAD: {structure_name}", (x, y),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        
        return annotated
