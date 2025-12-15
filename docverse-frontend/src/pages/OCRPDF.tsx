import { useState, useEffect, useRef } from "react";
import { ScanText, ArrowRight, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
];

export default function OCRPDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [language, setLanguage] = useState("en");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadKey, setUploadKey] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const uploadRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const allReady = files.length > 0 && files.every((f) => f.status === "complete");

  const handleProcess = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    if (!allReady) return;

    setIsProcessing(true);
    setIsComplete(false);
    setError(null);
    setProgress(8);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    const formData = new FormData();
    for (const f of files) {
      const file = f.file as File | undefined;
      if (file) {
        formData.append("files", file, file.name ?? "document.pdf");
      }
    }
    formData.append("language", language);

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", `${apiBase}/ocr-searchable-pdf`);
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
      console.error("Error generating searchable PDF", err);
      if (!error) {
        setError(
          "We couldn't generate the searchable PDF. This can happen with very large or complex documents. Try fewer pages or a clearer scan and try again."
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setIsComplete(false);
    setError(null);
    setProgress(0);
    setLanguage("en");
    setUploadKey((prev) => prev + 1);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // First scroll: when files are selected, scroll to the upload area (blue bar)
  useEffect(() => {
    if (files.length > 0 && uploadRef.current) {
      const rect = uploadRef.current.getBoundingClientRect();
      const offset = window.scrollY + rect.top + 140;
      window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
    }
  }, [files.length]);

  // When an error occurs, bring the user back to the upload section so they see the message
  useEffect(() => {
    if (error && uploadRef.current) {
      const rect = uploadRef.current.getBoundingClientRect();
      const offset = window.scrollY + rect.top - 60;
      window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
    }
  }, [error]);

  // Second scroll: when upload is fully complete, scroll to the settings/preview block
  useEffect(() => {
    if (allReady && previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      const offset = window.scrollY + rect.top - 90;
      window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
    }
  }, [allReady]);

  useEffect(() => {
    if (isProcessing && !isComplete && loadingRef.current) {
      const rect = loadingRef.current.getBoundingClientRect();
      const offset = window.scrollY + rect.top - 180;
      window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
    }
  }, [isProcessing, isComplete]);

  // Scroll to result section when OCR is complete
  useEffect(() => {
    if (isComplete && resultRef.current) {
      const rect = resultRef.current.getBoundingClientRect();
      const offset = window.scrollY + rect.top - 50;
      window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
    }
  }, [isComplete]);

  return (
    <ToolPageLayout
      title="OCR Scanner"
      description="Extract text from scanned documents and images. Convert non-selectable PDFs into searchable text."
      icon={ScanText}
      iconColor="secondary"
    >
      <div className="mx-auto max-w-3xl">
        {!isComplete ? (
          isProcessing ? (
            <div ref={loadingRef} className="py-16 flex flex-col items-center gap-6">
              <h2 className="text-2xl font-semibold">Scanning...</h2>
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
                {error && (
                  <p className="mb-3 text-sm text-destructive text-center max-w-md mx-auto">{error}</p>
                )}
                <FileUploadZone
                  key={uploadKey}
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  maxFiles={10}
                  onFilesChange={setFiles}
                />
              </div>

              {files.length > 0 && (
                <div ref={previewRef} className="mt-8 space-y-6">
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="font-semibold mb-4">OCR Settings</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Document Language
                        </label>
                        <Select value={language} onValueChange={setLanguage}>
                          <SelectTrigger className="w-full max-w-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {languages.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {lang.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      Start OCR
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" onClick={handleReset}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Start over
                    </Button>
                    {error && (
                      <p className="mt-2 text-sm text-destructive text-center max-w-md">{error}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          <div ref={resultRef} className="py-8">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                <ScanText className="h-8 w-8 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">OCR Complete!</h2>
              <p className="text-muted-foreground">
                Your searchable PDF is ready to download.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  if (!downloadUrl) return;
                  const link = document.createElement("a");
                  link.href = downloadUrl;
                  link.download = "ocr-searchable.pdf";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                disabled={!downloadUrl}
              >
                <Download className="h-5 w-5 mr-2" />
                Download Searchable PDF
              </Button>
              <Button variant="ghost" onClick={handleReset}>
                Scan another document
              </Button>
              {error && (
                <p className="mt-1 text-sm text-destructive text-center max-w-md">{error}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
