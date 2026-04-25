/**
 * VAULT PII SHIELD — Background Service Worker
 */

// Initialize defaults on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    vaultEnabled: true,
    vaultApi: 'http://localhost:5000',
    scanCount: 0,
    blockedCount: 0,
  });
  console.log('[Vault] Extension installed. PII Shield active.');
});

// Handle messages from content/popup scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'VAULT_SCAN_COMPLETE') {
    // Increment scan counter
    chrome.storage.sync.get(['scanCount'], (data) => {
      chrome.storage.sync.set({ scanCount: (data.scanCount || 0) + 1 });
    });
    sendResponse({ ok: true });
  }

  if (msg.type === 'VAULT_BLOCKED') {
    chrome.storage.sync.get(['blockedCount'], (data) => {
      chrome.storage.sync.set({ blockedCount: (data.blockedCount || 0) + 1 });
    });
    // Update badge
    chrome.action.setBadgeText({ text: '🛡', tabId: sender.tab?.id });
    chrome.action.setBadgeBackgroundColor({ color: '#ef4444', tabId: sender.tab?.id });
    setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: sender.tab?.id }), 3000);
    sendResponse({ ok: true });
  }

  if (msg.type === 'GET_STATS') {
    chrome.storage.sync.get(['scanCount', 'blockedCount', 'vaultEnabled'], sendResponse);
    return true; // async
  }

  return true;
});
