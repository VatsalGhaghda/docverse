import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
// Use the bundled worker from the same pdfjs-dist version to avoid version mismatch
// Vite will turn this into a dedicated worker.
// @ts-ignore - worker import handled by Vite
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

(pdfjsLib as any).GlobalWorkerOptions.workerPort = new (pdfjsWorker as any)();

interface PdfThumbnailProps {
  file: File;
  width?: number;
  height?: number;
}

export function PdfThumbnail({ file, width = 220, height = 280 }: PdfThumbnailProps) {
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

        const page = await pdf.getPage(1);
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
        console.error("Error rendering PDF thumbnail", err);
        if (!cancelled) setError("preview-error");
      }
    };

    render();

    return () => {
      cancelled = true;
    };
  }, [file, width, height]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="rounded-2xl bg-[#081421] px-4 py-5 flex items-center justify-center">
          <div className="relative h-16 w-12 rounded-lg border-[3px] border-[#00D8FF] text-[#00D8FF] flex items-center justify-center">
            <div className="w-7 space-y-2">
              <div className="h-0.5 rounded bg-[#00D8FF]" />
              <div className="h-0.5 rounded bg-[#00D8FF]" />
              <div className="h-0.5 rounded bg-[#00D8FF]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <canvas ref={canvasRef} className="w-full h-auto" />;
}
