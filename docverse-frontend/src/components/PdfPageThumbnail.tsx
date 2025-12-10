import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - worker import handled by Vite
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

(pdfjsLib as any).GlobalWorkerOptions.workerPort = new (pdfjsWorker as any)();

interface PdfPageThumbnailProps {
  file: File;
  pageNumber: number;
  width?: number;
  height?: number;
}

export function PdfPageThumbnail({ file, pageNumber, width = 160, height = 210 }: PdfPageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = (pdfjsLib as any).getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const safePage = Math.min(Math.max(1, pageNumber), pdf.numPages);
        const page = await pdf.getPage(safePage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(width / viewport.width, height / viewport.height);
        const scaledViewport = page.getViewport({ scale });

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
      } catch (err) {
        console.error("Error rendering PDF page thumbnail", err);
        if (!cancelled) setError("preview-error");
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [file, pageNumber, width, height]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
        Preview
        <br />
        unavailable
      </div>
    );
  }

  return <canvas ref={canvasRef} className="w-full h-auto" />;
}
