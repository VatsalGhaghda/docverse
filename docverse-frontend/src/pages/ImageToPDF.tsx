import { useState, useEffect, useRef } from "react";
import {
  Image as ImageIcon,
  ArrowRight,
  RotateCcw,
  Download,
  RectangleVertical,
  RectangleHorizontal,
  Square,
  SquareDashed,
  SquareStack,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ImageToPDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [pageSize, setPageSize] = useState<"fit" | "a4" | "letter">("a4");
  const [margin, setMargin] = useState<"none" | "small" | "big">("none");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const uploadRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [imageDims, setImageDims] = useState<Record<string, { w: number; h: number }>>({});
  const [dragThumbId, setDragThumbId] = useState<string | null>(null);

  const allReady = files.length > 0 && files.every((f) => f.status === "complete");

  const handleProcess = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    if (!allReady) return;

    setIsProcessing(true);
    setIsComplete(false);
    setError(null);
    setProgress(8);

    const formData = new FormData();
    for (const f of files) {
      const file = f.file as File | undefined;
      if (file) {
        formData.append("files", file, file.name ?? "image.jpg");
      }
    }
    formData.append("orientation", orientation);
    formData.append("pageSize", pageSize);
    formData.append("margin", margin);

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", `${apiBase}/image-to-pdf`);
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
          reject(new Error("Network error while uploading images"));
        };

        xhr.send(formData);
      });
    } catch (err) {
      console.error("Error converting images to PDF", err);
      setError("Something went wrong while converting your images to PDF. Please try again.");
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
    setUploadKey((prev) => prev + 1);
    setProgress(0);
    setOrientation("portrait");
    setPageSize("a4");
    setMargin("none");
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

  const handleThumbDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    setDragThumbId(id);
  };

  const handleThumbDragOver = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!dragThumbId || dragThumbId === targetId) return;

    setFiles((prev: any[]) => {
      const currentIndex = prev.findIndex((f) => f.id === dragThumbId);
      const targetIndex = prev.findIndex((f) => f.id === targetId);
      if (currentIndex === -1 || targetIndex === -1) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(currentIndex, 1);
      updated.splice(targetIndex, 0, moved);
      return updated;
    });
  };

  const handleThumbDragEnd = () => {
    setDragThumbId(null);
  };

  // Generate object URLs for image thumbnails used in the left preview column
  useEffect(() => {
    if (!files.length) {
      setPreviewUrls({});
      setImageDims({});
      return;
    }

    const next: Record<string, string> = {};
    const urlsToRevoke: string[] = [];

    files.forEach((f: any) => {
      const file = f.file as File | undefined;
      if (!file || !file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      next[f.id] = url;
      urlsToRevoke.push(url);
    });

    setPreviewUrls(next);

    // Load natural dimensions so previews can reflect orientation/fit sizing.
    const nextDims: Record<string, { w: number; h: number }> = {};
    let cancelled = false;
    const loaders: HTMLImageElement[] = [];

    for (const f of files) {
      const url = next[f.id];
      if (!url) continue;
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        nextDims[f.id] = {
          w: (img.naturalWidth || img.width || 1) as number,
          h: (img.naturalHeight || img.height || 1) as number,
        };
        setImageDims((prev) => ({ ...prev, ...nextDims }));
      };
      img.src = url;
      loaders.push(img);
    }

    return () => {
      cancelled = true;
      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const getPageAspectRatio = (id: string): number => {
    const dims = imageDims[id];
    const imgW = dims?.w || 3;
    const imgH = dims?.h || 4;
    const drawW = imgW;
    const drawH = imgH;

    if (pageSize === "fit") {
      const ratioMap: Record<typeof margin, number> = { none: 0, small: 0.06, big: 0.12 };
      const pad = ratioMap[margin] * Math.min(drawW, drawH);
      return (drawW + pad * 2) / Math.max(1, drawH + pad * 2);
    }

    const a4 = 210 / 297;
    const letter = 8.5 / 11;
    const base = pageSize === "letter" ? letter : a4;
    return orientation === "landscape" ? 1 / base : base;
  };

  const getMarginRatio = (): number => {
    if (margin === "small") return 0.06;
    if (margin === "big") return 0.12;
    return 0;
  };

  return (
    <ToolPageLayout
      title="Image to PDF"
      description="Combine JPG and PNG images into a single, clean PDF document."
      icon={ImageIcon}
      iconColor="secondary"
    >
      <div className="mx-auto max-w-5xl">
        {!isComplete ? (
          isProcessing ? (
            <div ref={loadingRef} className="py-16 flex flex-col items-center gap-6">
              <h2 className="text-2xl font-semibold">Creating PDF...</h2>
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
                  accept=".jpg,.jpeg,.png"
                  multiple
                  maxFiles={50}
                  onFilesChange={setFiles}
                />
              </div>

              {files.length > 0 && (
                <div
                  ref={previewRef}
                  className="mt-8 grid grid-cols-1 lg:grid-cols-[2fr,1.3fr] gap-6 items-start"
                >
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border bg-card p-4">
                      <h3 className="font-semibold mb-1">Page order</h3>
                      <p className="text-xs text-muted-foreground">
                        Thumbnails below show the current order of images. Drag within the upload list to reorder
                        before converting.
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-muted/5 max-h-[34rem] overflow-y-auto pr-1.5 scroll-slim">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-2.5">
                        {files.map((f: any, index: number) => {
                          const file = f.file as File | undefined;
                          const url = file ? previewUrls[f.id] : undefined;
                          const dims = imageDims[f.id];
                          const imgW = dims?.w || 1;
                          const imgH = dims?.h || 1;
                          const pageAspect = getPageAspectRatio(f.id);
                          const pad = getMarginRatio();
                          return (
                            <div
                              key={f.id}
                              className="group relative rounded-xl border border-border bg-card/70 p-1.5 flex flex-col items-center gap-1.5 cursor-move transition-shadow hover:shadow-sm"
                              draggable
                              onDragStart={(e) => handleThumbDragStart(e, f.id)}
                              onDragOver={(e) => handleThumbDragOver(e, f.id)}
                              onDragEnd={handleThumbDragEnd}
                            >
                              <div
                                className="w-full rounded-lg bg-muted/40 overflow-hidden flex items-center justify-center border border-border/60 group-hover:border-primary/60 transition-colors"
                                style={{ aspectRatio: String(pageAspect) }}
                              >
                                <div
                                  className="h-full w-full bg-background/70"
                                  style={{ padding: `${pad * 100}%` }}
                                >
                                  <div className="h-full w-full rounded-md bg-muted/20 flex items-center justify-center overflow-hidden">
                                    {url && (
                                      <img
                                        src={url}
                                        alt={file?.name || `Image ${index + 1}`}
                                        className="h-full w-full object-contain"
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                              <p className="text-[10px] text-muted-foreground w-full text-center px-1">
                                Image {index + 1}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs font-medium">Page orientation</p>
                        <div className="flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setOrientation("portrait")}
                            className={`flex-1 rounded-lg border px-3 py-2 text-center font-medium transition ${
                              orientation === "portrait"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-foreground hover:border-primary/60"
                            }`}
                          >
                            <span className="inline-flex items-center justify-center gap-1">
                              <RectangleVertical className="h-3.5 w-3.5" />
                              <span>Portrait</span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrientation("landscape")}
                            className={`flex-1 rounded-lg border px-3 py-2 text-center font-medium transition ${
                              orientation === "landscape"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-foreground hover:border-primary/60"
                            }`}
                          >
                            <span className="inline-flex items-center justify-center gap-1">
                              <RectangleHorizontal className="h-3.5 w-3.5" />
                              <span>Landscape</span>
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium">Page size</p>
                        <Select
                          value={pageSize}
                          onValueChange={(v) => setPageSize(v as "fit" | "a4" | "letter")}
                        >
                          <SelectTrigger className="h-9 w-full text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fit">Fit to image</SelectItem>
                            <SelectItem value="a4">A4 (210×297 mm)</SelectItem>
                            <SelectItem value="letter">Letter (8.5×11 in)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-medium">Margin</p>
                        <div className="flex gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setMargin("none")}
                            className={`flex-1 rounded-lg border px-3 py-2 text-center font-medium transition ${
                              margin === "none"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-foreground hover:border-primary/60"
                            }`}
                          >
                            <span className="inline-flex items-center justify-center gap-1">
                              <Square className="h-3.5 w-3.5" />
                              <span>No margin</span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMargin("small")}
                            className={`flex-1 rounded-lg border px-3 py-2 text-center font-medium transition ${
                              margin === "small"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-foreground hover:border-primary/60"
                            }`}
                          >
                            <span className="inline-flex items-center justify-center gap-1">
                              <SquareDashed className="h-3.5 w-3.5" />
                              <span>Small</span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMargin("big")}
                            className={`flex-1 rounded-lg border px-3 py-2 text-center font-medium transition ${
                              margin === "big"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-foreground hover:border-primary/60"
                            }`}
                          >
                            <span className="inline-flex items-center justify-center gap-1">
                              <SquareStack className="h-3.5 w-3.5" />
                              <span>Big</span>
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                      <Button
                        size="lg"
                        className="btn-hero gradient-secondary w-full"
                        onClick={handleProcess}
                        disabled={isProcessing || !allReady}
                      >
                        Convert {files.length} image{files.length > 1 ? "s" : ""}
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" onClick={handleReset}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Start over
                      </Button>
                    </div>
                  </div>
                </div>
              )}
          </>
          )
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10">
              <ImageIcon className="h-10 w-10 text-secondary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">PDF Created!</h2>
            <p className="text-muted-foreground mb-8">
              Your images have been combined into a single PDF document.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="btn-hero gradient-secondary"
                onClick={() => {
                  if (!downloadUrl) return;
                  const link = document.createElement("a");
                  link.href = downloadUrl;
                  const baseName = (files[0]?.name || "images").replace(/\.(jpg|jpeg|png)$/i, "");
                  link.download = `${baseName}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                disabled={!downloadUrl}
              >
                <Download className="h-5 w-5 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Convert more images
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
