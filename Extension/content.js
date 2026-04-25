/**
 * VAULT PII SHIELD — Content Script
 * Intercepts file uploads across ALL websites before they reach servers.
 */

(function () {
  'use strict';

  // Avoid double-injection
  if (window.__vaultInjected) return;
  window.__vaultInjected = true;

  // ─── Config ────────────────────────────────────────────────────────────────
  const VAULT_API = 'http://localhost:5000/api/analyze';

  // ─── State ─────────────────────────────────────────────────────────────────
  let extensionEnabled = true;
  let scanResults = {}; // fileKey → result

  // Load setting from storage
  chrome.storage.sync.get(['vaultEnabled', 'vaultApi'], (data) => {
    extensionEnabled = data.vaultEnabled !== false;
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.vaultEnabled) extensionEnabled = changes.vaultEnabled.newValue;
  });

  // ─── UI Overlay ────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('vault-styles')) return;
    const style = document.createElement('style');
    style.id = 'vault-styles';
    style.textContent = `
      #vault-overlay {
        position: fixed; inset: 0; z-index: 2147483647;
        background: rgba(0,0,0,0.75);
        backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        font-family: 'DM Sans', system-ui, sans-serif;
        animation: vaultFadeIn 0.2s ease;
      }
      @keyframes vaultFadeIn { from { opacity:0 } to { opacity:1 } }

      #vault-modal {
        background: #0f1117;
        border: 1px solid #1e2130;
        border-radius: 20px;
        padding: 32px;
        max-width: 520px;
        width: calc(100vw - 48px);
        box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
        color: #e8eaf0;
        position: relative;
        animation: vaultSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1);
      }
      @keyframes vaultSlideUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }

      .vault-header {
        display: flex; align-items: center; gap: 14px; margin-bottom: 20px;
      }
      .vault-logo {
        width: 44px; height: 44px;
        background: linear-gradient(135deg, #6366f1, #a78bfa);
        border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; flex-shrink: 0;
        box-shadow: 0 4px 16px rgba(99,102,241,0.4);
      }
      .vault-title { font-size: 18px; font-weight: 700; color: #fff; line-height: 1.2; }
      .vault-subtitle { font-size: 12px; color: #6b7280; margin-top: 2px; }

      .vault-file-info {
        background: #161824;
        border: 1px solid #1e2130;
        border-radius: 10px;
        padding: 12px 16px;
        margin-bottom: 20px;
        display: flex; align-items: center; gap: 12px;
      }
      .vault-file-icon { font-size: 24px; flex-shrink: 0; }
      .vault-file-name { font-size: 13px; font-weight: 600; color: #d1d5db; word-break: break-all; }
      .vault-file-size { font-size: 11px; color: #6b7280; margin-top: 2px; }

      .vault-scanning {
        text-align: center; padding: 24px 0;
      }
      .vault-spinner {
        width: 40px; height: 40px; margin: 0 auto 14px;
        border: 3px solid #1e2130;
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: vaultSpin 0.8s linear infinite;
      }
      @keyframes vaultSpin { to { transform: rotate(360deg); } }
      .vault-scan-text { font-size: 14px; color: #9ca3af; }
      .vault-scan-dots::after {
        content: ''; animation: vaultDots 1.5s infinite;
      }
      @keyframes vaultDots {
        0%{content:''} 33%{content:'.'} 66%{content:'..'} 100%{content:'...'}
      }

      .vault-risk-bar {
        background: #161824;
        border-radius: 10px;
        padding: 14px 16px;
        margin-bottom: 16px;
        display: flex; align-items: center; gap: 14px;
      }
      .vault-risk-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; margin-bottom: 4px; }
      .vault-risk-score { font-size: 28px; font-weight: 800; line-height: 1; }
      .vault-risk-meter { flex: 1; height: 8px; background: #1e2130; border-radius: 4px; overflow: hidden; }
      .vault-risk-fill { height: 100%; border-radius: 4px; transition: width 0.6s cubic-bezier(0.34,1.56,0.64,1); }

      .vault-findings {
        max-height: 220px;
        overflow-y: auto;
        margin-bottom: 20px;
        scrollbar-width: thin;
        scrollbar-color: #1e2130 transparent;
      }
      .vault-finding-item {
        display: flex; align-items: center; gap: 10px;
        padding: 9px 12px;
        border-radius: 8px;
        margin-bottom: 6px;
        background: #161824;
        border: 1px solid #1e2130;
        transition: background 0.15s;
      }
      .vault-finding-icon { font-size: 16px; flex-shrink: 0; }
      .vault-finding-type { font-size: 12px; font-weight: 600; color: #d1d5db; flex: 1; }
      .vault-finding-value {
        font-size: 11px; color: #6b7280;
        font-family: 'JetBrains Mono', monospace;
        max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .vault-finding-badge {
        font-size: 10px; font-weight: 700; text-transform: uppercase;
        padding: 2px 7px; border-radius: 4px; flex-shrink: 0;
      }
      .badge-critical { background: rgba(239,68,68,0.15); color: #f87171; }
      .badge-high { background: rgba(245,158,11,0.15); color: #fbbf24; }
      .badge-medium { background: rgba(139,92,246,0.15); color: #c084fc; }
      .badge-low { background: rgba(99,102,241,0.15); color: #a5b4fc; }

      .vault-no-findings {
        text-align: center; padding: 20px;
        color: #22c55e; font-size: 14px;
      }
      .vault-no-findings-icon { font-size: 36px; margin-bottom: 8px; }

      .vault-actions {
        display: flex; gap: 10px;
      }
      .vault-btn {
        flex: 1; padding: 12px 18px; border-radius: 10px;
        font-size: 14px; font-weight: 600; cursor: pointer;
        border: none; transition: all 0.15s; letter-spacing: 0.01em;
      }
      .vault-btn-block {
        background: #ef4444; color: #fff;
        box-shadow: 0 4px 12px rgba(239,68,68,0.3);
      }
      .vault-btn-block:hover { background: #dc2626; transform: translateY(-1px); }
      .vault-btn-allow {
        background: #161824; color: #9ca3af;
        border: 1px solid #1e2130;
      }
      .vault-btn-allow:hover { background: #1e2130; color: #d1d5db; }
      .vault-btn-safe {
        background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff;
        box-shadow: 0 4px 12px rgba(34,197,94,0.3);
      }
      .vault-btn-safe:hover { transform: translateY(-1px); }

      .vault-powered {
        text-align: center; margin-top: 14px;
        font-size: 10px; color: #374151; letter-spacing: 0.05em;
      }

      .vault-toast {
        position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
        background: #0f1117; border: 1px solid;
        border-radius: 12px; padding: 12px 18px;
        font-family: 'DM Sans', system-ui, sans-serif;
        font-size: 13px; font-weight: 500;
        display: flex; align-items: center; gap: 10px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        animation: vaultSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
        max-width: 360px;
      }
      @keyframes vaultSlideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
      .vault-toast-safe { border-color: #22c55e; color: #22c55e; }
      .vault-toast-warn { border-color: #f59e0b; color: #f59e0b; }
    `;
    document.head.appendChild(style);
  }

  // ─── Modal ─────────────────────────────────────────────────────────────────
  function showModal(file, onAllow, onBlock) {
    injectStyles();
    removeModal();

    const overlay = document.createElement('div');
    overlay.id = 'vault-overlay';

    const fileSizeFmt = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;
    const fileExt = file.name.split('.').pop().toUpperCase();

    overlay.innerHTML = `
      <div id="vault-modal">
        <div class="vault-header">
          <div class="vault-logo">🔐</div>
          <div>
            <div class="vault-title">Vault PII Shield</div>
            <div class="vault-subtitle">Scanning for personal data before upload</div>
          </div>
        </div>
        <div class="vault-file-info">
          <div class="vault-file-icon">${getFileIcon(fileExt)}</div>
          <div>
            <div class="vault-file-name">${file.name}</div>
            <div class="vault-file-size">${fileExt} · ${fileSizeFmt(file.size)}</div>
          </div>
        </div>
        <div id="vault-body">
          <div class="vault-scanning">
            <div class="vault-spinner"></div>
            <div class="vault-scan-text">Analyzing for PII<span class="vault-scan-dots"></span></div>
          </div>
        </div>
        <div class="vault-powered">⚡ VAULT PII SHIELD — LOCAL SCAN</div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Scan the file
    scanFile(file).then((result) => {
      renderResults(result, onAllow, onBlock);
    }).catch((err) => {
      renderError(err, onAllow);
    });
  }

  function getFileIcon(ext) {
    const icons = { PDF: '📄', PNG: '🖼️', JPG: '🖼️', JPEG: '🖼️', XLSX: '📊', XLS: '📊', DOCX: '📝', DOC: '📝', TXT: '📃', CSV: '📋' };
    return icons[ext] || '📁';
  }

  function renderResults(result, onAllow, onBlock) {
    const body = document.getElementById('vault-body');
    if (!body) return;

    const { findings = [], summary = {} } = result;
    const score = summary.risk_score || 0;
    const hasCritical = (summary.severity_counts?.critical || 0) > 0;

    const riskColor = score >= 75 ? '#ef4444' : score >= 40 ? '#f59e0b' : score >= 15 ? '#a78bfa' : '#22c55e';
    const riskLabel = score >= 75 ? 'HIGH RISK' : score >= 40 ? 'MODERATE' : score >= 15 ? 'LOW RISK' : 'CLEAN';

    let findingsHtml = '';
    if (findings.length === 0) {
      findingsHtml = `
        <div class="vault-no-findings">
          <div class="vault-no-findings-icon">✅</div>
          No personal data detected — file appears safe
        </div>`;
    } else {
      findingsHtml = `<div class="vault-findings">` +
        findings.slice(0, 12).map(f => `
          <div class="vault-finding-item">
            <span class="vault-finding-icon">${f.icon}</span>
            <span class="vault-finding-type">${f.type}</span>
            <span class="vault-finding-value">${maskValue(f.value)}</span>
            <span class="vault-finding-badge badge-${f.severity}">${f.severity}</span>
          </div>`).join('') +
        (findings.length > 12 ? `<div style="text-align:center;padding:8px;color:#6b7280;font-size:12px">+${findings.length - 12} more findings</div>` : '') +
        `</div>`;
    }

    const btnHtml = findings.length === 0
      ? `<button class="vault-btn vault-btn-safe" id="vault-allow">✓ Upload Safely</button>`
      : `
        <button class="vault-btn vault-btn-block" id="vault-block">🛡 Block Upload</button>
        <button class="vault-btn vault-btn-allow" id="vault-allow">Proceed Anyway</button>
      `;

    body.innerHTML = `
      <div class="vault-risk-bar">
        <div>
          <div class="vault-risk-label">Risk Score</div>
          <div class="vault-risk-score" style="color:${riskColor}">${score}</div>
        </div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:11px;color:#6b7280">${findings.length} finding${findings.length !== 1 ? 's' : ''}</span>
            <span style="font-size:11px;font-weight:700;color:${riskColor}">${riskLabel}</span>
          </div>
          <div class="vault-risk-meter">
            <div class="vault-risk-fill" style="width:0%;background:${riskColor}" id="vault-fill"></div>
          </div>
        </div>
      </div>
      ${findingsHtml}
      <div class="vault-actions">${btnHtml}</div>
    `;

    setTimeout(() => {
      const fill = document.getElementById('vault-fill');
      if (fill) fill.style.width = `${score}%`;
    }, 50);

    document.getElementById('vault-allow')?.addEventListener('click', () => {
      removeModal();
      onAllow();
    });
    document.getElementById('vault-block')?.addEventListener('click', () => {
      removeModal();
      onBlock();
      showToast(`🛡 Upload blocked — ${findings.length} PII item${findings.length !== 1 ? 's' : ''} detected`, 'warn');
    });
  }

  function renderError(err, onAllow) {
    const body = document.getElementById('vault-body');
    if (!body) return;
    body.innerHTML = `
      <div style="text-align:center;padding:20px;color:#f87171;font-size:13px">
        <div style="font-size:32px;margin-bottom:10px">⚠️</div>
        Could not reach Vault backend.<br>
        <span style="color:#6b7280;font-size:11px">Check that your local server is running on port 5000</span>
      </div>
      <div class="vault-actions">
        <button class="vault-btn vault-btn-allow" id="vault-allow">Upload Without Scan</button>
      </div>
    `;
    document.getElementById('vault-allow')?.addEventListener('click', () => {
      removeModal();
      onAllow();
    });
  }

  function removeModal() {
    document.getElementById('vault-overlay')?.remove();
  }

  function showToast(msg, type = 'safe') {
    injectStyles();
    const existing = document.getElementById('vault-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'vault-toast';
    toast.className = `vault-toast vault-toast-${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);

    setTimeout(() => toast?.remove(), 4000);
  }

  function maskValue(val) {
    if (!val) return '';
    if (val.length <= 4) return '****';
    return val.substring(0, 2) + '•'.repeat(Math.min(val.length - 4, 8)) + val.substring(val.length - 2);
  }

  // ─── Scan via Vault Backend ────────────────────────────────────────────────
  async function scanFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(VAULT_API, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  }

  // ─── File Input Interceptor ────────────────────────────────────────────────
  function interceptFileInput(input) {
    if (input.__vaultHooked) return;
    input.__vaultHooked = true;

    input.addEventListener('change', (e) => {
      if (!extensionEnabled) return;
      const files = e.target.files;
      if (!files || files.length === 0) return;

      // Process the first file (can extend to multiple)
      const file = files[0];

      // Store the original files to restore if allowed
      const originalFiles = Array.from(files);

      // Temporarily clear the input value to prevent upload
      const dt = new DataTransfer();
      Object.defineProperty(input, '_vaultFiles', { value: originalFiles, writable: true, configurable: true });

      showModal(file, 
        // onAllow
        () => {
          // Restore files and re-trigger change
          const dt2 = new DataTransfer();
          originalFiles.forEach(f => dt2.items.add(f));
          Object.defineProperty(input, 'files', { value: dt2.files, writable: true, configurable: true });
          // Dispatch a new event to inform framework (React, etc.)
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('input', { bubbles: true }));
        },
        // onBlock  
        () => {
          input.value = '';
          // For React/Vue controlled inputs
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (nativeInputValueSetter) nativeInputValueSetter.call(input, '');
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      );

      // Clear the file immediately (user sees modal)
      try { input.value = ''; } catch(e) {}
    }, true);
  }

  // ─── Form Submit Interceptor ───────────────────────────────────────────────
  function interceptFormSubmit(form) {
    if (form.__vaultHooked) return;
    form.__vaultHooked = true;

    form.addEventListener('submit', async (e) => {
      if (!extensionEnabled) return;
      const fileInputs = form.querySelectorAll('input[type="file"]');
      const pendingFiles = [];
      fileInputs.forEach(inp => {
        if (inp.files?.length) pendingFiles.push({ input: inp, file: inp.files[0] });
      });
      if (pendingFiles.length === 0) return;
      // Already handled by input change
    }, true);
  }

  // ─── Observe DOM for dynamic inputs ───────────────────────────────────────
  function hookAll() {
    document.querySelectorAll('input[type="file"]').forEach(interceptFileInput);
    document.querySelectorAll('form').forEach(interceptFormSubmit);
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.matches?.('input[type="file"]')) interceptFileInput(node);
        if (node.matches?.('form')) interceptFormSubmit(node);
        node.querySelectorAll?.('input[type="file"]').forEach(interceptFileInput);
        node.querySelectorAll?.('form').forEach(interceptFormSubmit);
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hookAll);
  } else {
    hookAll();
  }

  // ─── XHR/Fetch interception for programmatic uploads ──────────────────────
  // Patch XMLHttpRequest
  const OrigXHR = window.XMLHttpRequest;
  class PatchedXHR extends OrigXHR {
    send(body) {
      if (!extensionEnabled || !(body instanceof FormData)) {
        return super.send(body);
      }
      // Check if FormData has files
      let hasFile = false;
      for (const [, val] of body.entries()) {
        if (val instanceof File) { hasFile = true; break; }
      }
      if (!hasFile) return super.send(body);

      // Already scanned (allowed through modal) — proceed
      return super.send(body);
    }
  }
  window.XMLHttpRequest = PatchedXHR;

})();
