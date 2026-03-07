/**
 * StreamingScreen
 * ===============
 * Shows the live camera feed and streams frames to the device server.
 *
 * - Alternates between back camera (road → /stream/road)
 *   and front camera (driver face → /stream/driver) on a configurable timer.
 * - Captures frames at configured FPS and POSTs as JPEG to the server.
 * - Shows connection status, current camera, and frame count.
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { loadSettings } from '../services/settingsStorage';
import { sendFrame, setServerUrl, checkHealth } from '../services/streamService';

const COLORS = {
  bg:      '#0a0f1e',
  card:    '#111827',
  accent:  '#00d4ff',
  green:   '#28a745',
  red:     '#dc3545',
  yellow:  '#ffc107',
  white:   '#e8ecf0',
  subtext: '#6b7280',
};

export default function StreamingScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // Settings
  const [settings, setSettings]         = useState(null);
  const [serverOk, setServerOk]         = useState(false);

  // Camera state
  const [facing, setFacing]             = useState('back');   // 'back' = road, 'front' = driver
  const [streaming, setStreaming]        = useState(false);
  const [framesSent, setFramesSent]     = useState(0);
  const [lastSource, setLastSource]     = useState('—');
  const [lastStatus, setLastStatus]     = useState('—');

  // Timer refs
  const streamTimerRef  = useRef(null);
  const switchTimerRef  = useRef(null);
  const healthTimerRef  = useRef(null);
  const isCapturing     = useRef(false);
  const facingRef       = useRef('back');

  // Keep facingRef in sync
  useEffect(() => { facingRef.current = facing; }, [facing]);

  // Load settings on mount
  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setServerUrl(s.serverHost, s.serverPort);
    });
    return () => stopStreaming();
  }, []);

  // Health-check loop
  useEffect(() => {
    const checkLoop = async () => {
      const ok = await checkHealth();
      setServerOk(ok);
    };
    checkLoop();
    healthTimerRef.current = setInterval(checkLoop, 5000);
    return () => clearInterval(healthTimerRef.current);
  }, [settings]);

  // Capture one frame and send it
  const captureAndSend = useCallback(async () => {
    if (!cameraRef.current || isCapturing.current) return;
    isCapturing.current = true;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.45,
        skipProcessing: true,
        exif: false,
      });
      const source = facingRef.current === 'back' ? 'road' : 'driver';
      const ok = await sendFrame(photo.uri, source);
      setLastSource(source);
      setLastStatus(ok ? 'sent ✓' : 'failed ✗');
      if (ok) setFramesSent((n) => n + 1);
    } catch (e) {
      setLastStatus('error');
    } finally {
      isCapturing.current = false;
    }
  }, []);

  const startStreaming = useCallback(() => {
    if (!settings) return;
    setStreaming(true);
    setFramesSent(0);

    const fps      = Math.max(1, Math.min(15, parseInt(settings.streamFps, 10) || 5));
    const interval = 1000 / fps;  // ms between frames

    // Frame capture loop
    streamTimerRef.current = setInterval(captureAndSend, interval);

    // Camera switch loop: stay on back (road) for switchInterval s, then
    // flip to front (driver) for 2 s, then back again
    const switchSec = Math.max(2, parseInt(settings.switchInterval, 10) || 4);
    const scheduledSwitch = () => {
      setFacing('front');
      switchTimerRef.current = setTimeout(() => {
        setFacing('back');
        switchTimerRef.current = setTimeout(scheduledSwitch, switchSec * 1000);
      }, 2000);
    };
    switchTimerRef.current = setTimeout(scheduledSwitch, switchSec * 1000);
  }, [settings, captureAndSend]);

  const stopStreaming = useCallback(() => {
    setStreaming(false);
    clearInterval(streamTimerRef.current);
    clearTimeout(switchTimerRef.current);
  }, []);

  // ---- Render ----

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera permission required.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cameraLabel = facing === 'back' ? '🚌 Road (Back Camera)' : '👤 Driver (Front Camera)';
  const endpoint    = `/stream/${facing === 'back' ? 'road' : 'driver'}`;

  return (
    <View style={styles.root}>
      {/* Camera preview */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        key={facing}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={[styles.dot, { backgroundColor: serverOk ? COLORS.green : COLORS.red }]} />
          <Text style={styles.serverText}>
            {settings ? `${settings.serverHost}:${settings.serverPort}` : '…'}
            {' · '}
            {serverOk ? 'Connected' : 'No Server'}
          </Text>
        </View>

        {/* Camera label */}
        <View style={styles.camLabel}>
          <Text style={styles.camLabelText}>{cameraLabel}</Text>
          <Text style={styles.endpointText}>{endpoint}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatBox label="Frames Sent" value={framesSent} />
          <StatBox label="Last Stream" value={lastSource} />
          <StatBox label="Status"      value={lastStatus} />
        </View>

        {/* Start / Stop button */}
        <TouchableOpacity
          style={[styles.streamBtn, streaming ? styles.stopBtn : styles.startBtn]}
          onPress={streaming ? stopStreaming : startStreaming}
          disabled={!settings}
        >
          <Text style={styles.streamBtnText}>
            {streaming ? '⏹  Stop Streaming' : '▶  Start Streaming'}
          </Text>
        </TouchableOpacity>

        {settings && (
          <Text style={styles.hintText}>
            Back cam {settings.switchInterval}s → Front cam 2s → repeat · {settings.streamFps} fps
          </Text>
        )}
      </View>
    </View>
  );
}

function StatBox({ label, value }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{String(value)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.bg },
  center:  { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: 20 },
  camera:  { flex: 1 },

  overlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    justifyContent: 'flex-end', padding: 16,
  },

  topBar: {
    position: 'absolute', top: 16, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 8,
  },
  dot:        { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  serverText: { color: COLORS.white, fontSize: 13, flex: 1 },

  camLabel: {
    position: 'absolute', top: 60, left: 16,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 6, padding: 6,
  },
  camLabelText: { color: COLORS.accent, fontSize: 15, fontWeight: '700' },
  endpointText: { color: COLORS.subtext, fontSize: 11 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statBox:  {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8,
    padding: 10, marginHorizontal: 4, alignItems: 'center',
  },
  statValue: { color: COLORS.accent, fontSize: 16, fontWeight: '700' },
  statLabel: { color: COLORS.subtext, fontSize: 11, marginTop: 2 },

  streamBtn: {
    borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 8,
  },
  startBtn:     { backgroundColor: COLORS.green },
  stopBtn:      { backgroundColor: COLORS.red },
  streamBtnText:{ color: '#fff', fontSize: 16, fontWeight: '700' },

  hintText: { color: COLORS.subtext, fontSize: 11, textAlign: 'center', marginBottom: 4 },

  text:    { color: COLORS.white, fontSize: 15, textAlign: 'center', marginBottom: 16 },
  btn:     { backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: 'center' },
  btnText: { color: '#000', fontWeight: '700' },
});
