# DocVerse: Phase-wise Implementation Plan

## Phase 1: Foundation Setup (Week 1-2)

### Frontend Setup (Vite + React + TypeScript)
- Initialize Vite + React + TypeScript project
- Set up TailwindCSS for styling
- Configure ESLint and Prettier
- Set up basic routing with React Router
- Create basic layout components (Header, Footer, Sidebar)

### Backend Setup (Node.js + Express)
- Initialize Node.js project with TypeScript
- Set up Express server
- Configure CORS and security middleware
- Create basic API endpoints (health check, file upload)

### Infrastructure
- Set up GitHub repository
- Configure Vercel/Netlify for frontend deployment
- Set up Oracle Cloud Free Tier VM

## Phase 2: Core PDF & Office Tools (Implemented)

### Image → PDF
- Implemented backend endpoint `POST /image-to-pdf` using `pdf-lib`.
- Combines multiple images (JPG/PNG) into a single PDF.
- Supports options:
  - Orientation: portrait / landscape (changes page orientation only, not image rotation).
  - Page size: A4, Letter, Fit to image.
  - Margins: none, small, big.
- Images are embedded unrotated, centered and scaled to fit page + margins.

**Frontend (`ImageToPDF.tsx`)**
- Drag-and-drop upload for single/multiple images with reordering.
- Option controls (orientation, page size, margins).
- Option-aware previews: thumbnails reflect current orientation/page size/margins; images are never rotated, only page aspect and padding change.
- Progress and completion UI with download of final PDF.

### PDF → Image
- Implemented backend endpoint `POST /pdf-to-image`.
- Modes:
  - `pageToJpg`: render each PDF page to JPG via `pdftoppm` (from `poppler-utils`).
  - `extractImages`: extract embedded images via `pdfimages` (from `poppler-utils`).
- Quality mapping:
  - Normal / High options mapped to DPI + JPEG quality flags.
- Output behavior:
  - Single output image → returned directly with correct `Content-Type` and filename.
  - Multiple images → returned as ZIP archive `<base>-images.zip`.

**Frontend (`PDFToImage.tsx`)**
- Upload single PDF and choose mode (Page to JPG / Extract images) and quality (Normal / High).
- Handles both single-image and ZIP responses by inspecting `Content-Type` and `Content-Disposition`.
- Download button label updates dynamically ("Download Image" vs "Download Images (ZIP)").

### Word / Excel / PowerPoint → PDF
- Implemented backend endpoints:
  - `POST /convert/word-to-pdf`
  - `POST /convert/excel-to-pdf`
  - `POST /convert/powerpoint-to-pdf`
- Primary conversion engine: **Adobe PDF Services** (when enabled) with **LibreOffice fallback**.
  - Adobe path uses SDK v4.1.0 job pattern:
    - `upload` → `submit` → `getJobResult` → `getContent`.
  - Fallback path uses LibreOffice headless:
    - `soffice --headless --convert-to pdf --outdir <tempDir> <inputFile>`
  - Multi-file upload is supported. Output behavior:
    - Single output PDF: returned directly.
    - Multiple output PDFs: returned as a ZIP.
- Each response includes `X-Conversion-Engine` (`adobe` or `libreoffice`) header for debugging.

**Frontend (`WordToPDF.tsx`, `ExcelToPDF.tsx`, `PowerPointToPDF.tsx`)**
- Single-file upload using shared `FileUploadZone` component.
- Progress indicator during conversion and completion screen with "Download PDF" button.
- Output filename is derived from original base name (e.g. `document.docx` → `document.pdf`).

### Backend Docker & System Dependencies

- Base image: `node:18-bullseye-slim`.
- System packages installed for PDF/image/OCR/Office conversions:
  - `qpdf` (PDF compression).
  - `ghostscript` (PDF compression/processing).
  - `poppler-utils` (provides `pdftoppm`, `pdfimages` for PDF → image).
  - `tesseract-ocr`, `tesseract-ocr-eng` (OCR engine + English language).
  - Additional Tesseract language packs for the OCR UI language selector:
    - `tesseract-ocr-spa`, `tesseract-ocr-fra`, `tesseract-ocr-deu`, `tesseract-ocr-ita`, `tesseract-ocr-por`,
      `tesseract-ocr-chi-sim`, `tesseract-ocr-jpn`, `tesseract-ocr-kor`, `tesseract-ocr-ara`.
  - `libreoffice` (for Word/Excel/PowerPoint → PDF).
- Docker build steps:
  - `npm install --production=false`
  - `npm run build`
  - `npm start` (runs compiled `dist/index.js`).

### Environment & Dev Commands (Current State)

- Backend local dev: `npm run dev` (Express + ts-node-dev on port 4000), using `.env` loaded via `dotenv`.
- Frontend local dev: `npm run dev` (Vite dev server on port 8080), with `VITE_API_BASE_URL` pointing to backend (defaults to `http://localhost:4000`).
- Adobe PDF Services Node SDK (`@adobe/pdfservices-node-sdk@4.1.0`) is integrated and used as a primary engine when enabled.
  - Toggle behavior via environment variables:
    - `ADOBE_PDF_SERVICES_ENABLED=true|false`
    - `USE_ADOBE_AS_PRIMARY=true|false`
    - `ADOBE_CLIENT_ID`, `ADOBE_CLIENT_SECRET`
- Install Docker on the VM

### Deployment Targets (Phase 1+)
- **Frontend (docverse-frontend)**: Deploy as a static Vite/React site on **Vercel** (Free Tier).
- **Backend API (docverse-backend)**: Deploy Express/TypeScript service on **Render** as a Web Service (Free Tier).
- **Future heavy processing**: Run containerized workers on **Oracle Cloud Free Tier VM** for CPU-intensive PDF tasks.
- **Queue (Phase 2+)**: Use **Upstash Redis** (Free Tier) for job queueing between API and workers.

## Phase 2: Core PDF Operations (Week 3-4)

### Frontend
- Implement file upload component with drag & drop
- Create file preview functionality
- Build basic UI for:
  - PDF Merge
  - PDF Split
  - PDF to Image conversion
  - Image to PDF conversion

### Backend
- Set up file upload handling with multer
- Implement basic file processing queue with Bull (Redis)
- Create worker service for:
  - PDF merging (pdf-lib)
  - PDF splitting (pdf-lib)
  - PDF to Image conversion (pdf2pic)
  - Image to PDF conversion (pdf-lib)

**Note (Current State)**
- Core PDF operations are currently executed synchronously in the API process.
- A background queue/worker is still the recommended next step for production reliability and to avoid request timeouts.

### Infrastructure
- Set up Redis on Oracle Cloud VM
- Configure basic monitoring
- Set up basic logging

## Phase 3: Advanced Features (Week 5-6)

### Frontend
- Add progress indicators
- Implement batch processing UI
- Add file preview with PDF.js
- Create settings panel for conversion options

### Backend
- Add support for:
  - PDF compression (ghostscript)
  - PDF to Word conversion (LibreOffice headless)
  - Word to PDF conversion (LibreOffice headless)
  - Basic OCR (tesseract.js)

**Updates (Implemented / Current Implementation)**
- PDF compression:
  - Primary engine: **Adobe PDF Services** (when enabled).
  - Fallback engine: **Ghostscript**.
  - Multi-file upload supported with single vs ZIP response.
  - Response includes `X-Conversion-Engine`.
- Office conversions:
  - Office → PDF: Adobe primary + LibreOffice fallback.
  - PDF → Word/Excel/PowerPoint: Adobe primary + LibreOffice fallback.
  - Multi-file upload supported with single vs ZIP response.
  - Response includes `X-Conversion-Engine`.
- OCR:
  - Endpoint: `POST /ocr-searchable-pdf`.
  - Output: searchable PDF only.
  - Primary engine: Adobe OCR (PDF inputs; merges multiple PDFs into a single job).
  - Fallback engine: Tesseract (+ Poppler `pdftoppm` for PDFs).
  - Response includes `X-Conversion-Engine`.

### Infrastructure
- Set up object storage (Oracle Cloud)
- Implement file cleanup service
- Configure basic caching

## Phase 4: Polish & Optimization (Week 7-8)

### Frontend
- Add responsive design
- Implement dark/light theme
- Add loading states and error handling
- Create help tooltips and documentation

### Backend
- Optimize worker performance
- Implement rate limiting
- Add request validation
- Set up proper error handling

### Infrastructure
- Configure CDN for static assets
- Set up basic monitoring
- Implement backup strategy

## Phase 5: Testing & Deployment (Week 9-10)

### Testing
- Unit tests for core functionality
- Integration tests for API endpoints
- End-to-end testing with Cypress
- Load testing

### Deployment
- Set up CI/CD pipeline
- Configure production environment
- Implement monitoring and alerting
- Deploy to production

## Recommended Next Steps (Post-Phase 2/3 Reality Check)

### 1) Production deployment + environment hardening
- Ensure production env vars are set for Adobe usage:
  - `ADOBE_PDF_SERVICES_ENABLED`, `USE_ADOBE_AS_PRIMARY`, `ADOBE_CLIENT_ID`, `ADOBE_CLIENT_SECRET`.
- Confirm container runtime includes system dependencies for fallbacks:
  - `libreoffice`, `ghostscript`, `poppler-utils`, `tesseract-ocr` + language packs.

### 2) Queue + worker architecture (to prevent timeouts)
- Introduce Redis-backed queue (Upstash or VM-hosted Redis).
- API responsibilities:
  - accept upload, validate, enqueue job, return job id.
- Worker responsibilities:
  - run conversion/OCR/compress jobs and store outputs.

### 3) Storage + cleanup
- Store outputs in object storage (Oracle Object Storage or similar).
- Add lifecycle cleanup for temp dirs and stored outputs.

### 4) Tests (minimum viable)
- Add integration tests for most critical endpoints:
  - `/ocr-searchable-pdf`, `/compress-pdf`, `/convert/*`.
- Add a small set of sample fixtures and automated CI.

## Technology Stack

### Frontend
- **Framework**: Vite + React 18 + TypeScript
- **UI Library**: TailwindCSS + HeadlessUI
- **State Management**: React Query
- **File Handling**: Uppy.js
- **PDF Rendering**: PDF.js
- **Build Tool**: Vite
- **Hosting**: Vercel (Free Tier)

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Queue**: Bull (Redis)
- **File Storage**: Oracle Cloud Object Storage (Free Tier)
- **Hosting**: Oracle Cloud Free Tier VM

### Infrastructure
- **Version Control**: GitHub (Free)
- **CI/CD**: GitHub Actions (Free for public repos)
- **Monitoring**: Better Stack (Free Tier)
- **Logging**: Better Stack (Free Tier)

## Free Tier Resources

1. **Vercel**
   - 100GB-Hrs Serverless Function Execution
   - 1,000,000 Edge Function Invocations/month
   - 100GB Bandwidth/month

2. **Oracle Cloud Free Tier**
   - 2 AMD-based Compute VMs (1/8 OCPU and 1 GB memory each)
   - 4 Arm-based Ampere A1 cores and 24 GB of memory
   - 200 GB total block storage
   - 10 GB object storage

3. **Redis (Upstash)**
   - 10,000 commands/day
   - Max 1GB storage
   - 30-day data retention

4. **Better Stack**
   - 1 million logs/month
   - 3-hour data retention
   - Basic monitoring

## Development Workflow

1. **Local Development**
   - Frontend: `npm run dev`
   - Backend: `npm run dev`
   - Worker: `npm run worker`

2. **Testing**
   - Unit tests: `npm test`
   - E2E tests: `npm run test:e2e`

3. **Deployment**
   - Frontend: Automatic via Vercel
   - Backend: Manual deployment to Oracle VM
   - Worker: Docker container on Oracle VM

## Risk Mitigation

1. **Free Tier Limits**
   - Monitor usage closely
   - Implement rate limiting
   - Set up alerts for approaching limits

2. **Performance**
   - Implement queue for long-running tasks
   - Use streaming for large files
   - Optimize Docker images

3. **Security**
   - Sanitize all file uploads
   - Run virus scanning
   - Implement CORS properly

## Deployment Steps (Phase 1)

1. **Initialize Git repository (local)**
   - From `C:/Users/ASUS/OneDrive/Desktop/DocVerse`:
     - `git init`
     - `git add docverse-frontend docverse-backend Phase_Implementation.md`
     - `git commit -m "chore: initial DocVerse frontend and backend"`

2. **Create GitHub repository**
   - Create a new repo on GitHub (e.g. `docverse`), without any starter files.
   - Add GitHub as remote:
     - `git remote add origin https://github.com/<your-username>/docverse.git`
   - Push code:
     - `git push -u origin main`

3. **Connect frontend (docverse-frontend) to Vercel**
   - Log into Vercel and **Import Project** from GitHub.
   - Select the `docverse` repository.
   - Set **Root Directory** to `docverse-frontend`.
   - Framework preset: **Vite** / **React** (auto-detected).
   - Build command: `npm run build` (default for Vite).
   - Output directory: `dist`.
   - Deploy and note the resulting URL (e.g. `https://docverse-frontend.vercel.app`).

4. **Connect backend (docverse-backend) to Render**
   - Log into Render and create a new **Web Service** from GitHub.
   - Select the same `docverse` repository.
   - Set **Root Directory** to `docverse-backend`.
   - Build command: `npm run build`.
   - Start command: `npm start`.
   - Environment: Node 18+.
   - Choose the free tier instance type and deploy.
   - Note the backend URL (e.g. `https://docverse-api.onrender.com`).

5. **Wire frontend to backend (later)**
   - When API routes are defined, configure the frontend to call the Render URL via environment variables (e.g. `VITE_API_BASE_URL`).

## Current Implementation Notes: Protect / Unlock PDF

### Backend (docverse-backend)
- **Endpoints implemented**:
  - `POST /protect-pdf` – protects a single PDF with a password using **qpdf**.
  - `POST /unlock-pdf` – unlocks a password-protected PDF given the correct password.
  - `POST /pdf-encryption-status` – lightweight check to see if an uploaded PDF is encrypted.
- **qpdf integration**:
  - Using `qpdf --warning-exit-0 --show-encryption input.pdf` to detect encryption state.
  - Treats output containing `"not encrypted"` (case-insensitive) as **not protected**.
  - Protect uses `qpdf --warning-exit-0 --encrypt <pwd> <pwd> 256 -- input.pdf output.pdf`.
  - Unlock uses `qpdf --warning-exit-0 --password=<pwd> --decrypt input.pdf output.pdf`.
  - Handles qpdf "operation succeeded with warnings" via `--warning-exit-0`.
- **Error semantics**:
  - Protect:
    - `400` + `code: "already_protected"` when input is already encrypted.
  - Unlock:
    - `400` + `code: "not_protected"` when input is not encrypted.
    - `401` + `code: "incorrect_password"` when qpdf decrypt fails.
- **Dockerfile (backend)**:
  - Based on `node:18-bullseye-slim`.
  - Installs qpdf via `apt-get install -y qpdf`.
  - Builds with `npm run build` and starts with `npm start` on port `4000`.

### Frontend (docverse-frontend)
- **Tools implemented**:
  - Protect PDF page
  - Unlock PDF page
- **Key UX behavior**:
  - File uploads use shared `FileUploadZone` with generic PDF icon preview.
  - Immediate validation on upload via `/pdf-encryption-status`:
    - Protect: shows red message and disables button for already-protected PDFs.
    - Unlock: shows red message and disables button for unprotected PDFs.
  - Clear error messages for incorrect password, already-protected, and not-protected cases.
  - Password + confirm-password fields with visibility toggles.
  - Smooth scrolling to the file card area after upload (with page offset).
- **API base URL**:
  - Configured via `VITE_API_BASE_URL` (e.g. `https://<render-backend-url>` in production).

### Deployment (Protect / Unlock PDF)
- **Backend on Render (Docker)**:
  - Render Web Service uses `docverse-backend/Dockerfile` as the runtime.
  - No explicit build/start commands required in Render; Dockerfile controls the build.
  - qpdf is installed inside the image; `QPDF_PATH` env var is optional (defaults to `"qpdf"`).
- **Frontend on Vercel**:
  - Vercel project root: `docverse-frontend`.
  - Environment variable `VITE_API_BASE_URL` points to the Render backend URL.
  - Frontend calls backend routes (`/protect-pdf`, `/unlock-pdf`, `/pdf-encryption-status`) through this base URL.

