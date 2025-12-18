# DocVerse

DocVerse is a web-based document toolkit focused on common PDF workflows. It provides a modern React UI and a Node.js/Express backend for converting, editing, and processing documents.

## Description
DocVerse helps you perform everyday PDF tasks such as merging, splitting, compression, OCR, protection/unlocking, and office/PDF conversions from a simple browser interface. The project is built as a two-part app:

- `docverse-frontend`: Vite + React + TypeScript UI
- `docverse-backend`: Node.js + Express + TypeScript API

## Features
- **PDF merge**
- **PDF split**
- **PDF compression** (Ghostscript fallback; Adobe PDF Services optional)
- **OCR to searchable PDF** (Tesseract fallback; Adobe OCR optional)
- **Protect PDF / Unlock PDF** (password encryption/decryption using `qpdf`)
- **Office -> PDF conversions**
  - Word/Excel/PowerPoint -> PDF
  - PDF -> Word/Excel/PowerPoint
- **Other PDF tools (UI-driven)**
  - Add page numbers
  - Watermark
  - Organize pages
  - Sign PDF

## Tech Stack Used
### Frontend
- **React 18** + **TypeScript**
- **Vite**
- **TailwindCSS**
- **shadcn/ui** + **Radix UI**
- **Lucide icons**
- **PDF.js (`pdfjs-dist`)** for page counting / previews

### Backend
- **Node.js** + **Express** + **TypeScript**
- **multer** (multipart uploads)
- **pdf-lib** (PDF manipulation)
- **jszip** (ZIP responses for multi-file outputs)
- **@adobe/pdfservices-node-sdk** (optional; enabled via env vars)

### System dependencies (for fallback engines)
These are required on the machine/container running the backend if you want the non-Adobe fallbacks:
- **LibreOffice** (`soffice`) for Office/PDF conversions
- **Ghostscript** for compression fallback
- **Poppler utils** (`pdftoppm`, `pdfimages`) for PDF -> image workflows
- **Tesseract OCR** for OCR fallback
- **qpdf** for protect/unlock

## Installation Steps
### Prerequisites
- Node.js (recommended: Node 18+)
- npm
- (Optional but recommended) Install system dependencies listed above for full conversion support.

### 1) Clone the repository
```bash
git clone https://github.com/VatsalGhaghda/DocVerse
cd DocVerse
```

### 2) Frontend setup
```bash
cd docverse-frontend
npm install
npm run dev
```
Frontend runs on:
- `http://localhost:8080`

Create `docverse-frontend/.env` (optional):
```bash
VITE_API_BASE_URL=http://localhost:4000
```

### 3) Backend setup
```bash
cd docverse-backend
npm install
npm run dev
```
Backend runs on:
- `http://localhost:4000`

Create `docverse-backend/.env` as needed. Example:
```bash
PORT=4000

# Optional Adobe integration
ADOBE_PDF_SERVICES_ENABLED=false
USE_ADOBE_AS_PRIMARY=false
ADOBE_CLIENT_ID=
ADOBE_CLIENT_SECRET=
```

## Contribution
Contributions are welcome.

- Open an issue to discuss major changes before submitting a PR.
- Keep PRs focused and scoped.
- Follow the existing code style and run lint/build checks before submitting.

## Author
Created by **Vatsal Ghaghda**
