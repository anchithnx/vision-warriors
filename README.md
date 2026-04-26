# Vision Warriors - Personal Data Privacy Analyzer

A document privacy scanner that automatically detects and redacts Personally Identifiable Information (PII) from uploaded files. Built for Indian document formats, the tool supports PDFs, images, Word documents, Excel spreadsheets, and plain text files.

---

## Problem Statement

Documents shared in professional and personal contexts  tax returns, contracts, ID proofs often contain sensitive information such as Aadhaar numbers, PAN cards, bank account details, and phone numbers. Manually identifying and redacting this data is time-consuming and error-prone. This tool automates the entire pipeline: upload a document, detect all PII, and download a redacted version in seconds.Users often unknowingly share sensitive personal information in documents, increasing the risk of data breaches and misuse. 

---

## Features

- Detects 14 types of PII using regex pattern matching tuned for Indian formats
- Supports PDF, PNG, JPG, DOCX, XLSX, and TXT file types
- Performs OCR on scanned images and image-based PDFs using EasyOCR
- Generates a redacted copy of the document with sensitive data blacked out
- Displays a risk score and severity breakdown (critical, high, medium, low)
- Clean drag-and-drop interface with animated scan progress stages

---

## Detected PII Types

| Type | Severity |
|---|---|
| Aadhaar Number | Critical |
| PAN Card | Critical |
| Passport Number | Critical |
| Bank Account Number | Critical |
| Credit / Debit Card | Critical |
| Phone Number | High |
| Email Address | High |
| Driving Licence | High |
| IFSC Code | High |
| Voter ID | High |
| Date of Birth | Medium |
| GST Number | Medium |
| IP Address | Low |
| Pincode | Low |

---

## Tech Stack

**Backend**
- Python 3.10+
- Flask, Flask-CORS
- PyMuPDF (fitz) — PDF parsing and redaction
- pdfplumber — PDF text extraction
- EasyOCR — OCR for images and scanned documents
- Pillow — image manipulation
- python-docx — Word document processing
- openpyxl — Excel file processing

**Frontend**
- React 18
- Vite
- Tailwind CSS

---

## Project Structure

```
vision-warriors-main/
├── Backend/
│   └── app.py                  # Flask API server
├── Frontend/
│   ├── src/
│   │   ├── App.jsx             # Main React component
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── test_documents/             # Sample mock tax return images
├── generate_dataset.py         # Script to generate test documents
└── requirements.txt
extension/
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

## Getting Started

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- pip

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/your-username/vision-warriors.git
cd vision-warriors

# Install Python dependencies
pip install -r requirements.txt

# Start the Flask server
python Backend/app.py
```

The backend will run at `http://localhost:5000`.

### Frontend Setup

```bash
cd Frontend

# Install Node dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run at `http://localhost:5173`.

---

## API Reference

### POST /api/analyze

Accepts a multipart form upload and returns PII findings with a redacted document.

**Request**

```
Content-Type: multipart/form-data
Body: file=<uploaded file>
```

**Response**

```json
{
  "filename": "document.pdf",
  "file_type": "PDF",
  "findings": [
    {
      "type": "Aadhaar Number",
      "value": "1234 5678 9012",
      "severity": "critical",
      "color": "#FF4444",
      "start": 42,
      "end": 57
    }
  ],
  "summary": {
    "total_findings": 5,
    "unique_values": 4,
    "severity_counts": {
      "critical": 2,
      "high": 2,
      "medium": 1,
      "low": 0
    },
    "type_counts": {
      "Aadhaar Number": 1,
      "PAN Card": 1
    },
    "risk_score": 80
  },
  "redacted_b64": "<base64-encoded redacted document>",
  "redacted_ext": "pdf",
  "raw_text_preview": "...",
  "page_count": 2
}
```

### GET /api/health

Returns server status.

```json
{ "status": "ok", "version": "1.0.0" }
```

---

## Generating Test Documents

The `generate_dataset.py` script creates mock Indian tax return images with synthetic PII for testing purposes.

```bash
pip install faker pillow
python generate_dataset.py
```

Generated images are saved to the `test_documents/` directory.

---

## Risk Score Calculation

The risk score is computed as:

```
risk_score = min(100, critical * 25 + high * 15 + medium * 8 + low * 3)
```

This gives a 0-100 score representing overall document exposure based on the severity distribution of detected findings.

---

## Supported File Formats

| Format | Text Extraction | Redacted Output |
|---|---|---|
| PDF | PyMuPDF | Redacted PDF |
| PNG / JPG / WEBP / BMP / TIFF | EasyOCR | Redacted PNG |
| DOCX | python-docx | Redacted DOCX |
| XLSX / XLS | openpyxl | Redacted XLSX |
| TXT | Native decode | Redacted TXT |

---

## Team

VISION WARRIORS

| No. | Name |
|---|---|
| 1 | Anjali V |
| 2 | Anchith Shantivana C |
| 3 | Akshay P  |
| 4 |  BS Sujay Krishna |
