import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

const app = express();
const PORT = process.env.PORT || 4000;

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

    // Stub: just echo the original PDF bytes with a new filename.
    // Real encryption/password protection will be implemented in a later phase.
    res
      .status(200)
      .contentType("application/pdf")
      .setHeader("Content-Disposition", `attachment; filename=${protectedName}`)
      .send(file.buffer);
  } catch (error) {
    console.error("Error protecting PDF", error);
    res.status(500).json({
      status: "error",
      message: "Failed to protect PDF. Please try again.",
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

    // Stub: echo original bytes with a new filename.
    // Real unlocking will be implemented later using a proper PDF encryption library.
    res
      .status(200)
      .contentType("application/pdf")
      .setHeader("Content-Disposition", `attachment; filename=${unlockedName}`)
      .send(file.buffer);
  } catch (error) {
    console.error("Error unlocking PDF", error);
    res.status(500).json({
      status: "error",
      message: "Failed to unlock PDF. Please try again.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`DocVerse backend listening on port ${PORT}`);
});
