# 🔐 Vault PII Shield — Chrome Extension

A browser extension that **intercepts every file upload** across any website and scans for personal data (PII) using your local Vault backend — before the file ever leaves your browser.

---

## How It Works

```
User selects file → Extension intercepts →
Sends to local Vault API → Scans for PII →
Shows results modal → User decides: Block or Allow
```

The file never reaches the destination server until you explicitly allow it.

---

## What It Detects

| Type | Severity |
|------|----------|
| 🪪 Aadhaar Number | Critical |
| 💳 PAN Card | Critical |
| 📘 Passport Number | Critical |
| 💰 Credit/Debit Card | Critical |
| 🏦 Bank Account Number | Critical |
| 📱 Phone Number | High |
| 📧 Email Address | High |
| 🚗 Driving Licence | High |
| 🏛️ IFSC Code | High |
| 🗳️ Voter ID | High |
| 🎂 Date of Birth | Medium |
| 🧾 GST Number | Medium |
| 🌐 IP Address | Low |
| 📍 Pincode | Low |

---

## Installation

### Step 1: Start Your Vault Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
# Server starts at http://localhost:5000
```

### Step 2: Load the Extension in Chrome

1. Open Chrome → go to `chrome://extensions/`
2. Toggle **Developer mode** ON (top right)
3. Click **"Load unpacked"**
4. Select the `vault-extension/` folder
5. The Vault shield icon appears in your toolbar ✅

### Step 3: Verify Connection
- Click the Vault icon in the toolbar
- You should see **"Connected — Vault backend running"** in green
- If not, make sure `python app.py` is running

---

## Usage

Once installed, **nothing changes** in how you browse — the extension works silently in the background.

When you try to upload any file anywhere:

1. **The upload is intercepted** immediately
2. **A modal appears** showing scan progress
3. After scanning, you see:
   - ✅ **Clean** → green "Upload Safely" button
   - ⚠️ **PII Detected** → risk score + list of findings
4. You choose: **Block Upload** or **Proceed Anyway**

### Popup Controls
- **Toggle ON/OFF** — disable temporarily for trusted sites
- **Stats** — see how many files scanned and blocked
- **Backend URL** — change if you run Flask on a different port

---

## File Support

| Format | Scan Method |
|--------|-------------|
| PDF | PyMuPDF text extraction |
| Images (PNG, JPG, WEBP...) | EasyOCR text recognition |
| Excel (XLSX, XLS) | Cell-by-cell scan |
| Word (DOCX) | Paragraph scan |
| Text (TXT, CSV) | Direct regex scan |

---

## Project Structure

```
vault-extension/
├── manifest.json        # Extension configuration (Manifest V3)
├── content.js           # Main script — intercepts uploads on every page
├── background.js        # Service worker — stats, badge updates
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── popup/
    ├── popup.html       # Extension toolbar popup UI
    └── popup.js         # Popup logic (toggle, stats, server config)
```

---

## Privacy

- **All scanning is local** — your files go to `localhost:5000`, never a remote server
- **No data is stored** by the extension
- **Scan stats** (count only, no file names) are stored in Chrome sync storage

---

## Troubleshooting

**Extension shows "Cannot connect"**
→ Make sure Flask is running: `python backend/app.py`

**Modal doesn't appear on some sites**
→ Some sites use shadow DOM or custom file pickers. The extension hooks standard `<input type="file">` elements.

**False positives**
→ Pincode and phone number patterns are broad. Use "Proceed Anyway" if you're confident the file is safe.
