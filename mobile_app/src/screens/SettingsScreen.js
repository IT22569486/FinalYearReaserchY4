/**
 * SettingsScreen
 * ==============
 * Configure server connection details and streaming parameters.
 * Settings are persisted in AsyncStorage.
 *
 * Fields:
 *   Server Host  — IP or hostname of the device/server (e.g. 192.168.1.15)
 *   Server Port  — Stream receiver port (default 5005)
 *   Stream FPS   — How many frames per second to send (1–15)
 *   Switch Interval — How long to stay on back (road) camera before switching to front
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { loadSettings, saveSettings } from '../services/settingsStorage';
import { setServerUrl, checkHealth } from '../services/streamService';

const COLORS = {
  bg:     '#0a0f1e',
  card:   '#111827',
  border: '#1f2937',
  accent: '#00d4ff',
  green:  '#28a745',
  red:    '#dc3545',
  yellow: '#ffc107',
  white:  '#e8ecf0',
  sub:    '#6b7280',
  input:  '#1a2234',
};

export default function SettingsScreen() {
  const [host,     setHost]     = useState('192.168.1.15');
  const [port,     setPort]     = useState('5005');
  const [fps,      setFps]      = useState('5');
  const [interval, setInterval] = useState('4');
  const [testing,  setTesting]  = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saved,    setSaved]    = useState(false);

  // Load on mount
  useEffect(() => {
    loadSettings().then((s) => {
      setHost(s.serverHost);
      setPort(s.serverPort);
      setFps(s.streamFps);
      setInterval(s.switchInterval);
    });
  }, []);

  const handleSave = useCallback(async () => {
    const settings = {
      serverHost:     host.trim(),
      serverPort:     port.trim(),
      streamFps:      fps.trim(),
      switchInterval: interval.trim(),
    };
    await saveSettings(settings);
    setServerUrl(settings.serverHost, settings.serverPort);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [host, port, fps, interval]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    setServerUrl(host.trim(), port.trim());
    const ok = await checkHealth();
    setTestResult(ok);
    setTesting(false);
  }, [host, port]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Settings</Text>

        {/* ── Server Connection ────────────────────── */}
        <Card title="Server Connection">
          <Label>Server IP / Host</Label>
          <TextInput
            style={styles.input}
            value={host}
            onChangeText={setHost}
            placeholder="e.g. 192.168.1.15 or server.example.com"
            placeholderTextColor={COLORS.sub}
            autoCapitalize="none"
            keyboardType="url"
          />
          <Text style={styles.hint}>
            Local test: your PC's Wi-Fi IP (192.168.1.15){'\n'}
            After DigitalOcean deploy: server public IP or domain
          </Text>

          <Label>Stream Port</Label>
          <TextInput
            style={styles.input}
            value={port}
            onChangeText={setPort}
            placeholder="5005"
            placeholderTextColor={COLORS.sub}
            keyboardType="number-pad"
          />

          {/* Test connection */}
          <TouchableOpacity style={styles.testBtn} onPress={handleTest} disabled={testing}>
            <Text style={styles.testBtnText}>
              {testing ? 'Testing…' : '🔌  Test Connection'}
            </Text>
          </TouchableOpacity>
          {testResult !== null && (
            <View style={[styles.resultBox, { borderColor: testResult ? COLORS.green : COLORS.red }]}>
              <Text style={{ color: testResult ? COLORS.green : COLORS.red, fontWeight: '700' }}>
                {testResult ? '✓ Server reachable' : '✗ Cannot reach server'}
              </Text>
              {!testResult && (
                <Text style={styles.hint}>
                  Make sure: {'\n'}
                  • Device Python is running (python main.py){'\n'}
                  • streaming_server.enabled = true in device_config.json{'\n'}
                  • IP and port match{'\n'}
                  • Phone and PC are on the same Wi-Fi (or server is deployed)
                </Text>
              )}
            </View>
          )}
        </Card>

        {/* ── Streaming Parameters ─────────────────── */}
        <Card title="Streaming Parameters">
          <Label>Frames Per Second (1–15)</Label>
          <TextInput
            style={styles.input}
            value={fps}
            onChangeText={setFps}
            placeholder="5"
            placeholderTextColor={COLORS.sub}
            keyboardType="number-pad"
          />
          <Text style={styles.hint}>
            Recommended: 5 fps for most networks. Lower = less bandwidth. Higher = more accurate detection.
          </Text>

          <Label>Back-Camera Interval (seconds)</Label>
          <TextInput
            style={styles.input}
            value={interval}
            onChangeText={setInterval}
            placeholder="4"
            placeholderTextColor={COLORS.sub}
            keyboardType="number-pad"
          />
          <Text style={styles.hint}>
            App stays on BACK camera (road) for this many seconds, then switches to FRONT (driver face) for 2 seconds, then repeats.
            Increase for more road monitoring; decrease for more driver monitoring.
          </Text>
        </Card>

        {/* ── Architecture Info ─────────────────────── */}
        <Card title="System Architecture">
          <InfoRow icon="📱" label="This app" value="Streams video only" />
          <InfoRow icon="🖥️"  label="Device/Server" value="Runs AI models (YOLO, MiDaS)" />
          <InfoRow icon="📡" label="Backend" value="Node.js + Firebase (same server)" />
          <InfoRow icon="🌐" label="Web Dashboard" value="React web frontend" />
          <Text style={styles.archNote}>
            Stream endpoints on server:{'\n'}
            {'  '}POST /stream/driver — front camera (driver face){'\n'}
            {'  '}POST /stream/road   — rear camera (road view){'\n'}
            {'  '}GET  /health        — server health check
          </Text>
        </Card>

        {/* ── Save button ──────────────────────────── */}
        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.savedBtn]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>
            {saved ? '✓ Saved!' : 'Save Settings'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ---- sub-components ----

function Card({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  pageTitle: { color: COLORS.accent, fontSize: 22, fontWeight: '700', marginBottom: 16 },

  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { color: COLORS.accent, fontSize: 14, fontWeight: '700',
               textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  label: { color: COLORS.white, fontSize: 13, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: COLORS.input, borderRadius: 8, borderWidth: 1,
    borderColor: COLORS.border, color: COLORS.white, fontSize: 15,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  hint: { color: COLORS.sub, fontSize: 11, marginTop: 6, lineHeight: 16 },

  testBtn: {
    backgroundColor: COLORS.accent, borderRadius: 8, padding: 12,
    alignItems: 'center', marginTop: 14,
  },
  testBtnText: { color: '#000', fontWeight: '700', fontSize: 14 },

  resultBox: {
    borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 10,
  },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  infoIcon:  { fontSize: 16, width: 28 },
  infoLabel: { color: COLORS.sub, fontSize: 12, flex: 1 },
  infoValue: { color: COLORS.white, fontSize: 12, flex: 1, textAlign: 'right' },
  archNote:  { color: COLORS.sub, fontSize: 11, marginTop: 10, lineHeight: 17,
               backgroundColor: '#0d1117', borderRadius: 6, padding: 8 },

  saveBtn:   {
    backgroundColor: COLORS.accent, borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 4,
  },
  savedBtn:  { backgroundColor: COLORS.green },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
