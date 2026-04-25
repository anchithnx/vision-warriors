/**
 * VAULT PII SHIELD — Popup Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('main-toggle');
  const toggleLabel = document.getElementById('toggle-label');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const statScanned = document.getElementById('stat-scanned');
  const statBlocked = document.getElementById('stat-blocked');
  const apiInput = document.getElementById('api-url');
  const saveBtn = document.getElementById('save-api');
  const serverStatus = document.getElementById('server-status');

  // ─── Load state ──────────────────────────────────────────────────────────
  chrome.storage.sync.get(['vaultEnabled', 'vaultApi', 'scanCount', 'blockedCount'], (data) => {
    const enabled = data.vaultEnabled !== false;
    setToggle(enabled);

    statScanned.textContent = data.scanCount || 0;
    statBlocked.textContent = data.blockedCount || 0;

    if (data.vaultApi) {
      apiInput.value = data.vaultApi;
      testServer(data.vaultApi);
    } else {
      testServer('http://localhost:5000');
    }
  });

  // ─── Toggle ───────────────────────────────────────────────────────────────
  toggle.addEventListener('click', () => {
    const isOn = toggle.classList.contains('on');
    const newState = !isOn;
    setToggle(newState);
    chrome.storage.sync.set({ vaultEnabled: newState });
  });

  function setToggle(enabled) {
    if (enabled) {
      toggle.classList.add('on');
      toggleLabel.textContent = 'ON';
      statusDot.classList.remove('off');
      statusText.innerHTML = 'Shield is <strong>active</strong> — all file uploads are being monitored';
    } else {
      toggle.classList.remove('on');
      toggleLabel.textContent = 'OFF';
      statusDot.classList.add('off');
      statusText.innerHTML = 'Shield is <strong>disabled</strong> — uploads pass through unscanned';
    }
  }

  // ─── Save API URL ─────────────────────────────────────────────────────────
  saveBtn.addEventListener('click', () => {
    const url = apiInput.value.trim().replace(/\/$/, '');
    chrome.storage.sync.set({ vaultApi: url });
    testServer(url);
    saveBtn.textContent = 'Saved!';
    setTimeout(() => saveBtn.textContent = 'Save', 1500);
  });

  // ─── Test server health ───────────────────────────────────────────────────
  async function testServer(base) {
    serverStatus.innerHTML = '<span style="color:#6b7280">○</span> <span>Testing...</span>';
    try {
      const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(3000) });
      const data = await res.json();
      if (data.status === 'ok') {
        serverStatus.innerHTML = '<span style="color:#22c55e">●</span> <span style="color:#22c55e">Connected — Vault backend running</span>';
      } else {
        throw new Error('bad response');
      }
    } catch (e) {
      serverStatus.innerHTML = '<span style="color:#ef4444">●</span> <span style="color:#ef4444">Cannot connect — start your Flask server</span>';
    }
  }

  // ─── Live stat updates ────────────────────────────────────────────────────
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.scanCount) statScanned.textContent = changes.scanCount.newValue || 0;
    if (changes.blockedCount) statBlocked.textContent = changes.blockedCount.newValue || 0;
  });
});
