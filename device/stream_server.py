#!/usr/bin/env python3
"""
Mobile Video Stream Receiver
=============================
Receives JPEG frames from the mobile app via HTTP POST.
Components (driver_monitor, object_distance_measurement) fetch the latest
frame by calling `get_latest_frame('driver')` or `get_latest_frame('road')`.

Endpoints (all on configurable port, default 5005):
  POST /stream/driver   — front camera frames (driver face)
  POST /stream/road     — rear camera frames  (road view)
  GET  /frame/driver    — fetch latest driver frame as JPEG
  GET  /frame/road      — fetch latest road frame as JPEG
  GET  /health          — JSON status

Usage from other modules:
    from stream_server import start_server, get_latest_frame
    start_server(host='0.0.0.0', port=5005)
    frame_bgr, timestamp = get_latest_frame('road')
"""

import threading
import time
import logging

import cv2
import numpy as np

try:
    from flask import Flask, request, jsonify, Response
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    print("[StreamServer] WARNING: flask not installed. Run: pip install flask")

# ---------------------------------------------------------------------------
# Thread-safe frame store
# ---------------------------------------------------------------------------
_frames_raw = {'driver': None, 'road': None}   # raw JPEG bytes (for fast serve)
_frames_bgr = {'driver': None, 'road': None}   # decoded numpy BGR (for processing)
_frame_times = {'driver': 0.0, 'road': 0.0}
_frame_lock = threading.Lock()

_server_started = False


def get_latest_frame(source: str):
    """
    Return (frame_bgr, timestamp) for the given source ('driver' or 'road').
    frame_bgr is None if no frame has been received yet.
    timestamp is a float (time.time()) of when the frame arrived.
    """
    with _frame_lock:
        return _frames_bgr.get(source), _frame_times.get(source, 0.0)


def has_fresh_frame(source: str, max_age_s: float = 10.0) -> bool:
    """Return True if a frame has been received within max_age_s seconds."""
    with _frame_lock:
        t = _frame_times.get(source, 0.0)
    return t > 0 and (time.time() - t) < max_age_s


def _store_frame(source: str, jpeg_bytes: bytes) -> bool:
    """Decode JPEG bytes and store both raw and BGR copies."""
    arr = np.frombuffer(jpeg_bytes, np.uint8)
    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if frame is None:
        return False
    with _frame_lock:
        _frames_raw[source] = jpeg_bytes
        _frames_bgr[source] = frame
        _frame_times[source] = time.time()
    return True


# ---------------------------------------------------------------------------
# Flask application
# ---------------------------------------------------------------------------
if FLASK_AVAILABLE:
    _app = Flask(__name__)
    _app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10 MB max per frame

    def _extract_jpeg() -> bytes | None:
        """Extract raw JPEG bytes from multipart upload or raw body."""
        if request.files:
            for key in ('file', 'frame', 'image'):
                if key in request.files:
                    return request.files[key].read()
        data = request.get_data()
        return data if data else None

    @_app.route('/stream/driver', methods=['POST'])
    def recv_driver():
        data = _extract_jpeg()
        ok = _store_frame('driver', data) if data else False
        return jsonify({'status': 'ok' if ok else 'error', 'source': 'driver'})

    @_app.route('/stream/road', methods=['POST'])
    def recv_road():
        data = _extract_jpeg()
        ok = _store_frame('road', data) if data else False
        return jsonify({'status': 'ok' if ok else 'error', 'source': 'road'})

    @_app.route('/frame/<source>', methods=['GET'])
    def serve_frame(source):
        """Return the latest frame as image/jpeg (for subprocess components to pull)."""
        if source not in ('driver', 'road'):
            return jsonify({'error': 'Unknown source'}), 404
        with _frame_lock:
            raw = _frames_raw.get(source)
        if raw is None:
            return jsonify({'error': 'No frame yet'}), 503
        return Response(raw, mimetype='image/jpeg')

    @_app.route('/health', methods=['GET'])
    def health():
        now = time.time()
        with _frame_lock:
            driver_age = round(now - _frame_times['driver'], 2) if _frame_times['driver'] else -1
            road_age   = round(now - _frame_times['road'],   2) if _frame_times['road']   else -1
        return jsonify({
            'status': 'ok',
            'driver_frame_age_s': driver_age,
            'road_frame_age_s':   road_age,
        })


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def start_server(host: str = '0.0.0.0', port: int = 5005) -> threading.Thread | None:
    """
    Start the Flask frame-receiver in a background daemon thread.
    Safe to call multiple times (only starts once).
    Returns the thread object or None if Flask is not available.
    """
    global _server_started
    if _server_started:
        return None
    if not FLASK_AVAILABLE:
        print("[StreamServer] Flask unavailable — mobile streaming disabled.")
        return None

    # Suppress Flask/Werkzeug request logs
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)

    def _run():
        _app.run(host=host, port=port, debug=False, use_reloader=False, threaded=True)

    t = threading.Thread(target=_run, daemon=True, name='StreamServer')
    t.start()
    _server_started = True

    print(f"[StreamServer] Listening on http://{host}:{port}")
    print(f"[StreamServer]   POST /stream/driver  — front camera (driver face)")
    print(f"[StreamServer]   POST /stream/road    — rear  camera (road view)")
    print(f"[StreamServer]   GET  /frame/<source> — pull latest frame (for components)")
    print(f"[StreamServer]   GET  /health         — server status")
    return t


# ---------------------------------------------------------------------------
# MobileCapture: drop-in cv2.VideoCapture replacement that polls the server
# ---------------------------------------------------------------------------

class MobileCapture:
    """
    Drop-in replacement for cv2.VideoCapture.
    Polls the local stream server's /frame/<source> endpoint.

    Usage (same API as cv2.VideoCapture):
        cap = MobileCapture('road', server_port=5005)
        if cap.isOpened():
            ret, frame = cap.read()
    """

    def __init__(self, source: str = 'road', server_host: str = '127.0.0.1',
                 server_port: int = 5005, read_timeout_s: float = 3.0,
                 wait_timeout_s: float = 30.0):
        self.source = source
        self._url_frame  = f'http://{server_host}:{server_port}/frame/{source}'
        self._url_health = f'http://{server_host}:{server_port}/health'
        self._read_timeout = read_timeout_s
        self._wait_timeout = wait_timeout_s
        self._opened = False
        self._last_frame = None

        # Try to contact the server
        self._opened = self._wait_for_first_frame()

    def _wait_for_first_frame(self) -> bool:
        import urllib.request
        import urllib.error
        deadline = time.time() + self._wait_timeout
        print(f"[MobileCapture:{self.source}] Waiting for first frame (up to {self._wait_timeout:.0f}s)…")
        while time.time() < deadline:
            try:
                with urllib.request.urlopen(self._url_frame, timeout=2) as resp:
                    if resp.status == 200:
                        data = resp.read()
                        arr = np.frombuffer(data, np.uint8)
                        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                        if frame is not None:
                            self._last_frame = frame
                            print(f"[MobileCapture:{self.source}] First frame received  "
                                  f"({frame.shape[1]}x{frame.shape[0]})")
                            return True
            except Exception:
                pass
            time.sleep(1.0)
            print(f"[MobileCapture:{self.source}] … still waiting (open mobile app and start streaming)")
        print(f"[MobileCapture:{self.source}] Timeout — no frame received.")
        return False

    def isOpened(self) -> bool:
        return self._opened

    def read(self):
        """Fetch the latest frame from the stream server."""
        import urllib.request
        import urllib.error
        try:
            with urllib.request.urlopen(self._url_frame, timeout=self._read_timeout) as resp:
                if resp.status == 200:
                    data = resp.read()
                    arr = np.frombuffer(data, np.uint8)
                    frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                    if frame is not None:
                        self._last_frame = frame
                        return True, frame
        except Exception:
            pass
        # Return last known frame if fetch fails (avoids full stop on brief outage)
        if self._last_frame is not None:
            return True, self._last_frame
        return False, None

    def release(self):
        self._opened = False

    def set(self, prop_id, value):
        pass  # no-op for stream capture

    def get(self, prop_id):
        if self._last_frame is not None:
            h, w = self._last_frame.shape[:2]
            if prop_id == cv2.CAP_PROP_FRAME_WIDTH:  return float(w)
            if prop_id == cv2.CAP_PROP_FRAME_HEIGHT: return float(h)
            if prop_id == cv2.CAP_PROP_FPS:          return 15.0
        return 0.0


# ---------------------------------------------------------------------------
# Stand-alone test
# ---------------------------------------------------------------------------
if __name__ == '__main__':
    print("Starting stream server standalone…")
    start_server()
    print("Server running. Press Ctrl-C to stop.")
    try:
        while True:
            time.sleep(5)
            f_d, t_d = get_latest_frame('driver')
            f_r, t_r = get_latest_frame('road')
            now = time.time()
            print(f"  driver: {'frame ' + str(f_d.shape) if f_d is not None else 'no frame'}  "
                  f"age={round(now-t_d,1) if t_d else '—'}s  |  "
                  f"road: {'frame ' + str(f_r.shape) if f_r is not None else 'no frame'}  "
                  f"age={round(now-t_r,1) if t_r else '—'}s")
    except KeyboardInterrupt:
        print("Stopped.")
