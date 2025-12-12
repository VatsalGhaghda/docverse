import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import JSZip from "jszip";
import fs from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const app = express();
const PORT = process.env.PORT || 4000;
const execFileAsync = promisify(execFile);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per file (frontend also enforces this)
    files: 5,
  },
});

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "docverse-backend",
    message: "DocVerse backend is running. Use /health for health checks and /upload for uploads.",
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "docverse-backend" });
});

app.post("/upload", (req: Request, res: Response) => {
  // TODO: Wire this to real file handling / job queue in later phases
  res.json({
    status: "accepted",
    message: "Upload endpoint stub. Implement storage & processing in later phases.",
    bodyExample: req.body,
  });
});

app.post("/merge-pdf", upload.array("files", 5), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length < 2) {
      return res.status(400).json({
        status: "error",
        message: "Please upload at least 2 PDF files to merge.",
      });
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotal = 100 * 1024 * 1024; // 100MB total

    if (totalSize > maxTotal) {
      return res.status(413).json({
        status: "error",
        message: "Total size of uploaded files exceeds 100MB.",
      });
    }

    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const pdf = await PDFDocument.load(file.buffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedBytes = await mergedPdf.save();

    res
      .status(200)
      .contentType("application/pdf")
      .setHeader("Content-Disposition", "attachment; filename=merged.pdf")
      .send(Buffer.from(mergedBytes));
  } catch (error) {
    console.error("Error merging PDFs", error);
    res.status(500).json({
      status: "error",
      message: "Failed to merge PDFs. Please try again.",
    });
  }
});

app.post("/split-pdf", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload a PDF file to split.",
      });
    }

    if (file.size > 100 * 1024 * 1024) {
      return res.status(413).json({
        status: "error",
        message: "Uploaded file exceeds 100MB limit.",
      });
    }

    const mode = (req.body.mode as string) || "range"; // range | each | half
    const rangeMode = (req.body.rangeMode as string) || "custom"; // custom | fixed

    const srcPdf = await PDFDocument.load(file.buffer);
    const totalPages = srcPdf.getPageCount();

    const zip = new JSZip();

    const addRangeToZip = async (from: number, to: number, rangeIndex: number) => {
      const start = Math.max(1, from);
      const end = Math.min(totalPages, to);
      if (start > end) return;

      const pdf = await PDFDocument.create();
      const pageIndices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
      const copiedPages = await pdf.copyPages(srcPdf, pageIndices);
      copiedPages.forEach((p) => pdf.addPage(p));
      const bytes = await pdf.save();

      const name = `range-${rangeIndex}-${start}-to-${end}.pdf`;
      zip.file(name, bytes);
    };

    if (mode === "range") {
      if (rangeMode === "fixed") {
        const chunkSize = parseInt(req.body.chunkSize, 10) || 1;
        if (chunkSize <= 0) {
          return res.status(400).json({
            status: "error",
            message: "chunkSize must be a positive integer.",
          });
        }
        let rangeIndex = 1;
        for (let start = 1; start <= totalPages; start += chunkSize) {
          const end = Math.min(start + chunkSize - 1, totalPages);
          await addRangeToZip(start, end, rangeIndex++);
        }
      } else {
        // custom ranges: expect JSON array [{ from: number, to: number }, ...]
        let ranges: { from: number; to: number }[] = [];
        if (req.body.ranges) {
          try {
            ranges = JSON.parse(req.body.ranges as string);
          } catch {
            return res.status(400).json({
              status: "error",
              message: "Invalid ranges payload.",
            });
          }
        }

        if (!Array.isArray(ranges) || ranges.length === 0) {
          return res.status(400).json({
            status: "error",
            message: "Please provide at least one valid page range.",
          });
        }

        let rangeIndex = 1;
        for (const r of ranges) {
          if (typeof r.from !== "number" || typeof r.to !== "number") continue;
          await addRangeToZip(r.from, r.to, rangeIndex++);
        }
      }
    } else if (mode === "each") {
      // One PDF per page
      for (let i = 1; i <= totalPages; i++) {
        const pdf = await PDFDocument.create();
        const [page] = await pdf.copyPages(srcPdf, [i - 1]);
        pdf.addPage(page);
        const bytes = await pdf.save();
        zip.file(`page-${i}.pdf`, bytes);
      }
    } else if (mode === "half") {
      const half = Math.ceil(totalPages / 2);
      await addRangeToZip(1, half, 1);
      if (half + 1 <= totalPages) {
        await addRangeToZip(half + 1, totalPages, 2);
      }
    } else {
      return res.status(400).json({
        status: "error",
        message: "Unknown split mode.",
      });
    }

    const zipBytes = await zip.generateAsync({ type: "nodebuffer" });

    res
      .status(200)
      .contentType("application/zip")
      .setHeader("Content-Disposition", "attachment; filename=split-pages.zip")
      .send(zipBytes);
  } catch (error) {
    console.error("Error splitting PDF", error);
    res.status(500).json({
      status: "error",
      message: "Failed to split PDF. Please try again.",
    });
  }
});

app.post("/compress-pdf", upload.array("files", 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Please upload at least one PDF file to compress.",
      });
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotal = 100 * 1024 * 1024; // 100MB total

    if (totalSize > maxTotal) {
      return res.status(413).json({
        status: "error",
        message: "Total size of uploaded files exceeds 100MB.",
      });
    }

    // Map a numeric quality (10–100) to Ghostscript PDFSETTINGS presets.
    const rawQuality = parseInt((req.body.quality as string) || "70", 10);
    const clampedQuality = isNaN(rawQuality) ? 70 : Math.min(100, Math.max(10, rawQuality));

    const mapQualityToPdfSettings = (q: number): { preset: string; dpi: number } => {
      if (q >= 75) {
        // Higher quality: light compression
        return { preset: "/prepress", dpi: 180 };
      }
      if (q >= 45) {
        // Recommended / balanced
        return { preset: "/ebook", dpi: 110 };
      }
      // Extreme compression: very strong downsampling
      return { preset: "/screen", dpi: 50 };
    };

    const { preset: pdfSettings, dpi } = mapQualityToPdfSettings(clampedQuality);

    const isWindows = process.platform === "win32";
    const gsPath = process.env.GS_PATH || (isWindows ? "gswin64c" : "gs");

    // Helper to compress a single PDF buffer with Ghostscript.
    const compressWithGhostscript = async (inputBuffer: Buffer): Promise<Buffer> => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "docverse-compress-"));
      const inputPath = path.join(tmpDir, "input.pdf");
      const outputPath = path.join(tmpDir, "output.pdf");

      fs.writeFileSync(inputPath, inputBuffer);

      try {
        const args = [
          "-sDEVICE=pdfwrite",
          "-dCompatibilityLevel=1.4",
          `-dPDFSETTINGS=${pdfSettings}`,
          // Image downsampling tuned by effective DPI derived from quality slider
          "-dDownsampleColorImages=true",
          "-dColorImageDownsampleType=/Bicubic",
          `-dColorImageResolution=${dpi}`,
          "-dDownsampleGrayImages=true",
          "-dGrayImageDownsampleType=/Bicubic",
          `-dGrayImageResolution=${dpi}`,
          "-dDownsampleMonoImages=true",
          "-dMonoImageDownsampleType=/Subsample",
          `-dMonoImageResolution=${dpi}`,
          "-dNOPAUSE",
          "-dQUIET",
          "-dBATCH",
          `-sOutputFile=${outputPath}`,
          inputPath,
        ];

        await execFileAsync(gsPath, args);

        const compressed = fs.readFileSync(outputPath);
        return compressed;
      } finally {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      }
    };

    // If only a single file is uploaded, return a single compressed PDF instead of a ZIP.
    // If Ghostscript does not actually reduce size, fall back to the original bytes so the
    // file is never larger than the input.
    if (files.length === 1) {
      const file = files[0];
      const compressedBytes = await compressWithGhostscript(file.buffer);
      const chosenBytes =
        compressedBytes.length >= file.buffer.length ? file.buffer : compressedBytes;

      const originalName = file.originalname || "document.pdf";
      const dotIndex = originalName.lastIndexOf(".");
      const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
      const compressedName = `${base}-compressed.pdf`;

      return res
        .status(200)
        .contentType("application/pdf")
        .setHeader("Content-Disposition", `attachment; filename=${compressedName}`)
        .send(Buffer.from(chosenBytes));
    }

    // Multiple files: compress each and return a ZIP archive. For each file, if
    // Ghostscript does not reduce size, fall back to the original bytes.
    const zip = new JSZip();

    for (const file of files) {
      const compressedBytes = await compressWithGhostscript(file.buffer);
      const chosenBytes =
        compressedBytes.length >= file.buffer.length ? file.buffer : compressedBytes;

      const originalName = file.originalname || "document.pdf";
      const dotIndex = originalName.lastIndexOf(".");
      const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
      const compressedName = `${base}-compressed.pdf`;

      zip.file(compressedName, chosenBytes);
    }

    const zipBytes = await zip.generateAsync({ type: "nodebuffer" });

    res
      .status(200)
      .contentType("application/zip")
      .setHeader("Content-Disposition", "attachment; filename=compressed-pdfs.zip")
      .send(zipBytes);
  } catch (error) {
    console.error("Error compressing PDFs", error);
    res.status(500).json({
      status: "error",
      message:
        "Failed to compress PDFs. Please ensure Ghostscript is installed on the server and try again.",
    });
  }
});

app.post("/convert/pdf-to-word", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload a PDF file to convert.",
      });
    }

    if (file.size > 100 * 1024 * 1024) {
      return res.status(413).json({
        status: "error",
        message: "Uploaded file exceeds 100MB limit.",
      });
    }

    const originalName = file.originalname || "document.pdf";
    const dotIndex = originalName.lastIndexOf(".");
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const convertedName = `${base}.docx`;

    res
      .status(200)
      .contentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
      .setHeader("Content-Disposition", `attachment; filename=${convertedName}`)
      .send(file.buffer);
  } catch (error) {
    console.error("Error in PDF to Word conversion", error);
    res.status(500).json({
      status: "error",
      message: "Failed to convert PDF to Word. Please try again.",
    });
  }
});

app.post("/convert/pdf-to-excel", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload a PDF file to convert.",
      });
    }

    if (file.size > 100 * 1024 * 1024) {
      return res.status(413).json({
        status: "error",
        message: "Uploaded file exceeds 100MB limit.",
      });
    }

    const originalName = file.originalname || "document.pdf";
    const dotIndex = originalName.lastIndexOf(".");
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const convertedName = `${base}.xlsx`;

    res
      .status(200)
      .contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .setHeader("Content-Disposition", `attachment; filename=${convertedName}`)
      .send(file.buffer);
  } catch (error) {
    console.error("Error in PDF to Excel conversion", error);
    res.status(500).json({
      status: "error",
      message: "Failed to convert PDF to Excel. Please try again.",
    });
  }
});

app.post("/convert/pdf-to-powerpoint", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload a PDF file to convert.",
      });
    }

    if (file.size > 100 * 1024 * 1024) {
      return res.status(413).json({
        status: "error",
        message: "Uploaded file exceeds 100MB limit.",
      });
    }

    const originalName = file.originalname || "document.pdf";
    const dotIndex = originalName.lastIndexOf(".");
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const convertedName = `${base}.pptx`;

    res
      .status(200)
      .contentType("application/vnd.openxmlformats-officedocument.presentationml.presentation")
      .setHeader("Content-Disposition", `attachment; filename=${convertedName}`)
      .send(file.buffer);
  } catch (error) {
    console.error("Error in PDF to PowerPoint conversion", error);
    res.status(500).json({
      status: "error",
      message: "Failed to convert PDF to PowerPoint. Please try again.",
    });
  }
});

app.post("/convert/word-to-pdf", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload a Word document to convert.",
      });
    }

    if (file.size > 100 * 1024 * 1024) {
      return res.status(413).json({
        status: "error",
        message: "Uploaded file exceeds 100MB limit.",
      });
    }

    const originalName = file.originalname || "document.docx";
    const dotIndex = originalName.lastIndexOf(".");
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const convertedName = `${base}.pdf`;

    res
      .status(200)
      .contentType("application/pdf")
      .setHeader("Content-Disposition", `attachment; filename=${convertedName}`)
      .send(file.buffer);
  } catch (error) {
    console.error("Error in Word to PDF conversion", error);
    res.status(500).json({
      status: "error",
      message: "Failed to convert Word to PDF. Please try again.",
    });
  }
});

app.post("/convert/excel-to-pdf", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload an Excel workbook to convert.",
      });
    }

    if (file.size > 100 * 1024 * 1024) {
      return res.status(413).json({
        status: "error",
        message: "Uploaded file exceeds 100MB limit.",
      });
    }

    const originalName = file.originalname || "spreadsheet.xlsx";
    const dotIndex = originalName.lastIndexOf(".");
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const convertedName = `${base}.pdf`;

    res
      .status(200)
      .contentType("application/pdf")
      .setHeader("Content-Disposition", `attachment; filename=${convertedName}`)
      .send(file.buffer);
  } catch (error) {
    console.error("Error in Excel to PDF conversion", error);
    res.status(500).json({
      status: "error",
      message: "Failed to convert Excel to PDF. Please try again.",
    });
  }
});

app.post("/convert/powerpoint-to-pdf", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload a PowerPoint presentation to convert.",
      });
    }

    if (file.size > 100 * 1024 * 1024) {
      return res.status(413).json({
        status: "error",
        message: "Uploaded file exceeds 100MB limit.",
      });
    }

    const originalName = file.originalname || "presentation.pptx";
    const dotIndex = originalName.lastIndexOf(".");
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const convertedName = `${base}.pdf`;

    res
      .status(200)
      .contentType("application/pdf")
      .setHeader("Content-Disposition", `attachment; filename=${convertedName}`)
      .send(file.buffer);
  } catch (error) {
    console.error("Error in PowerPoint to PDF conversion", error);
    res.status(500).json({
      status: "error",
      message: "Failed to convert PowerPoint to PDF. Please try again.",
    });
  }
});

app.post("/convert/pdf-to-html", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload a PDF file to convert.",
      });
    }

    if (file.size > 100 * 1024 * 1024) {
      return res.status(413).json({
        status: "error",
        message: "Uploaded file exceeds 100MB limit.",
      });
    }

    const originalName = file.originalname || "document.pdf";
    const dotIndex = originalName.lastIndexOf(".");
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const convertedName = `${base}-html.zip`;

    // Stub: return original bytes but as a .zip named like an HTML package.
    // Real PDF-to-HTML conversion with assets will be implemented in a later phase.
    res
      .status(200)
      .contentType("application/zip")
      .setHeader("Content-Disposition", `attachment; filename=${convertedName}`)
      .send(file.buffer);
  } catch (error) {
    console.error("Error in PDF to HTML conversion", error);
    res.status(500).json({
      status: "error",
      message: "Failed to convert PDF to HTML. Please try again.",
    });
  }
});

app.post("/pdf-to-image", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload a PDF file to convert to images.",
      });
    }

    if (file.size > 100 * 1024 * 1024) {
      return res.status(413).json({
        status: "error",
        message: "Uploaded file exceeds 100MB limit.",
      });
    }

    const originalName = file.originalname || "document.pdf";
    const dotIndex = originalName.lastIndexOf(".");
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const zipName = `${base}-images.zip`;

    // Stub: return original bytes but as a ZIP named like an image package.
    // Real per-page image rendering will be implemented in a later phase.
    res
      .status(200)
      .contentType("application/zip")
      .setHeader("Content-Disposition", `attachment; filename=${zipName}`)
      .send(file.buffer);
  } catch (error) {
    console.error("Error in PDF to Image conversion", error);
    res.status(500).json({
      status: "error",
      message: "Failed to convert PDF to images. Please try again.",
    });
  }
});

app.post("/image-to-pdf", upload.array("files", 50), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Please upload at least one image to convert to PDF.",
      });
    }

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const maxTotal = 100 * 1024 * 1024; // 100MB

    if (totalSize > maxTotal) {
      return res.status(413).json({
        status: "error",
        message: "Total size of uploaded images exceeds 100MB.",
      });
    }

    const first = files[0];
    const originalName = first.originalname || "image";
    const dotIndex = originalName.lastIndexOf(".");
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const pdfName = `${base}.pdf`;

    // Stub: echo the first image bytes but label them as a PDF.
    // Real multi-image to single-PDF rendering will be implemented later.
    res
      .status(200)
      .contentType("application/pdf")
      .setHeader("Content-Disposition", `attachment; filename=${pdfName}`)
      .send(first.buffer);
  } catch (error) {
    console.error("Error in Image to PDF conversion", error);
    res.status(500).json({
      status: "error",
      message: "Failed to convert images to PDF. Please try again.",
    });
  }
});

app.post("/ocr", upload.array("files", 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Please upload at least one file for OCR.",
      });
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxTotal = 100 * 1024 * 1024; // 100MB total

    if (totalSize > maxTotal) {
      return res.status(413).json({
        status: "error",
        message: "Total size of uploaded files exceeds 100MB.",
      });
    }

    const language = (req.body.language as string) || "en";

    // Stub: return placeholder text and echo metadata. Real OCR will be added later.
    const placeholderText =
      "This is stub OCR text. Real text extraction will be implemented in a later phase. " +
      `Language requested: ${language}. Files received: ${files.length}.`;

    res.status(200).json({
      status: "ok",
      text: placeholderText,
    });
  } catch (error) {
    console.error("Error in OCR endpoint", error);
    res.status(500).json({
      status: "error",
      message: "Failed to run OCR. Please try again.",
    });
  }
});

app.post("/add-page-numbers", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload a PDF file to add page numbers.",
      });
    }

    if (file.size > 100 * 1024 * 1024) {
      return res.status(413).json({
        status: "error",
        message: "Uploaded file exceeds 100MB limit.",
      });
    }

    const originalName = file.originalname || "document.pdf";
    const dotIndex = originalName.lastIndexOf(".");
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const numberedName = `${base}-numbered.pdf`;

    // Options from frontend
    const format = (req.body.format as string) || "1";
    const template = (req.body.template as string) || "number";
    const pageMode = (req.body.pageMode as "single" | "facing") || "single";
    const coverIsFirstPage = req.body.coverIsFirstPage === "true";
    const startAtRaw = parseInt((req.body.startAt as string) || "1", 10);
    const startAt = Number.isNaN(startAtRaw) || startAtRaw < 1 ? 1 : startAtRaw;
    const range = ((req.body.range as string) || "").trim();
    const position = (req.body.position as string) || "bottom-center";
    const fontSizeRaw = parseInt((req.body.fontSize as string) || "12", 10);
    const fontSize = Number.isNaN(fontSizeRaw) ? 12 : Math.min(48, Math.max(6, fontSizeRaw));
    const marginRaw = parseInt((req.body.margin as string) || "24", 10);
    const margin = Number.isNaN(marginRaw) ? 24 : Math.min(200, Math.max(4, marginRaw));
    const colorRaw = (req.body.color as string) || "#000000";
    const fontFamilyRaw = (req.body.fontFamily as string) || "helvetica";
    const bold = req.body.bold === "true";
    const italic = req.body.italic === "true";
    const underline = req.body.underline === "true";

    // Load PDF
    const pdfDoc = await PDFDocument.load(file.buffer);
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    // Helper: parse range string like "1-3,5,8-10" into a Set of 1-based page numbers
    const defaultStartPage = coverIsFirstPage && pageMode === "facing" ? 2 : 1;

    const parseRanges = (input: string, maxPage: number): Set<number> => {
      const result = new Set<number>();
      if (!input) {
        for (let i = defaultStartPage; i <= maxPage; i++) result.add(i);
        return result;
      }

      const parts = input.split(",");
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const dashIndex = trimmed.indexOf("-");
        if (dashIndex === -1) {
          const n = parseInt(trimmed, 10);
          if (!Number.isNaN(n) && n >= 1 && n <= maxPage) result.add(n);
        } else {
          const startStr = trimmed.slice(0, dashIndex).trim();
          const endStr = trimmed.slice(dashIndex + 1).trim();
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          if (Number.isNaN(start) || Number.isNaN(end)) continue;
          const from = Math.max(1, Math.min(start, end));
          const to = Math.min(maxPage, Math.max(start, end));
          for (let i = from; i <= to; i++) {
            result.add(i);
          }
        }
      }

      // If nothing valid parsed, default to all pages
      if (result.size === 0) {
        for (let i = defaultStartPage; i <= maxPage; i++) result.add(i);
      }

      return result;
    };

    const pagesToNumber = parseRanges(range, totalPages);
    const sortedPagesToNumber = Array.from(pagesToNumber).sort((a, b) => a - b);
    const totalLogicalPages = sortedPagesToNumber.length;

    // Helpers to format numbers
    const toRoman = (num: number, uppercase: boolean): string => {
      if (num <= 0) return "";
      const romans: [number, string][] = [
        [1000, "M"],
        [900, "CM"],
        [500, "D"],
        [400, "CD"],
        [100, "C"],
        [90, "XC"],
        [50, "L"],
        [40, "XL"],
        [10, "X"],
        [9, "IX"],
        [5, "V"],
        [4, "IV"],
        [1, "I"],
      ];
      let n = num;
      let result = "";
      for (const [value, symbol] of romans) {
        while (n >= value) {
          result += symbol;
          n -= value;
        }
      }
      return uppercase ? result : result.toLowerCase();
    };

    const formatNumber = (n: number): string => {
      switch (format) {
        case "01":
          return n.toString().padStart(2, "0");
        case "i":
          return toRoman(n, false);
        case "I":
          return toRoman(n, true);
        case "1":
        default:
          return n.toString();
      }
    };

    const parseColor = (hex: string): { r: number; g: number; b: number } => {
      const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
      if (!match) {
        return { r: 0, g: 0, b: 0 };
      }
      const intVal = parseInt(match[1], 16);
      const r = ((intVal >> 16) & 0xff) / 255;
      const g = ((intVal >> 8) & 0xff) / 255;
      const b = (intVal & 0xff) / 255;
      return { r, g, b };
    };

    const { r, g, b } = parseColor(colorRaw);

    type FontFamily = "helvetica" | "times" | "courier";
    const fontFamily = (fontFamilyRaw.toLowerCase() as FontFamily) || "helvetica";

    const resolveStandardFont = () => {
      switch (fontFamily) {
        case "times":
          if (bold && italic) return StandardFonts.TimesRomanBoldItalic;
          if (bold) return StandardFonts.TimesRomanBold;
          if (italic) return StandardFonts.TimesRomanItalic;
          return StandardFonts.TimesRoman;
        case "courier":
          if (bold && italic) return StandardFonts.CourierBoldOblique;
          if (bold) return StandardFonts.CourierBold;
          if (italic) return StandardFonts.CourierOblique;
          return StandardFonts.Courier;
        case "helvetica":
        default:
          if (bold && italic) return StandardFonts.HelveticaBoldOblique;
          if (bold) return StandardFonts.HelveticaBold;
          if (italic) return StandardFonts.HelveticaOblique;
          return StandardFonts.Helvetica;
      }
    };

    const font = await pdfDoc.embedFont(resolveStandardFont());

    // Draw numbers on selected pages
    for (let index = 0; index < totalPages; index++) {
      const pageNumber = index + 1; // 1-based
      if (!pagesToNumber.has(pageNumber)) continue;

      const logicalIndex = sortedPagesToNumber.indexOf(pageNumber);
      const logicalNumber = startAt + logicalIndex;
      const baseNumberText = formatNumber(logicalNumber);

      let text: string;
      switch (template) {
        case "page_n":
          text = `Page ${baseNumberText}`;
          break;
        case "page_n_of_total": {
          const totalText = formatNumber(startAt + totalLogicalPages - 1);
          text = `Page ${baseNumberText} of ${totalText}`;
          break;
        }
        case "number":
        default:
          text = baseNumberText;
          break;
      }

      const page = pages[index];
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = fontSize;

      let x = margin;
      let y = margin;

      const bottomY = margin;
      const topY = height - margin - textHeight;

      // For facing pages, mirror left/right positions across the spread.
      // "left" means outer edges, "right" means inner edges. Center stays centered.
      let effectivePosition = position;
      if (pageMode === "facing") {
        const isCoverPage = coverIsFirstPage && pageNumber === 1;
        if (!isCoverPage) {
          // Determine if this physical page is the left or right page in its spread.
          // With a cover: spreads start at page 2 (even = left, odd = right).
          // Without a cover: spreads start at page 1 (odd = left, even = right).
          const isLeftPageInSpread = coverIsFirstPage ? pageNumber % 2 === 0 : pageNumber % 2 === 1;

          const [vertical, horizontal] = position.split("-") as [
            "top" | "bottom",
            "left" | "center" | "right"
          ];

          let effHorizontal: "left" | "center" | "right" = horizontal;
          if (horizontal !== "center") {
            if (horizontal === "left") {
              // "left" = outer: left page uses left, right page uses right
              effHorizontal = isLeftPageInSpread ? "left" : "right";
            } else {
              // "right" = inner: left page uses right, right page uses left
              effHorizontal = isLeftPageInSpread ? "right" : "left";
            }
          }

          effectivePosition = `${vertical}-${effHorizontal}` as typeof position;
        }
      }

      switch (effectivePosition) {
        case "top-left":
          x = margin;
          y = topY;
          break;
        case "top-center":
          x = (width - textWidth) / 2;
          y = topY;
          break;
        case "top-right":
          x = width - margin - textWidth;
          y = topY;
          break;
        case "bottom-left":
          x = margin;
          y = bottomY;
          break;
        case "bottom-center":
          x = (width - textWidth) / 2;
          y = bottomY;
          break;
        case "bottom-right":
        default:
          x = width - margin - textWidth;
          y = bottomY;
          break;
      }

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(r, g, b),
      });

      if (underline) {
        const underlineOffset = fontSize * 0.2;
        const underlineY = y - underlineOffset;
        page.drawLine({
          start: { x, y: underlineY },
          end: { x: x + textWidth, y: underlineY },
          thickness: Math.max(0.5, fontSize * 0.06),
          color: rgb(r, g, b),
        });
      }
    }

    const numberedBytes = await pdfDoc.save();

    res
      .status(200)
      .contentType("application/pdf")
      .setHeader("Content-Disposition", `attachment; filename=${numberedName}`)
      .send(Buffer.from(numberedBytes));
  } catch (error) {
    console.error("Error adding page numbers", error);
    res.status(500).json({
      status: "error",
      message: "Failed to add page numbers. Please try again.",
    });
  }
});

app.post("/organize-pdf", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload a PDF file to organize.",
      });
    }

    if (file.size > 100 * 1024 * 1024) {
      return res.status(413).json({
        status: "error",
        message: "Uploaded file exceeds 100MB limit.",
      });
    }

    const originalName = file.originalname || "document.pdf";
    const dotIndex = originalName.lastIndexOf(".");
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const organizedName = `${base}-organized.pdf`;

    // Parse pages payload from frontend
    type IncomingPage = {
      type: "page" | "blank";
      originalIndex: number | null;
      rotation: 0 | 90 | 180 | 270;
    };

    let pagesPayload: IncomingPage[] = [];
    const rawPages = req.body.pages as string | undefined;
    if (rawPages) {
      try {
        const parsed = JSON.parse(rawPages);
        if (Array.isArray(parsed)) {
          pagesPayload = parsed.filter((p) =>
            p && (p.type === "page" || p.type === "blank") && typeof p.rotation === "number"
          );
        }
      } catch (err) {
        console.warn("Failed to parse pages payload for /organize-pdf", err);
      }
    }

    if (pagesPayload.length === 0) {
      // Fallback: just return original if no valid instructions
      return res
        .status(200)
        .contentType("application/pdf")
        .setHeader("Content-Disposition", `attachment; filename=${organizedName}`)
        .send(file.buffer);
    }

    const srcDoc = await PDFDocument.load(file.buffer);
    const srcPages = srcDoc.getPages();

    const outDoc = await PDFDocument.create();

    // Use first page size as baseline for blank pages
    const basePageSize = srcPages[0]?.getSize();

    for (const item of pagesPayload) {
      if (item.type === "page") {
        if (
          item.originalIndex == null ||
          Number.isNaN(item.originalIndex) ||
          item.originalIndex < 0 ||
          item.originalIndex >= srcPages.length
        ) {
          continue;
        }

        const [copiedPage] = await outDoc.copyPages(srcDoc, [item.originalIndex]);

        // Apply rotation if requested
        if (item.rotation) {
          copiedPage.setRotation(degrees(item.rotation));
        }

        outDoc.addPage(copiedPage);
      } else if (item.type === "blank") {
        // Insert a blank page using the same size as the first page if available
        if (basePageSize) {
          const blank = outDoc.addPage([basePageSize.width, basePageSize.height]);
          if (item.rotation) {
            blank.setRotation(degrees(item.rotation));
          }
        } else {
          outDoc.addPage();
        }
      }
    }

    const organizedBytes = await outDoc.save();

    res
      .status(200)
      .contentType("application/pdf")
      .setHeader("Content-Disposition", `attachment; filename=${organizedName}`)
      .send(Buffer.from(organizedBytes));
  } catch (error) {
    console.error("Error organizing PDF", error);
    res.status(500).json({
      status: "error",
      message: "Failed to organize PDF. Please try again.",
    });
  }
});

app.post(
  "/watermark-pdf",
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "watermarkImage", maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      const file = files?.file?.[0];

      if (!file) {
        return res.status(400).json({
          status: "error",
          message: "Please upload a PDF file to watermark.",
        });
      }

      if (file.size > 100 * 1024 * 1024) {
        return res.status(413).json({
          status: "error",
          message: "Uploaded file exceeds 100MB limit.",
        });
      }

      const originalName = file.originalname || "document.pdf";
      const dotIndex = originalName.lastIndexOf(".");
      const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
      const watermarkedName = `${base}-watermarked.pdf`;

      const body = req.body as {
        mode?: string;
        text?: string;
        opacity?: string; // 0-100 from frontend (already inverted from transparency)
        rotation?: string; // degrees
        position?: string; // e.g. top-left, mid-center
        rangeFrom?: string;
        rangeTo?: string;
        layer?: string; // over | under
        fontSize?: string;
        color?: string;
        fontFamily?: string;
        bold?: string;
        italic?: string;
        underline?: string;
      };

      const mode = body.mode === "image" ? "image" : "text";
      const watermarkText = (body.text || "").trim();
      const opacityPercent = Number.parseFloat(body.opacity || "100");
      const opacity = Number.isFinite(opacityPercent)
        ? Math.min(Math.max(opacityPercent / 100, 0), 1)
        : 1;
      const rotationDegrees = Number.parseFloat(body.rotation || "0");
      const rotation = Number.isFinite(rotationDegrees) ? rotationDegrees : 0;
      const positionKey = body.position || "mid-center";
      const layer = body.layer === "under" ? "under" : "over";
      const fontSizeRaw = body.fontSize || "32";
      const sizeFromBody = Number.parseFloat(fontSizeRaw);
      const effectiveFontSize = Number.isFinite(sizeFromBody) ? Math.max(8, Math.min(sizeFromBody, 96)) : 32;

      const colorRaw = body.color || "#000000";
      const fontFamilyRaw = body.fontFamily || "helvetica";
      const bold = body.bold === "true";
      const italic = body.italic === "true";
      const underline = body.underline === "true";

      const rangeFromNum = Number.parseInt(body.rangeFrom || "", 10);
      const rangeToNum = Number.parseInt(body.rangeTo || "", 10);

      const watermarkImageFile = files?.watermarkImage?.[0];

      if (mode === "text" && !watermarkText) {
        return res.status(400).json({
          status: "error",
          message: "Please provide watermark text.",
        });
      }

      if (mode === "image" && !watermarkImageFile) {
        return res.status(400).json({
          status: "error",
          message: "Please upload a watermark image.",
        });
      }

      const srcDoc = await PDFDocument.load(file.buffer);
      const srcPages = srcDoc.getPages();
      const totalPages = srcPages.length;

      // Determine page range (1-based, inclusive). If not provided, default to all pages.
      let startPage = 1;
      let endPage = totalPages;

      if (!Number.isNaN(rangeFromNum)) {
        startPage = Math.min(Math.max(rangeFromNum, 1), totalPages);
      }
      if (!Number.isNaN(rangeToNum)) {
        endPage = Math.min(Math.max(rangeToNum, 1), totalPages);
      }
      if (startPage > endPage) {
        [startPage, endPage] = [endPage, startPage];
      }

      const outDoc = await PDFDocument.create();

      // Embed all source pages so we can control drawing order (layer over/under)
      const embeddedPages = await outDoc.embedPages(srcPages);

      // Prepare resources for watermark drawing
      let textFont = undefined as undefined | any;
      let imageEmbed: any | undefined;

      if (mode === "text") {
        type FontFamily = "helvetica" | "times" | "courier";
        const fontFamily = (fontFamilyRaw.toLowerCase() as FontFamily) || "helvetica";

        const resolveStandardFont = () => {
          switch (fontFamily) {
            case "times":
              if (bold && italic) return StandardFonts.TimesRomanBoldItalic;
              if (bold) return StandardFonts.TimesRomanBold;
              if (italic) return StandardFonts.TimesRomanItalic;
              return StandardFonts.TimesRoman;
            case "courier":
              if (bold && italic) return StandardFonts.CourierBoldOblique;
              if (bold) return StandardFonts.CourierBold;
              if (italic) return StandardFonts.CourierOblique;
              return StandardFonts.Courier;
            case "helvetica":
            default:
              if (bold && italic) return StandardFonts.HelveticaBoldOblique;
              if (bold) return StandardFonts.HelveticaBold;
              if (italic) return StandardFonts.HelveticaOblique;
              return StandardFonts.Helvetica;
          }
        };

        textFont = await outDoc.embedFont(resolveStandardFont());
      } else if (mode === "image" && watermarkImageFile) {
        const mime = watermarkImageFile.mimetype || "";
        if (mime === "image/png") {
          imageEmbed = await outDoc.embedPng(watermarkImageFile.buffer);
        } else {
          // Treat everything else as JPEG-compatible
          imageEmbed = await outDoc.embedJpg(watermarkImageFile.buffer);
        }
      }

      const drawWatermarkOnPage = (page: any, pageIndex: number, width: number, height: number) => {
        const pageNumber1Based = pageIndex + 1;
        if (pageNumber1Based < startPage || pageNumber1Based > endPage) {
          return;
        }

        // Compute target coordinates based on 3x3 position grid.
        // Use comfortable margins so watermark stays inside the page but can sit relatively close to edges.
        // When rotation is non-zero we are still slightly more conservative.
        const baseMarginFactor = rotation !== 0 ? 0.13 : 0.09;
        const marginX = width * baseMarginFactor;
        const marginY = height * baseMarginFactor;

        const isTop = positionKey.startsWith("top-");
        const isBottom = positionKey.startsWith("bottom-");
        const isMid = positionKey.startsWith("mid-");

        const isLeft = positionKey.endsWith("left");
        const isRight = positionKey.endsWith("right");
        const isCenter = positionKey.endsWith("center");

        let x = width / 2;
        let y = height / 2;

        if (isLeft) x = marginX;
        if (isRight) x = width - marginX;
        if (isCenter) x = width / 2;

        if (isTop) y = height - marginY;
        if (isBottom) y = marginY;
        if (isMid) y = height / 2;

        if (mode === "text" && textFont) {
          const fontSize = rotation !== 0 ? Math.max(8, effectiveFontSize - 2) : effectiveFontSize;
          const textWidth = textFont.widthOfTextAtSize(watermarkText, fontSize);
          const textHeight = textFont.heightAtSize(fontSize);

          // Derive a target anchor point that takes current font size into account,
          // so left/right/top/bottom positions sit close to the margins but remain inside.
          let targetX = width / 2;
          let targetY = height / 2;

          if (isLeft) {
            targetX = marginX + textWidth / 2;
          } else if (isRight) {
            targetX = width - marginX - textWidth / 2;
          } else if (isCenter) {
            targetX = width / 2;
          }

          if (isTop) {
            targetY = height - marginY - textHeight / 2;
          } else if (isBottom) {
            targetY = marginY + textHeight / 2;
          } else if (isMid) {
            targetY = height / 2;
          }

          // Center the text block around the target point.
          let drawX = targetX - textWidth / 2;
          let drawY = targetY - textHeight / 2;

          // For exact mid-center we keep the text perfectly centered and skip clamping.
          const isExactCenter = isMid && isCenter;

          if (!isExactCenter) {
            // Clamp so text box stays within margins (approximate, ignores rotation, but safe).
            if (drawX < marginX) drawX = marginX;
            if (drawX + textWidth > width - marginX) {
              drawX = width - marginX - textWidth;
            }
            if (drawY < marginY) drawY = marginY;
            if (drawY + textHeight > height - marginY) {
              drawY = height - marginY - textHeight;
            }
          }

          // Parse text color from hex
          const parseColor = (hex: string) => {
            const normalized = hex.trim().replace(/^#/, "");
            const intVal = Number.parseInt(normalized, 16);
            if (Number.isNaN(intVal)) {
              return { r: 0, g: 0, b: 0 };
            }
            const r = ((intVal >> 16) & 0xff) / 255;
            const g = ((intVal >> 8) & 0xff) / 255;
            const b = (intVal & 0xff) / 255;
            return { r, g, b };
          };
          const { r, g, b } = parseColor(colorRaw);

          page.drawText(watermarkText, {
            x: drawX,
            y: drawY,
            size: fontSize,
            font: textFont,
            color: rgb(r, g, b),
            opacity,
            rotate: degrees(rotation),
          });

          // Underline support: draw a simple line under the text block if requested.
          if (underline) {
            const underlineY = drawY - fontSize * 0.15;
            page.drawLine({
              start: { x: drawX, y: underlineY },
              end: { x: drawX + textWidth, y: underlineY },
              thickness: Math.max(0.5, fontSize * 0.05),
              color: rgb(r, g, b),
              opacity,
            });
          }
        } else if (mode === "image" && imageEmbed) {
          const imageDims = imageEmbed.scale(1);
          const maxWidth = width * (rotation !== 0 ? 0.36 : 0.45);
          const maxHeight = height * (rotation !== 0 ? 0.36 : 0.45);
          const scale = Math.min(maxWidth / imageDims.width, maxHeight / imageDims.height, 1);
          const { width: w, height: h } = imageEmbed.scale(scale);

          let drawX = x - w / 2;
          let drawY = y - h / 2;

          const isExactCenter = isMid && isCenter;

          if (!isExactCenter) {
            // Clamp image box so it remains inside margins (again, approximate wrt rotation).
            if (drawX < marginX) drawX = marginX;
            if (drawX + w > width - marginX) {
              drawX = width - marginX - w;
            }
            if (drawY < marginY) drawY = marginY;
            if (drawY + h > height - marginY) {
              drawY = height - marginY - h;
            }
          }

          page.drawImage(imageEmbed, {
            x: drawX,
            y: drawY,
            width: w,
            height: h,
            opacity,
            rotate: degrees(rotation),
          });
        }
      };

      // Rebuild document with desired layering
      embeddedPages.forEach((embeddedPage, index) => {
        const { width, height } = embeddedPage;
        const newPage = outDoc.addPage([width, height]);

        if (layer === "under") {
          // Draw watermark first, then the original content on top
          drawWatermarkOnPage(newPage, index, width, height);
          newPage.drawPage(embeddedPage);
        } else {
          // Draw original content first, then watermark on top
          newPage.drawPage(embeddedPage);
          drawWatermarkOnPage(newPage, index, width, height);
        }
      });

      const watermarkedBytes = await outDoc.save();

      res
        .status(200)
        .contentType("application/pdf")
        .setHeader("Content-Disposition", `attachment; filename=${watermarkedName}`)
        .send(Buffer.from(watermarkedBytes));
    } catch (error) {
      console.error("Error watermarking PDF", error);
      res.status(500).json({
        status: "error",
        message: "Failed to watermark PDF. Please try again.",
      });
    }
  }
);

app.post("/sign-pdf", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload a PDF file to sign.",
      });
    }

    if (file.size > 100 * 1024 * 1024) {
      return res.status(413).json({
        status: "error",
        message: "Uploaded file exceeds 100MB limit.",
      });
    }

    const originalName = file.originalname || "document.pdf";
    const dotIndex = originalName.lastIndexOf(".");
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const signedName = `${base}-signed.pdf`;

    // Stub: echo original bytes with a new filename. Real signature placement
    // (drawn/typed/uploaded) will be implemented in a later phase.
    res
      .status(200)
      .contentType("application/pdf")
      .setHeader("Content-Disposition", `attachment; filename=${signedName}`)
      .send(file.buffer);
  } catch (error) {
    console.error("Error signing PDF", error);
    res.status(500).json({
      status: "error",
      message: "Failed to sign PDF. Please try again.",
    });
  }
});

app.post("/protect-pdf", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    const { password } = req.body as { password?: string };

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload a PDF file to protect.",
      });
    }

    if (!password) {
      return res.status(400).json({
        status: "error",
        message: "Password is required to protect the PDF.",
      });
    }

    if (file.size > 100 * 1024 * 1024) {
      return res.status(413).json({
        status: "error",
        message: "Uploaded file exceeds 100MB limit.",
      });
    }

    const originalName = file.originalname || "document.pdf";
    const dotIndex = originalName.lastIndexOf(".");
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const protectedName = `${base}-protected.pdf`;

    const qpdfPath = process.env.QPDF_PATH || "qpdf";
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "docverse-protect-"));
    const inputPath = path.join(tmpDir, "input.pdf");
    const outputPath = path.join(tmpDir, "output.pdf");

    fs.writeFileSync(inputPath, file.buffer);

    try {
      // First, detect if the PDF is already encrypted.
      try {
        const { stdout } = await execFileAsync(qpdfPath, [
          "--warning-exit-0",
          "--show-encryption",
          inputPath,
        ]);
        const showEncOut = stdout?.toString() || "";
        // Newer qpdf prints "File is not encrypted" for unprotected PDFs. Treat anything
        // that does NOT contain "not encrypted" (case-insensitive) as already protected.
        if (!showEncOut.toLowerCase().includes("not encrypted")) {
          return res.status(400).json({
            status: "error",
            code: "already_protected",
            message: "This PDF is already password-protected. Use Unlock PDF instead.",
          });
        }
      } catch {
        // If show-encryption fails unexpectedly, fall through to generic error below.
      }

      // Basic encryption: user password only, 256-bit AES. Owner password = user password for now.
      // Use --warning-exit-0 so that qpdf exits with code 0 even if there are non-fatal warnings.
      const args = [
        "--warning-exit-0",
        "--encrypt",
        password,
        password,
        "256",
        "--",
        inputPath,
        outputPath,
      ];

      await execFileAsync(qpdfPath, args);

      const protectedBuffer = fs.readFileSync(outputPath);

      res
        .status(200)
        .contentType("application/pdf")
        .setHeader("Content-Disposition", `attachment; filename=${protectedName}`)
        .send(protectedBuffer);
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
  } catch (error) {
    console.error("Error protecting PDF", error);
    res.status(500).json({
      status: "error",
      message:
        "Failed to protect PDF. Please ensure qpdf is installed on the server and try again.",
    });
  }
});

app.post("/unlock-pdf", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;
    const { password } = req.body as { password?: string };

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload a PDF file to unlock.",
      });
    }

    if (!password) {
      return res.status(400).json({
        status: "error",
        message: "Password is required to unlock the PDF.",
      });
    }

    if (file.size > 100 * 1024 * 1024) {
      return res.status(413).json({
        status: "error",
        message: "Uploaded file exceeds 100MB limit.",
      });
    }

    const originalName = file.originalname || "document.pdf";
    const dotIndex = originalName.lastIndexOf(".");
    const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
    const unlockedName = `${base}-unlocked.pdf`;

    const qpdfPath = process.env.QPDF_PATH || "qpdf";
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "docverse-unlock-"));
    const inputPath = path.join(tmpDir, "input.pdf");
    const outputPath = path.join(tmpDir, "output.pdf");

    fs.writeFileSync(inputPath, file.buffer);

    try {
      // Check whether the PDF is actually encrypted.
      try {
        const { stdout, stderr } = await execFileAsync(qpdfPath, [
          "--warning-exit-0",
          "--show-encryption",
          inputPath,
        ]);
        const showEncOut = stdout?.toString() || "";
        // If qpdf reports "File is not encrypted", we can safely skip unlocking.
        if (showEncOut.toLowerCase().includes("not encrypted")) {
          return res.status(400).json({
            status: "error",
            code: "not_protected",
            message: "This PDF is not password-protected and does not need unlocking.",
          });
        }
      } catch {
        // If show-encryption fails unexpectedly, we'll let the decrypt attempt handle it.
      }

      // Use --warning-exit-0 so that qpdf exits with code 0 even if there are non-fatal warnings
      // while decrypting, and we don't incorrectly treat them as password failures.
      // qpdf expects --password to be passed as --password=password (single argument).
      const args = [
        "--warning-exit-0",
        `--password=${password}`,
        "--decrypt",
        inputPath,
        outputPath,
      ];

      try {
        await execFileAsync(qpdfPath, args);
      } catch {
        return res.status(401).json({
          status: "error",
          code: "incorrect_password",
          message: "The password you entered is incorrect for this PDF.",
        });
      }

      const unlockedBuffer = fs.readFileSync(outputPath);

      res
        .status(200)
        .contentType("application/pdf")
        .setHeader("Content-Disposition", `attachment; filename=${unlockedName}`)
        .send(unlockedBuffer);
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
  } catch (error) {
    console.error("Error unlocking PDF", error);
    res.status(500).json({
      status: "error",
      message:
        "Failed to unlock PDF. Please ensure qpdf is installed on the server and try again.",
    });
  }
});

app.post("/pdf-encryption-status", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "Please upload a PDF file to check encryption status.",
      });
    }

    if (file.size > 100 * 1024 * 1024) {
      return res.status(413).json({
        status: "error",
        message: "Uploaded file exceeds 100MB limit.",
      });
    }

    const qpdfPath = process.env.QPDF_PATH || "qpdf";
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "docverse-status-"));
    const inputPath = path.join(tmpDir, "input.pdf");

    fs.writeFileSync(inputPath, file.buffer);

    try {
      const { stdout } = await execFileAsync(qpdfPath, [
        "--warning-exit-0",
        "--show-encryption",
        inputPath,
      ]);

      const showEncOut = stdout?.toString() || "";
      const encrypted = !showEncOut.toLowerCase().includes("not encrypted");

      return res.status(200).json({
        status: "ok",
        encrypted,
      });
    } catch (err: any) {
      const stderr = (err?.stderr || "").toString().toLowerCase();

      // If qpdf reports an invalid password for show-encryption, we still know the
      // file is encrypted; just report encrypted=true without treating it as an error.
      if (stderr.includes("invalid password")) {
        return res.status(200).json({
          status: "ok",
          encrypted: true,
        });
      }

      console.error("Error checking PDF encryption status", err);
      return res.status(500).json({
        status: "error",
        message:
          "Failed to check PDF encryption status. Please ensure qpdf is installed on the server and try again.",
      });
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
  } catch (error) {
    console.error("Error in /pdf-encryption-status", error);
    res.status(500).json({
      status: "error",
      message: "Failed to check PDF encryption status. Please try again.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`DocVerse backend listening on port ${PORT}`);
});
