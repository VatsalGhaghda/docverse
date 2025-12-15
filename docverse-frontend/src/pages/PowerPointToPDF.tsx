import { useState, useEffect, useRef } from "react";
import { Presentation, ArrowRight, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

export default function PowerPointToPDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadKind, setDownloadKind] = useState<"pdf" | "zip" | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const uploadRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);

  const allReady = files.length >= 1 && files.every((f: any) => f.status === "complete");

  const handleProcess = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    if (!allReady || files.length === 0) return;

    setIsProcessing(true);
    setIsComplete(false);
    setError(null);
    setProgress(8);

    const formData = new FormData();
    files.forEach((item: any) => {
      const file = item.file as File | undefined;
      if (file) {
        formData.append("files", file, file.name ?? "presentation.pptx");
      }
    });

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", `${apiBase}/convert/powerpoint-to-pdf`);
        xhr.responseType = "blob";

        const interval = window.setInterval(() => {
          setProgress((prev) => {
            if (prev >= 92) return prev;
            const next = prev + 4;
            return next > 92 ? 92 : next;
          });
        }, 100);

        xhr.onload = () => {
          window.clearInterval(interval);

          if (xhr.status >= 200 && xhr.status < 300) {
            const blob = xhr.response as Blob;
            const url = URL.createObjectURL(blob);
            const contentType = xhr.getResponseHeader("Content-Type") || "";
            const kind: "pdf" | "zip" = contentType.toLowerCase().includes("zip")
              ? "zip"
              : "pdf";
            setDownloadKind(kind);
            setDownloadUrl(url);
            setProgress(100);
            setIsComplete(true);
            resolve();
          } else {
            reject(new Error(`Request failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          window.clearInterval(interval);
          reject(new Error("Network error while uploading file"));
        };

        xhr.send(formData);
      });
    } catch (err) {
      console.error("Error converting PowerPoint to PDF", err);
      setError("Something went wrong while converting your presentation. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setIsComplete(false);
    setError(null);
    setDownloadKind(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setUploadKey((prev) => prev + 1);
    setProgress(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!files.length || !uploadRef.current) return;
    const rect = uploadRef.current.getBoundingClientRect();
    const offset = window.scrollY + rect.top - 180;
    window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
  }, [files.length]);

  useEffect(() => {
    if (!allReady || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const offset = window.scrollY + rect.top - 80;
    window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
  }, [allReady]);

  useEffect(() => {
    if (isProcessing && !isComplete && loadingRef.current) {
      const rect = loadingRef.current.getBoundingClientRect();
      const offset = window.scrollY + rect.top - 120;
      window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
    }
  }, [isProcessing, isComplete]);

  const fileCount = files.length;

  return (
    <ToolPageLayout
      title="PowerPoint to PDF"
      description="Convert PowerPoint presentations (.ppt, .pptx) into PDFs for easy sharing."
      icon={Presentation}
      iconColor="accent"
    >
      <div className="mx-auto max-w-3xl">
        {!isComplete ? (
          isProcessing ? (
            <div ref={loadingRef} className="py-16 flex flex-col items-center gap-6">
              <h2 className="text-2xl font-semibold">Converting to PDF...</h2>
              <div className="relative h-24 w-24">
                <div className="h-24 w-24 rounded-full border-[6px] border-accent-foreground/10" />
                <div className="absolute inset-0 rounded-full border-[6px] border-accent border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
                  {progress}%
                </div>
              </div>
              {error && (
                <p className="mt-2 text-sm text-destructive text-center max-w-md">{error}</p>
              )}
            </div>
          ) : (
            <>
              <div ref={uploadRef}>
                <FileUploadZone
                  key={uploadKey}
                  accept=".ppt,.pptx"
                  multiple
                  maxFiles={5}
                  variant="accent"
                  iconType="powerpoint"
                  horizontalScroll={false}
                  onFilesChange={setFiles}
                />
              </div>

              {files.length > 0 && (
                <div ref={previewRef} className="mt-8 space-y-6">
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="font-semibold mb-2">Share as PDF</h3>
                    <p className="text-sm text-muted-foreground">
                      Ideal for sending slide decks when you don't want others to edit the original presentation.
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <Button
                      size="lg"
                      className="btn-hero bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={handleProcess}
                      disabled={isProcessing || !allReady}
                    >
                      Convert {fileCount} PowerPoint file{fileCount === 1 ? "" : "s"}
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" onClick={handleReset}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Start over
                    </Button>
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
              <Presentation className="h-10 w-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Conversion Complete!</h2>
            <p className="text-muted-foreground mb-8">
              Your PowerPoint file{fileCount === 1 ? "" : "s"} ha
              {fileCount === 1 ? "s" : "ve"} been converted to PDF.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="btn-hero bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => {
                  if (!downloadUrl) return;
                  const link = document.createElement("a");
                  link.href = downloadUrl;
                  if (downloadKind === "zip" || fileCount > 1) {
                    link.download = "converted-powerpoint-pdfs.zip";
                  } else {
                    const baseName = (files[0]?.name || "presentation").replace(/\.(pptx?|PPTX?)$/, "");
                    link.download = `${baseName}.pdf`;
                  }
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                disabled={!downloadUrl}
              >
                <Download className="h-5 w-5 mr-2" />
                {downloadKind === "zip" || fileCount > 1 ? "Download PDFs (ZIP)" : "Download PDF"}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Convert more presentations
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
