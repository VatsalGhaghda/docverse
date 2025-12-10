import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import { PDFDocument } from "pdf-lib";
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

    // If only a single file is uploaded, return a single compressed PDF instead of a ZIP
    if (files.length === 1) {
      const file = files[0];
      const pdf = await PDFDocument.load(file.buffer);
      const compressedBytes = await pdf.save({ useObjectStreams: true });

      const originalName = file.originalname || "document.pdf";
      const dotIndex = originalName.lastIndexOf(".");
      const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
      const compressedName = `${base}-compressed.pdf`;

      return res
        .status(200)
        .contentType("application/pdf")
        .setHeader("Content-Disposition", `attachment; filename=${compressedName}`)
        .send(Buffer.from(compressedBytes));
    }

    // Multiple files: compress each and return a ZIP archive
    const zip = new JSZip();

    for (const file of files) {
      const pdf = await PDFDocument.load(file.buffer);
      const compressedBytes = await pdf.save({ useObjectStreams: true });

      const originalName = file.originalname || "document.pdf";
      const dotIndex = originalName.lastIndexOf(".");
      const base = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
      const compressedName = `${base}-compressed.pdf`;

      zip.file(compressedName, compressedBytes);
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
      message: "Failed to compress PDFs. Please try again.",
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

    // Stub: for now, simply return the original bytes with a new filename.
    // Later, real page-number drawing will be implemented using a PDF library.
    res
      .status(200)
      .contentType("application/pdf")
      .setHeader("Content-Disposition", `attachment; filename=${numberedName}`)
      .send(file.buffer);
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

    // Stub: just return original bytes with an updated filename.
    // Later, real page reordering/add/remove will be implemented.
    res
      .status(200)
      .contentType("application/pdf")
      .setHeader("Content-Disposition", `attachment; filename=${organizedName}`)
      .send(file.buffer);
  } catch (error) {
    console.error("Error organizing PDF", error);
    res.status(500).json({
      status: "error",
      message: "Failed to organize PDF. Please try again.",
    });
  }
});

app.post("/watermark-pdf", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const file = req.file as Express.Multer.File | undefined;

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

    // Stub: mirror the original bytes with a new filename. Real watermark drawing
    // (text/image, opacity, rotation, position) will be implemented in a later phase.
    res
      .status(200)
      .contentType("application/pdf")
      .setHeader("Content-Disposition", `attachment; filename=${watermarkedName}`)
      .send(file.buffer);
  } catch (error) {
    console.error("Error watermarking PDF", error);
    res.status(500).json({
      status: "error",
      message: "Failed to watermark PDF. Please try again.",
    });
  }
});

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
        const { stdout, stderr } = await execFileAsync(qpdfPath, [
          "--warning-exit-0",
          "--show-encryption",
          inputPath,
        ]);
        const showEncOut = stdout?.toString() || "";
        console.log("qpdf --show-encryption (protect) stdout:\n", showEncOut);
        if (stderr) {
          console.log("qpdf --show-encryption (protect) stderr:\n", stderr.toString());
        }
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
        console.log("qpdf --show-encryption (unlock) stdout:\n", showEncOut);
        if (stderr) {
          console.log("qpdf --show-encryption (unlock) stderr:\n", stderr.toString());
        }
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

      console.log("qpdf decrypt (unlock) args (redacted password)", {
        qpdfPath,
        inputPath,
        outputPath,
      });

      try {
        await execFileAsync(qpdfPath, args);
        console.log("qpdf decrypt (unlock) succeeded for", inputPath);
      } catch (err) {
        console.error("qpdf decrypt (unlock) failed", err);
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
