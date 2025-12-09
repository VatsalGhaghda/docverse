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
