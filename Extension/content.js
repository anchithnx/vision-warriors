/**
 * VAULT PII SHIELD — Content Script v2.0
 * Intercepts file uploads, scans for PII, and offers redaction before upload.
 */

(function () {
  'use strict';

  if (window.__vaultInjected) return;
  window.__vaultInjected = true;

  const VAULT_API = 'http://localhost:5000/api/analyze';
  let extensionEnabled = true;

  // ─── Fix: Track files already cleared to upload ────────────────────────────
  // Key = "name::size::lastModified" prevents re-scanning allowed/redacted files
  const skipScanKeys = new Set();
  function fileKey(file) {
    return `${file.name}::${file.size}::${file.lastModified}`;
  }

  chrome.storage.sync.get(['vaultEnabled'], (data) => {
    extensionEnabled = data.vaultEnabled !== false;
  });
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.vaultEnabled) extensionEnabled = changes.vaultEnabled.newValue;
  });

  // ─── Styles ────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('vault-styles')) return;
    const style = document.createElement('style');
    style.id = 'vault-styles';
    style.textContent = `
      #vault-overlay {
        position: fixed; inset: 0; z-index: 2147483647;
        background: rgba(0,0,0,0.78); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        font-family: 'DM Sans', system-ui, sans-serif;
        animation: vaultFadeIn 0.2s ease;
      }
      @keyframes vaultFadeIn { from{opacity:0} to{opacity:1} }
      #vault-modal {
        background: #0f1117; border: 1px solid #1e2130; border-radius: 20px;
        padding: 28px 28px 22px; max-width: 540px; width: calc(100vw - 48px);
        box-shadow: 0 40px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.05);
        color: #e8eaf0; position: relative;
        animation: vaultSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1);
      }
      @keyframes vaultSlideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
      .vault-header { display:flex; align-items:center; gap:14px; margin-bottom:18px; }
      .vault-logo {
        width:44px; height:44px; background:linear-gradient(135deg,#6366f1,#a78bfa);
        border-radius:12px; display:flex; align-items:center; justify-content:center;
        font-size:22px; flex-shrink:0; box-shadow:0 4px 16px rgba(99,102,241,0.4);
      }
      .vault-title { font-size:18px; font-weight:700; color:#fff; line-height:1.2; }
      .vault-subtitle { font-size:12px; color:#6b7280; margin-top:2px; }
      .vault-file-info {
        background:#161824; border:1px solid #1e2130; border-radius:10px;
        padding:11px 14px; margin-bottom:18px; display:flex; align-items:center; gap:12px;
      }
      .vault-file-icon { font-size:24px; flex-shrink:0; }
      .vault-file-name { font-size:13px; font-weight:600; color:#d1d5db; word-break:break-all; }
      .vault-file-size { font-size:11px; color:#6b7280; margin-top:2px; }
      .vault-scanning { text-align:center; padding:24px 0; }
      .vault-spinner {
        width:40px; height:40px; margin:0 auto 14px;
        border:3px solid #1e2130; border-top-color:#6366f1;
        border-radius:50%; animation:vaultSpin 0.8s linear infinite;
      }
      @keyframes vaultSpin { to{transform:rotate(360deg)} }
      .vault-scan-text { font-size:14px; color:#9ca3af; }
      .vault-scan-dots::after { content:''; animation:vaultDots 1.5s infinite; }
      @keyframes vaultDots { 0%{content:''} 33%{content:'.'} 66%{content:'..'} 100%{content:'...'} }
      .vault-risk-bar {
        background:#161824; border:1px solid #1e2130; border-radius:10px;
        padding:13px 15px; margin-bottom:14px; display:flex; align-items:center; gap:14px;
      }
      .vault-risk-label { font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#6b7280; margin-bottom:4px; }
      .vault-risk-score { font-size:28px; font-weight:800; line-height:1; }
      .vault-risk-meter { flex:1; height:7px; background:#1e2130; border-radius:4px; overflow:hidden; }
      .vault-risk-fill { height:100%; border-radius:4px; transition:width 0.7s cubic-bezier(0.34,1.56,0.64,1); }
      .vault-findings { max-height:190px; overflow-y:auto; margin-bottom:16px; scrollbar-width:thin; scrollbar-color:#1e2130 transparent; }
      .vault-finding-item {
        display:flex; align-items:center; gap:10px; padding:8px 11px;
        border-radius:8px; margin-bottom:5px; background:#161824; border:1px solid #1e2130;
      }
      .vault-finding-icon { font-size:15px; flex-shrink:0; }
      .vault-finding-type { font-size:12px; font-weight:600; color:#d1d5db; flex:1; }
      .vault-finding-value { font-size:11px; color:#6b7280; font-family:monospace; max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .vault-finding-badge { font-size:10px; font-weight:700; text-transform:uppercase; padding:2px 7px; border-radius:4px; flex-shrink:0; }
      .badge-critical { background:rgba(239,68,68,0.15); color:#f87171; }
      .badge-high { background:rgba(245,158,11,0.15); color:#fbbf24; }
      .badge-medium { background:rgba(139,92,246,0.15); color:#c084fc; }
      .badge-low { background:rgba(99,102,241,0.15); color:#a5b4fc; }
      .vault-no-findings { text-align:center; padding:18px; color:#22c55e; font-size:14px; }
      .vault-no-findings-icon { font-size:36px; margin-bottom:8px; }
      .vault-row { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px; }
      .vault-row:last-child { margin-bottom:0; }
      .vault-row.single { grid-template-columns:1fr; }
      .vault-btn {
        padding:11px 14px; border-radius:10px; font-size:13px; font-weight:600;
        cursor:pointer; border:none; transition:all 0.15s; letter-spacing:0.01em;
        display:flex; align-items:center; justify-content:center; gap:6px;
      }
      .vault-btn:disabled { opacity:0.45; cursor:not-allowed; }
      .vault-btn-block { background:#ef4444; color:#fff; box-shadow:0 4px 12px rgba(239,68,68,0.3); }
      .vault-btn-block:hover:not(:disabled) { background:#dc2626; transform:translateY(-1px); }
      .vault-btn-redact { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; box-shadow:0 4px 12px rgba(99,102,241,0.35); }
      .vault-btn-redact:hover:not(:disabled) { opacity:0.9; transform:translateY(-1px); }
      .vault-btn-download { background:#161824; color:#a78bfa; border:1px solid #6366f1; }
      .vault-btn-download:hover:not(:disabled) { background:#1e1f35; color:#c4b5fd; }
      .vault-btn-allow { background:#161824; color:#6b7280; border:1px solid #1e2130; }
      .vault-btn-allow:hover:not(:disabled) { background:#1e2130; color:#9ca3af; }
      .vault-btn-safe { background:linear-gradient(135deg,#22c55e,#16a34a); color:#fff; box-shadow:0 4px 12px rgba(34,197,94,0.3); }
      .vault-btn-safe:hover:not(:disabled) { transform:translateY(-1px); }
      .vault-progress {
        display:none; align-items:center; gap:10px;
        background:#161824; border:1px solid #6366f1; border-radius:10px;
        padding:10px 14px; margin-bottom:8px; font-size:12px; color:#a78bfa;
      }
      .vault-progress.visible { display:flex; }
      .vault-mini-spin {
        width:14px; height:14px; flex-shrink:0;
        border:2px solid #1e2130; border-top-color:#6366f1;
        border-radius:50%; animation:vaultSpin 0.7s linear infinite;
      }
      .vault-powered { text-align:center; margin-top:12px; font-size:10px; color:#374151; letter-spacing:0.05em; }
      .vault-toast {
        position:fixed; bottom:24px; right:24px; z-index:2147483647;
        background:#0f1117; border:1px solid; border-radius:12px; padding:12px 18px;
        font-family:'DM Sans',system-ui,sans-serif; font-size:13px; font-weight:500;
        display:flex; align-items:center; gap:10px;
        box-shadow:0 20px 40px rgba(0,0,0,0.4);
        animation:vaultSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1); max-width:360px;
      }
      @keyframes vaultSlideIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
      .vault-toast-safe { border-color:#22c55e; color:#22c55e; }
      .vault-toast-warn { border-color:#f59e0b; color:#f59e0b; }
      .vault-toast-info { border-color:#6366f1; color:#a78bfa; }
    `;
    document.head.appendChild(style);
  }

  // ─── Modal ─────────────────────────────────────────────────────────────────
  function showModal(file, onAllow, onBlock, onUploadRedacted) {
    injectStyles();
    removeModal();

    const overlay = document.createElement('div');
    overlay.id = 'vault-overlay';
    const fmt = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;
    const ext = file.name.split('.').pop().toUpperCase();
    const icons = { PDF:'📄', PNG:'🖼️', JPG:'🖼️', JPEG:'🖼️', WEBP:'🖼️', XLSX:'📊', XLS:'📊', DOCX:'📝', DOC:'📝', TXT:'📃', CSV:'📋' };

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
          <div class="vault-file-icon">${icons[ext] || '📁'}</div>
          <div>
            <div class="vault-file-name">${file.name}</div>
            <div class="vault-file-size">${ext} · ${fmt(file.size)}</div>
          </div>
        </div>
        <div id="vault-body">
          <div class="vault-scanning">
            <div class="vault-spinner"></div>
            <div class="vault-scan-text">Analyzing for PII<span class="vault-scan-dots"></span></div>
          </div>
        </div>
        <div class="vault-powered">⚡ VAULT PII SHIELD — LOCAL SCAN</div>
      </div>`;

    document.body.appendChild(overlay);

    scanFile(file)
      .then(result => renderResults(result, onAllow, onBlock, onUploadRedacted))
      .catch(err => renderError(err, onAllow));
  }

  function renderResults(result, onAllow, onBlock, onUploadRedacted) {
    const body = document.getElementById('vault-body');
    if (!body) return;

    const { findings = [], summary = {}, redacted_b64, redacted_ext } = result;
    const score = summary.risk_score || 0;
    const hasRedacted = !!redacted_b64;

    const riskColor = score >= 75 ? '#ef4444' : score >= 40 ? '#f59e0b' : score >= 15 ? '#a78bfa' : '#22c55e';
    const riskLabel = score >= 75 ? 'HIGH RISK' : score >= 40 ? 'MODERATE' : score >= 15 ? 'LOW RISK' : 'CLEAN';

    const findingsHtml = findings.length === 0
      ? `<div class="vault-no-findings"><div class="vault-no-findings-icon">✅</div>No personal data detected — file appears safe</div>`
      : `<div class="vault-findings">` +
          findings.slice(0, 12).map(f => `
            <div class="vault-finding-item">
              <span class="vault-finding-icon">${f.icon}</span>
              <span class="vault-finding-type">${f.type}</span>
              <span class="vault-finding-value">${maskValue(f.value)}</span>
              <span class="vault-finding-badge badge-${f.severity}">${f.severity}</span>
            </div>`).join('') +
          (findings.length > 12 ? `<div style="text-align:center;padding:8px;color:#6b7280;font-size:12px">+${findings.length - 12} more</div>` : '') +
        `</div>`;

    const actionsHtml = findings.length === 0
      ? `<div class="vault-row single"><button class="vault-btn vault-btn-safe" id="vault-allow">✓ Upload Safely</button></div>`
      : `<div id="vault-progress" class="vault-progress"><div class="vault-mini-spin"></div><span id="vault-progress-text">Preparing redacted file…</span></div>
         <div class="vault-row">
           <button class="vault-btn vault-btn-redact" id="vault-upload-redacted" ${!hasRedacted?'disabled':''}>🛡 Upload Redacted</button>
           <button class="vault-btn vault-btn-block" id="vault-block">✕ Block Upload</button>
         </div>
         <div class="vault-row">
           <button class="vault-btn vault-btn-download" id="vault-download-redacted" ${!hasRedacted?'disabled':''}>⬇ Download Redacted</button>
           <button class="vault-btn vault-btn-allow" id="vault-allow">Proceed Anyway</button>
         </div>`;

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
          <div class="vault-risk-meter"><div class="vault-risk-fill" style="width:0%;background:${riskColor}" id="vault-fill"></div></div>
        </div>
      </div>
      ${findingsHtml}
      ${actionsHtml}`;

    setTimeout(() => { const f = document.getElementById('vault-fill'); if (f) f.style.width = score + '%'; }, 50);

    document.getElementById('vault-allow')?.addEventListener('click', () => { removeModal(); onAllow(); });

    document.getElementById('vault-block')?.addEventListener('click', () => {
      removeModal();
      onBlock();
      showToast(`🛡 Blocked — ${findings.length} PII item${findings.length !== 1 ? 's' : ''} found`, 'warn');
      chrome.runtime.sendMessage({ type: 'VAULT_BLOCKED' });
    });

    if (hasRedacted) {
      document.getElementById('vault-download-redacted')?.addEventListener('click', () => {
        downloadRedacted(redacted_b64, redacted_ext, result.filename);
        showToast('⬇ Redacted file downloaded', 'info');
      });

      document.getElementById('vault-upload-redacted')?.addEventListener('click', () => {
        // Disable all buttons and show progress
        document.querySelectorAll('#vault-modal .vault-btn').forEach(b => b.disabled = true);
        const prog = document.getElementById('vault-progress');
        const txt = document.getElementById('vault-progress-text');
        if (prog) prog.classList.add('visible');
        if (txt) txt.textContent = 'Swapping in redacted version…';

        try {
          const redactedFile = base64ToFile(redacted_b64, redacted_ext, result.filename);
          removeModal();
          onUploadRedacted(redactedFile);
          showToast('✅ Redacted version uploaded — PII removed', 'safe');
        } catch (e) {
          if (txt) txt.textContent = '⚠ Failed to prepare redacted file';
          setTimeout(() => {
            document.querySelectorAll('#vault-modal .vault-btn').forEach(b => b.disabled = false);
            if (prog) prog.classList.remove('visible');
          }, 2000);
        }
      });
    }
  }

  function renderError(err, onAllow) {
    const body = document.getElementById('vault-body');
    if (!body) return;
    body.innerHTML = `
      <div style="text-align:center;padding:20px;color:#f87171;font-size:13px">
        <div style="font-size:32px;margin-bottom:10px">⚠️</div>
        Could not reach Vault backend.<br>
        <span style="color:#6b7280;font-size:11px">Make sure the local server is running on port 5000</span>
      </div>
      <div class="vault-row single">
        <button class="vault-btn vault-btn-allow" id="vault-allow">Upload Without Scan</button>
      </div>`;
    document.getElementById('vault-allow')?.addEventListener('click', () => { removeModal(); onAllow(); });
  }

  function removeModal() { document.getElementById('vault-overlay')?.remove(); }

  function showToast(msg, type = 'safe') {
    injectStyles();
    document.getElementById('vault-toast')?.remove();
    const t = document.createElement('div');
    t.id = 'vault-toast';
    t.className = `vault-toast vault-toast-${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t?.remove(), 4000);
  }

  function maskValue(val) {
    if (!val) return '';
    if (val.length <= 4) return '****';
    return val.slice(0,2) + '•'.repeat(Math.min(val.length-4, 8)) + val.slice(-2);
  }

  // ─── Redaction helpers ─────────────────────────────────────────────────────
  function base64ToFile(b64, ext, originalName) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const mimeMap = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', txt: 'text/plain',
    };
    const mime = mimeMap[ext?.toLowerCase()] || 'application/octet-stream';
    const baseName = originalName.replace(/\.[^.]+$/, '');
    return new File([bytes], `${baseName}_redacted.${ext}`, { type: mime });
  }

  function downloadRedacted(b64, ext, originalName) {
    const file = base64ToFile(b64, ext, originalName);
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = file.name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ─── Scan ──────────────────────────────────────────────────────────────────
  async function scanFile(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(VAULT_API, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  // ─── Intercept file inputs ─────────────────────────────────────────────────
  function interceptFileInput(input) {
    if (input.__vaultHooked) return;
    input.__vaultHooked = true;

    input.addEventListener('change', (e) => {
      if (!extensionEnabled) return;
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const file = files[0];

      // ── THE FIX: if this file was already cleared, let it through once ──
      const key = fileKey(file);
      if (skipScanKeys.has(key)) {
        skipScanKeys.delete(key);
        return;
      }

      const originalFiles = Array.from(files);
      try { input.value = ''; } catch (_) {}

      showModal(
        file,
        // onAllow — upload original
        () => {
          skipScanKeys.add(fileKey(file));
          const dt = new DataTransfer();
          originalFiles.forEach(f => dt.items.add(f));
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'files')?.set;
          if (nativeSetter) {
            nativeSetter.call(input, dt.files);
          } else {
            Object.defineProperty(input, 'files', { value: dt.files, writable: true, configurable: true });
          }
          input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        },
        // onBlock — discard
        () => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (setter) setter.call(input, '');
          input.dispatchEvent(new Event('change', { bubbles: true }));
        },
        // onUploadRedacted — swap in cleaned file
        (redactedFile) => {
          skipScanKeys.add(fileKey(redactedFile));
          const dt = new DataTransfer();
          dt.items.add(redactedFile);
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'files')?.set;
          if (nativeSetter) {
            nativeSetter.call(input, dt.files);
          } else {
            Object.defineProperty(input, 'files', { value: dt.files, writable: true, configurable: true });
          }
          input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        }
      );
    }, true);
  }

  // ─── Observe DOM ───────────────────────────────────────────────────────────
  function hookAll() {
    document.querySelectorAll('input[type="file"]').forEach(interceptFileInput);
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => m.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      if (node.matches?.('input[type="file"]')) interceptFileInput(node);
      node.querySelectorAll?.('input[type="file"]').forEach(interceptFileInput);
    }));
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hookAll);
  } else {
    hookAll();
  }

})();
