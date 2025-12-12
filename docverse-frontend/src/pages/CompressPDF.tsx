import { useState, useEffect, useRef } from "react";
import { FileDown, ArrowRight, RotateCcw, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

export default function CompressPDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [quality, setQuality] = useState([70]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const uploadRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const completeRef = useRef<HTMLDivElement | null>(null);

  const handleProcess = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setIsComplete(false);
    setError(null);
    setProgress(0);

    const totalOriginal = files.reduce((sum, file: any) => {
      const size = file.file?.size ?? 0;
      return sum + size;
    }, 0);
    setOriginalSize(totalOriginal > 0 ? totalOriginal : null);
    setCompressedSize(null);

    try {
      const formData = new FormData();
      files.slice(0, 10).forEach((file: any) => {
        if (file.file) {
          formData.append("files", file.file, file.name ?? "file.pdf");
        }
      });

      // Pass quality (10–100) to backend so it can choose an appropriate compression level.
      formData.append("quality", String(quality[0] ?? 70));

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", `${apiBase}/compress-pdf`);
        xhr.responseType = "blob";

        // Dummy loader: smoothly increase progress up to ~92% while request is in flight
        const interval = window.setInterval(() => {
          setProgress((prev) => {
            if (prev >= 92) return prev;
            const next = prev + 5;
            return next > 92 ? 92 : next;
          });
        }, 120);

        xhr.onload = () => {
          window.clearInterval(interval);

          if (xhr.status >= 200 && xhr.status < 300) {
            const blob = xhr.response as Blob;
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setCompressedSize(blob.size);
            setProgress(100);
            setIsComplete(true);
            resolve();
          } else {
            reject(new Error(`Request failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          window.clearInterval(interval);
          reject(new Error("Network error while uploading files"));
        };

        xhr.send(formData);
      });
    } catch (err) {
      console.error("Error compressing PDFs", err);
      setError("Something went wrong while compressing your files. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setIsComplete(false);
    setQuality([70]);
    setError(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setUploadKey((prev) => prev + 1);
    setOriginalSize(null);
    setCompressedSize(null);
    setProgress(0);
    // Scroll back to top of the page
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getQualityLabel = (value: number) => {
    if (value >= 80) return "High Quality";
    if (value >= 50) return "Balanced";
    return "Maximum Compression";
  };

  const formatMB = (bytes: number) => {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const percentSaved =
    originalSize != null && compressedSize != null && originalSize > 0
      ? Math.max(0, Math.round((1 - compressedSize / originalSize) * 100))
      : null;

  const allReady =
    files.length >= 1 && files.every((file: any) => file.status === "complete");

  // Auto-scroll to compression options once files are uploaded
  useEffect(() => {
    if (files.length > 0 && previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [files.length]);

  // When compressing (loader visible), scroll so loader sits comfortably below the top
  useEffect(() => {
    if (isProcessing && !isComplete && loadingRef.current) {
      const rect = loadingRef.current.getBoundingClientRect();
      const offset = window.scrollY + rect.top - 180; // 180px padding from top
      window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
    }
  }, [isProcessing, isComplete]);

  // No additional scroll on completion; keep the page where the loader was

  return (
    <ToolPageLayout
      title="Compress PDF"
      description="Reduce PDF file size while maintaining quality. Perfect for email attachments and web uploads."
      icon={FileDown}
      iconColor="accent"
    >
      <div className="mx-auto max-w-3xl">
        {!isComplete ? (
          isProcessing ? (
            // Full-width compressing screen (similar to MergePDF loader)
            <div ref={loadingRef} className="py-16 flex flex-col items-center gap-6">
              <h2 className="text-2xl font-semibold">Compressing PDFs...</h2>
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
                  accept=".pdf"
                  multiple
                  maxFiles={10}
                  onFilesChange={setFiles}
                />
              </div>

              {files.length > 0 && (
                <div ref={previewRef} className="mt-8 space-y-6">
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="font-semibold mb-2">Compression Level</h3>
                    <div className="mb-4 flex items-start gap-2 rounded-md border border-accent/20 bg-accent/5 px-3 py-2 text-xs text-muted-foreground">
                      <Info className="mt-px h-3.5 w-3.5 text-accent" />
                      <p>
                        Image-heavy PDFs may take up to 30-60 seconds to compress, especially at stronger
                        compression levels.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Quality: {quality[0]}%</Label>
                        <span className="text-sm text-muted-foreground">
                          {getQualityLabel(quality[0])}
                        </span>
                      </div>
                      <Slider
                        value={quality}
                        onValueChange={setQuality}
                        max={100}
                        min={10}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Smaller file</span>
                        <span>Better quality</span>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-4 gap-3">
                      {[
                        { label: "Fast", value: 70, desc: "Quicker, lighter compression" },
                        { label: "Extreme", value: 20, desc: "Maximum size reduction" },
                        { label: "Balanced", value: 50, desc: "Strong reduction, good quality" },
                        { label: "Light", value: 85, desc: "Best quality, smaller size" },
                      ].map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => setQuality([preset.value])}
                          className={`rounded-lg border p-3 text-center transition-all ${
                            quality[0] === preset.value
                              ? "border-accent bg-accent/10"
                              : "border-border hover:border-accent/50"
                          }`}
                        >
                          <p className="font-medium">{preset.label}</p>
                          <p className="text-xs text-muted-foreground">{preset.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <Button
                      size="lg"
                      className="btn-hero bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={handleProcess}
                      disabled={isProcessing || !allReady}
                    >
                      Compress {files.length} PDF{files.length > 1 ? "s" : ""}
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" onClick={handleReset}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Start over
                    </Button>
                  </div>

                  {error && (
                    <p className="mt-4 text-sm text-destructive text-center">{error}</p>
                  )}
                </div>
              )}
            </>
          )
        ) : (
          <div ref={completeRef} className="text-center py-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
              <FileDown className="h-10 w-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Compression Complete!</h2>
            <p className="text-muted-foreground mb-6">
              Your files have been compressed successfully.
            </p>

            {percentSaved !== null && originalSize != null && compressedSize != null && (
              <div className="mb-8 flex items-center justify-center gap-6">
                <div className="relative h-20 w-20">
                  {/* Base muted ring */}
                  <div className="absolute inset-0 rounded-full bg-muted" />
                  {/* Filled arc representing % saved */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundImage: `conic-gradient(hsl(var(--accent)) ${percentSaved}%, hsl(var(--muted)) ${percentSaved}% 100%)`,
                    }}
                  />
                  {/* Inner circle with text */}
                  <div className="absolute inset-3 rounded-full bg-background flex flex-col items-center justify-center text-xs font-semibold">
                    <span>{percentSaved}%</span>
                    <span className="text-[10px] text-muted-foreground">SAVED</span>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm">
                    Your PDF{files.length > 1 ? "s are" : " is"} now {percentSaved}% smaller!
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatMB(originalSize)} {"->"} {formatMB(compressedSize)}
                  </p>
                </div>
              </div>
            )}
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="btn-hero bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => {
                  if (!downloadUrl) return;
                  const link = document.createElement("a");
                  link.href = downloadUrl;
                  const single = files.length === 1;
                  const baseName = single
                    ? (files[0]?.name || "document.pdf").replace(/\.pdf$/i, "")
                    : "compressed-pdfs";
                  link.download = single ? `${baseName}-compressed.pdf` : `${baseName}.zip`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                disabled={!downloadUrl}
              >
                <Download className="h-5 w-5 mr-2" />
                Download Compressed Files
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Compress more files
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
