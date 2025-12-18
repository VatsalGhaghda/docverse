import { useState, useEffect, useRef } from "react";
import { Scissors, ArrowRight, RotateCcw, Download, Check, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";
import { PdfPageThumbnail } from "@/components/PdfPageThumbnail";
import { ToolProcessingState } from "@/components/ToolProcessingState";
import { xhrUploadForBlob, XhrUploadError } from "@/lib/xhrUpload";

export default function SplitPDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [splitMode, setSplitMode] = useState("range"); // range | each
  const [rangeMode, setRangeMode] = useState<"custom" | "fixed">("custom");
  const [ranges, setRanges] = useState<{ id: string; from: string; to: string }[]>([
    { id: "r1", from: "1", to: "" },
  ]);
  const [chunkSize, setChunkSize] = useState("4");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pagesExtractMode, setPagesExtractMode] = useState<"all" | "select">("all");
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const uploadRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const completeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // reset split configuration when a new file is selected
    setRangeMode("custom");
    setRanges([{ id: "r1", from: "1", to: "" }]);
    setChunkSize("4");
    setPageCount(null);
    setPagesExtractMode("all");
    setSelectedPages([]);
  }, [uploadKey]);

  const activeFile = files[0]?.file as File | undefined;

  useEffect(() => {
    // lazily determine page count using pdfjs via PdfPageThumbnail's worker (simple approach)
    const detectPages = async () => {
      if (!activeFile) {
        setPageCount(null);
        return;
      }
      try {
        // dynamic import to avoid bundling in non-split contexts
        const pdfjsLib = await import("pdfjs-dist");
        // @ts-ignore - worker configured globally in PdfThumbnail/PdfPageThumbnail
        const arrayBuffer = await activeFile.arrayBuffer();
        const loadingTask = (pdfjsLib as any).getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const count = pdf.numPages || null;
        setPageCount(count);

        // Initialize first range to 1..lastPage when we know page count and ranges are still default
        if (count && ranges.length === 1 && ranges[0].from === "1" && ranges[0].to === "") {
          setRanges([{ id: "r1", from: "1", to: String(count) }]);
        }
      } catch {
        setPageCount(null);
      }
    };

    void detectPages();
  }, [activeFile]);

  const allReady = files.length === 1 && files[0].status === "complete";
  // Auto-scroll to upload area first, then preview/options when the file is ready
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
    // when processing starts, scroll so the loader sits comfortably below the top
    if (isProcessing && !isComplete && loadingRef.current) {
      const rect = loadingRef.current.getBoundingClientRect();
      const offset = window.scrollY + rect.top - 120;
      window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
    }
  }, [isProcessing, isComplete]);

  const handleProcess = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    if (!allReady || !activeFile) return;

    let resolvedPageCount = pageCount;
    if (!resolvedPageCount) {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        // @ts-ignore - worker configured globally in PdfThumbnail/PdfPageThumbnail
        const arrayBuffer = await activeFile.arrayBuffer();
        const loadingTask = (pdfjsLib as any).getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const count = Number(pdf?.numPages);
        resolvedPageCount = Number.isFinite(count) ? count : null;
        setPageCount(resolvedPageCount);
      } catch {
        resolvedPageCount = pageCount;
      }
    }

    const MAX_OUTPUT_PDFS = 50;
    const computeOutputCount = (): number | null => {
      if (splitMode === "half") return 2;

      // For 'each' mode, optionally only selected pages
      if (splitMode === "each") {
        if (pagesExtractMode === "select") {
          return selectedPages.length;
        }
        return typeof resolvedPageCount === "number" ? resolvedPageCount : null;
      }

      // 'range' mode
      if (rangeMode === "fixed") {
        const total = typeof resolvedPageCount === "number" ? resolvedPageCount : null;
        if (!total) return null;
        const chunk = Math.max(1, parseInt(chunkSize || "1", 10) || 1);
        return Math.ceil(total / chunk);
      }

      // custom ranges: count non-empty ranges
      const normalizedRanges = ranges
        .map((r) => {
          const from = parseInt(r.from, 10);
          const to = parseInt(r.to, 10);
          if (Number.isNaN(from) && Number.isNaN(to)) return null;
          return { from: Number.isNaN(from) ? 1 : from, to: Number.isNaN(to) ? from : to };
        })
        .filter(Boolean);

      return normalizedRanges.length;
    };

    const outputCount = computeOutputCount();
    if (typeof outputCount === "number" && outputCount > MAX_OUTPUT_PDFS) {
      setError(
        `This split would generate ${outputCount} PDF files. The limit is ${MAX_OUTPUT_PDFS}. Please increase the chunk size, reduce ranges, or select fewer pages.`
      );
      return;
    }

    setIsProcessing(true);
    setIsComplete(false);
    setError(null);
    setProgress(8);

    const formData = new FormData();
    formData.append("file", activeFile, activeFile.name ?? "document.pdf");

    // Determine effective mode sent to backend
    let effectiveMode = splitMode;
    const usingSelectedPages = splitMode === "each" && pagesExtractMode === "select";
    if (usingSelectedPages) {
      effectiveMode = "range"; // map selected pages to single-page ranges
    }

    formData.append("mode", effectiveMode);

    if (effectiveMode === "range") {
      if (splitMode === "range") {
        formData.append("rangeMode", rangeMode);
        if (rangeMode === "fixed") {
          formData.append("chunkSize", chunkSize || "1");
        } else {
          // Normalize ranges: default blanks, clamp within 1..pageCount, ensure from <= to
          const totalPages = pageCount ?? undefined;
          const normalized = ranges
            .map((r) => {
              let from = parseInt(r.from, 10);
              let to = parseInt(r.to, 10);

              if (Number.isNaN(from)) from = 1;
              if (Number.isNaN(to)) to = totalPages ?? from;

              if (totalPages) {
                from = Math.min(Math.max(1, from), totalPages);
                to = Math.min(Math.max(1, to), totalPages);
              } else {
                from = Math.max(1, from);
                to = Math.max(1, to);
              }

              if (from > to) {
                const tmp = from;
                from = to;
                to = tmp;
              }
              return { from, to };
            })
            .filter((r) => r.from <= r.to);

          formData.append("ranges", JSON.stringify(normalized));
        }
      } else if (usingSelectedPages) {
        // Pages mode with selected pages -> treat as custom single-page ranges
        formData.append("rangeMode", "custom");
        const uniqueSorted = Array.from(new Set(selectedPages)).sort((a, b) => a - b);
        const normalized = uniqueSorted.map((p) => ({ from: p, to: p }));
        formData.append("ranges", JSON.stringify(normalized));
      }
    }

    try {
      const { blob } = await xhrUploadForBlob({
        url: `${apiBase}/split-pdf`,
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
      console.error("Error splitting PDF", err);
      if (err instanceof XhrUploadError) {
        setError(err.message);
      } else {
        setError("Something went wrong while splitting your PDF. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setIsComplete(false);
    setError(null);
    setDownloadUrl(null);
    setRanges([{ id: "r1", from: "1", to: "" }]);
    setChunkSize("4");
    setPageCount(null);
    setProgress(0);
    setSplitMode("range");
    setRangeMode("custom");
    setUploadKey((prev) => prev + 1);
    // Scroll back to top of the page
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addRange = () => {
    setRanges((prev) => {
      const last = prev[prev.length - 1];
      const total = pageCount ?? undefined;

      let lastTo = parseInt(last?.to || "", 10);
      if (Number.isNaN(lastTo)) {
        lastTo = parseInt(last?.from || "1", 10);
      }

      let nextFrom = lastTo + 1;
      let nextTo = total ?? nextFrom;

      if (total) {
        nextFrom = Math.min(Math.max(1, nextFrom), total);
        nextTo = total;
      } else {
        nextFrom = Math.max(1, nextFrom);
        nextTo = Math.max(nextFrom, nextTo);
      }

      return [
        ...prev,
        {
          id: `r${prev.length + 1}`,
          from: String(nextFrom),
          to: String(nextTo),
        },
      ];
    });
  };

  const removeRange = (id: string) => {
    setRanges((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== id);
    });
  };

  const updateChunkSize = (value: string) => {
    setChunkSize((prev) => {
      const total = pageCount ?? undefined;

      if (value === "") return "";

      let n = parseInt(value, 10);
      if (Number.isNaN(n)) return prev;

      if (total) {
        n = Math.min(Math.max(1, n), total);
      } else {
        n = Math.max(1, n);
      }

      return String(n);
    });
  };

  const updateRange = (id: string, field: "from" | "to", value: string) => {
    setRanges((prev) => {
      const total = pageCount ?? undefined;
      return prev.map((r) => {
        if (r.id !== id) return r;

        // Allow empty while typing, otherwise clamp
        if (value === "") {
          return { ...r, [field]: "" } as typeof r;
        }

        let n = parseInt(value, 10);
        if (Number.isNaN(n)) {
          return r;
        }

        if (total) {
          n = Math.min(Math.max(1, n), total);
        } else {
          n = Math.max(1, n);
        }

        return { ...r, [field]: String(n) } as typeof r;
      });
    });
  };

  const normalizedChunkSize = (() => {
    const total = pageCount ?? undefined;

    if (chunkSize === "") return null;

    let n = Number(chunkSize);
    if (Number.isNaN(n)) return null;

    if (total) {
      n = Math.min(Math.max(1, n), total);
    } else {
      n = Math.max(1, n);
    }

    return n;
  })();

  const canSplit = () => {
    if (!allReady) return false;

    if (splitMode === "each") {
      if (pagesExtractMode === "all") return true;
      return selectedPages.length > 0;
    }

    // range mode
    if (rangeMode === "fixed") {
      const n = normalizedChunkSize;
      return n !== null && n > 0;
    }
    const valid = ranges.some((r) => {
      const from = Number(r.from);
      const to = Number(r.to);
      return !Number.isNaN(from) && !Number.isNaN(to) && from <= to;
    });
    return valid;
  };

  return (
    <ToolPageLayout
      title="Split PDF"
      description="Extract pages or split your PDF into multiple files. Select specific pages or split by range."
      icon={Scissors}
      iconColor="secondary"
    >
      <div className="mx-auto max-w-5xl">
        {!isComplete ? (
          isProcessing ? (
            <ToolProcessingState
              containerRef={loadingRef}
              title="Splitting PDF..."
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
                  externalError={error}
                  onFilesChange={setFiles}
                />
              </div>

              {files.length > 0 && (
                <div
                  ref={previewRef}
                  className="mt-8 grid grid-cols-1 lg:grid-cols-[2fr,1.3fr] gap-6 items-start"
                >
                  {/* Left: simple range preview using first/last pages of each range */}
                  <div className="space-y-4">
                    {splitMode === "range" && pageCount && rangeMode === "custom" && (
                      <div className="rounded-xl border border-border bg-card/0 max-h-[28rem] overflow-y-auto scroll-slim p-3 space-y-3">
                        {ranges.map((r, idx) => {
                          const from = Number(r.from) || 1;
                          const to = Number(r.to) || pageCount;
                          return (
                            <div
                              key={r.id}
                              className="rounded-xl border border-border bg-card/60 p-3 flex flex-col gap-2"
                            >
                              <p className="text-sm font-medium mb-1">Range {idx + 1}</p>
                              <div className="flex items-center gap-3">
                                {activeFile && (
                                  <>
                                    <div className="w-24">
                                      <PdfPageThumbnail file={activeFile} pageNumber={from} />
                                      <p className="mt-1 text-xs text-center text-muted-foreground">
                                        Page {from}
                                      </p>
                                    </div>
                                    <span className="text-lg text-muted-foreground">…</span>
                                    <div className="w-24">
                                      <PdfPageThumbnail file={activeFile} pageNumber={to} />
                                      <p className="mt-1 text-xs text-center text-muted-foreground">
                                        Page {to}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Fixed ranges: condensed preview - first few, ellipsis, last few */}
                    {splitMode === "range" && pageCount && rangeMode === "fixed" && activeFile && (
                      <div className="space-y-3">
                        {(() => {
                          const size = normalizedChunkSize || 1;

                          // Build all fixed ranges
                          const allRanges: { start: number; end: number; index: number }[] = [];
                          let idx = 0;
                          while (idx * size < pageCount) {
                            const start = idx * size + 1;
                            const end = Math.min(start + size - 1, pageCount);
                            allRanges.push({ start, end, index: idx });
                            idx++;
                          }

                          const total = allRanges.length;
                          if (total === 0) return null;

                          const headCount = 2;
                          const tailCount = 2;

                          // If few ranges, just show all
                          if (total <= headCount + tailCount) {
                            return allRanges.map((p) => (
                              <div
                                key={p.index}
                                className="rounded-xl border border-border bg-card/60 p-3 flex flex-col gap-2"
                              >
                                <p className="text-sm font-medium mb-1">Range {p.index + 1}</p>
                                <div className="flex items-center gap-3">
                                  <div className="w-24">
                                    <PdfPageThumbnail file={activeFile} pageNumber={p.start} />
                                    <p className="mt-1 text-xs text-center text-muted-foreground">
                                      Page {p.start}
                                    </p>
                                  </div>
                                  <span className="text-lg text-muted-foreground">…</span>
                                  <div className="w-24">
                                    <PdfPageThumbnail file={activeFile} pageNumber={p.end} />
                                    <p className="mt-1 text-xs text-center text-muted-foreground">
                                      Page {p.end}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ));
                          }

                          const head = allRanges.slice(0, headCount);
                          const tail = allRanges.slice(-tailCount);

                          return (
                            <>
                              {head.map((p) => (
                                <div
                                  key={p.index}
                                  className="rounded-xl border border-border bg-card/60 p-3 flex flex-col gap-2"
                                >
                                  <p className="text-sm font-medium mb-1">Range {p.index + 1}</p>
                                  <div className="flex items-center gap-3">
                                    <div className="w-24">
                                      <PdfPageThumbnail file={activeFile} pageNumber={p.start} />
                                      <p className="mt-1 text-xs text-center text-muted-foreground">
                                        Page {p.start}
                                      </p>
                                    </div>
                                    <span className="text-lg text-muted-foreground">…</span>
                                    <div className="w-24">
                                      <PdfPageThumbnail file={activeFile} pageNumber={p.end} />
                                      <p className="mt-1 text-xs text-center text-muted-foreground">
                                        Page {p.end}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}

                              {/* Ellipsis card to indicate skipped middle ranges */}
                              <div className="flex items-center justify-center py-2 text-sm text-muted-foreground">
                                …
                              </div>

                              {tail.map((p) => (
                                <div
                                  key={p.index}
                                  className="rounded-xl border border-border bg-card/60 p-3 flex flex-col gap-2"
                                >
                                  <p className="text-sm font-medium mb-1">Range {p.index + 1}</p>
                                  <div className="flex items-center gap-3">
                                    <div className="w-24">
                                      <PdfPageThumbnail file={activeFile} pageNumber={p.start} />
                                      <p className="mt-1 text-xs text-center text-muted-foreground">
                                        Page {p.start}
                                      </p>
                                    </div>
                                    <span className="text-lg text-muted-foreground">…</span>
                                    <div className="w-24">
                                      <PdfPageThumbnail file={activeFile} pageNumber={p.end} />
                                      <p className="mt-1 text-xs text-center text-muted-foreground">
                                        Page {p.end}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* Each: scrollable grid of page thumbnails with selectable pages */}
                    {splitMode === "each" && pageCount && activeFile && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {pagesExtractMode === "all"
                              ? `All ${pageCount} pages will be split`
                              : selectedPages.length > 0
                              ? `${selectedPages.length} page${selectedPages.length > 1 ? "s" : ""} selected`
                              : "Select pages to extract"}
                          </span>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/10 max-h-80 overflow-y-auto pr-2 scroll-slim">
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-3">
                            {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => {
                              const isSelected =
                                pagesExtractMode === "select" && selectedPages.includes(page);
                              return (
                                <button
                                  key={page}
                                  type="button"
                                  onClick={() => {
                                    if (pagesExtractMode !== "select") return;
                                    setSelectedPages((prev) => {
                                      if (prev.includes(page)) {
                                        return prev.filter((p) => p !== page);
                                      }
                                      return [...prev, page];
                                    });
                                  }}
                                  className={`relative rounded-xl border bg-card/60 p-1 flex flex-col items-center transition-shadow ${
                                    isSelected
                                      ? "border-secondary shadow-sm"
                                      : "border-border hover:border-secondary/60"
                                  }`}
                                >
                                  <div className="w-full">
                                    <PdfPageThumbnail file={activeFile} pageNumber={page} />
                                  </div>
                                  <p className="mt-1 text-[10px] text-center text-muted-foreground">{page}</p>
                                  {pagesExtractMode === "select" && (
                                    <div
                                      className={`absolute top-1 right-1 h-5 w-5 rounded-full border flex items-center justify-center text-[10px] ${
                                        isSelected
                                          ? "bg-secondary text-secondary-foreground border-secondary"
                                          : "bg-background/80 text-muted-foreground border-border"
                                      }`}
                                    >
                                      {isSelected && <Check className="h-3 w-3" />}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: split options panel (iLovePDF-inspired) */}
                  <div className="rounded-xl border border-border bg-card p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Split Options</h3>
                      {pageCount && (
                        <span className="text-xs text-muted-foreground">{pageCount} pages</span>
                      )}
                    </div>

                    <RadioGroup value={splitMode} onValueChange={setSplitMode} className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSplitMode("range")}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${{
                          true: "border-secondary bg-secondary/10",
                          false: "border-border hover:border-secondary/60",
                        }[String(splitMode === "range")]}`}
                      >
                        Range
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitMode("each")}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${{
                          true: "border-secondary bg-secondary/10",
                          false: "border-border hover:border-secondary/60",
                        }[String(splitMode === "each")]}`}
                      >
                        Pages
                      </button>
                    </RadioGroup>

                    {splitMode === "range" && (
                      <div className="space-y-4">
                        <div className="inline-flex rounded-full border bg-background p-1 text-xs">
                          <button
                            type="button"
                            className={`px-3 py-1 rounded-full ${
                              rangeMode === "custom" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"
                            }`}
                            onClick={() => setRangeMode("custom")}
                          >
                            Custom ranges
                          </button>
                          <button
                            type="button"
                            className={`px-3 py-1 rounded-full ${
                              rangeMode === "fixed" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"
                            }`}
                            onClick={() => setRangeMode("fixed")}
                          >
                            Fixed ranges
                          </button>
                        </div>

                        {rangeMode === "custom" ? (
                          <div className="space-y-3">
                            {ranges.map((r, idx) => (
                              <div
                                key={r.id}
                                className="flex items-center gap-1 text-sm sm:gap-2 sm:grid sm:grid-cols-[auto,1fr,1fr,auto] sm:items-center"
                              >
                                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                                  Range {idx + 1}
                                </span>
                                <div className="flex items-center gap-1 flex-1 min-w-0 sm:gap-2 sm:contents">
                                  <div className="flex items-center gap-1 min-w-0 sm:gap-2">
                                    {/* <span className="text-xs text-muted-foreground">from</span> */}
                                    <div className="flex flex-none w-20 sm:w-auto items-stretch rounded-full border bg-background overflow-hidden">
                                      <Input
                                        type="number"
                                        min={1}
                                        max={pageCount ?? undefined}
                                        value={r.from}
                                        onChange={(e) => updateRange(r.id, "from", e.target.value)}
                                        className="h-8 w-full sm:w-20 border-0 focus-visible:ring-0 rounded-none text-right pr-1 sm:pr-2 no-native-spinner"
                                      />
                                      <div className="flex flex-col border-l bg-muted/60">
                                        <button
                                          type="button"
                                          className="flex-1 px-0.5 sm:px-1 flex items-center justify-center hover:bg-muted"
                                          onClick={() => {
                                            const current = parseInt(r.from || "1", 10) || 1;
                                            updateRange(r.id, "from", String(current + 1));
                                          }}
                                        >
                                          <ChevronUp className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          className="flex-1 px-0.5 sm:px-1 flex items-center justify-center hover:bg-muted"
                                          onClick={() => {
                                            const current = parseInt(r.from || "1", 10) || 1;
                                            updateRange(r.id, "from", String(current - 1));
                                          }}
                                        >
                                          <ChevronDown className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 min-w-0 sm:gap-2">
                                    <span className="text-xs text-muted-foreground">to</span>
                                    <div className="flex flex-none w-20 sm:w-auto items-stretch rounded-full border bg-background overflow-hidden">
                                      <Input
                                        type="number"
                                        min={1}
                                        max={pageCount ?? undefined}
                                        value={r.to}
                                        onChange={(e) => updateRange(r.id, "to", e.target.value)}
                                        className="h-8 w-full sm:w-20 border-0 focus-visible:ring-0 rounded-none text-right pr-1 sm:pr-2 no-native-spinner"
                                      />
                                      <div className="flex flex-col border-l bg-muted/60">
                                        <button
                                          type="button"
                                          className="flex-1 px-0.5 sm:px-1 flex items-center justify-center hover:bg-muted"
                                          onClick={() => {
                                            const current = parseInt(r.to || "1", 10) || 1;
                                            updateRange(r.id, "to", String(current + 1));
                                          }}
                                        >
                                          <ChevronUp className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          className="flex-1 px-0.5 sm:px-1 flex items-center justify-center hover:bg-muted"
                                          onClick={() => {
                                            const current = parseInt(r.to || "1", 10) || 1;
                                            updateRange(r.id, "to", String(current - 1));
                                          }}
                                        >
                                          <ChevronDown className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-destructive/70 hover:text-destructive transition"
                                    onClick={() => removeRange(r.id)}
                                    disabled={ranges.length <= 1}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addRange} className="mt-1 w-full sm:w-auto">
                              + Add range
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span>Split into page ranges of</span>
                              <div className="inline-flex items-stretch rounded-full border bg-background overflow-hidden">
                                <Input
                                  type="number"
                                  min={1}
                                  max={pageCount ?? undefined}
                                  value={chunkSize}
                                  onChange={(e) => updateChunkSize(e.target.value)}
                                  className="h-8 w-20 border-0 focus-visible:ring-0 rounded-none text-right pr-2 no-native-spinner"
                                />
                                <div className="flex flex-col border-l bg-muted/60">
                                  <button
                                    type="button"
                                    className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                    onClick={() => {
                                      const next = String((normalizedChunkSize ?? 1) + 1);
                                      updateChunkSize(next);
                                    }}
                                  >
                                    <ChevronUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                    onClick={() => {
                                      const current = normalizedChunkSize ?? 1;
                                      const next = String(current - 1);
                                      updateChunkSize(next);
                                    }}
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <span>pages</span>
                            </div>
                            {pageCount && normalizedChunkSize && (
                              <p className="text-xs text-muted-foreground">
                                This PDF will be split into files of {normalizedChunkSize} pages. Approximately
                                {" "}
                                {Math.ceil(pageCount / normalizedChunkSize)} PDFs will be created.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {splitMode === "each" && (
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="inline-flex rounded-full border bg-background p-1 text-xs">
                          <button
                            type="button"
                            className={`px-3 py-1 rounded-full ${
                              pagesExtractMode === "all"
                                ? "bg-secondary text-secondary-foreground"
                                : "text-muted-foreground"
                            }`}
                            onClick={() => setPagesExtractMode("all")}
                          >
                            Extract all pages
                          </button>
                          <button
                            type="button"
                            className={`px-3 py-1 rounded-full ${
                              pagesExtractMode === "select"
                                ? "bg-secondary text-secondary-foreground"
                                : "text-muted-foreground"
                            }`}
                            onClick={() => setPagesExtractMode("select")}
                          >
                            Select pages
                          </button>
                        </div>

                        <p>
                          {pagesExtractMode === "all" && pageCount && (
                            <>
                              Each page will be exported as a separate PDF file (<span className="font-semibold">
                                {pageCount}
                              </span>{" "}
                              PDFs will be created).
                            </>
                          )}
                          {pagesExtractMode === "all" && !pageCount &&
                            "Each page will be exported as a separate PDF file."}
                          {pagesExtractMode === "select" && (
                            <>
                              Selected pages will be exported as separate PDF files.
                              {selectedPages.length > 0 && (
                                <>
                                  {" "}(<span className="font-semibold">{selectedPages.length}</span>{" "}
                                  PDF{selectedPages.length > 1 ? "s" : ""} will be created).
                                </>
                              )}
                            </>
                          )}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col items-center gap-4 pt-2 w-full max-w-sm mx-auto px-2">
                      <Button
                        size="lg"
                        className="btn-hero gradient-secondary"
                        onClick={handleProcess}
                        disabled={isProcessing || !canSplit()}
                        style={{ width: "100%" }}
                      >
                        Split PDF
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" onClick={handleReset} className="w-full">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Start over
                      </Button>
                    </div>

                    {error && (
                      <p className="mt-2 text-sm text-destructive text-center px-2">{error}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          <div ref={completeRef} className="text-center py-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10">
              <Scissors className="h-10 w-10 text-secondary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Split Complete!</h2>
            <p className="text-muted-foreground mb-8">
              Your PDF has been split into multiple files.
            </p>
            <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto px-2">
              <Button
                size="lg"
                className="btn-hero gradient-secondary"
                onClick={() => {
                  if (!downloadUrl) return;
                  const link = document.createElement("a");
                  link.href = downloadUrl;
                  link.download = "split-pages.zip";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                disabled={!downloadUrl}
                style={{ width: "100%" }}
              >
                <Download className="h-5 w-5 mr-2" />
                Download All Files
              </Button>
              <Button variant="outline" onClick={handleReset} className="w-full">
                Split another PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
