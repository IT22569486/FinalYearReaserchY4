/**
 * Settings storage using AsyncStorage.
 * Persists server connection settings between app launches.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  SERVER_HOST: 'ctb_server_host',
  SERVER_PORT: 'ctb_server_port',
  STREAM_FPS:  'ctb_stream_fps',
  SWITCH_INTERVAL: 'ctb_switch_interval',
};

const DEFAULTS = {
  serverHost: '192.168.1.15',   // local PC IP — change to server IP after deploy
  serverPort: '5005',
  streamFps: '5',               // frames per second to send
  switchInterval: '4',          // seconds between camera switch (back→front→back)
};

export async function loadSettings() {
  try {
    const [host, port, fps, interval] = await AsyncStorage.multiGet([
      KEYS.SERVER_HOST,
      KEYS.SERVER_PORT,
      KEYS.STREAM_FPS,
      KEYS.SWITCH_INTERVAL,
    ]);
    return {
      serverHost:     host[1]     ?? DEFAULTS.serverHost,
      serverPort:     port[1]     ?? DEFAULTS.serverPort,
      streamFps:      fps[1]      ?? DEFAULTS.streamFps,
      switchInterval: interval[1] ?? DEFAULTS.switchInterval,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveSettings(settings) {
  try {
    await AsyncStorage.multiSet([
      [KEYS.SERVER_HOST,     settings.serverHost],
      [KEYS.SERVER_PORT,     settings.serverPort],
      [KEYS.STREAM_FPS,      settings.streamFps],
      [KEYS.SWITCH_INTERVAL, settings.switchInterval],
    ]);
  } catch (e) {
    console.warn('[Settings] Save failed:', e);
  }
}
