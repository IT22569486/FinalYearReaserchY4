#!/usr/bin/env python3
"""
Adaptive Processing Optimizer for Raspberry Pi
For Sri Lanka CTB Bus Driver Monitoring System

Implements 5 key optimizations:
1. Speed-based frame gap - Process fewer frames at low speed
2. Conditional MiDaS - Only run depth estimation when objects detected
3. ROI cropping - Only process relevant road area
4. Resolution scaling - Lower resolution when safe
5. Frame similarity skip - Skip processing if frame is similar to previous

Designed to maximize performance on resource-constrained devices.
"""

import numpy as np
import cv2
import time
from typing import Tuple, Optional, Dict, Any, List
from collections import deque
from enum import Enum


class ProcessingLevel(Enum):
    """Processing intensity levels."""
    MINIMAL = "MINIMAL"      # Low speed, no objects - minimal processing
    LOW = "LOW"              # Low speed or stationary
    NORMAL = "NORMAL"        # Normal driving conditions
    HIGH = "HIGH"            # High speed or objects detected
    CRITICAL = "CRITICAL"    # Very close objects - process everything


class AdaptiveProcessor:
    """
    Adaptive frame processor that optimizes for Raspberry Pi performance.
    
    Implements 5 optimizations:
    1. Speed-based frame gap
    2. Conditional MiDaS execution
    3. ROI cropping
    4. Dynamic resolution scaling
    5. Frame similarity skip
    """
    
    # Speed thresholds (km/h)
    SPEED_STATIONARY = 5
    SPEED_SLOW = 20
    SPEED_MEDIUM = 40
    SPEED_HIGH = 60
    
    # Frame gap settings (process every N frames) - MORE AGGRESSIVE
    FRAME_GAP_STATIONARY = 15   # Process 1 in 15 frames when stationary
    FRAME_GAP_SLOW = 8          # Process 1 in 8 frames at slow speed
    FRAME_GAP_MEDIUM = 4        # Process 1 in 4 frames at medium speed
    FRAME_GAP_HIGH = 2          # Process every 2 frames at high speed
    
    # Resolution settings - LOWER FOR BETTER PERFORMANCE
    RESOLUTION_LOW = 256        # Low res for minimal processing
    RESOLUTION_MEDIUM = 384     # Medium res for normal conditions
    RESOLUTION_HIGH = 480       # Full res for critical situations
    
    # ROI settings (percentage of frame height to crop from top)
    ROI_CROP_TOP = 0.40         # Crop top 40% (sky/trees)
    
    # Frame similarity threshold (0.0 - 1.0)
    SIMILARITY_THRESHOLD = 0.85  # If 85%+ similar, skip processing
    
    # MiDaS settings - RUN LESS FREQUENTLY
    MIDAS_MIN_INTERVAL = 10     # Minimum frames between MiDaS runs when no objects
    MIDAS_SAFETY_INTERVAL = 45  # Force MiDaS every N frames for safety
    
    # Distance-based priority (brightness values from depth)
    CLOSE_OBJECT_THRESHOLD = 150   # Objects with brightness > this are "close"
    
    def __init__(self, original_width: int = 1280, original_height: int = 720):
        """
        Initialize adaptive processor.
        
        Args:
            original_width: Original frame width
            original_height: Original frame height
        """
        self.original_width = original_width
        self.original_height = original_height
        
        # Current state
        self.current_speed = 0.0          # km/h
        self.objects_detected = False
        self.closest_object_distance = float('inf')
        self.closest_object_brightness = 0
        
        # Frame tracking
        self.frame_count = 0
        self.last_processed_frame_idx = 0
        self.last_midas_frame_idx = 0
        self.last_full_process_time = time.time()
        
        # Cached results for skipped frames
        self.last_yolo_result = None
        self.last_midas_result = None
        self.last_processed_frame = None
        
        # Performance metrics
        self.processing_times: deque = deque(maxlen=100)
        self.frames_skipped = 0
        self.midas_runs = 0
        self.yolo_runs = 0
        
        # Processing level
        self.current_level = ProcessingLevel.NORMAL
        
        print("✅ Adaptive Processor initialized")
        print(f"   ROI: Crop top {self.ROI_CROP_TOP*100:.0f}%")
        print(f"   Resolutions: Low={self.RESOLUTION_LOW}, Med={self.RESOLUTION_MEDIUM}, High={self.RESOLUTION_HIGH}")
        print(f"   Frame similarity threshold: {self.SIMILARITY_THRESHOLD*100:.0f}%")
    
    def set_speed(self, speed_kmh: float) -> None:
        """Update current vehicle speed."""
        self.current_speed = max(0, speed_kmh)
    
    def set_detection_state(self, objects_detected: bool, 
                           closest_brightness: float = 0) -> None:
        """
        Update detection state from YOLO results.
        
        Args:
            objects_detected: Whether any objects were detected
            closest_brightness: Brightness of closest object (higher = closer)
        """
        self.objects_detected = objects_detected
        self.closest_object_brightness = closest_brightness
    
    # =========================================================================
    # OPTIMIZATION 1: Speed-based Frame Gap
    # =========================================================================
    
    def get_frame_gap(self) -> int:
        """
        Get frame gap based on current speed and conditions.
        
        Returns:
            Number of frames to skip between processing
        """
        speed = self.current_speed
        
        # Override: Always process if objects are close
        if self.closest_object_brightness > self.CLOSE_OBJECT_THRESHOLD:
            return 1  # Process every frame
        
        # Speed-based gap
        if speed < self.SPEED_STATIONARY:
            base_gap = self.FRAME_GAP_STATIONARY
        elif speed < self.SPEED_SLOW:
            base_gap = self.FRAME_GAP_SLOW
        elif speed < self.SPEED_MEDIUM:
            base_gap = self.FRAME_GAP_MEDIUM
        else:
            base_gap = self.FRAME_GAP_HIGH
        
        # Reduce gap if objects detected
        if self.objects_detected:
            base_gap = max(1, base_gap // 2)
        
        return base_gap
    
    def should_process_frame(self) -> bool:
        """
        Determine if current frame should be processed.
        
        Returns:
            True if frame should be processed
        """
        self.frame_count += 1
        
        frame_gap = self.get_frame_gap()
        should_process = (self.frame_count - self.last_processed_frame_idx) >= frame_gap
        
        # Safety: Force processing every 3 seconds minimum
        if time.time() - self.last_full_process_time > 3.0:
            should_process = True
        
        if should_process:
            self.last_processed_frame_idx = self.frame_count
        else:
            self.frames_skipped += 1
        
        return should_process
    
    # =========================================================================
    # OPTIMIZATION 2: Conditional MiDaS
    # =========================================================================
    
    def should_run_midas(self) -> bool:
        """
        Determine if MiDaS depth estimation should run.
        
        MiDaS is expensive - only run when:
        1. Objects detected (need distance info)
        2. Safety interval reached (periodic check)
        3. High speed (reaction time matters)
        
        Returns:
            True if MiDaS should run
        """
        frames_since_midas = self.frame_count - self.last_midas_frame_idx
        
        # Always run if objects detected
        if self.objects_detected:
            self.last_midas_frame_idx = self.frame_count
            self.midas_runs += 1
            return True
        
        # Always run at high speed (for safety)
        if self.current_speed >= self.SPEED_HIGH:
            self.last_midas_frame_idx = self.frame_count
            self.midas_runs += 1
            return True
        
        # Safety: Run periodically even without objects
        if frames_since_midas >= self.MIDAS_SAFETY_INTERVAL:
            self.last_midas_frame_idx = self.frame_count
            self.midas_runs += 1
            return True
        
        # Don't run - use cached result
        return False
    
    def get_cached_midas_result(self) -> Optional[np.ndarray]:
        """Get cached MiDaS result when not running fresh inference."""
        return self.last_midas_result
    
    def cache_midas_result(self, result: np.ndarray) -> None:
        """Cache MiDaS result for reuse."""
        self.last_midas_result = result.copy() if result is not None else None
    
    # =========================================================================
    # OPTIMIZATION 3: ROI Cropping
    # =========================================================================
    
    def crop_roi(self, frame: np.ndarray) -> Tuple[np.ndarray, Tuple[int, int, int, int]]:
        """
        Crop frame to Region of Interest (road area only).
        
        Removes top portion of frame (sky, distant scenery) to reduce
        processing area without losing important road information.
        
        Args:
            frame: Input frame (BGR)
            
        Returns:
            Tuple of (cropped_frame, (x1, y1, x2, y2) roi bounds)
        """
        h, w = frame.shape[:2]
        
        # Calculate crop region (bottom portion of frame)
        y1 = int(h * self.ROI_CROP_TOP)
        y2 = h
        x1 = 0
        x2 = w
        
        cropped = frame[y1:y2, x1:x2]
        roi_bounds = (x1, y1, x2, y2)
        
        return cropped, roi_bounds
    
    def adjust_detections_to_original(self, detections: List[dict], 
                                      roi_bounds: Tuple[int, int, int, int]) -> List[dict]:
        """
        Adjust detection coordinates from ROI back to original frame.
        
        Args:
            detections: List of detections with 'bbox' key
            roi_bounds: (x1, y1, x2, y2) of ROI in original frame
            
        Returns:
            Adjusted detections with corrected coordinates
        """
        x_offset, y_offset = roi_bounds[0], roi_bounds[1]
        
        adjusted = []
        for det in detections:
            new_det = det.copy()
            if 'bbox' in det:
                bbox = det['bbox']
                new_det['bbox'] = [
                    bbox[0] + x_offset,
                    bbox[1] + y_offset,
                    bbox[2] + x_offset,
                    bbox[3] + y_offset
                ]
            adjusted.append(new_det)
        
        return adjusted
    
    def should_use_roi(self) -> bool:
        """
        Determine if ROI cropping should be used.
        
        Returns:
            True if ROI should be used
        """
        # Always use ROI for efficiency, unless we're in critical mode
        # (very close objects where full frame might be needed)
        if self.closest_object_brightness > self.CLOSE_OBJECT_THRESHOLD * 1.5:
            return False  # Use full frame for very close objects
        return True
    
    # =========================================================================
    # OPTIMIZATION 4: Resolution Scaling
    # =========================================================================
    
    def get_target_resolution(self) -> int:
        """
        Get target resolution based on current conditions.
        
        Returns:
            Target width for inference
        """
        speed = self.current_speed
        
        # Critical: Close objects - use high res
        if self.closest_object_brightness > self.CLOSE_OBJECT_THRESHOLD:
            return self.RESOLUTION_HIGH
        
        # High speed - use high res for reaction time
        if speed >= self.SPEED_HIGH:
            return self.RESOLUTION_HIGH
        
        # No objects and slow - use low res
        if not self.objects_detected and speed < self.SPEED_SLOW:
            return self.RESOLUTION_LOW
        
        # Medium speed or objects detected - use medium res
        return self.RESOLUTION_MEDIUM
    
    def scale_frame(self, frame: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        Scale frame to target resolution.
        
        Args:
            frame: Input frame
            
        Returns:
            Tuple of (scaled_frame, scale_factor)
        """
        h, w = frame.shape[:2]
        target_res = self.get_target_resolution()
        
        # Calculate scale factor based on width
        scale = target_res / w
        
        if scale >= 1.0:
            return frame, 1.0  # Don't upscale
        
        new_w = int(w * scale)
        new_h = int(h * scale)
        
        scaled = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        
        return scaled, scale
    
    def adjust_detections_for_scale(self, detections: List[dict], 
                                    scale: float) -> List[dict]:
        """
        Adjust detection coordinates for scaled frame.
        
        Args:
            detections: List of detections
            scale: Scale factor used
            
        Returns:
            Adjusted detections
        """
        if scale == 1.0:
            return detections
        
        inv_scale = 1.0 / scale
        adjusted = []
        
        for det in detections:
            new_det = det.copy()
            if 'bbox' in det:
                bbox = det['bbox']
                new_det['bbox'] = [
                    bbox[0] * inv_scale,
                    bbox[1] * inv_scale,
                    bbox[2] * inv_scale,
                    bbox[3] * inv_scale
                ]
            adjusted.append(new_det)
        
        return adjusted
    
    # =========================================================================
    # OPTIMIZATION 5: Frame Similarity Skip
    # =========================================================================
    
    def check_frame_similarity(self, frame: np.ndarray) -> float:
        """
        Check similarity between current frame and last processed frame.
        
        Uses a fast histogram comparison method.
        
        Args:
            frame: Current frame
            
        Returns:
            Similarity score (0.0 - 1.0)
        """
        if self.last_processed_frame is None:
            return 0.0  # First frame - no similarity
        
        # Resize both frames for fast comparison
        small_size = (64, 64)
        current_small = cv2.resize(frame, small_size)
        last_small = cv2.resize(self.last_processed_frame, small_size)
        
        # Convert to grayscale
        current_gray = cv2.cvtColor(current_small, cv2.COLOR_BGR2GRAY)
        last_gray = cv2.cvtColor(last_small, cv2.COLOR_BGR2GRAY)
        
        # Calculate histograms
        hist_current = cv2.calcHist([current_gray], [0], None, [256], [0, 256])
        hist_last = cv2.calcHist([last_gray], [0], None, [256], [0, 256])
        
        # Normalize histograms
        cv2.normalize(hist_current, hist_current)
        cv2.normalize(hist_last, hist_last)
        
        # Compare histograms (correlation method)
        similarity = cv2.compareHist(hist_current, hist_last, cv2.HISTCMP_CORREL)
        
        return max(0.0, similarity)  # Ensure non-negative
    
    def should_skip_for_similarity(self, frame: np.ndarray) -> bool:
        """
        DISABLED - similarity check adds too much overhead.
        Simple frame gap is more efficient for performance.
        
        Args:
            frame: Current frame
            
        Returns:
            Always False (disabled)
        """
        # DISABLED - this adds overhead without enough benefit
        # The histogram comparison takes ~5-10ms which negates the savings
        return False
    
    def cache_processed_frame(self, frame: np.ndarray) -> None:
        """Cache frame for similarity comparison."""
        self.last_processed_frame = frame.copy()
    
    # =========================================================================
    # Main Processing Interface
    # =========================================================================
    
    def determine_processing_level(self) -> ProcessingLevel:
        """
        Determine current processing level based on all factors.
        
        Returns:
            ProcessingLevel enum value
        """
        speed = self.current_speed
        
        # Critical: Very close objects
        if self.closest_object_brightness > self.CLOSE_OBJECT_THRESHOLD * 1.5:
            self.current_level = ProcessingLevel.CRITICAL
            return self.current_level
        
        # High: Fast speed or close objects
        if speed >= self.SPEED_HIGH or self.closest_object_brightness > self.CLOSE_OBJECT_THRESHOLD:
            self.current_level = ProcessingLevel.HIGH
            return self.current_level
        
        # Normal: Medium speed or objects detected
        if speed >= self.SPEED_MEDIUM or self.objects_detected:
            self.current_level = ProcessingLevel.NORMAL
            return self.current_level
        
        # Low: Slow speed with no objects
        if speed >= self.SPEED_SLOW:
            self.current_level = ProcessingLevel.LOW
            return self.current_level
        
        # Minimal: Stationary with no objects
        self.current_level = ProcessingLevel.MINIMAL
        return self.current_level
    
    def preprocess_frame(self, frame: np.ndarray) -> Dict[str, Any]:
        """
        Preprocess frame with SIMPLIFIED optimizations.
        
        SIMPLIFIED: Only frame gap skipping and conditional MiDaS.
        ROI cropping and resolution scaling add overhead without benefit.
        
        Args:
            frame: Original input frame
            
        Returns:
            Dict with preprocessed frame and metadata
        """
        result = {
            'original_frame': frame,
            'processed_frame': frame,  # No preprocessing - pass through
            'should_run_yolo': True,
            'should_run_midas': True,
            'roi_bounds': None,
            'scale': 1.0,
            'processing_level': self.determine_processing_level()
        }
        
        # OPTIMIZATION 1: Speed-based frame gap (simple and effective)
        if not self.should_process_frame():
            result['should_run_yolo'] = False
            result['should_run_midas'] = False
            return result
        
        # OPTIMIZATION 2: Conditional MiDaS (only when needed)
        result['should_run_midas'] = self.should_run_midas()
        
        # Track YOLO runs
        self.yolo_runs += 1
        self.last_full_process_time = time.time()
        
        return result
    
    def postprocess_results(self, detections: List[dict], 
                           roi_bounds: Optional[Tuple[int, int, int, int]],
                           scale: float) -> List[dict]:
        """
        Post-process detection results to original frame coordinates.
        
        Args:
            detections: Detection results from YOLO
            roi_bounds: ROI bounds if cropping was used
            scale: Scale factor if scaling was used
            
        Returns:
            Adjusted detections in original frame coordinates
        """
        adjusted = detections
        
        # Adjust for scaling first
        if scale != 1.0:
            adjusted = self.adjust_detections_for_scale(adjusted, scale)
        
        # Adjust for ROI cropping
        if roi_bounds is not None:
            adjusted = self.adjust_detections_to_original(adjusted, roi_bounds)
        
        return adjusted
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get performance statistics.
        
        Returns:
            Dict with performance metrics
        """
        avg_processing_time = np.mean(list(self.processing_times)) if self.processing_times else 0
        
        total_frames = self.frame_count
        skip_rate = (self.frames_skipped / total_frames * 100) if total_frames > 0 else 0
        
        return {
            'total_frames': total_frames,
            'frames_skipped': self.frames_skipped,
            'skip_rate_percent': skip_rate,
            'yolo_runs': self.yolo_runs,
            'midas_runs': self.midas_runs,
            'avg_preprocessing_ms': avg_processing_time * 1000,
            'current_frame_gap': self.get_frame_gap(),
            'current_resolution': self.get_target_resolution(),
            'processing_level': self.current_level.value
        }
    
    def draw_stats_overlay(self, frame: np.ndarray) -> np.ndarray:
        """
        Draw minimal optimization stats overlay on frame.
        
        Args:
            frame: Frame to draw on
            
        Returns:
            Annotated frame
        """
        annotated = frame.copy()
        height, width = frame.shape[:2]
        
        stats = self.get_stats()
        
        # Draw compact stats (top-right corner to avoid overlap)
        line = f"OPT:{self.current_level.value} G:{stats['current_frame_gap']} R:{stats['current_resolution']} S:{stats['skip_rate_percent']:.0f}%"
        
        # Position at top-right
        text_size = cv2.getTextSize(line, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)[0]
        panel_x = width - text_size[0] - 15
        panel_y = 50
        
        # Semi-transparent background
        cv2.rectangle(annotated, (panel_x - 5, panel_y - 15),
                     (panel_x + text_size[0] + 5, panel_y + 5),
                     (0, 0, 0), -1)
        
        # Color based on level
        color = (0, 255, 255)  # Cyan default
        if self.current_level == ProcessingLevel.CRITICAL:
            color = (0, 0, 255)  # Red
        elif self.current_level == ProcessingLevel.HIGH:
            color = (0, 165, 255)  # Orange
        elif self.current_level == ProcessingLevel.MINIMAL:
            color = (0, 255, 0)  # Green (saving power)
        
        cv2.putText(annotated, line, (panel_x, panel_y),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)
        
        return annotated


# =============================================================================
# Utility function for easy integration
# =============================================================================

def create_adaptive_processor(width: int = 1280, height: int = 720,
                             speed_source: str = 'manual') -> AdaptiveProcessor:
    """
    Factory function to create configured AdaptiveProcessor.
    
    Args:
        width: Frame width
        height: Frame height
        speed_source: Speed input source ('manual', 'gps', 'obd')
        
    Returns:
        Configured AdaptiveProcessor instance
    """
    processor = AdaptiveProcessor(width, height)
    print(f"📊 Adaptive Processor created for {width}x{height}")
    return processor
