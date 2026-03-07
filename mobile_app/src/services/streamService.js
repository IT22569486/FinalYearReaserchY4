/**
 * Frame streaming service.
 * Sends JPEG frames to the device/server via HTTP POST.
 */

let _baseUrl = 'http://192.168.1.15:5005';

export function setServerUrl(host, port) {
  _baseUrl = `http://${host}:${port}`;
}

export function getServerUrl() {
  return _baseUrl;
}

/**
 * Upload a single JPEG frame to the server.
 * @param {string} uri        - file:// URI from CameraView.takePictureAsync()
 * @param {'driver'|'road'} source - which camera stream endpoint
 * @returns {Promise<boolean>}  true on success
 */
export async function sendFrame(uri, source) {
  const endpoint = `${_baseUrl}/stream/${source}`;
  const body = new FormData();
  body.append('file', { uri, type: 'image/jpeg', name: `${source}.jpg` });

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      body,
      headers: { Accept: 'application/json' },
    });
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Check if the server is reachable.
 * @returns {Promise<boolean>}
 */
export async function checkHealth() {
  try {
    const resp = await fetch(`${_baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}
