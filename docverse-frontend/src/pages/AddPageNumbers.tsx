import { useState, useEffect, useRef } from "react";
import { ListOrdered, ArrowRight, RotateCcw, Download, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";
import { PdfPageThumbnail } from "@/components/PdfPageThumbnail";

export default function AddPageNumbers() {
  const [files, setFiles] = useState<any[]>([]);
  const [format, setFormat] = useState("1");
  const [template, setTemplate] = useState("number");
  const [pageMode, setPageMode] = useState<"single" | "facing">("single");
  const [coverIsFirstPage, setCoverIsFirstPage] = useState(false);
  const [startAt, setStartAt] = useState("1");
  const [range, setRange] = useState("");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [position, setPosition] = useState("bottom-center");
  const [fontSize, setFontSize] = useState([12]);
  const [margin, setMargin] = useState([24]);
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

  const activeFile = files[0]?.file as File | undefined;
  const [pageCount, setPageCount] = useState<number | null>(null);
  const allReady = files.length === 1 && files[0].status === "complete";

  const updateRangeState = (from: string, to: string) => {
    let value = "";
    if (from && to) {
      value = `${from}-${to}`;
    }
    setRange(value);
  };

  const handleProcess = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    if (!allReady || !activeFile) return;

    setIsProcessing(true);
    setIsComplete(false);
    setError(null);
    setProgress(8);

    const formData = new FormData();
    formData.append("file", activeFile, activeFile.name ?? "document.pdf");
    formData.append("format", format);
    formData.append("template", template);
    formData.append("pageMode", pageMode);
    formData.append("coverIsFirstPage", coverIsFirstPage ? "true" : "false");
    formData.append("startAt", startAt);
    formData.append("range", range);
    formData.append("position", position);
    formData.append("fontSize", String(fontSize[0]));
    formData.append("margin", String(margin[0]));
    formData.append("color", color);
    formData.append("fontFamily", fontFamily);
    formData.append("bold", isBold ? "true" : "false");
    formData.append("italic", isItalic ? "true" : "false");
    formData.append("underline", isUnderline ? "true" : "false");

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", `${apiBase}/add-page-numbers`);
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
          reject(new Error("Network error while uploading file"));
        };

        xhr.send(formData);
      });
    } catch (err) {
      console.error("Error adding page numbers", err);
      setError("Something went wrong while adding page numbers. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setIsComplete(false);
    setStartAt("1");
    setRange("");
    setRangeFrom("");
    setRangeTo("");
    setFormat("1");
    setTemplate("number");
    setPageMode("single");
    setCoverIsFirstPage(false);
    setPosition("bottom-center");
    setFontSize([12]);
    setMargin([24]);
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

  // Detect page count for preview thumbnails (similar to SplitPDF)
  // Run only after upload is fully complete to avoid extra work during upload phase
  useEffect(() => {
    const detectPages = async () => {
      if (!activeFile || !allReady) {
        setPageCount(null);
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
          updateRangeState(from, to);
        }
      } catch {
        setPageCount(null);
      }
    };

    void detectPages();
  }, [activeFile, allReady]);

  // When upload has fully completed and preview is ready, scroll down to the preview/options block
  useEffect(() => {
    if (allReady && previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      const offset = window.scrollY + rect.top - 90; // similar offset to keep content in view
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

  const previewMarginInset = 4 + ((margin[0] - 8) / (64 - 8)) * 14;

  return (
    <ToolPageLayout
      title="Add Page Numbers"
      description="Insert page numbers into your PDF with full control over style, position and page range."
      icon={ListOrdered}
      iconColor="accent"
    >
      <div className="mx-auto max-w-5xl">
        {!isComplete && (
          isProcessing ? (
            <div ref={loadingRef} className="py-16 flex flex-col items-center gap-6">
              <h2 className="text-2xl font-semibold">Applying numbers...</h2>
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
                  multiple={false}
                  maxFiles={1}
                  onFilesChange={setFiles}
                />
              </div>

              {allReady && (
                <div
                  ref={previewRef}
                  className="mt-8 grid grid-cols-1 lg:grid-cols-[2.1fr,1.5fr] gap-6 items-start"
                >
                  {/* Left: page thumbnails with position marker */}
                  <div className="space-y-3">
                    {activeFile && pageCount && (
                      <div className="rounded-xl border border-border bg-muted/10 max-h-[34rem] overflow-y-auto pr-2 scroll-slim">
                        {pageMode === "single" && (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-3">
                            {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => {
                              const isCover = coverIsFirstPage && page === 1;
                              const showMarker = !isCover;
                              return (
                                <div
                                  key={page}
                                  className="relative rounded-xl border bg-card/60 p-1 flex flex-col items-center"
                                >
                                  <div className="w-full relative">
                                    <PdfPageThumbnail file={activeFile} pageNumber={page} />
                                    {/* Position marker overlay: 3x3 grid with dynamic inset from margin */}
                                    {showMarker && (
                                      <div className="pointer-events-none absolute inset-0 flex items-stretch justify-stretch">
                                        <div
                                          className="flex-1 flex flex-col"
                                          style={{ padding: `${previewMarginInset}px` }}
                                        >
                                          {/* Top row */}
                                          <div className="flex-1 flex">
                                            <div className="flex-1 flex items-start justify-start">
                                              {position === "top-left" && (
                                                <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                              )}
                                            </div>
                                            <div className="flex-1 flex items-start justify-center">
                                              {position === "top-center" && (
                                                <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                              )}
                                            </div>
                                            <div className="flex-1 flex items-start justify-end">
                                              {position === "top-right" && (
                                                <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                              )}
                                            </div>
                                          </div>
                                          {/* Middle row (unused, just spacing) */}
                                          <div className="flex-1 flex">
                                            <div className="flex-1" />
                                            <div className="flex-1" />
                                            <div className="flex-1" />
                                          </div>
                                          {/* Bottom row */}
                                          <div className="flex-1 flex">
                                            <div className="flex-1 flex items-end justify-start">
                                              {position === "bottom-left" && (
                                                <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                              )}
                                            </div>
                                            <div className="flex-1 flex items-end justify-center">
                                              {position === "bottom-center" && (
                                                <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                              )}
                                            </div>
                                            <div className="flex-1 flex items-end justify-end">
                                              {position === "bottom-right" && (
                                                <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <p className="mt-1 text-[10px] text-center text-muted-foreground">
                                    {isCover ? "Cover" : page}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {pageMode === "facing" && (
                          <div className="space-y-3 p-3">
                            {coverIsFirstPage && (
                              <div className="rounded-xl border bg-card/60 p-2 flex flex-col items-center">
                                <div className="w-32">
                                  <PdfPageThumbnail file={activeFile} pageNumber={1} />
                                </div>
                                <p className="mt-1 text-[10px] text-center text-muted-foreground">Cover (page 1)</p>
                              </div>
                            )}

                            {(() => {
                              const startPage = coverIsFirstPage ? 2 : 1;
                              const spreads: { left: number; right: number | null; index: number }[] = [];
                              let logicalIndex = 1;
                              for (let p = startPage; p <= pageCount; p += 2) {
                                const left = p;
                                const right = p + 1 <= pageCount ? p + 1 : null;
                                spreads.push({ left, right, index: logicalIndex });
                                logicalIndex += 1;
                              }
                              return spreads.map((spread) => (
                                <div
                                  key={spread.index}
                                  className="flex items-center justify-center gap-3 rounded-xl border bg-card/60 p-2"
                                >
                                  <div className="flex gap-2">
                                    <div className="relative w-24">
                                      <PdfPageThumbnail file={activeFile} pageNumber={spread.left} />
                                      <div className="pointer-events-none absolute inset-0 flex items-stretch justify-stretch">
                                        <div
                                          className="flex-1 flex flex-col"
                                          style={{ padding: `${previewMarginInset}px` }}
                                        >
                                          <div className="flex-1 flex">
                                            <div className="flex-1 flex items-start justify-start">
                                              {position === "top-left" && (
                                                <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                              )}
                                            </div>
                                            <div className="flex-1 flex items-start justify-center">
                                              {position === "top-center" && (
                                                <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                              )}
                                            </div>
                                            <div className="flex-1 flex items-start justify-end">
                                              {position === "top-right" && (
                                                <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex-1 flex">
                                            <div className="flex-1" />
                                            <div className="flex-1" />
                                            <div className="flex-1" />
                                          </div>
                                          <div className="flex-1 flex">
                                            <div className="flex-1 flex items-end justify-start">
                                              {position === "bottom-left" && (
                                                <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                              )}
                                            </div>
                                            <div className="flex-1 flex items-end justify-center">
                                              {position === "bottom-center" && (
                                                <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                              )}
                                            </div>
                                            <div className="flex-1 flex items-end justify-end">
                                              {position === "bottom-right" && (
                                                <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <p className="mt-1 text-[10px] text-center text-muted-foreground">
                                        Page {spread.left}
                                      </p>
                                    </div>
                                    {spread.right && (
                                      <div className="relative w-24">
                                        <PdfPageThumbnail file={activeFile} pageNumber={spread.right} />
                                        <div className="pointer-events-none absolute inset-0 flex items-stretch justify-stretch">
                                          <div
                                            className="flex-1 flex flex-col"
                                            style={{ padding: `${previewMarginInset}px` }}
                                          >
                                            {/* Top row: mirror left/right across spread */}
                                            <div className="flex-1 flex">
                                              <div className="flex-1 flex items-start justify-start">
                                                {position === "top-right" && (
                                                  <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                                )}
                                              </div>
                                              <div className="flex-1 flex items-start justify-center">
                                                {position === "top-center" && (
                                                  <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                                )}
                                              </div>
                                              <div className="flex-1 flex items-start justify-end">
                                                {position === "top-left" && (
                                                  <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex-1 flex">
                                              <div className="flex-1" />
                                              <div className="flex-1" />
                                              <div className="flex-1" />
                                            </div>
                                            {/* Bottom row: mirror left/right across spread */}
                                            <div className="flex-1 flex">
                                              <div className="flex-1 flex items-end justify-start">
                                                {position === "bottom-right" && (
                                                  <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                                )}
                                              </div>
                                              <div className="flex-1 flex items-end justify-center">
                                                {position === "bottom-center" && (
                                                  <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                                )}
                                              </div>
                                              <div className="flex-1 flex items-end justify-end">
                                                {position === "bottom-left" && (
                                                  <span className="h-3 w-3 rounded-full bg-accent shadow" />
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        <p className="mt-1 text-[10px] text-center text-muted-foreground">
                                          Page {spread.right}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: options panel (scrollable content with sticky footer buttons) */}
                  <div className="rounded-xl border border-border bg-card p-0 flex flex-col max-h-[34rem]">
                    <div className="p-6 space-y-6 overflow-y-auto scroll-slim flex-1">
                      <h3 className="font-semibold mb-1">Numbering Options</h3>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Page mode</Label>
                          <div className="inline-flex rounded-full border bg-background p-1 text-xs">
                            <button
                              type="button"
                              className={`px-3 py-1 rounded-full ${
                                pageMode === "single"
                                  ? "bg-accent text-accent-foreground"
                                  : "text-muted-foreground"
                              }`}
                              onClick={() => setPageMode("single")}
                            >
                              Single page
                            </button>
                            <button
                              type="button"
                              className={`px-3 py-1 rounded-full ${
                                pageMode === "facing"
                                  ? "bg-accent text-accent-foreground"
                                  : "text-muted-foreground"
                              }`}
                              onClick={() => setPageMode("facing")}
                            >
                              Facing pages
                            </button>
                          </div>
                        </div>

                        <div className="flex items-end gap-2">
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-border bg-background"
                              checked={coverIsFirstPage}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setCoverIsFirstPage(checked);
                                if (!pageCount) return;

                                if (checked) {
                                  const from = "2";
                                  const to = String(pageCount);
                                  setRangeFrom(from);
                                  setRangeTo(to);
                                  updateRangeState(from, to);
                                } else {
                                  const from = "1";
                                  const to = String(pageCount);
                                  setRangeFrom(from);
                                  setRangeTo(to);
                                  updateRangeState(from, to);
                                }
                              }}
                            />
                            <span>First page is cover page</span>
                          </label>
                        </div>
                      </div> {/* <-- ADDED closing div for the first .grid (Option A) */}

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Number format</Label>
                          <Select value={format} onValueChange={setFormat}>
                            <SelectTrigger>
                              <SelectValue placeholder="1, 2, 3..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1, 2, 3...</SelectItem>
                              <SelectItem value="01">01, 02, 03...</SelectItem>
                              <SelectItem value="i">i, ii, iii...</SelectItem>
                              <SelectItem value="I">I, II, III...</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Text</Label>
                          <Select value={template} onValueChange={setTemplate}>
                            <SelectTrigger>
                              <SelectValue placeholder="Insert only page number (recommended)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="number">Insert only page number (recommended)</SelectItem>
                              <SelectItem value="page_n">Page {"{n}"}</SelectItem>
                              <SelectItem value="page_n_of_total">Page {"{n}"} of {"{total}"}</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Choose how the page number text should appear on each page.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Page range (optional)</Label>
                          <div className="space-y-2 text-xs text-muted-foreground">
                            <div className="grid grid-cols-[auto,auto,auto,auto] items-center gap-2">
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
                                      updateRangeState("", rangeTo);
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
                                    updateRangeState(str, rangeTo);
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
                                      updateRangeState(str, rangeTo);
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
                                      updateRangeState(str, rangeTo);
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
                                      updateRangeState(rangeFrom, "");
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
                                    updateRangeState(rangeFrom, str);
                                  }}
                                  className="h-8 w-20 border-0 focus-visible:ring-0 rounded-none text-right pr-2 no-native-spinner"
                                />
                                <div className="flex flex-col border-l bg-muted/60">
                                  <button
                                    type="button"
                                    className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                    onClick={() => {
                                      const total = pageCount ?? undefined;
                                      let current = parseInt(rangeTo || (rangeFrom || "1"), 10) || 1;
                                      current += 1;
                                      if (total) {
                                        current = Math.min(Math.max(1, current), total);
                                      } else {
                                        current = Math.max(1, current);
                                      }
                                      const str = String(current);
                                      setRangeTo(str);
                                      updateRangeState(rangeFrom, str);
                                    }}
                                  >
                                    <ChevronUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                    onClick={() => {
                                      const total = pageCount ?? undefined;
                                      let current = parseInt(rangeTo || (rangeFrom || "1"), 10) || 1;
                                      current -= 1;
                                      if (total) {
                                        current = Math.min(Math.max(1, current), total);
                                      } else {
                                        current = Math.max(1, current);
                                      }
                                      const str = String(current);
                                      setRangeTo(str);
                                      updateRangeState(rangeFrom, str);
                                    }}
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Leave empty to number all pages. When set, numbers will be added only from this range.
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="startAt">Start numbering at</Label>
                          <div className="inline-flex items-stretch rounded-full border bg-background overflow-hidden">
                            <Input
                              id="startAt"
                              type="number"
                              min={1}
                              value={startAt}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "") {
                                  setStartAt("1");
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
                                setStartAt(String(n));
                              }}
                              className="h-8 w-20 border-0 focus-visible:ring-0 rounded-none text-right pr-2 no-native-spinner"
                            />
                            <div className="flex flex-col border-l bg-muted/60">
                              <button
                                type="button"
                                className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                onClick={() => {
                                  const total = pageCount ?? undefined;
                                  let current = parseInt(startAt || "1", 10) || 1;
                                  current += 1;
                                  if (total) {
                                    current = Math.min(Math.max(1, current), total);
                                  } else {
                                    current = Math.max(1, current);
                                  }
                                  setStartAt(String(current));
                                }}
                              >
                                <ChevronUp className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                onClick={() => {
                                  const total = pageCount ?? undefined;
                                  let current = parseInt(startAt || "1", 10) || 1;
                                  current -= 1;
                                  if (total) {
                                    current = Math.min(Math.max(1, current), total);
                                  } else {
                                    current = Math.max(1, current);
                                  }
                                  setStartAt(String(current));
                                }}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Position</Label>
                          <div className="inline-block rounded-md border border-border bg-background p-2">
                            <div className="grid grid-cols-3 grid-rows-3 gap-px w-24 h-24">
                              {[
                                { key: "top-left", clickable: true },
                                { key: "top-center", clickable: true },
                                { key: "top-right", clickable: true },
                                { key: "mid-left", clickable: false },
                                { key: "mid-center", clickable: false },
                                { key: "mid-right", clickable: false },
                                { key: "bottom-left", clickable: true },
                                { key: "bottom-center", clickable: true },
                                { key: "bottom-right", clickable: true },
                              ].map((cell) => {
                                if (!cell.clickable) {
                                  return (
                                    <div
                                      key={cell.key}
                                      className="relative flex items-center justify-center border border-dashed border-border/40 bg-muted/10"
                                    />
                                  );
                                }

                                const isActive = position === cell.key;

                                return (
                                  <button
                                    key={cell.key}
                                    type="button"
                                    onClick={() => setPosition(cell.key as typeof position)}
                                    className={`relative flex items-center justify-center border border-dashed border-border/60 bg-muted/20 hover:bg-muted/50 ${
                                      isActive ? "bg-accent/10 border-accent/70" : ""
                                    }`}
                                  >
                                    {isActive && <span className="h-3 w-3 rounded-full bg-accent" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label>Font size</Label>
                              <span className="text-xs text-muted-foreground">{fontSize[0]} pt</span>
                            </div>
                            <Slider value={fontSize} onValueChange={setFontSize} min={8} max={24} step={1} />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label>Margin from edge</Label>
                              <span className="text-xs text-muted-foreground">{margin[0]} px</span>
                            </div>
                            <Slider value={margin} onValueChange={setMargin} min={8} max={64} step={4} />
                          </div>
                          <div className="space-y-2">
                            <Label>Text format</Label>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2">
                                <Select
                                  value={fontFamily}
                                  onValueChange={(value) =>
                                    setFontFamily(value as "helvetica" | "times" | "courier")
                                  }
                                >
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
                              <div className="flex items-center gap-1.5">
                                {[
                                  "#000000",
                                  "#4b5563",
                                  "#1d4ed8",
                                  "#b91c1c",
                                ].map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`h-5 w-5 rounded-full border transition-colors ${
                                      color === c
                                        ? "border-accent ring-2 ring-accent/40"
                                        : "border-border hover:border-accent/60 hover:bg-muted/40"
                                    }`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setIsBold((prev) => !prev)}
                                  className={`h-7 min-w-[2rem] rounded-md border px-2 py-1 font-semibold tracking-wide transition-colors ${
                                    isBold
                                      ? "border-accent bg-accent/10 text-white shadow-sm"
                                      : "border-border bg-background text-muted-foreground hover:border-accent/60 hover:bg-muted/40"
                                  }`}
                                >
                                  B
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsItalic((prev) => !prev)}
                                  className={`h-7 min-w-[2rem] rounded-md border px-2 py-1 italic transition-colors ${
                                    isItalic
                                      ? "border-accent bg-accent/10 text-white shadow-sm"
                                      : "border-border bg-background text-muted-foreground hover:border-accent/60 hover:bg-muted/40"
                                  }`}
                                >
                                  I
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsUnderline((prev) => !prev)}
                                  className={`h-7 min-w-[2rem] rounded-md border px-2 py-1 underline transition-colors ${
                                    isUnderline
                                      ? "border-accent bg-accent/10 text-white shadow-sm"
                                      : "border-border bg-background text-muted-foreground hover:border-accent/60 hover:bg-muted/40"
                                  }`}
                                >
                                  U
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sticky footer buttons */}
                    <div className="border-t border-border bg-card/95 px-6 py-4 flex flex-col items-center gap-3 sticky bottom-0">
                      <Button
                        size="lg"
                        className="btn-hero w-full bg-accent text-accent-foreground hover:bg-accent/90"
                        onClick={handleProcess}
                        disabled={isProcessing || !allReady}
                      >
                        Apply page numbers
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" onClick={handleReset} className="text-xs">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Start over
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )
        )}

        {isComplete && (
          <div className="text-center py-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
              <ListOrdered className="h-10 w-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Page Numbers Added!</h2>
            <p className="text-muted-foreground mb-8">
              Your PDF now includes page numbers according to your settings.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="btn-hero bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => {
                  if (!downloadUrl) return;
                  const link = document.createElement("a");
                  link.href = downloadUrl;
                  const baseName = (files[0]?.name || "document").replace(/\.pdf$/i, "");
                  link.download = `${baseName}-numbered.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                disabled={!downloadUrl}
              >
                <Download className="h-5 w-5 mr-2" />
                Download Updated PDF
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Add numbers to another PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
