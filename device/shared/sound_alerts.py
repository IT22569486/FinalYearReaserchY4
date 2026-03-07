#!/usr/bin/env python3
"""
Violation Sound Alerts
======================
Plays distinct beep patterns for each violation type.
Reads tone configuration from device_config.json  →  violation_sounds.

Usage:
    from shared.sound_alerts import SoundAlerts
    sa = SoundAlerts(sound_config)
    sa.play('phone_detected')
    sa.play('sleeping')

Sound config shape (from device_config.json):
    {
      "enabled": true,
      "phone_detected":   { "duration_ms": 200, "repeat": 3, "frequency": 1200 },
      "seatbelt_missing": { "duration_ms": 1500,"repeat": 1, "frequency": 900  },
      ...
    }
"""

import threading
import time
import sys

# ---- optional audio backends ----
try:
    import numpy as np
    _NUMPY = True
except ImportError:
    _NUMPY = False

try:
    import pygame
    pygame.mixer.init(frequency=22050, size=-16, channels=2, buffer=512)
    _PYGAME = True
except Exception:
    _PYGAME = False

# ---- cooldown between same-type alerts (seconds) ----
_DEFAULT_COOLDOWN = 3.0


class SoundAlerts:
    """
    Thread-safe violation sound player.
    Each violation type has its own cooldown clock so spamming is suppressed.
    """

    def __init__(self, sound_config: dict, cooldown_s: float = _DEFAULT_COOLDOWN):
        """
        :param sound_config: the 'violation_sounds' section from device_config.json
        :param cooldown_s:   minimum seconds between two alerts of the same type
        """
        self._cfg = sound_config or {}
        self._enabled = self._cfg.get('enabled', True)
        self._cooldown = cooldown_s
        self._last_played: dict[str, float] = {}
        self._lock = threading.Lock()

        if not _PYGAME and not _NUMPY:
            print("[Sound] WARNING: pygame/numpy not installed — using terminal bell fallback")
        elif not _PYGAME:
            print("[Sound] WARNING: pygame not installed — using terminal bell fallback")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def play(self, violation_type: str):
        """
        Trigger the sound for *violation_type* (non-blocking, daemon thread).
        Returns immediately without waiting for playback to finish.
        Silently ignores unknown types or when sounds are disabled.
        """
        if not self._enabled:
            return
        cfg = self._cfg.get(violation_type)
        if not cfg:
            return

        now = time.time()
        with self._lock:
            if now - self._last_played.get(violation_type, 0.0) < self._cooldown:
                return
            self._last_played[violation_type] = now

        threading.Thread(
            target=self._play_sync,
            args=(violation_type, cfg),
            daemon=True,
            name=f'Sound-{violation_type}',
        ).start()

    def play_sync(self, violation_type: str):
        """Blocking version — only use from a dedicated thread."""
        cfg = self._cfg.get(violation_type, {})
        if cfg:
            self._play_sync(violation_type, cfg)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _play_sync(self, violation_type: str, cfg: dict):
        duration_ms = cfg.get('duration_ms', 500)
        frequency   = cfg.get('frequency', 800)
        repeat      = max(1, cfg.get('repeat', 1))

        print(f"[Sound] {violation_type}: {repeat}× {duration_ms} ms @ {frequency} Hz")

        if _PYGAME and _NUMPY:
            self._pygame_beep(duration_ms, frequency, repeat)
        else:
            self._fallback_beep(duration_ms, repeat)

    @staticmethod
    def _pygame_beep(duration_ms: int, frequency: int, repeat: int,
                     volume: float = 0.8):
        try:
            sample_rate = 22050
            n = int(sample_rate * duration_ms / 1000)
            t = np.linspace(0, duration_ms / 1000.0, n, endpoint=False)
            wave = (volume * 32767 * np.sin(2 * np.pi * frequency * t)).astype(np.int16)
            stereo = np.column_stack([wave, wave])
            sound = pygame.sndarray.make_sound(stereo)
            for i in range(repeat):
                sound.play()
                pygame.time.wait(duration_ms + 80)   # +80 ms gap between repeats
        except Exception as e:
            print(f"[Sound] pygame error: {e}")

    @staticmethod
    def _fallback_beep(duration_ms: int, repeat: int):
        """OS-level beep fallback (Windows winsound or terminal bell)."""
        for _ in range(repeat):
            try:
                if sys.platform == 'win32':
                    import winsound
                    winsound.Beep(800, duration_ms)
                else:
                    import subprocess
                    subprocess.run(['beep', '-l', str(duration_ms)],
                                   capture_output=True, timeout=2)
            except Exception:
                print('\a', end='', flush=True)   # terminal bell
            time.sleep((duration_ms + 100) / 1000.0)


# ---------------------------------------------------------------------------
# Convenience factory — loads config from DeviceConfig automatically
# ---------------------------------------------------------------------------

def make_sound_alerts() -> SoundAlerts:
    """
    Create a SoundAlerts instance using violation_sounds from device_config.json.
    Returns a no-op instance if config is unavailable.
    """
    try:
        import sys
        from pathlib import Path
        _dev = Path(__file__).parent.parent
        if str(_dev) not in sys.path:
            sys.path.insert(0, str(_dev))
        from shared.config import DeviceConfig
        cfg = DeviceConfig()
        sound_cfg = cfg.get('violation_sounds', {})
        return SoundAlerts(sound_cfg)
    except Exception as e:
        print(f"[Sound] Could not load config: {e} — sound disabled")
        return SoundAlerts({'enabled': False})
