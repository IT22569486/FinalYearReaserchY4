#!/usr/bin/env python3
"""
Detection-Informed Video Enhancement for Context-Aware Monitoring.

Inspired by: "High-Dynamic-Range Tone Mapping in Intelligent Automotive Systems"
             Shopovska et al., Sensors 2023, 23(12), 5767.
             DOI: 10.3390/s23125767

The paper proposes a lightweight CNN (DI-TM) that tone maps HDR video frames
into 8-bit representations optimized for YOLO object detection rather than
just visual quality. Key insights adapted here:

  1. MULTI-SCALE processing (local + global branches, like the DI-TM CNN)
     => We use CLAHE for local contrast + global histogram analysis
  2. DETECTION-INFORMED optimization — enhance where objects are likely
     => Road ROI gets stronger enhancement than sky
     => Adaptive per-region CLAHE based on zone importance
  3. NOISE-AWARE processing in dark regions (paper's key finding)
     => Dark pixels get stronger denoising before contrast stretching
  4. CONTRAST-TO-NOISE RATIO optimization (paper Section 3.3)
     => Preserve edges while removing noise (bilateral + unsharp)
  5. AUTO scene adaptation (like DI-TM adapting to tunnel/night/day)
     => Analyze brightness/contrast/noise per frame for auto-tuning

All operations are classical OpenCV — NO neural network required — 
designed for Raspberry Pi real-time processing (target < 15 ms/frame).

Author: Sandaru Abey
"""

import cv2
import numpy as np
import time
from typing import Tuple, Optional, Dict, Any
from enum import Enum


class EnhancementLevel(Enum):
    """Enhancement intensity levels."""
    NONE = "NONE"           # No enhancement (passthrough)
    LIGHT = "LIGHT"         # Fast: CLAHE + light denoise only (~5ms)
    MODERATE = "MODERATE"   # Balanced: CLAHE + denoise + sharpen (~10ms)
    HEAVY = "HEAVY"         # Full pipeline: all stages enabled (~20ms)
    AUTO = "AUTO"           # Auto-detect scene and adapt dynamically


class VideoEnhancer:
    """
    Detection-Informed Video Enhancer (DI-VE).

    Adapts concepts from the DI-TM paper (Shopovska et al. 2023) for
    real-time classical CV processing on Raspberry Pi.

    The paper's CNN uses local + global branches to produce detection-
    optimal tone-mapped frames. We replicate this strategy with:

      Local branch  => per-region CLAHE (adaptive contrast)
      Global branch => scene-level brightness/noise analysis
      Fusion        => detection-weighted combination

    Enhancement pipeline (in order):
      1. Stabilization  — ECC jitter reduction (bumpy roads)
      2. Denoise        — Noise-aware bilateral filter
      3. White Balance   — Gray-world auto correction
      4. Dehaze         — Lightweight dark channel prior
      5. CLAHE          — Detection-informed multi-zone contrast
      6. Gamma          — Auto-brightness for dark scenes
      7. Sharpen        — Unsharp mask for edge detail
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the video enhancer.

        Args:
            config: Enhancement config dict from device_config.json.
                    Nested under components.context_aware_monitoring.video_enhancement
        """
        cfg = config or {}

        # Parse enhancement level
        level_str = cfg.get("enhancement_level", "MODERATE").upper()
        try:
            self.level = EnhancementLevel[level_str]
        except KeyError:
            self.level = EnhancementLevel.MODERATE

        # Individual toggles
        self.enable_denoise = cfg.get("enable_denoise", True)
        self.enable_white_balance = cfg.get("enable_white_balance", True)
        self.enable_dehaze = cfg.get("enable_dehaze", False)
        self.enable_clahe = cfg.get("enable_clahe", True)
        self.enable_sharpen = cfg.get("enable_sharpen", True)
        self.enable_gamma = cfg.get("enable_gamma", True)
        self.enable_stabilization = cfg.get("enable_stabilization", False)

        # Parameters
        self.clahe_clip_limit = cfg.get("clahe_clip_limit", 2.5)
        self.clahe_grid_size = cfg.get("clahe_grid_size", 8)
        self.denoise_strength = cfg.get("denoise_strength", 5)
        self.sharpen_amount = cfg.get("sharpen_amount", 0.3)
        self.gamma = cfg.get("gamma", 0)  # 0 = auto
        self.target_brightness = cfg.get("target_brightness", 120)

        # Detection-Informed: road ROI gets stronger enhancement
        # (paper insight — object regions matter more than sky)
        self.road_roi_top_ratio = cfg.get("road_roi_top_ratio", 0.40)

        # Apply level presets
        self._apply_level_presets()

        # Initialize CLAHE operators
        # Paper insight: multi-scale local processing
        # We use two CLAHE: normal for sky, stronger for road ROI
        self._clahe_normal = cv2.createCLAHE(
            clipLimit=self.clahe_clip_limit,
            tileGridSize=(self.clahe_grid_size, self.clahe_grid_size)
        )
        self._clahe_road = cv2.createCLAHE(
            clipLimit=min(self.clahe_clip_limit * 1.5, 6.0),
            tileGridSize=(self.clahe_grid_size, self.clahe_grid_size)
        )

        # Pre-compute gamma LUT cache
        self._gamma_lut_cache = {}

        # Stabilization state
        self._prev_gray = None
        self._warp_matrix = np.eye(2, 3, dtype=np.float32)

        # Performance tracking
        self._process_times = []
        self._frame_count = 0

        # AUTO mode — scene analysis history
        self._brightness_history = []
        self._scene_is_dark = False
        self._scene_is_hazy = False

        print(f"  VideoEnhancer initialized (Level: {self.level.value})")
        self._print_config()

    # =========================================================================
    # Level presets
    # =========================================================================

    def _apply_level_presets(self):
        """Apply preset configurations for each enhancement level."""
        if self.level == EnhancementLevel.NONE:
            self.enable_denoise = False
            self.enable_white_balance = False
            self.enable_dehaze = False
            self.enable_clahe = False
            self.enable_sharpen = False
            self.enable_gamma = False
            self.enable_stabilization = False

        elif self.level == EnhancementLevel.LIGHT:
            self.enable_denoise = True
            self.enable_white_balance = False
            self.enable_dehaze = False
            self.enable_clahe = True
            self.enable_sharpen = False
            self.enable_gamma = True
            self.enable_stabilization = False
            self.denoise_strength = 3
            self.clahe_clip_limit = 2.0

        elif self.level == EnhancementLevel.MODERATE:
            self.enable_denoise = True
            self.enable_white_balance = True
            self.enable_dehaze = False
            self.enable_clahe = True
            self.enable_sharpen = True
            self.enable_gamma = True
            self.enable_stabilization = False

        elif self.level == EnhancementLevel.HEAVY:
            self.enable_denoise = True
            self.enable_white_balance = True
            self.enable_dehaze = True
            self.enable_clahe = True
            self.enable_sharpen = True
            self.enable_gamma = True
            self.enable_stabilization = True
            self.denoise_strength = 7
            self.clahe_clip_limit = 3.0
            self.sharpen_amount = 0.4

        elif self.level == EnhancementLevel.AUTO:
            # Start moderate, adapt per frame
            self.enable_denoise = True
            self.enable_white_balance = True
            self.enable_dehaze = False
            self.enable_clahe = True
            self.enable_sharpen = True
            self.enable_gamma = True
            self.enable_stabilization = False

    def _print_config(self):
        """Print active pipeline stages."""
        active = []
        if self.enable_denoise:
            active.append(f"Denoise(h={self.denoise_strength})")
        if self.enable_white_balance:
            active.append("WB")
        if self.enable_dehaze:
            active.append("Dehaze")
        if self.enable_clahe:
            active.append(f"CLAHE(clip={self.clahe_clip_limit})")
        if self.enable_sharpen:
            active.append(f"Sharpen({self.sharpen_amount})")
        if self.enable_gamma:
            active.append(f"Gamma({'auto' if self.gamma <= 0 else self.gamma})")
        if self.enable_stabilization:
            active.append("Stabilize")
        print(f"    Pipeline: {' → '.join(active) if active else 'PASSTHROUGH'}")

    # =========================================================================
    # Scene Analysis (AUTO mode) — analogous to DI-TM global branch
    # =========================================================================

    def _analyze_scene(self, frame: np.ndarray) -> Dict[str, Any]:
        """
        Analyze the scene — acts like the paper's "global branch" that
        summarizes overall illumination into a feature vector.

        The DI-TM paper uses strided convolutions to compress the
        full image into a 64-element global vector. We approximate this
        with histogram statistics (mean, std, range, noise estimate).
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape

        # Overall brightness
        mean_brightness = float(np.mean(gray))
        self._brightness_history.append(mean_brightness)
        if len(self._brightness_history) > 30:
            self._brightness_history.pop(0)
        avg_brightness = np.mean(self._brightness_history)

        # Road region analysis (bottom 60% — where objects are)
        road_start = int(h * self.road_roi_top_ratio)
        road_region = gray[road_start:, :]
        road_brightness = float(np.mean(road_region))
        road_contrast = float(np.std(road_region))

        # Sky/top region analysis
        sky_region = gray[:road_start, :]
        sky_brightness = float(np.mean(sky_region))

        # Contrast range (paper notes this is key for haze detection)
        min_val = float(np.min(gray))
        max_val = float(np.max(gray))
        contrast_range = max_val - min_val
        std_dev = float(np.std(gray))

        # Scene classification
        self._scene_is_dark = avg_brightness < 80
        self._scene_is_hazy = contrast_range < 120 and std_dev < 40

        # Brightness ratio between sky and road
        # Paper insight: tunnel entry = bright sky + dark road
        brightness_ratio = sky_brightness / max(road_brightness, 1.0)

        return {
            'brightness': avg_brightness,
            'road_brightness': road_brightness,
            'road_contrast': road_contrast,
            'sky_brightness': sky_brightness,
            'brightness_ratio': brightness_ratio,
            'contrast_range': contrast_range,
            'is_dark': self._scene_is_dark,
            'is_hazy': self._scene_is_hazy,
            'is_tunnel_entry': brightness_ratio > 2.5,
        }

    def _auto_configure(self, scene: Dict[str, Any]):
        """
        Auto-configure based on scene analysis.

        Paper finding: "Two main factors negatively affect detection —
        noise in dark scenes and image brightness." (Section 3.3)
        """
        # Dark scene → stronger gamma + stronger CLAHE
        if scene['is_dark']:
            self.clahe_clip_limit = 3.5
            self.denoise_strength = 7  # Paper: noise worst in dark scenes
        elif scene.get('is_tunnel_entry', False):
            # Tunnel entry: high brightness ratio → need local tone mapping
            self.clahe_clip_limit = 4.0
            self.denoise_strength = 5
        else:
            self.clahe_clip_limit = 2.0
            self.denoise_strength = 3

        # Rebuild CLAHE with updated params
        self._clahe_normal = cv2.createCLAHE(
            clipLimit=self.clahe_clip_limit,
            tileGridSize=(self.clahe_grid_size, self.clahe_grid_size)
        )
        self._clahe_road = cv2.createCLAHE(
            clipLimit=min(self.clahe_clip_limit * 1.5, 6.0),
            tileGridSize=(self.clahe_grid_size, self.clahe_grid_size)
        )

        # Hazy → enable dehazing
        self.enable_dehaze = scene['is_hazy']

    # =========================================================================
    # Enhancement Operations
    # =========================================================================

    def _denoise(self, frame: np.ndarray) -> np.ndarray:
        """
        Noise-aware denoising — paper's key contribution.

        The paper emphasizes "contrast-to-noise ratio" optimization:
        dark regions get stronger denoising since lifting dark pixels
        amplifies sensor noise. This bilateral filter preserves edges
        (important for YOLO object boundary detection).
        """
        return cv2.bilateralFilter(
            frame, d=5,
            sigmaColor=self.denoise_strength * 10,
            sigmaSpace=self.denoise_strength * 10
        )

    def _white_balance(self, frame: np.ndarray) -> np.ndarray:
        """
        Gray-world white balance correction.
        Fixes color casts from artificial bus lighting, streetlights, etc.
        """
        b, g, r = cv2.split(frame.astype(np.float32))
        avg_b, avg_g, avg_r = np.mean(b), np.mean(g), np.mean(r)
        avg_gray = (avg_b + avg_g + avg_r) / 3.0

        if avg_b > 0:
            b = np.clip(b * (avg_gray / avg_b), 0, 255)
        if avg_g > 0:
            g = np.clip(g * (avg_gray / avg_g), 0, 255)
        if avg_r > 0:
            r = np.clip(r * (avg_gray / avg_r), 0, 255)

        return cv2.merge([b, g, r]).astype(np.uint8)

    def _dehaze(self, frame: np.ndarray) -> np.ndarray:
        """
        Lightweight dark-channel-prior dehazing.

        The paper notes that tone-mapped tunnel/fog images lose object
        contrast. This restores visibility by estimating atmospheric
        light and removing the haze component.

        Optimized: small 7x7 kernels for Raspberry Pi speed.
        """
        img = frame.astype(np.float64) / 255.0
        dark_ch = np.min(img, axis=2)

        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
        dark_ch = cv2.erode(dark_ch, kernel)

        # Atmospheric light from brightest dark-channel pixels
        flat = dark_ch.flatten()
        n_bright = max(int(len(flat) * 0.001), 1)
        indices = np.argpartition(flat, -n_bright)[-n_bright:]
        h, w = frame.shape[:2]
        atm_light = np.mean(img[indices // w, indices % w], axis=0)
        atm_light = np.clip(atm_light, 0.1, 1.0)

        # Transmission estimate
        norm_dark = np.min(img / atm_light, axis=2)
        norm_dark = cv2.erode(norm_dark, kernel)
        transmission = np.clip(1.0 - 0.85 * norm_dark, 0.1, 1.0)

        # Recover scene
        t3 = np.maximum(np.stack([transmission] * 3, axis=2), 0.1)
        result = (img - atm_light) / t3 + atm_light
        return np.clip(result * 255, 0, 255).astype(np.uint8)

    def _apply_clahe_detection_informed(self, frame: np.ndarray) -> np.ndarray:
        """
        Detection-Informed CLAHE — the paper's core contribution adapted.

        The DI-TM paper processes images through local (pixel-level) and
        global (image-level) branches. The key insight is that object
        regions (road area, lower frame) need different contrast treatment
        than background regions (sky, upper frame).

        Our adaptation:
          - Split frame into sky zone (top 40%) and road zone (bottom 60%)
          - Apply weaker CLAHE to sky (reduces noise amplification)
          - Apply stronger CLAHE to road (enhances object visibility)
          - Blend at boundary to avoid artifacts

        This mirrors the paper's finding that "increasing sampling density
        of object regions during training" improves detection.
        """
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)
        h, w = l_ch.shape

        # Calculate split point with blending zone
        road_start = int(h * self.road_roi_top_ratio)
        blend_height = max(int(h * 0.05), 10)  # 5% blend zone

        # Apply CLAHE to sky region (lighter)
        sky_l = l_ch[:road_start + blend_height, :]
        sky_enhanced = self._clahe_normal.apply(sky_l)

        # Apply stronger CLAHE to road region (detection-important)
        road_l = l_ch[road_start - blend_height:, :]
        road_enhanced = self._clahe_road.apply(road_l)

        # Compose with smooth blending at boundary
        l_result = np.zeros_like(l_ch)

        # Sky portion (above blend zone)
        l_result[:road_start - blend_height, :] = sky_enhanced[:road_start - blend_height, :]

        # Road portion (below blend zone)
        l_result[road_start + blend_height:, :] = road_enhanced[2 * blend_height:, :]

        # Blend zone — weighted average to avoid visible seam
        for i in range(2 * blend_height):
            alpha = i / (2 * blend_height)  # 0 → 1
            row_idx = road_start - blend_height + i
            sky_row_idx = row_idx  # index into sky_enhanced
            road_row_idx = i       # index into road_enhanced
            if sky_row_idx < sky_enhanced.shape[0] and road_row_idx < road_enhanced.shape[0]:
                l_result[row_idx, :] = (
                    (1 - alpha) * sky_enhanced[sky_row_idx, :] +
                    alpha * road_enhanced[road_row_idx, :]
                ).astype(np.uint8)

        lab_result = cv2.merge([l_result, a_ch, b_ch])
        return cv2.cvtColor(lab_result, cv2.COLOR_LAB2BGR)

    def _gamma_correction(self, frame: np.ndarray) -> np.ndarray:
        """
        Auto-gamma for brightness normalization.

        Paper insight: detection performance drops sharply when
        "image brightness in dark scenes" is not corrected. Auto-gamma
        targets consistent brightness regardless of lighting.
        """
        gamma = self.gamma
        if gamma <= 0:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            mean_bright = float(np.mean(gray))
            if mean_bright > 10:
                gamma = np.log(self.target_brightness / 255.0) / np.log(mean_bright / 255.0)
                gamma = np.clip(gamma, 0.4, 2.5)
            else:
                gamma = 0.5

        if abs(gamma - 1.0) < 0.05:
            return frame

        # Use cached LUT for speed (paper: "computational efficiency is
        # an important constraint for ADAS applications")
        gamma_key = round(gamma, 2)
        if gamma_key not in self._gamma_lut_cache:
            inv_g = 1.0 / gamma
            self._gamma_lut_cache[gamma_key] = np.array([
                np.clip(pow(i / 255.0, inv_g) * 255.0, 0, 255)
                for i in range(256)
            ]).astype(np.uint8)
            # Keep cache bounded
            if len(self._gamma_lut_cache) > 20:
                oldest = next(iter(self._gamma_lut_cache))
                del self._gamma_lut_cache[oldest]

        return cv2.LUT(frame, self._gamma_lut_cache[gamma_key])

    def _sharpen(self, frame: np.ndarray) -> np.ndarray:
        """
        Unsharp mask sharpening.

        Paper Section 3.1: "local processing branch encodes local image
        features related to object edges and structures" — sharpening
        makes edges more prominent for YOLO boundary detection.
        """
        blurred = cv2.GaussianBlur(frame, (0, 0), sigmaX=2.0)
        sharpened = cv2.addWeighted(
            frame, 1.0 + self.sharpen_amount,
            blurred, -self.sharpen_amount, 0
        )
        return np.clip(sharpened, 0, 255).astype(np.uint8)

    def _stabilize(self, frame: np.ndarray) -> np.ndarray:
        """
        Lightweight ECC-based frame stabilization.
        Reduces bus vibration jitter for cleaner model inputs.
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        if self._prev_gray is None:
            self._prev_gray = gray
            return frame

        try:
            warp = np.eye(2, 3, dtype=np.float32)
            criteria = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 50, 1e-3)

            # Downscale for speed
            s = 0.5
            small_prev = cv2.resize(self._prev_gray, None, fx=s, fy=s)
            small_curr = cv2.resize(gray, None, fx=s, fy=s)

            _, warp = cv2.findTransformECC(
                small_prev, small_curr, warp,
                cv2.MOTION_TRANSLATION, criteria
            )
            warp[0, 2] /= s
            warp[1, 2] /= s

            # Smooth
            self._warp_matrix = 0.7 * self._warp_matrix + 0.3 * warp
            h, w = frame.shape[:2]
            stabilized = cv2.warpAffine(
                frame, self._warp_matrix, (w, h),
                flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP,
                borderMode=cv2.BORDER_REPLICATE
            )
            self._prev_gray = gray
            return stabilized
        except cv2.error:
            self._prev_gray = gray
            return frame

    # =========================================================================
    # Main Enhancement Pipeline
    # =========================================================================

    def enhance(self, frame: np.ndarray) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Apply the full detection-informed enhancement pipeline.

        This is the main entry point — call before feeding frames to
        YOLO and MiDaS. Follows the DI-TM paper's philosophy of
        optimizing preprocessing for detection performance rather than
        just perceptual visual quality.

        Args:
            frame: Raw BGR frame from camera/video

        Returns:
            (enhanced_frame, stats_dict)
        """
        if self.level == EnhancementLevel.NONE:
            return frame, {'level': 'NONE', 'time_ms': 0}

        self._frame_count += 1
        t_start = time.time()
        enhanced = frame.copy()
        stats = {'level': self.level.value}

        # AUTO: re-analyze scene every 10 frames
        if self.level == EnhancementLevel.AUTO and self._frame_count % 10 == 1:
            scene = self._analyze_scene(frame)
            self._auto_configure(scene)
            stats['scene'] = scene

        # 1. Stabilization
        if self.enable_stabilization:
            enhanced = self._stabilize(enhanced)

        # 2. Denoise (paper: "contrast-to-noise ratio" is critical)
        if self.enable_denoise:
            enhanced = self._denoise(enhanced)

        # 3. White Balance
        if self.enable_white_balance:
            enhanced = self._white_balance(enhanced)

        # 4. Dehaze
        if self.enable_dehaze:
            enhanced = self._dehaze(enhanced)

        # 5. Detection-Informed CLAHE (paper's local+global concept)
        if self.enable_clahe:
            enhanced = self._apply_clahe_detection_informed(enhanced)

        # 6. Gamma correction (paper: dark scene handling)
        if self.enable_gamma:
            enhanced = self._gamma_correction(enhanced)

        # 7. Sharpening (paper: edge structure preservation)
        if self.enable_sharpen:
            enhanced = self._sharpen(enhanced)

        total_ms = (time.time() - t_start) * 1000
        stats['total_ms'] = total_ms
        self._process_times.append(total_ms)
        if len(self._process_times) > 100:
            self._process_times.pop(0)

        return enhanced, stats

    def enhance_for_midas(self, frame: np.ndarray) -> np.ndarray:
        """
        MiDaS-optimized enhancement.

        MiDaS is sensitive to noise and extreme brightness. Apply a
        lighter pipeline: denoise + CLAHE + gamma, but NO sharpening
        (amplifies artifacts) and NO dehazing (changes relative depths).
        """
        enhanced = frame.copy()
        if self.enable_denoise:
            enhanced = self._denoise(enhanced)
        if self.enable_clahe:
            enhanced = self._apply_clahe_detection_informed(enhanced)
        if self.enable_gamma:
            enhanced = self._gamma_correction(enhanced)
        return enhanced

    def get_avg_time_ms(self) -> float:
        """Average enhancement time in ms."""
        return float(np.mean(self._process_times)) if self._process_times else 0.0

    def get_stats_text(self) -> str:
        """Compact stats string for overlay."""
        return f"VE:{self.level.value} {self.get_avg_time_ms():.1f}ms"

    def draw_comparison(self, original: np.ndarray, enhanced: np.ndarray) -> np.ndarray:
        """Create side-by-side original vs enhanced for debugging."""
        h, w = original.shape[:2]
        orig_labeled = original.copy()
        enh_labeled = enhanced.copy()

        cv2.putText(orig_labeled, "ORIGINAL", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        cv2.putText(enh_labeled, "ENHANCED (DI-VE)", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        orig_gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
        enh_gray = cv2.cvtColor(enhanced, cv2.COLOR_BGR2GRAY)

        cv2.putText(orig_labeled,
                    f"Bright:{np.mean(orig_gray):.0f} Contrast:{np.std(orig_gray):.0f}",
                    (10, h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(enh_labeled,
                    f"Bright:{np.mean(enh_gray):.0f} Contrast:{np.std(enh_gray):.0f}",
                    (10, h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        return np.hstack([orig_labeled, enh_labeled])


# =============================================================================
# Factory
# =============================================================================

def create_video_enhancer(component_config: Optional[Dict[str, Any]] = None) -> VideoEnhancer:
    """Create a VideoEnhancer from the context_aware_monitoring component config."""
    ve_config = {}
    if component_config:
        ve_config = component_config.get("video_enhancement", {})
    return VideoEnhancer(config=ve_config)


# =============================================================================
# Standalone test
# =============================================================================

if __name__ == '__main__':
    import sys

    source = 0
    if len(sys.argv) > 1:
        source = sys.argv[1]
        if source.isdigit():
            source = int(source)

    print("=" * 60)
    print("Detection-Informed Video Enhancement Test")
    print("Based on: Shopovska et al., Sensors 2023")
    print("=" * 60)

    enhancer = VideoEnhancer(config={"enhancement_level": "AUTO"})

    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"Failed to open: {source}")
        sys.exit(1)

    print(f"\nSource: {source}")
    print("Keys: 1=LIGHT 2=MODERATE 3=HEAVY 4=AUTO q=quit\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        enhanced, stats = enhancer.enhance(frame)
        comparison = enhancer.draw_comparison(frame, enhanced)

        info = f"Time: {stats['total_ms']:.1f}ms | Level: {stats['level']}"
        cv2.putText(comparison, info, (10, comparison.shape[0] - 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

        disp_w = min(1280, comparison.shape[1])
        scale = disp_w / comparison.shape[1]
        display = cv2.resize(comparison, (disp_w, int(comparison.shape[0] * scale)))
        cv2.imshow('DI-VE Test', display)

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('1'):
            enhancer.level = EnhancementLevel.LIGHT
            enhancer._apply_level_presets()
        elif key == ord('2'):
            enhancer.level = EnhancementLevel.MODERATE
            enhancer._apply_level_presets()
        elif key == ord('3'):
            enhancer.level = EnhancementLevel.HEAVY
            enhancer._apply_level_presets()
        elif key == ord('4'):
            enhancer.level = EnhancementLevel.AUTO
            enhancer._apply_level_presets()

    cap.release()
    cv2.destroyAllWindows()
    print(f"\nAvg enhancement: {enhancer.get_avg_time_ms():.1f}ms")
