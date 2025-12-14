import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  FileSignature,
  ArrowRight,
  RotateCcw,
  Download,
  Pencil,
  Type,
  Upload,
  Copy,
  X,
  ChevronUp,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";
import { PdfPageThumbnail } from "@/components/PdfPageThumbnail";

export default function SignPDF() {
  type FieldId = "signature";
  type PageScope = "this" | "all" | "allButLast" | "last" | "custom";
  type FieldMode = "draw" | "type" | "upload";

  type SignatureVariant = {
    id: string;
    mode: FieldMode;
    typed?: string;
    imageBlob: Blob;
    imagePreviewUrl: string;
  };

  type Placement = {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  type PlacementEntry = Placement & {
    id: string;
    pageIndex: number;
    variantId: string;
  };

  type FieldState = {
    id: FieldId;
    label: string;
    required: boolean;
    enabled: boolean;
    mode: FieldMode;
    typed: string;
    imageBlob: Blob | null;
    imagePreviewUrl: string | null;
    variants: SignatureVariant[];
    drawVariantId: string | null;
    pageScope: PageScope;
    customPages: string;
    customRanges: { id: string; from: string; to: string }[];
    placements: PlacementEntry[];
  };

  const [files, setFiles] = useState<any[]>([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<FieldId>("signature");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const [textFontFamily, setTextFontFamily] = useState<"helvetica" | "times" | "courier">("helvetica");
  const [textColor, setTextColor] = useState("#000000");
  const uploadRef = useRef<HTMLDivElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const optionsPanelRef = useRef<HTMLDivElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawStateRef = useRef<{ drawing: boolean; activePointerId: number | null }>({ drawing: false, activePointerId: null });
  const uploadImageRef = useRef<HTMLInputElement | null>(null);

  const [dragPaletteFieldId, setDragPaletteFieldId] = useState<FieldId | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);

  const activeFile = files[0]?.file as File | undefined;
  const allReady = files.length === 1 && files[0].status === "complete";

  const defaultPlacement = useMemo<Placement>(() => ({ x: 0.18, y: 0.18, width: 0.18, height: 0.08 }), []);

  const createPlacementId = () => Math.random().toString(36).slice(2, 10);
  const createVariantId = () => Math.random().toString(36).slice(2, 10);
  const createRangeId = () => `r${Math.random().toString(36).slice(2, 8)}`;

  const [fields, setFields] = useState<FieldState[]>([
    {
      id: "signature",
      label: "Signature",
      required: true,
      enabled: true,
      mode: "draw",
      typed: "",
      imageBlob: null,
      imagePreviewUrl: null,
      variants: [],
      drawVariantId: null,
      pageScope: "this",
      customPages: "",
      customRanges: [{ id: "r1", from: "1", to: "" }],
      placements: [],
    },
  ]);

  const selectedField = fields.find((f) => f.id === selectedFieldId) || fields[0];

  const canSign = useMemo(() => {
    if (!allReady || !activeFile) return false;
    const signature = fields.find((f) => f.id === "signature");
    if (!signature?.imageBlob) return false;
    if (!signature.placements || signature.placements.length === 0) return false;
    return true;
  }, [activeFile, allReady, fields]);

  const setField = (id: FieldId, patch: Partial<FieldState>) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        return { ...f, ...patch };
      })
    );
  };

  const addOrUpdateVariant = (fieldId: FieldId, variant: SignatureVariant) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const existing = f.variants.find((v) => v.id === variant.id);
        if (existing?.imagePreviewUrl && existing.imagePreviewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(existing.imagePreviewUrl);
        }
        const nextVariants = existing
          ? f.variants.map((v) => (v.id === variant.id ? variant : v))
          : [...f.variants, variant];
        return { ...f, variants: nextVariants };
      })
    );
  };

  const removeVariant = (fieldId: FieldId, variantId: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const toRemove = f.variants.find((v) => v.id === variantId) || null;
        if (toRemove?.imagePreviewUrl && toRemove.imagePreviewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(toRemove.imagePreviewUrl);
        }

        const nextVariants = f.variants.filter((v) => v.id !== variantId);
        const nextPlacements = f.placements.filter((p) => p.variantId !== variantId);
        const nextDrawVariantId = f.drawVariantId === variantId ? null : f.drawVariantId;

        let nextImageBlob = f.imageBlob;
        let nextImagePreviewUrl = f.imagePreviewUrl;

        if (toRemove && f.imagePreviewUrl === toRemove.imagePreviewUrl) {
          const fallback = nextVariants[nextVariants.length - 1];
          if (fallback) {
            nextImageBlob = fallback.imageBlob;
            nextImagePreviewUrl = fallback.imagePreviewUrl;
          } else {
            if (nextImagePreviewUrl && nextImagePreviewUrl.startsWith("blob:")) {
              URL.revokeObjectURL(nextImagePreviewUrl);
            }
            nextImageBlob = null;
            nextImagePreviewUrl = null;
          }
        }

        if (nextVariants.length === 0) {
          nextImageBlob = null;
          nextImagePreviewUrl = null;
        }

        return {
          ...f,
          variants: nextVariants,
          placements: nextPlacements,
          drawVariantId: nextDrawVariantId,
          imageBlob: nextImageBlob,
          imagePreviewUrl: nextImagePreviewUrl,
        };
      })
    );
  };

  const beginPaletteDrag = (
    id: FieldId,
    variantId: string,
    clientX: number,
    clientY: number,
    mode: "clone" | "move" = "clone",
    sourcePlacementId?: string
  ) => {
    const variantPreviewUrl =
      fields.find((f) => f.id === id)?.variants.find((v) => v.id === variantId)?.imagePreviewUrl ?? null;

    setDragPaletteFieldId(id);
    setDragPos({ x: clientX, y: clientY });

    const resolveAspectRatio = async (src: string): Promise<number | null> => {
      try {
        const aspect = await new Promise<number>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            if (!w || !h) reject(new Error("Invalid image dimensions"));
            else resolve(w / h);
          };
          img.onerror = () => reject(new Error("Failed to load image"));
          img.src = src;
        });
        if (!Number.isFinite(aspect) || aspect <= 0) return null;
        return aspect;
      } catch {
        return null;
      }
    };

    const onMove = (e: MouseEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY });
    };

    const onUp = async (e: MouseEvent) => {
      setDragPaletteFieldId(null);
      setDragPos(null);
      const currentMode = mode;
      const sourceId = sourcePlacementId;

      if (stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect();
        const { clientX, clientY } = e;
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
          const relX = (clientX - rect.left) / rect.width;
          const relY = (clientY - rect.top) / rect.height;
          let boxWidth = defaultPlacement.width;
          let boxHeight = defaultPlacement.height;

          if (variantPreviewUrl) {
            const aspect = await resolveAspectRatio(variantPreviewUrl);
            if (aspect) {
              // Keep visual proportions of the source image so typed signatures don't look squashed.
              boxHeight = boxWidth / aspect;
              boxHeight = Math.min(0.24, Math.max(0.04, boxHeight));
            }
          }
          const x = relX - boxWidth / 2;
          const y = relY - boxHeight / 2;

          if (currentMode === "move" && sourceId) {
            // Move existing placement to new page/position
            setFields((prev) =>
              prev.map((f) => {
                if (f.id !== id) return f;
                return {
                  ...f,
                  placements: f.placements.map((p) =>
                    p.id === sourceId
                      ? {
                          ...p,
                          pageIndex: activePageIndex,
                          x,
                          y,
                        }
                      : p
                  ),
                };
              })
            );
          } else {
            // Clone: add a new placement entry
            const newEntry: PlacementEntry = {
              id: createPlacementId(),
              pageIndex: activePageIndex,
              x,
              y,
              width: boxWidth,
              height: boxHeight,
              variantId,
            };
            setFields((prev) =>
              prev.map((f) => {
                if (f.id !== id) return f;
                return {
                  ...f,
                  placements: [...f.placements, newEntry],
                };
              })
            );
            setSelectedFieldId(id);
          }
        }
      }

      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const removePlacement = (fieldId: FieldId, placementId: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        return {
          ...f,
          placements: f.placements.filter((p) => p.id !== placementId),
        };
      })
    );
  };

  const setFieldImage = (id: FieldId, blob: Blob | null, previewUrl: string | null) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        if (f.imagePreviewUrl && f.imagePreviewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(f.imagePreviewUrl);
        }
        return { ...f, imageBlob: blob, imagePreviewUrl: previewUrl };
      })
    );
  };

  const revokeFieldVariantUrls = (field: FieldState) => {
    for (const v of field.variants) {
      if (v.imagePreviewUrl && v.imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(v.imagePreviewUrl);
      }
    }
  };

  const normalizeRangesToString = (ranges: { from: string; to: string }[], totalPages?: number | null) => {
    const parts: string[] = [];
    for (const r of ranges) {
      let from = parseInt(r.from, 10);
      let to = parseInt(r.to, 10);
      if (Number.isNaN(from)) continue;
      if (Number.isNaN(to)) {
        if (typeof totalPages === "number" && Number.isFinite(totalPages)) {
          to = totalPages;
        } else {
          to = from;
        }
      }

      if (typeof totalPages === "number" && Number.isFinite(totalPages)) {
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

      if (from === to) {
        parts.push(String(from));
      } else {
        parts.push(`${from}-${to}`);
      }
    }
    return parts.join(",");
  };

  const addCustomRange = (fieldId: FieldId) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const last = f.customRanges[f.customRanges.length - 1];
        const total = pageCount ?? undefined;
        let lastTo = parseInt(last?.to || "", 10);
        if (Number.isNaN(lastTo)) lastTo = parseInt(last?.from || "1", 10) || 1;
        let nextFrom = lastTo + 1;
        let nextTo = total ?? nextFrom;
        if (total) {
          nextFrom = Math.min(Math.max(1, nextFrom), total);
          nextTo = total;
        } else {
          nextFrom = Math.max(1, nextFrom);
          nextTo = Math.max(nextFrom, nextTo);
        }
        return {
          ...f,
          customRanges: [...f.customRanges, { id: createRangeId(), from: String(nextFrom), to: String(nextTo) }],
        };
      })
    );
  };

  const removeCustomRange = (fieldId: FieldId, rangeId: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        if (f.customRanges.length <= 1) return f;
        return { ...f, customRanges: f.customRanges.filter((r) => r.id !== rangeId) };
      })
    );
  };

  const updateCustomRange = (fieldId: FieldId, rangeId: string, key: "from" | "to", value: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const total = pageCount ?? undefined;
        return {
          ...f,
          customRanges: f.customRanges.map((r) => {
            if (r.id !== rangeId) return r;
            if (value === "") return { ...r, [key]: "" };
            let n = parseInt(value, 10);
            if (Number.isNaN(n)) return r;
            if (total) {
              n = Math.min(Math.max(1, n), total);
            } else {
              n = Math.max(1, n);
            }
            return { ...r, [key]: String(n) };
          }),
        };
      })
    );
  };

  const updatePlacement = (fieldId: FieldId, placementId: string, next: Partial<Placement>) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        return {
          ...f,
          placements: f.placements.map((p) => {
            if (p.id !== placementId) return p;
            const merged: Placement = {
              x: p.x,
              y: p.y,
              width: p.width,
              height: p.height,
              ...next,
            };
            const clamped: Placement = {
              x: Math.min(1, Math.max(0, merged.x)),
              y: Math.min(1, Math.max(0, merged.y)),
              width: Math.min(1, Math.max(0.03, merged.width)),
              height: Math.min(1, Math.max(0.03, merged.height)),
            };
            clamped.x = Math.min(1 - clamped.width, Math.max(0, clamped.x));
            clamped.y = Math.min(1 - clamped.height, Math.max(0, clamped.y));
            return { ...p, ...clamped };
          }),
        };
      })
    );
  };

  const renderTypedToPng = async (
    text: string,
    opts?: { fontFamily: "helvetica" | "times" | "courier"; color: string }
  ): Promise<{ blob: Blob; preview: string } | null> => {
    const value = (text || "").trim();
    if (!value) return null;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    canvas.width = 1000;
    canvas.height = 320;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const family = opts?.fontFamily ?? "helvetica";
    const color = opts?.color || "#111111";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let fontSize = 140;
    while (fontSize > 48) {
      const cssFamily =
        family === "times"
          ? "'Times New Roman', Times, serif"
          : family === "courier"
          ? "'Courier New', Courier, monospace"
          : "Helvetica, Arial, sans-serif";
      ctx.font = `${fontSize}px ${cssFamily}`;
      const metrics = ctx.measureText(value);
      if (metrics.width <= canvas.width - 80) break;
      fontSize -= 6;
    }
    ctx.fillText(value, canvas.width / 2, canvas.height / 2);

    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = image.data;
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const a = data[(y * canvas.width + x) * 4 + 3];
        if (a > 0) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < 0 || maxY < 0) return null;

    const padding = 18;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(canvas.width - 1, maxX + padding);
    maxY = Math.min(canvas.height - 1, maxY + padding);
    const w = Math.max(1, maxX - minX + 1);
    const h = Math.max(1, maxY - minY + 1);

    const out = document.createElement("canvas");
    const outCtx = out.getContext("2d");
    if (!outCtx) return null;
    out.width = w;
    out.height = h;
    outCtx.clearRect(0, 0, w, h);
    outCtx.drawImage(canvas, minX, minY, w, h, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) => out.toBlob(resolve, "image/png"));
    if (!blob) return null;
    const preview = out.toDataURL("image/png");
    return { blob, preview };
  };

  const clearCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    setActivePageIndex(0);
  }, [uploadKey]);

  useEffect(() => {
    if (!pageCount) return;
    setFields((prev) =>
      prev.map((f) => {
        if (f.customRanges.length === 1 && f.customRanges[0].from === "1" && f.customRanges[0].to === "") {
          return { ...f, customRanges: [{ id: "r1", from: "1", to: String(pageCount) }] };
        }
        return f;
      })
    );
  }, [pageCount]);

  useEffect(() => {
    const detectPages = async () => {
      if (!activeFile || !allReady) {
        setPageCount(null);
        return;
      }
      try {
        const pdfjsLib = await import("pdfjs-dist");
        // @ts-ignore worker configured globally in PdfPageThumbnail
        const arrayBuffer = await activeFile.arrayBuffer();
        const loadingTask = (pdfjsLib as any).getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const count = pdf.numPages || null;
        setPageCount(count);
      } catch {
        setPageCount(null);
      }
    };
    void detectPages();
  }, [activeFile, allReady]);

  // No automatic cloning of placements across pages; user controls where to place via drag.

  // Step 1: when a file is selected, scroll to the upload area (showing progress bar)
  useEffect(() => {
    if (!files.length || !uploadRef.current) return;
    const rect = uploadRef.current.getBoundingClientRect();
    const offset = window.scrollY + rect.top + 50;
    window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
  }, [files.length]);

  useEffect(() => {
    if (isProcessing && !isComplete && loadingRef.current) {
      const rect = loadingRef.current.getBoundingClientRect();
      const offset = window.scrollY + rect.top - 160;
      window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
    }
  }, [isProcessing, isComplete]);

  // Step 2: once file is fully uploaded/processed by the upload widget (allReady), scroll to preview/sections
  useEffect(() => {
    if (!allReady || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const offset = window.scrollY + rect.top - 80;
    window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
  }, [allReady]);

  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.style.touchAction = "none";
    canvas.style.userSelect = "none";
    canvas.style.backgroundColor = "transparent";
    canvas.style.cursor = "crosshair";

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const w = Math.max(320, Math.floor(rect.width || canvas.clientWidth || 0));
      const h = Math.max(170, Math.floor(rect.height || canvas.clientHeight || 170));

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);
    };

    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [selectedField.enabled, selectedField.id, selectedField.mode]);

  const ensureDrawCanvasSize = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(170, Math.floor(rect.height || 170));
    const dpr = window.devicePixelRatio || 1;
    const nextW = Math.floor(w * dpr);
    const nextH = Math.floor(h * dpr);
    if (canvas.width === nextW && canvas.height === nextH) return;
    canvas.width = nextW;
    canvas.height = nextH;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
  };

  const prepareDrawContext = (ctx: CanvasRenderingContext2D) => {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
  };

  const getDrawPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getDrawPointFromClient = (clientX: number, clientY: number) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const finishDrawStroke = async () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;

    const state = drawStateRef.current;
    if (!state.drawing) return;
    state.drawing = false;
    state.activePointerId = null;

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    const preview = canvas.toDataURL("image/png");

    setFieldImage(selectedField.id, blob, preview);

    const fieldId = selectedField.id;
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== fieldId) return f;
        const variantId = f.drawVariantId || createVariantId();
        const existing = f.variants.find((v) => v.id === variantId);
        if (existing?.imagePreviewUrl && existing.imagePreviewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(existing.imagePreviewUrl);
        }
        const nextVariant: SignatureVariant = {
          id: variantId,
          mode: "draw",
          imageBlob: blob,
          imagePreviewUrl: preview,
        };
        const nextVariants = existing
          ? f.variants.map((v) => (v.id === variantId ? nextVariant : v))
          : [...f.variants, nextVariant];
        return { ...f, drawVariantId: variantId, variants: nextVariants };
      })
    );
  };

  const handleProcess = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
    if (!allReady || !activeFile) return;
    if (!canSign) {
      setError("Please add your signature and place it on the document before signing.");
      return;
    }

    setIsProcessing(true);
    setIsComplete(false);
    setError(null);
    setProgress(8);

    const payloadFields = fields
      .filter((f) => f.enabled)
      .map((f) => {
        const placements = (f.placements || []).map((p) => ({
          pageIndex: p.pageIndex,
          x: p.x,
          y: p.y,
          width: p.width,
          height: p.height,
          variantId: p.variantId,
        }));

        return {
          id: f.id,
          type: "signature",
          pageScope: f.pageScope,
          customPageRange:
            f.pageScope === "custom" ? normalizeRangesToString(f.customRanges, pageCount) : f.customPages,
          activePageIndex,
          placements,
        };
      });

    const formData = new FormData();
    formData.append("file", activeFile, activeFile.name ?? "document.pdf");
    formData.append("fields", JSON.stringify(payloadFields));

    for (const f of fields) {
      if (!f.enabled) continue;
      for (const v of f.variants) {
        const type = v.imageBlob.type || "image/png";
        const ext = type.includes("jpeg") || type.includes("jpg") ? "jpg" : "png";
        const fileObj = new File([v.imageBlob], `${f.id}-${v.id}.${ext}`, { type });
        formData.append(`variantImage_${f.id}_${v.id}`, fileObj);
      }
    }

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${apiBase}/sign-pdf`);
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
            return;
          }

          (async () => {
            try {
              const errBlob = xhr.response as Blob;
              const text = await errBlob.text();
              const data = JSON.parse(text);
              if (data && typeof data.message === "string") {
                setError(data.message);
              }
            } catch {
              // ignore
            }
            reject(new Error(`Request failed with status ${xhr.status}`));
          })();
        };

        xhr.onerror = () => {
          window.clearInterval(interval);
          reject(new Error("Network error while uploading file"));
        };

        xhr.send(formData);
      });
    } catch (err) {
      console.error("Error signing PDF", err);
      setError((prev) => prev || "Something went wrong while signing your PDF. Please try again.");
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
    setPageCount(null);
    setActivePageIndex(0);
    setSelectedFieldId("signature");
    setFields((prev) =>
      prev.map((f) => {
        revokeFieldVariantUrls(f);
        if (f.imagePreviewUrl && f.imagePreviewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(f.imagePreviewUrl);
        }
        if (f.id === "signature") {
          return {
            ...f,
            enabled: true,
            mode: "draw",
            typed: "",
            imageBlob: null,
            imagePreviewUrl: null,
            variants: [],
            drawVariantId: null,
            pageScope: "this",
            customPages: "",
            customRanges: [{ id: "r1", from: "1", to: "" }],
            placements: [],
          };
        }
        return {
          ...f,
          enabled: false,
          typed: "",
          imageBlob: null,
          imagePreviewUrl: null,
          variants: [],
          drawVariantId: null,
          pageScope: "this",
          customPages: "",
          customRanges: [{ id: "r1", from: "1", to: "" }],
          placements: [],
        };
      })
    );
    setUploadKey((prev) => prev + 1);
    setProgress(0);
    clearCanvas();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleOptionalField = (id: FieldId) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const enabled = !f.enabled;
        if (!enabled) {
          revokeFieldVariantUrls(f);
          if (f.imagePreviewUrl && f.imagePreviewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(f.imagePreviewUrl);
          }
          return {
            ...f,
            enabled,
            typed: "",
            imageBlob: null,
            imagePreviewUrl: null,
            variants: [],
            drawVariantId: null,
            placements: [],
            customPages: "",
            customRanges: [{ id: "r1", from: "1", to: "" }],
          };
        }
        return { ...f, enabled };
      })
    );
  };

  return (
    <ToolPageLayout
      title="Sign PDF"
      description="Add your signature to PDF documents electronically. Draw, type, or upload your signature."
      icon={FileSignature}
      iconColor="primary"
    >
      <div className="mx-auto max-w-7xl">
        {!isComplete ? (
          isProcessing ? (
            <div ref={loadingRef} className="py-16 flex flex-col items-center gap-6">
              <h2 className="text-2xl font-semibold">Signing document...</h2>
              <div className="relative h-24 w-24">
                <div className="h-24 w-24 rounded-full border-[6px] border-primary-foreground/10" />
                <div className="absolute inset-0 rounded-full border-[6px] border-primary border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
                  {progress}%
                </div>
              </div>
              {error && <p className="mt-2 text-sm text-destructive text-center max-w-md">{error}</p>}
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
                <div
                  ref={previewRef}
                  className="mt-8 grid grid-cols-1 lg:grid-cols-[180px,1fr,360px] gap-6 items-start"
                >
                  <div className="rounded-xl border border-border bg-card/0 p-3 max-h-[36rem] overflow-y-auto scroll-slim">
                    {activeFile && pageCount ? (
                      <div className="space-y-3">
                        {Array.from({ length: pageCount }, (_, i) => i).map((idx) => {
                          const isActive = idx === activePageIndex;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActivePageIndex(idx)}
                              className={`w-full rounded-xl border p-2 flex flex-col items-center gap-1 transition ${
                                isActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"
                              }`}
                            >
                              <div className="w-full">
                                <PdfPageThumbnail file={activeFile} pageNumber={idx + 1} width={150} height={195} />
                              </div>
                              <span className="text-[10px] text-muted-foreground">{idx + 1}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground text-center py-6">Preparing preview…</div>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-card/0 p-3">
                    <div className="rounded-xl border border-border bg-background p-3">
                      <div ref={stageRef} className="relative mx-auto w-full max-w-[760px]">
                        {activeFile && (
                          <PdfPageThumbnail file={activeFile} pageNumber={activePageIndex + 1} width={760} height={980} />
                        )}

                        {fields
                          .filter((f) => f.enabled && f.placements && f.placements.length > 0)
                          .flatMap((f) =>
                            f.placements
                              .filter((p) => p.pageIndex === activePageIndex)
                              .map((placement) => {
                                const isSelected = f.id === selectedFieldId;
                                const variant = f.variants.find((v) => v.id === placement.variantId) || null;
                                const style: CSSProperties = {
                                  left: `${placement.x * 100}%`,
                                  top: `${placement.y * 100}%`,
                                  width: `${placement.width * 100}%`,
                                  height: `${placement.height * 100}%`,
                                };

                                return (
                                  <div
                                    key={`${f.id}-${placement.id}`}
                                    onMouseDown={(e) => {
                                      if (!stageRef.current) return;
                                      setSelectedFieldId(f.id);
                                      const rect = stageRef.current.getBoundingClientRect();
                                      const startX = e.clientX;
                                      const startY = e.clientY;
                                      const start = placement;
                                      const startLeft = start.x;
                                      const startTop = start.y;

                                      const onMove = (ev: MouseEvent) => {
                                        const dx = (ev.clientX - startX) / rect.width;
                                        const dy = (ev.clientY - startY) / rect.height;
                                        updatePlacement(f.id, placement.id, { x: startLeft + dx, y: startTop + dy });
                                      };
                                      const onUp = () => {
                                        window.removeEventListener("mousemove", onMove);
                                        window.removeEventListener("mouseup", onUp);
                                      };
                                      window.addEventListener("mousemove", onMove);
                                      window.addEventListener("mouseup", onUp);
                                    }}
                                    className={`absolute rounded-md overflow-visible select-none group ${
                                      isSelected
                                        ? "border-2 border-primary shadow-sm"
                                        : "border border-transparent group-hover:border-primary/60"
                                    }`}
                                    style={style}
                                  >
                                    {variant?.imagePreviewUrl ? (
                                      <img
                                        src={variant.imagePreviewUrl}
                                        alt={f.label}
                                        className={`w-full h-full object-contain ${
                                          variant.mode === "type"
                                            ? "bg-transparent dark:[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.95))_drop-shadow(0_0_3px_rgba(255,255,255,0.75))]"
                                            : "bg-transparent"
                                        }`}
                                        draggable={false}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-[11px] bg-primary/10 text-primary font-medium">
                                        {f.label}
                                      </div>
                                    )}

                                    {/* Toolbar: remove (visible on hover) */}
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          removePlacement(f.id, placement.id);
                                        }}
                                        className="h-5 w-5 rounded bg-background text-foreground border border-border flex items-center justify-center text-[10px] shadow-sm"
                                        title="Remove this field"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>

                                    {isSelected && (
                                      <div
                                        onMouseDown={(e) => {
                                          e.stopPropagation();
                                          if (!stageRef.current) return;
                                          const rect = stageRef.current.getBoundingClientRect();
                                          const startX = e.clientX;
                                          const startY = e.clientY;
                                          const start = placement;
                                          const startW = start.width;
                                          const startH = start.height;
                                          const keepAspect = variant?.mode === "type";
                                          const ratio = startW > 0 ? startH / startW : 1;

                                          const onMove = (ev: MouseEvent) => {
                                            const dw = (ev.clientX - startX) / rect.width;
                                            const dh = (ev.clientY - startY) / rect.height;
                                            const nextW = startW + dw;
                                            const nextH = keepAspect ? nextW * ratio : startH + dh;
                                            updatePlacement(f.id, placement.id, { width: nextW, height: nextH });
                                          };
                                          const onUp = () => {
                                            window.removeEventListener("mousemove", onMove);
                                            window.removeEventListener("mouseup", onUp);
                                          };
                                          window.addEventListener("mousemove", onMove);
                                          window.addEventListener("mouseup", onUp);
                                        }}
                                        className="absolute right-0 bottom-0 h-3 w-3 bg-primary cursor-se-resize"
                                      />
                                    )}
                                  </div>
                                );
                              })
                          )}
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Drag to position. Select a box to resize from the corner.
                    </p>
                  </div>

                  <div
                    ref={optionsPanelRef}
                    className="rounded-xl border border-border bg-card p-0 flex flex-col max-h-[40rem]"
                  >
                    <div className="p-5 space-y-5 overflow-y-auto scroll-slim flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Signing options</h3>
                        {pageCount && <span className="text-xs text-muted-foreground">{pageCount} pages</span>}
                      </div>

                      <div className="space-y-2">
                      {fields.map((f) => {
                        const isSelected = f.id === selectedFieldId;
                        return (
                          <div key={f.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedFieldId(f.id)}
                              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium text-left transition ${
                                isSelected ? "border-primary bg-primary/10" : "border-border hover:border-primary/60"
                              } ${!f.enabled ? "opacity-60" : ""}`}
                            >
                              {f.label}
                              {f.required && <span className="text-xs text-muted-foreground"> (required)</span>}
                            </button>
                            {!f.required && (
                              <Button
                                type="button"
                                variant={f.enabled ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => toggleOptionalField(f.id)}
                              >
                                {f.enabled ? "On" : "Off"}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                      </div>

                      {selectedField.enabled ? (
                        <>
                          <Tabs
                            value={selectedField.mode}
                            onValueChange={(v) => setField(selectedField.id, { mode: v as FieldMode })}
                          >
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="draw" className="gap-2">
                              <Pencil className="h-4 w-4" />
                              Draw
                            </TabsTrigger>
                            <TabsTrigger value="type" className="gap-2">
                              <Type className="h-4 w-4" />
                              Type
                            </TabsTrigger>
                            <TabsTrigger value="upload" className="gap-2">
                              <Upload className="h-4 w-4" />
                              Upload
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="draw" className="mt-4 space-y-2">
                            <div className="border-2 border-dashed border-border rounded-xl bg-muted/20 p-2">
                              <canvas
                                ref={drawCanvasRef}
                                className="w-full h-[170px] rounded-lg cursor-crosshair"
                                style={{ touchAction: "none", backgroundColor: "transparent" }}
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  if (!selectedField.enabled || selectedField.mode !== "draw") return;
                                  const canvas = drawCanvasRef.current;
                                  const ctx = canvas?.getContext("2d");
                                  if (!canvas || !ctx) return;
                                  ensureDrawCanvasSize();
                                  const p = getDrawPoint(e);
                                  if (!p) return;
                                  drawStateRef.current.drawing = true;
                                  drawStateRef.current.activePointerId = e.pointerId;
                                  canvas.setPointerCapture(e.pointerId);
                                  prepareDrawContext(ctx);
                                  ctx.beginPath();
                                  ctx.moveTo(p.x, p.y);
                                  ctx.save();
                                  ctx.beginPath();
                                  ctx.fillStyle = "#111";
                                  ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
                                  ctx.fill();
                                  ctx.restore();
                                  ctx.beginPath();
                                  ctx.moveTo(p.x, p.y);
                                }}
                                onMouseDown={(e) => {
                                  // Fallback for environments where PointerEvents behave oddly.
                                  e.preventDefault();
                                  if (!selectedField.enabled || selectedField.mode !== "draw") return;
                                  const canvas = drawCanvasRef.current;
                                  const ctx = canvas?.getContext("2d");
                                  if (!canvas || !ctx) return;
                                  ensureDrawCanvasSize();
                                  const p = getDrawPointFromClient(e.clientX, e.clientY);
                                  if (!p) return;
                                  drawStateRef.current.drawing = true;
                                  drawStateRef.current.activePointerId = -1;
                                  prepareDrawContext(ctx);
                                  ctx.beginPath();
                                  ctx.moveTo(p.x, p.y);
                                  ctx.save();
                                  ctx.beginPath();
                                  ctx.fillStyle = "#111";
                                  ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
                                  ctx.fill();
                                  ctx.restore();
                                  ctx.beginPath();
                                  ctx.moveTo(p.x, p.y);
                                }}
                                onPointerMove={(e) => {
                                  const canvas = drawCanvasRef.current;
                                  const ctx = canvas?.getContext("2d");
                                  if (!canvas || !ctx) return;
                                  const state = drawStateRef.current;
                                  if (!state.drawing) return;
                                  if (state.activePointerId != null && e.pointerId !== state.activePointerId) return;
                                  e.preventDefault();
                                  const p = getDrawPoint(e);
                                  if (!p) return;
                                  ctx.lineTo(p.x, p.y);
                                  ctx.stroke();
                                }}
                                onMouseMove={(e) => {
                                  const canvas = drawCanvasRef.current;
                                  const ctx = canvas?.getContext("2d");
                                  if (!canvas || !ctx) return;
                                  const state = drawStateRef.current;
                                  if (!state.drawing) return;
                                  if (state.activePointerId !== -1) return;
                                  if ((e.buttons & 1) !== 1) return;
                                  e.preventDefault();
                                  const p = getDrawPointFromClient(e.clientX, e.clientY);
                                  if (!p) return;
                                  ctx.lineTo(p.x, p.y);
                                  ctx.stroke();
                                }}
                                onPointerUp={(e) => {
                                  const state = drawStateRef.current;
                                  if (state.activePointerId != null && e.pointerId !== state.activePointerId) return;
                                  void finishDrawStroke();
                                }}
                                onMouseUp={() => {
                                  const state = drawStateRef.current;
                                  if (state.activePointerId !== -1) return;
                                  void finishDrawStroke();
                                }}
                                onPointerCancel={() => {
                                  void finishDrawStroke();
                                }}
                                onPointerLeave={() => {
                                  void finishDrawStroke();
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">Draw inside the box above.</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  clearCanvas();
                                  setFieldImage(selectedField.id, null, null);
                                }}
                              >
                                Clear
                              </Button>
                            </div>
                          </TabsContent>

                          <TabsContent value="type" className="mt-4 space-y-3">
                            <Input
                              value={selectedField.typed}
                              onChange={(e) => setField(selectedField.id, { typed: e.target.value })}
                              placeholder="Type your name"
                              className="h-11"
                            />
                            <div className="space-y-2 text-xs mt-2">
                              <Label className="text-xs">Text format</Label>
                              <div className="flex items-center gap-2">
                                <Select
                                  value={textFontFamily}
                                  onValueChange={(value) =>
                                    setTextFontFamily(value as "helvetica" | "times" | "courier")
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
                                {["#000000", "#4b5563", "#1d4ed8", "#b91c1c"].map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setTextColor(c)}
                                    className={`h-5 w-5 rounded-full border transition-colors ${
                                      textColor === c
                                        ? "border-primary ring-2 ring-primary/50"
                                        : "border-border hover:border-primary/60 hover:bg-muted/40"
                                    }`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={async () => {
                                const result = await renderTypedToPng(selectedField.typed, {
                                  fontFamily: textFontFamily,
                                  color: textColor,
                                });
                                if (!result) {
                                  setFieldImage(selectedField.id, null, null);
                                  return;
                                }
                                setFieldImage(selectedField.id, result.blob, result.preview);
                                const variantId = createVariantId();
                                addOrUpdateVariant(selectedField.id, {
                                  id: variantId,
                                  mode: "type",
                                  typed: selectedField.typed,
                                  imageBlob: result.blob,
                                  imagePreviewUrl: result.preview,
                                });
                              }}
                            >
                              Use typed {selectedField.label}
                            </Button>
                            {selectedField.imagePreviewUrl && (
                              <div className="rounded-xl border border-border bg-muted/20 p-3">
                                <img
                                  src={selectedField.imagePreviewUrl}
                                  alt="preview"
                                  className="w-full h-16 object-contain bg-transparent rounded-lg dark:[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.95))_drop-shadow(0_0_3px_rgba(255,255,255,0.75))]"
                                />
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="upload" className="mt-4 space-y-3">
                            <input
                              ref={uploadImageRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const url = URL.createObjectURL(file);
                                setFieldImage(selectedField.id, file, url);

                                const variantId = createVariantId();
                                addOrUpdateVariant(selectedField.id, {
                                  id: variantId,
                                  mode: "upload",
                                  imageBlob: file,
                                  imagePreviewUrl: url,
                                });
                              }}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => uploadImageRef.current?.click()}
                            >
                              Choose image
                            </Button>
                            {selectedField.imagePreviewUrl && (
                              <div className="rounded-xl border border-border bg-muted/20 p-3">
                                <img
                                  src={selectedField.imagePreviewUrl}
                                  alt="uploaded"
                                  className="w-full h-20 object-contain rounded-lg"
                                />
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>

                        {selectedField.variants.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-xs text-muted-foreground">Drag onto the page to place:</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedField.variants.map((v) => (
                                <div
                                  key={v.id}
                                  className="relative inline-flex rounded-lg border border-dashed border-border bg-muted/40 px-3 py-2 items-center gap-2"
                                >
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      beginPaletteDrag(selectedField.id, v.id, e.clientX, e.clientY, "clone", null);
                                    }}
                                    className="flex flex-col justify-center items-center pr-1 cursor-grab active:cursor-grabbing select-none"
                                    aria-label="Drag to place signature"
                                  >
                                    <span className="flex gap-0.5 mb-[1px]">
                                      <span className="h-1 w-1 rounded-full bg-muted-foreground/80" />
                                      <span className="h-1 w-1 rounded-full bg-muted-foreground/80" />
                                    </span>
                                    <span className="flex gap-0.5 mb-[1px]">
                                      <span className="h-1 w-1 rounded-full bg-muted-foreground/80" />
                                      <span className="h-1 w-1 rounded-full bg-muted-foreground/80" />
                                    </span>
                                    <span className="flex gap-0.5">
                                      <span className="h-1 w-1 rounded-full bg-muted-foreground/80" />
                                      <span className="h-1 w-1 rounded-full bg-muted-foreground/80" />
                                    </span>
                                  </button>
                                  <div
                                    className={`h-9 w-9 rounded border flex items-center justify-center overflow-hidden ${
                                      v.mode === "type" ? "bg-transparent" : "bg-transparent"
                                    }`}
                                  >
                                    <img
                                      src={v.imagePreviewUrl}
                                      alt="token"
                                      className={`max-h-full max-w-full object-contain ${
                                        v.mode === "type"
                                          ? "dark:[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.95))_drop-shadow(0_0_3px_rgba(255,255,255,0.75))]"
                                          : ""
                                      }`}
                                    />
                                  </div>
                                  <span className="text-xs font-medium">{selectedField.label}</span>
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      removeVariant(selectedField.id, v.id);
                                    }}
                                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-background border border-border text-foreground flex items-center justify-center shadow-sm"
                                    title="Remove"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <p className="text-sm font-medium">Apply to</p>
                          <div className="grid grid-cols-2 gap-2">
                            {(
                              [
                                { id: "this", label: "Only this page" },
                                { id: "all", label: "All pages" },
                                { id: "allButLast", label: "All but last" },
                                { id: "last", label: "Last page" },
                                { id: "custom", label: "Custom" },
                              ] as { id: PageScope; label: string }[]
                            ).map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setField(selectedField.id, { pageScope: opt.id })}
                                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                                  selectedField.pageScope === opt.id
                                    ? "border-primary bg-primary/10"
                                    : "border-border hover:border-primary/60"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          {selectedField.pageScope === "custom" && (
                            <div className="space-y-3">
                              {selectedField.customRanges.map((r, idx) => (
                                <div key={r.id} className="flex flex-wrap items-center gap-2 text-sm max-w-full">
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">Range {idx + 1}</span>
                                  <div className="flex items-center gap-2 flex-wrap"> 
                                    <div className="inline-flex items-stretch rounded-full border bg-background overflow-hidden">
                                      <Input
                                        type="number"
                                        min={1}
                                        max={pageCount ?? undefined}
                                        value={r.from}
                                        onChange={(e) => updateCustomRange(selectedField.id, r.id, "from", e.target.value)}
                                        className="h-8 w-16 border-0 focus-visible:ring-0 rounded-none text-right pr-2 no-native-spinner"
                                      />
                                      <div className="flex flex-col border-l bg-muted/60">
                                        <button
                                          type="button"
                                          className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                          onClick={() => {
                                            const current = parseInt(r.from || "1", 10) || 1;
                                            updateCustomRange(selectedField.id, r.id, "from", String(current + 1));
                                          }}
                                        >
                                          <ChevronUp className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                          onClick={() => {
                                            const current = parseInt(r.from || "1", 10) || 1;
                                            updateCustomRange(selectedField.id, r.id, "from", String(current - 1));
                                          }}
                                        >
                                          <ChevronDown className="h-3 w-3" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-muted-foreground">to</span>
                                    <div className="inline-flex items-stretch rounded-full border bg-background overflow-hidden">
                                      <Input
                                        type="number"
                                        min={1}
                                        max={pageCount ?? undefined}
                                        value={r.to}
                                        onChange={(e) => updateCustomRange(selectedField.id, r.id, "to", e.target.value)}
                                        className="h-8 w-16 border-0 focus-visible:ring-0 rounded-none text-right pr-2 no-native-spinner"
                                      />
                                      <div className="flex flex-col border-l bg-muted/60">
                                        <button
                                          type="button"
                                          className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                          onClick={() => {
                                            const current = parseInt(r.to || "1", 10) || 1;
                                            updateCustomRange(selectedField.id, r.id, "to", String(current + 1));
                                          }}
                                        >
                                          <ChevronUp className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          className="flex-1 px-1 flex items-center justify-center hover:bg-muted"
                                          onClick={() => {
                                            const current = parseInt(r.to || "1", 10) || 1;
                                            updateCustomRange(selectedField.id, r.id, "to", String(current - 1));
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
                                    onClick={() => removeCustomRange(selectedField.id, r.id)}
                                    disabled={selectedField.customRanges.length <= 1}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addCustomRange(selectedField.id)}
                                className="mt-1"
                              >
                                + Add range
                              </Button>
                            </div>
                          )}
                        </div>

                        {error && <p className="text-sm text-destructive">{error}</p>}
                      </>
                      ) : (
                        <p className="text-sm text-muted-foreground">Turn this field On to configure it.</p>
                      )}
                    </div>

                    <div className="border-t border-border bg-card/95 px-5 py-4 flex flex-col items-center gap-3 sticky bottom-0">
                      <Button
                        size="lg"
                        className="btn-hero gradient-primary shadow-primary w-full"
                        onClick={handleProcess}
                        disabled={isProcessing || !canSign}
                      >
                        Sign Document
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
              {dragPaletteFieldId && dragPos && (
                <div
                  className="pointer-events-none fixed z-50"
                  style={{
                    left: dragPos.x,
                    top: dragPos.y,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="h-12 w-12 rounded border border-primary bg-background shadow-sm flex items-center justify-center text-[11px] text-primary font-medium">
                    {fields.find((f) => f.id === dragPaletteFieldId)?.label ?? ""}
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <FileSignature className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Document Signed!</h2>
            <p className="text-muted-foreground mb-8">Your signature has been added to the document.</p>
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="btn-hero gradient-primary shadow-primary"
                onClick={() => {
                  if (!downloadUrl) return;
                  const link = document.createElement("a");
                  link.href = downloadUrl;
                  const baseName = (files[0]?.name || "document").replace(/\.pdf$/i, "");
                  link.download = `${baseName}-signed.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                disabled={!downloadUrl}
              >
                <Download className="h-5 w-5 mr-2" />
                Download Signed PDF
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Sign another document
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
