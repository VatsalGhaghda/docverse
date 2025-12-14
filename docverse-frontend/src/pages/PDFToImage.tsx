import { useState, useEffect, useRef } from "react";
import {
  FileImage,
  ArrowRight,
  RotateCcw,
  Download,
  Image as ImageIcon,
  FileText,
  Images,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

export default function PDFToImage() {
  const [files, setFiles] = useState<any[]>([]);
  const [mode, setMode] = useState<"page" | "extract">("page");
  const [qualityPreset, setQualityPreset] = useState<"normal" | "high">("normal");
  const [format] = useState("jpg");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState<string | null>(null);
  const [downloadKind, setDownloadKind] = useState<"zip" | "image" | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const uploadRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);

  const activeFile = files[0]?.file as File | undefined;
  const allReady = files.length === 1 && files[0].status === "complete";

  const extractFilenameFromDisposition = (value: string | null): string | null => {
    if (!value) return null;
    const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1]);
      } catch {
        return utf8Match[1];
      }
    }

    const plainMatch = value.match(/filename="?([^";]+)"?/i);
    return plainMatch?.[1] ? plainMatch[1] : null;
  };

  const handleProcess = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    if (!allReady || !activeFile) return;

    setIsProcessing(true);
    setIsComplete(false);
    setError(null);
    setProgress(8);
    setDownloadName(null);
    setDownloadKind(null);

    const formData = new FormData();
    formData.append("file", activeFile, activeFile.name ?? "document.pdf");
    formData.append("format", format);
    const numericQuality = qualityPreset === "high" ? 95 : 80;
    formData.append("quality", String(numericQuality));
    formData.append("mode", mode === "extract" ? "extractImages" : "pageToJpg");

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", `${apiBase}/pdf-to-image`);
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
            setDownloadUrl(url);
            const contentType = xhr.getResponseHeader("Content-Type") || "";
            const kind: "zip" | "image" = contentType.toLowerCase().includes("zip") ? "zip" : "image";
            setDownloadKind(kind);
            const disposition = xhr.getResponseHeader("Content-Disposition");
            const nameFromHeader = extractFilenameFromDisposition(disposition);
            setDownloadName(nameFromHeader);
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
      console.error("Error converting PDF to images", err);
      setError("Something went wrong while converting your PDF to images. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setIsComplete(false);
    setError(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setDownloadName(null);
    setDownloadKind(null);
    setUploadKey((prev) => prev + 1);
    setProgress(0);
    setMode("page");
    setQualityPreset("normal");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!files.length || !uploadRef.current) return;
    const rect = uploadRef.current.getBoundingClientRect();
    const offset = window.scrollY + rect.top + 50;
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
      const offset = window.scrollY + rect.top - 160;
      window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
    }
  }, [isProcessing, isComplete]);

  return (
    <ToolPageLayout
      title="PDF to JPG"
      description="Convert pages of your PDF to JPG images or extract all embedded images."
      icon={FileImage}
      iconColor="secondary"
    >
      <div className="mx-auto max-w-3xl">
        {!isComplete ? (
          isProcessing ? (
            <div ref={loadingRef} className="py-16 flex flex-col items-center gap-6">
              <h2 className="text-2xl font-semibold">Converting to images...</h2>
              <div className="relative h-24 w-24">
                <div className="h-24 w-24 rounded-full border-[6px] border-secondary-foreground/10" />
                <div className="absolute inset-0 rounded-full border-[6px] border-secondary border-t-transparent animate-spin" />
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
                  multiple={false}
                  maxFiles={1}
                  onFilesChange={setFiles}
                />
              </div>

              {files.length > 0 && (
                <div ref={previewRef} className="mt-8 space-y-6">
                  <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                    <h3 className="font-semibold mb-1">PDF to JPG options</h3>
                    <p className="text-xs text-muted-foreground mb-1">
                      Choose whether to convert each page to an image or extract all embedded images.
                    </p>

                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Mode</Label>
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setMode("page")}
                            className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs transition ${
                              mode === "page"
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/60"
                            }`}
                          >
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-muted">
                              <FileText className="h-4 w-4" />
                            </span>
                            <span>
                              <span className="block font-medium text-[11px]">Page to JPG</span>
                              <span className="block text-[11px] text-muted-foreground">
                                Every page will be converted into a separate JPG file.
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMode("extract")}
                            className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs transition ${
                              mode === "extract"
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/60"
                            }`}
                          >
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-muted">
                              <Images className="h-4 w-4" />
                            </span>
                            <span>
                              <span className="block font-medium text-[11px]">Extract images</span>
                              <span className="block text-[11px] text-muted-foreground">
                                All embedded images inside the PDF will be extracted as JPG files.
                              </span>
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Image quality</Label>
                        <div className="flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setQualityPreset("normal")}
                            className={`flex-1 rounded-lg border px-3 py-2 text-center font-medium transition ${
                              qualityPreset === "normal"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-foreground hover:border-primary/60"
                            }`}
                          >
                            <span className="block text-[11px]">Normal</span>
                            <span className="block text-[10px] text-muted-foreground">Recommended</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setQualityPreset("high")}
                            className={`flex-1 rounded-lg border px-3 py-2 text-center font-medium transition ${
                              qualityPreset === "high"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-foreground hover:border-primary/60"
                            }`}
                          >
                            <span className="block text-[11px]">High</span>
                            <span className="block text-[10px] text-muted-foreground">Better quality</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                <div className="flex flex-col items-center gap-4">
                  <Button
                    size="lg"
                    className="btn-hero gradient-secondary"
                    onClick={handleProcess}
                    disabled={isProcessing || !allReady}
                  >
                    Convert to JPG
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
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10">
              <FileImage className="h-10 w-10 text-secondary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Conversion Complete!</h2>
            <p className="text-muted-foreground mb-8">
              Your PDF pages have been converted to images.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="btn-hero gradient-secondary"
                onClick={() => {
                  if (!downloadUrl) return;
                  const link = document.createElement("a");
                  link.href = downloadUrl;
                  const baseName = (activeFile?.name || files[0]?.name || "document").replace(/\.pdf$/i, "");
                  const fallbackName =
                    downloadKind === "image"
                      ? `${baseName}.${format}`
                      : `${baseName}-images.zip`;
                  link.download = downloadName || fallbackName;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                disabled={!downloadUrl}
              >
                <Download className="h-5 w-5 mr-2" />
                {downloadKind === "image" ? "Download Image" : "Download Images (ZIP)"}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Convert more PDFs
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
