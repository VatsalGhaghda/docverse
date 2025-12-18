import { useState, useEffect, useRef } from "react";
import {
  Droplets,
  ArrowRight,
  RotateCcw,
  Download,
  Image as ImageIcon,
  Type,
  BringToFront,
  SendToBack,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";
import { PdfPageThumbnail } from "@/components/PdfPageThumbnail";
import { ToolProcessingState } from "@/components/ToolProcessingState";
import { xhrUploadForBlob, XhrUploadError } from "@/lib/xhrUpload";

export default function WatermarkPDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("CONFIDENTIAL");
  const [transparency, setTransparency] = useState(0); // 0,25,50,75 (percent transparency)
  const [rotation, setRotation] = useState(0); // degrees: 0,45,90,180,270
  const [position, setPosition] = useState("mid-center");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [layer, setLayer] = useState<"over" | "under">("over");
  const [fontSize, setFontSize] = useState<[number]>([32]);
  const [color, setColor] = useState("#000000");
  const [fontFamily, setFontFamily] = useState<"helvetica" | "times" | "courier">("helvetica");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const uploadRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);

  const activeFile = files[0]?.file as File | undefined;
  const allReady = files.length === 1 && files[0].status === "complete";

  const handleProcess = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    if (!allReady || !activeFile) return;
    if (mode === "text" && !text.trim()) return;
    if (mode === "image" && !imageFile) return;

    setIsProcessing(true);
    setIsComplete(false);
    setError(null);
    setProgress(8);

    const formData = new FormData();
    formData.append("file", activeFile, activeFile.name ?? "document.pdf");
    formData.append("mode", mode);
    formData.append("text", text);
    const opacityValue = 100 - transparency;
    formData.append("opacity", String(opacityValue));
    formData.append("rotation", String(rotation));
    formData.append("position", position);
    if (mode === "image" && imageFile) {
      formData.append("watermarkImage", imageFile, imageFile.name ?? "image.png");
    }
    formData.append("rangeFrom", rangeFrom);
    formData.append("rangeTo", rangeTo);
    formData.append("layer", layer);
    formData.append("fontSize", String(fontSize[0]));
    formData.append("color", color);
    formData.append("fontFamily", fontFamily);
    formData.append("bold", isBold ? "true" : "false");
    formData.append("italic", isItalic ? "true" : "false");
    formData.append("underline", isUnderline ? "true" : "false");

    try {
      const { blob } = await xhrUploadForBlob({
        url: `${apiBase}/watermark-pdf`,
        formData,
        onProgress: (p) => setProgress(p),
        progressStart: 8,
        progressCap: 92,
        progressTickMs: 100,
        progressTickAmount: 4,
      });

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setIsComplete(true);
    } catch (err) {
      console.error("Error watermarking PDF", err);
      if (err instanceof XhrUploadError) {
        setError(err.message);
      } else {
        setError("Something went wrong while applying the watermark. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setIsComplete(false);
    setMode("text");
    setText("CONFIDENTIAL");
    setTransparency(0);
    setRotation(0);
    setPosition("mid-center");
    setImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    setRangeFrom("");
    setRangeTo("");
    setLayer("over");
    setFontSize([32]);
    setColor("#000000");
    setFontFamily("helvetica");
    setIsBold(false);
    setIsItalic(false);
    setIsUnderline(false);
    setError(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setUploadKey((prev) => prev + 1);
    setProgress(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Scroll to upload area when a file is selected (showing the blue upload bar)
  useEffect(() => {
    if (files.length > 0 && uploadRef.current) {
      const rect = uploadRef.current.getBoundingClientRect();
      const offset = window.scrollY + rect.top + 140; // leave some space from the top
      window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
    }
  }, [files.length]);

  // Detect page count for thumbnail previews
  useEffect(() => {
    const detectPages = async () => {
      if (!activeFile || !allReady) {
        setPageCount(null);
        setRangeFrom("");
        setRangeTo("");
        return;
      }

      try {
        const pdfjsLib = await import("pdfjs-dist");
        // @ts-ignore worker configured globally
        const arrayBuffer = await activeFile.arrayBuffer();
        const loadingTask = (pdfjsLib as any).getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const count = pdf.numPages || null;
        setPageCount(count);

        if (count && !rangeFrom && !rangeTo) {
          const from = "1";
          const to = String(count);
          setRangeFrom(from);
          setRangeTo(to);
        }
      } catch {
        setPageCount(null);
      }
    };

    void detectPages();
  }, [activeFile, allReady, rangeFrom, rangeTo]);

  // Clean up image preview URL when it changes/unmounts
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // When upload has fully completed and preview is ready, scroll down to the preview/options block
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

  return (
    <ToolPageLayout
      title="Watermark PDF"
      description="Add text or image watermarks to your PDF pages for branding or protection."
      icon={Droplets}
      iconColor="secondary"
    >
      <div className="mx-auto max-w-5xl">
        {!isComplete ? (
          isProcessing ? (
            <ToolProcessingState
              containerRef={loadingRef}
              title="Applying watermark..."
              progress={progress}
              error={error}
              color="secondary"
            />
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

              {allReady && activeFile && (
                <div
                  ref={previewRef}
                  className="mt-8 grid grid-cols-1 lg:grid-cols-[2.1fr,1.5fr] gap-6 items-start"
                >
                  {/* Left: page thumbnails with position marker */}
                  <div className="space-y-3">
                    {activeFile && pageCount && (
                      <div className="rounded-xl border border-border bg-muted/10 max-h-[34rem] overflow-y-auto pr-2 scroll-slim">
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-3">
                          {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNumber) => (
                            <div
                              key={pageNumber}
                              className="relative rounded-xl border bg-card/60 p-1 flex flex-col items-center"
                            >
                              <div className="w-full relative">
                                <PdfPageThumbnail file={activeFile} pageNumber={pageNumber} />
                                {/* Position marker overlay: 3x3 grid */}
                                <div className="pointer-events-none absolute inset-0 flex items-stretch justify-stretch">
                                  <div className="flex-1 flex flex-col p-2">
                                    {/* Top row */}
                                    <div className="flex-1 flex">
                                      <div className="flex-1 flex items-start justify-start">
                                        {position === "top-left" && (
                                          <span className="h-3 w-3 rounded-full bg-red-500 shadow" />
                                        )}
                                      </div>
                                      <div className="flex-1 flex items-start justify-center">
                                        {position === "top-center" && (
                                          <span className="h-3 w-3 rounded-full bg-red-500 shadow" />
                                        )}
                                      </div>
                                      <div className="flex-1 flex items-start justify-end">
                                        {position === "top-right" && (
                                          <span className="h-3 w-3 rounded-full bg-red-500 shadow" />
                                        )}
                                      </div>
                                    </div>
                                    {/* Middle row */}
                                    <div className="flex-1 flex">
                                      <div className="flex-1 flex items-center justify-start">
                                        {position === "mid-left" && (
                                          <span className="h-3 w-3 rounded-full bg-red-500 shadow" />
                                        )}
                                      </div>
                                      <div className="flex-1 flex items-center justify-center">
                                        {position === "mid-center" && (
                                          <span className="h-3 w-3 rounded-full bg-red-500 shadow" />
                                        )}
                                      </div>
                                      <div className="flex-1 flex items-center justify-end">
                                        {position === "mid-right" && (
                                          <span className="h-3 w-3 rounded-full bg-red-500 shadow" />
                                        )}
                                      </div>
                                    </div>
                                    {/* Bottom row */}
                                    <div className="flex-1 flex">
                                      <div className="flex-1 flex items-end justify-start">
                                        {position === "bottom-left" && (
                                          <span className="h-3 w-3 rounded-full bg-red-500 shadow" />
                                        )}
                                      </div>
                                      <div className="flex-1 flex items-end justify-center">
                                        {position === "bottom-center" && (
                                          <span className="h-3 w-3 rounded-full bg-red-500 shadow" />
                                        )}
                                      </div>
                                      <div className="flex-1 flex items-end justify-end">
                                        {position === "bottom-right" && (
                                          <span className="h-3 w-3 rounded-full bg-red-500 shadow" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <p className="mt-1 text-[10px] text-center text-muted-foreground">{pageNumber}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: options (scrollable content with sticky footer buttons) */}
                  <div className="rounded-xl border border-border bg-card p-0 flex flex-col max-h-[34rem]">
                    <div className="p-6 space-y-5 overflow-y-auto scroll-slim flex-1">
                      <h3 className="text-lg font-semibold text-center">Watermark options</h3>

                    {/* Line 1: Watermark type */}
                    <div className="space-y-2">
                      <Label>Watermark Type</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <button
                          type="button"
                          className={`h-11 rounded-md border px-3 flex items-center justify-center gap-2 font-medium transition-colors ${
                            mode === "text"
                              ? "border-secondary bg-secondary text-secondary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-secondary/70 hover:bg-muted/40"
                          }`}
                          onClick={() => setMode("text")}
                        >
                          <Type className="h-4 w-4" />
                          <span>Place text</span>
                        </button>
                        <button
                          type="button"
                          className={`h-11 rounded-md border px-3 flex items-center justify-center gap-2 font-medium transition-colors ${
                            mode === "image"
                              ? "border-secondary bg-secondary text-secondary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-secondary/70 hover:bg-muted/40"
                          }`}
                          onClick={() => setMode("image")}
                        >
                          <ImageIcon className="h-4 w-4" />
                          <span>Place image</span>
                        </button>
                      </div>
                    </div>

                    {/* Line 2: Pages range */}
                    <div className="space-y-2">
                      <Label>Pages</Label>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        {/* Mobile-only layout */}
                        <div className="flex flex-col gap-2 sm:hidden">
                          <div className="flex items-center gap-2 w-full">
                            <span className="whitespace-nowrap">From page</span>
                            <div className="flex flex-1 items-stretch rounded-full border bg-background overflow-hidden">
                              <Input
                                type="number"
                                min={1}
                                max={pageCount ?? undefined}
                                value={rangeFrom}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "") {
                                    setRangeFrom("");
                                    return;
                                  }
                                  let n = parseInt(value, 10);
                                  if (Number.isNaN(n)) return;
                                  const total = pageCount ?? undefined;
                                  if (total) {
                                    n = Math.min(Math.max(1, n), total);
                                  } else {
                                    n = Math.max(1, n);
                                  }
                                  const str = String(n);
                                  setRangeFrom(str);
                                }}
                                className="h-8 w-full border-0 focus-visible:ring-0 rounded-none text-right pr-1 no-native-spinner"
                              />
                              <div className="flex flex-col border-l bg-muted/60">
                                <button
                                  type="button"
                                  className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                  onClick={() => {
                                    const total = pageCount ?? undefined;
                                    let current = parseInt(rangeFrom || "1", 10) || 1;
                                    current += 1;
                                    if (total) {
                                      current = Math.min(Math.max(1, current), total);
                                    } else {
                                      current = Math.max(1, current);
                                    }
                                    const str = String(current);
                                    setRangeFrom(str);
                                  }}
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                  onClick={() => {
                                    const total = pageCount ?? undefined;
                                    let current = parseInt(rangeFrom || "1", 10) || 1;
                                    current -= 1;
                                    if (total) {
                                      current = Math.min(Math.max(1, current), total);
                                    } else {
                                      current = Math.max(1, current);
                                    }
                                    const str = String(current);
                                    setRangeFrom(str);
                                  }}
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full">
                            <span className="whitespace-nowrap">to page</span>
                            <div className="flex flex-1 items-stretch rounded-full border bg-background overflow-hidden">
                              <Input
                                type="number"
                                min={1}
                                max={pageCount ?? undefined}
                                value={rangeTo}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "") {
                                    setRangeTo("");
                                    return;
                                  }
                                  let n = parseInt(value, 10);
                                  if (Number.isNaN(n)) return;
                                  const total = pageCount ?? undefined;
                                  if (total) {
                                    n = Math.min(Math.max(1, n), total);
                                  } else {
                                    n = Math.max(1, n);
                                  }
                                  const str = String(n);
                                  setRangeTo(str);
                                }}
                                className="h-8 w-full border-0 focus-visible:ring-0 rounded-none text-right pr-1 no-native-spinner"
                              />
                              <div className="flex flex-col border-l bg-muted/60">
                                <button
                                  type="button"
                                  className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                  onClick={() => {
                                    const total = pageCount ?? undefined;
                                    let current = parseInt(rangeTo || "1", 10) || 1;
                                    current += 1;
                                    if (total) {
                                      current = Math.min(Math.max(1, current), total);
                                    } else {
                                      current = Math.max(1, current);
                                    }
                                    const str = String(current);
                                    setRangeTo(str);
                                  }}
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                  onClick={() => {
                                    const total = pageCount ?? undefined;
                                    let current = parseInt(rangeTo || "1", 10) || 1;
                                    current -= 1;
                                    if (total) {
                                      current = Math.min(Math.max(1, current), total);
                                    } else {
                                      current = Math.max(1, current);
                                    }
                                    const str = String(current);
                                    setRangeTo(str);
                                  }}
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Desktop-only layout */}
                        <div className="hidden sm:grid grid-cols-[auto,auto,auto,auto] items-center gap-2">
                          <span className="whitespace-nowrap">From page</span>
                          <div className="inline-flex items-stretch rounded-full border bg-background overflow-hidden">
                            <Input
                              type="number"
                              min={1}
                              max={pageCount ?? undefined}
                              value={rangeFrom}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "") {
                                  setRangeFrom("");
                                  return;
                                }
                                let n = parseInt(value, 10);
                                if (Number.isNaN(n)) return;
                                const total = pageCount ?? undefined;
                                if (total) {
                                  n = Math.min(Math.max(1, n), total);
                                } else {
                                  n = Math.max(1, n);
                                }
                                const str = String(n);
                                setRangeFrom(str);
                              }}
                              className="h-8 w-20 border-0 focus-visible:ring-0 rounded-none text-right pr-2 no-native-spinner"
                            />
                            <div className="flex flex-col border-l bg-muted/60">
                              <button
                                type="button"
                                className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                onClick={() => {
                                  const total = pageCount ?? undefined;
                                  let current = parseInt(rangeFrom || "1", 10) || 1;
                                  current += 1;
                                  if (total) {
                                    current = Math.min(Math.max(1, current), total);
                                  } else {
                                    current = Math.max(1, current);
                                  }
                                  const str = String(current);
                                  setRangeFrom(str);
                                }}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                onClick={() => {
                                  const total = pageCount ?? undefined;
                                  let current = parseInt(rangeFrom || "1", 10) || 1;
                                  current -= 1;
                                  if (total) {
                                    current = Math.min(Math.max(1, current), total);
                                  } else {
                                    current = Math.max(1, current);
                                  }
                                  const str = String(current);
                                  setRangeFrom(str);
                                }}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <span className="whitespace-nowrap text-right">to page</span>
                          <div className="inline-flex items-stretch rounded-full border bg-background overflow-hidden">
                            <Input
                              type="number"
                              min={1}
                              max={pageCount ?? undefined}
                              value={rangeTo}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "") {
                                  setRangeTo("");
                                  return;
                                }
                                let n = parseInt(value, 10);
                                if (Number.isNaN(n)) return;
                                const total = pageCount ?? undefined;
                                if (total) {
                                  n = Math.min(Math.max(1, n), total);
                                } else {
                                  n = Math.max(1, n);
                                }
                                const str = String(n);
                                setRangeTo(str);
                              }}
                              className="h-8 w-20 border-0 focus-visible:ring-0 rounded-none text-right pr-2 no-native-spinner"
                            />
                            <div className="flex flex-col border-l bg-muted/60">
                              <button
                                type="button"
                                className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                onClick={() => {
                                  const total = pageCount ?? undefined;
                                  let current = parseInt(rangeTo || "1", 10) || 1;
                                  current += 1;
                                  if (total) {
                                    current = Math.min(Math.max(1, current), total);
                                  } else {
                                    current = Math.max(1, current);
                                  }
                                  const str = String(current);
                                  setRangeTo(str);
                                }}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                onClick={() => {
                                  const total = pageCount ?? undefined;
                                  let current = parseInt(rangeTo || "1", 10) || 1;
                                  current -= 1;
                                  if (total) {
                                    current = Math.min(Math.max(1, current), total);
                                  } else {
                                    current = Math.max(1, current);
                                  }
                                  const str = String(current);
                                  setRangeTo(str);
                                }}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Leave empty to apply watermark on all pages.
                        </p>
                      </div>
                    </div>

                    {/* Line 3: Watermark text or image */}
                    {mode === "text" ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="watermark-text">Watermark text</Label>
                          <Input
                            id="watermark-text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Enter watermark text"
                          />
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Type className="h-3 w-3" />
                            Example: "CONFIDENTIAL", or your company name.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <Label>Text format</Label>
                          <div className="space-y-2 text-xs">
                            {/* Font family + size */}
                            <div className="grid grid-cols-[minmax(0,1.3fr),minmax(0,1.7fr)] gap-3 items-center">
                              <div className="space-y-1">
                                <span className="block text-[11px]">Font</span>
                                <Select value={fontFamily} onValueChange={(v) => setFontFamily(v as any)}>
                                  <SelectTrigger className="h-7 w-32 px-2 py-1 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="helvetica">Helvetica</SelectItem>
                                    <SelectItem value="times">Times</SelectItem>
                                    <SelectItem value="courier">Courier</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] text-muted-foreground">Font size</span>
                                  <span className="text-[11px] text-muted-foreground">{fontSize[0]} pt</span>
                                </div>
                                <Slider
                                  min={16}
                                  max={72}
                                  step={1}
                                  value={fontSize}
                                  onValueChange={(value) => setFontSize([value[0]])}
                                />
                              </div>
                            </div>

                            {/* Colors */}
                            <div className="space-y-1">
                              <span className="block text-[11px]">Color</span>
                              <div className="flex items-center gap-1.5">
                                {["#000000", "#4b5563", "#1d4ed8", "#b91c1c"].map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`h-5 w-5 rounded-full border transition-colors ${
                                      color === c
                                        ? "border-secondary ring-2 ring-secondary/40"
                                        : "border-border hover:border-secondary/60 hover:bg-muted/40"
                                    }`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* B / I / U */}
                            <div className="space-y-1">
                              <span className="block text-[11px]">Style</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setIsBold((prev) => !prev)}
                                  className={`h-7 min-w-[2rem] rounded-md border px-2 py-1 font-semibold tracking-wide transition-colors ${
                                    isBold
                                      ? "border-secondary bg-secondary/10 text-white shadow-sm"
                                      : "border-border bg-background text-muted-foreground hover:border-secondary/60 hover:bg-muted/40"
                                  }`}
                                >
                                  B
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsItalic((prev) => !prev)}
                                  className={`h-7 min-w-[2rem] rounded-md border px-2 py-1 italic transition-colors ${
                                    isItalic
                                      ? "border-secondary bg-secondary/10 text-white shadow-sm"
                                      : "border-border bg-background text-muted-foreground hover:border-secondary/60 hover:bg-muted/40"
                                  }`}
                                >
                                  I
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsUnderline((prev) => !prev)}
                                  className={`h-7 min-w-[2rem] rounded-md border px-2 py-1 underline transition-colors ${
                                    isUnderline
                                      ? "border-secondary bg-secondary/10 text-white shadow-sm"
                                      : "border-border bg-background text-muted-foreground hover:border-secondary/60 hover:bg-muted/40"
                                  }`}
                                >
                                  U
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Watermark image</Label>
                        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground space-y-3">
                          <div className="flex items-center gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-full border-border bg-background px-4 py-1.5 text-xs font-medium hover:border-secondary hover:bg-secondary/10 hover:text-white"
                              onClick={() => imageInputRef.current?.click()}
                            >
                              Choose file
                            </Button>
                            <Input
                              ref={imageInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                setImageFile(file);
                                if (imagePreviewUrl) {
                                  URL.revokeObjectURL(imagePreviewUrl);
                                }
                                if (file) {
                                  const url = URL.createObjectURL(file);
                                  setImagePreviewUrl(url);
                                } else {
                                  setImagePreviewUrl(null);
                                }
                              }}
                            />
                            {imagePreviewUrl && (
                              <div className="flex items-center gap-2">
                                <div className="h-10 w-10 rounded border overflow-hidden bg-muted flex items-center justify-center">
                                  <img
                                    src={imagePreviewUrl}
                                    alt="Selected watermark"
                                    className="max-h-10 max-w-10 object-contain"
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground">Preview</p>
                              </div>
                            )}
                          </div>
                          <p>Upload a logo or stamp image to use as a watermark.</p>
                        </div>
                      </div>
                    )}

                    {/* Line 4: Position grid */}
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <div className="inline-block rounded-md border border-border bg-background p-2">
                        <div className="grid grid-cols-3 grid-rows-3 gap-px w-24 h-24">
                          {[
                            "top-left",
                            "top-center",
                            "top-right",
                            "mid-left",
                            "mid-center",
                            "mid-right",
                            "bottom-left",
                            "bottom-center",
                            "bottom-right",
                          ].map((key) => {
                            const isActive = position === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setPosition(key)}
                                className={`relative flex items-center justify-center border border-dashed border-border/60 bg-muted/20 hover:bg-muted/50 ${
                                  isActive ? "bg-red-500/10 border-red-500/70" : ""
                                }`}
                              >
                                {isActive && <span className="h-3 w-3 rounded-full bg-red-500" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Line 5: Transparency & Rotation */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Transparency</Label>
                        <Select
                          value={String(transparency)}
                          onValueChange={(value) => setTransparency(parseInt(value, 10) || 0)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No transparency</SelectItem>
                            <SelectItem value="75">75%</SelectItem>
                            <SelectItem value="50">50%</SelectItem>
                            <SelectItem value="25">25%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Rotation</Label>
                        <Select
                          value={String(rotation)}
                          onValueChange={(value) => setRotation(parseInt(value, 10) || 0)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Do not rotate</SelectItem>
                            <SelectItem value="45">45 degrees</SelectItem>
                            <SelectItem value="90">90 degrees</SelectItem>
                            <SelectItem value="180">180 degrees</SelectItem>
                            <SelectItem value="270">270 degrees</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Line 6: Layer buttons */}
                    <div className="space-y-2">
                      <Label>Layer</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <button
                          type="button"
                          className={`h-11 rounded-md border px-3 text-left font-medium transition-colors ${
                            layer === "over"
                              ? "border-secondary bg-secondary text-secondary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-secondary/70 hover:bg-muted/40"
                          }`}
                          onClick={() => setLayer("over")}
                        >
                          <div className="flex items-center gap-2">
                            <BringToFront className="h-4 w-4" />
                            <span>Over the PDF content</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          className={`h-11 rounded-md border px-3 text-left font-medium transition-colors ${
                            layer === "under"
                              ? "border-secondary bg-secondary text-secondary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-secondary/70 hover:bg-muted/40"
                          }`}
                          onClick={() => setLayer("under")}
                        >
                          <div className="flex items-center gap-2">
                            <SendToBack className="h-4 w-4" />
                            <span>Below the PDF content</span>
                          </div>
                        </button>
                      </div>
                    </div>
                    </div>

                    <div className="border-t border-border bg-card/80 px-6 py-4 flex flex-col items-center gap-3 sticky bottom-0">
                      <Button
                        size="lg"
                        className="w-full btn-hero gradient-secondary"
                        onClick={handleProcess}
                        disabled={
                          isProcessing ||
                          !allReady ||
                          (mode === "text" && !text) ||
                          (mode === "image" && !imageFile)
                        }
                      >
                        Apply watermark
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" onClick={handleReset} className="text-xs flex items-center gap-2">
                        <RotateCcw className="h-4 w-4" />
                        <span>Start over</span>
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
              <Droplets className="h-10 w-10 text-secondary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Watermark Applied!</h2>
            <p className="text-muted-foreground mb-8">
              Your PDF now includes the watermark settings you chose.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="btn-hero gradient-secondary"
                onClick={() => {
                  if (!downloadUrl) return;
                  const link = document.createElement("a");
                  link.href = downloadUrl;
                  const baseName = (files[0]?.name || "document").replace(/\.pdf$/i, "");
                  link.download = `${baseName}-watermarked.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                disabled={!downloadUrl}
              >
                <Download className="h-5 w-5 mr-2" />
                Download Watermarked PDF
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Watermark another PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
