import { useState, useEffect, useRef, type PointerEvent } from "react";
import { PanelsTopLeft, ArrowRight, RotateCcw, Download, RotateCw, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";
import { PdfPageThumbnail } from "@/components/PdfPageThumbnail";
import { ToolProcessingState } from "@/components/ToolProcessingState";
import { xhrUploadForBlob, XhrUploadError } from "@/lib/xhrUpload";

type OrganizedPage = {
  id: string;
  type: "page" | "blank";
  originalIndex?: number; // 0-based index in original PDF for real pages
  rotation: 0 | 90 | 180 | 270;
};

export default function OrganizePDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [pages, setPages] = useState<OrganizedPage[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragCandidateRef = useRef<{ id: string; startX: number; startY: number } | null>(null);
  const uploadRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);

  const activeFile = files[0]?.file as File | undefined;
  const allReady = files.length === 1 && files[0].status === "complete";

  // Detect page count and initialize pages list once file upload is complete
  useEffect(() => {
    const detectPages = async () => {
      if (!activeFile || !allReady) {
        setPageCount(null);
        setPages([]);
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

        if (count) {
          const nextPages: OrganizedPage[] = Array.from({ length: count }, (_, index) => ({
            id: `page-${index + 1}`,
            type: "page",
            originalIndex: index,
            rotation: 0,
          }));
          setPages(nextPages);
        }
      } catch (err) {
        console.error("Error detecting pages for OrganizePDF", err);
        setPageCount(null);
        setPages([]);
      }
    };

    void detectPages();
  }, [activeFile, allReady]);

  const handleProcess = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    if (!allReady || !activeFile || pages.length === 0) return;

    setIsProcessing(true);
    setIsComplete(false);
    setError(null);
    setProgress(8);

    const payload = pages.map((p) => ({
      type: p.type,
      originalIndex: p.originalIndex ?? null,
      rotation: p.rotation,
    }));

    const formData = new FormData();
    formData.append("file", activeFile, activeFile.name ?? "document.pdf");
    formData.append("pages", JSON.stringify(payload));

    try {
      const { blob } = await xhrUploadForBlob({
        url: `${apiBase}/organize-pdf`,
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
      console.error("Error organizing PDF", err);
      if (err instanceof XhrUploadError) {
        setError(err.message);
      } else {
        setError("Something went wrong while organizing your PDF. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setIsComplete(false);
    setError(null);
    setPageCount(null);
    setPages([]);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setUploadKey((prev) => prev + 1);
    setProgress(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Scroll to upload area when a file is selected (similar to Add Page Numbers)
  useEffect(() => {
    if (files.length > 0 && uploadRef.current) {
      const rect = uploadRef.current.getBoundingClientRect();
      const offset = window.scrollY + rect.top + 140;
      window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
    }
  }, [files.length]);

  // After upload + page detection is fully ready, ensure preview is in view
  useEffect(() => {
    if (allReady && previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      const offset = window.scrollY + rect.top + 20;
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

  const endDrag = () => {
    setDraggingId(null);
    setDragOverId(null);
    dragCandidateRef.current = null;
  };

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    setPages((current) => {
      const fromIndex = current.findIndex((p) => p.id === draggingId);
      const toIndex = current.findIndex((p) => p.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return current;
      const updated = [...current];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>, id: string) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragCandidateRef.current = { id, startX: e.clientX, startY: e.clientY };
    setDragOverId(null);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const candidate = dragCandidateRef.current;
    if (!candidate) return;

    const dx = Math.abs(e.clientX - candidate.startX);
    const dy = Math.abs(e.clientY - candidate.startY);

    if (!draggingId && dx + dy >= 6) {
      setDraggingId(candidate.id);
    }

    if (!draggingId) return;

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const target = el?.closest("[data-page-id]") as HTMLElement | null;
    const targetId = target?.getAttribute("data-page-id") || null;
    if (targetId && targetId !== draggingId) {
      setDragOverId(targetId);
    }
  };

  const handlePointerUp = () => {
    if (draggingId && dragOverId && draggingId !== dragOverId) {
      handleDrop(dragOverId);
    }
    endDrag();
  };

  const rotatePage = (id: string) => {
    setPages((current) =>
      current.map((p) =>
        p.id === id
          ? {
              ...p,
              rotation: (((p.rotation + 90) % 360) as 0 | 90 | 180 | 270),
            }
          : p
      )
    );
  };

  const removePage = (id: string) => {
    setPages((current) => current.filter((p) => p.id !== id));
  };

  const addBlankAfter = (index: number) => {
    setPages((current) => {
      const newPage: OrganizedPage = {
        id: `blank-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: "blank",
        rotation: 0,
      };
      const updated = [...current];
      updated.splice(index + 1, 0, newPage);
      return updated;
    });
  };

  const renderPagePreview = (page: OrganizedPage, index: number, hasRightNeighbor: boolean) => {
    const isBlank = page.type === "blank";
    const orderLabel = isBlank
      ? "-"
      : page.originalIndex != null
      ? page.originalIndex + 1
      : index + 1;
    // Roughly treat every 5th item as end-of-row (matches lg:grid-cols-5 layout)
    const isEndOfRow = (index + 1) % 5 === 0;
    const showAddBlankBetween = hasRightNeighbor && !isEndOfRow;
    const showAddBlankAtRowEnd = isEndOfRow || !hasRightNeighbor;

    return (
      <div
        key={page.id}
        data-page-id={page.id}
        className={`relative rounded-xl border bg-card/80 p-2 flex flex-col items-center cursor-move transition-shadow hover:shadow-md ${
          draggingId === page.id ? "ring-2 ring-primary/70" : dragOverId === page.id ? "ring-2 ring-primary/40" : ""
        }`}
        onPointerDown={(e) => handlePointerDown(e, page.id)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: draggingId ? "none" : "manipulation" }}
      >
        <div className="w-32 h-auto relative flex items-center justify-center bg-muted/40 rounded-md overflow-hidden">
          {isBlank ? (
            <div className="flex h-44 w-full items-center justify-center bg-white text-xs text-muted-foreground border border-border rounded-md">
              Blank page
            </div>
          ) : (
            activeFile && page.originalIndex != null && (
              <div
                className="w-full"
                style={{ transform: `rotate(${page.rotation}deg)`, transition: "transform 150ms ease" }}
              >
                <PdfPageThumbnail file={activeFile} pageNumber={page.originalIndex + 1} />
              </div>
            )
          )}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">{orderLabel}</p>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            className="h-7 w-7 rounded-full border border-border bg-background flex items-center justify-center hover:border-primary hover:bg-primary/5"
            onClick={() => rotatePage(page.id)}
            onPointerDown={(e) => e.stopPropagation()}
            title="Rotate 90°"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="h-7 w-7 rounded-full border border-border bg-background flex items-center justify-center hover:border-destructive hover:bg-destructive/10"
            onClick={() => removePage(page.id)}
            onPointerDown={(e) => e.stopPropagation()}
            title="Remove page"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {showAddBlankBetween && (
          <div className="absolute inset-y-0 right-0 flex items-center justify-center pointer-events-none z-20">
            <button
              type="button"
              className="group relative pointer-events-auto h-8 w-8 rounded-full border-2 border-primary bg-background flex items-center justify-center shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary translate-x-[70%]"
              onClick={() => addBlankAfter(index)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                Add a blank page
              </span>
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}

        {showAddBlankAtRowEnd && (
          <div className="hidden lg:flex absolute inset-y-0 right-0 items-center justify-center pointer-events-none z-20">
            <button
              type="button"
              className="group relative pointer-events-auto h-8 w-8 rounded-full border-2 border-primary bg-background flex items-center justify-center shadow-sm hover:bg-primary hover:text-primary-foreground hover:border-primary translate-x-[30%]"
              onClick={() => addBlankAfter(index)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                Add a blank page
              </span>
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <ToolPageLayout
      title="Organize PDF"
      description="Reorder pages, rotate, remove, or insert blanks to prepare your PDF."
      icon={PanelsTopLeft}
      iconColor="primary"
    >
      <div className="mx-auto max-w-5xl">
        {!isComplete ? (
          isProcessing ? (
            <ToolProcessingState
              containerRef={loadingRef}
              title="Organizing PDF..."
              progress={progress}
              error={error}
              color="primary"
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
                <div ref={previewRef} className="mt-8 space-y-5">
                  <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold mb-1">Reorder and edit pages</h3>
                      <p className="text-xs text-muted-foreground">
                        Drag pages to reorder, rotate them, remove them, or insert blank pages in between.
                      </p>
                    </div>
                    {typeof pageCount === "number" && (
                      <span className="text-xs text-muted-foreground">{pageCount} pages</span>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-muted/5 p-3 max-h-[34rem] overflow-y-auto overflow-x-hidden scroll-slim">
                    {pages.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-12">
                        Unable to load pages from this PDF.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {pages.map((page, index) =>
                          renderPagePreview(page, index, index < pages.length - 1)
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto px-2">
                    <Button
                      size="lg"
                      className="btn-hero gradient-primary shadow-primary"
                      onClick={handleProcess}
                      disabled={isProcessing || !allReady || pages.length === 0}
                      style={{ width: "100%" }}
                    >
                      Organize PDF
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" onClick={handleReset} className="w-full">
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
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <PanelsTopLeft className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Organization complete</h2>
            <p className="text-muted-foreground mb-8">
              Your PDF has been organized according to your page order and actions.
            </p>
            <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto px-2">
              <Button
                size="lg"
                className="btn-hero gradient-primary shadow-primary"
                onClick={() => {
                  if (!downloadUrl) return;
                  const link = document.createElement("a");
                  link.href = downloadUrl;
                  const baseName = (files[0]?.name || "document").replace(/\.pdf$/i, "");
                  link.download = `${baseName}-organized.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                disabled={!downloadUrl}
                style={{ width: "100%" }}
              >
                <Download className="h-5 w-5 mr-2" />
                Download organized PDF
              </Button>
              <Button variant="outline" onClick={handleReset} className="w-full">
                Organize another PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
