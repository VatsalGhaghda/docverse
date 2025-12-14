import { useState, useCallback, useEffect } from "react";
import { Upload, X, FileText, GripVertical, Plus } from "lucide-react";
import { PdfThumbnail } from "@/components/PdfThumbnail";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "complete" | "error";
  file?: File;
}

interface FileUploadZoneProps {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  onFilesChange?: (files: UploadedFile[]) => void;
  className?: string;
  showThumbnails?: boolean;
}

export function FileUploadZone({
  accept = ".pdf",
  multiple = true,
  maxFiles = 20,
  onFilesChange,
  className,
  showThumbnails = true,
}: FileUploadZoneProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    onFilesChange?.(files);
  }, [files, onFilesChange]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList)
      .slice(0, maxFiles - files.length)
      .map((file) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        progress: 0,
        status: "uploading" as const,
        file,
      }));

    // Simulate upload progress
    newFiles.forEach((file, index) => {
      setTimeout(() => {
        const interval = setInterval(() => {
          setFiles((prev) => {
            const updated: UploadedFile[] = prev.map((f) => {
              if (f.id === file.id && f.progress < 100) {
                const newProgress = Math.min(f.progress + Math.random() * 30, 100);
                return {
                  ...f,
                  progress: newProgress,
                  status: (newProgress === 100 ? "complete" : "uploading") as UploadedFile["status"],
                };
              }
              return f;
            });
            return updated;
          });
        }, 200);

        setTimeout(() => clearInterval(interval), 2000);
      }, index * 300);
    });

    setFiles((prev) => [...prev, ...newFiles]);
  }, [files.length, maxFiles, onFilesChange]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleItemDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, id: string) => {
      e.dataTransfer.effectAllowed = "move";
      setDraggingId(id);
    },
    []
  );

  const handleItemDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      setFiles((prev) => {
        if (!draggingId || draggingId === targetId) return prev;

        const currentIndex = prev.findIndex((f) => f.id === draggingId);
        const targetIndex = prev.findIndex((f) => f.id === targetId);

        if (currentIndex === -1 || targetIndex === -1) return prev;
        const updated = [...prev];
        const [moved] = updated.splice(currentIndex, 1);
        updated.splice(targetIndex, 0, moved);
        return updated;
      });
    },
    [draggingId, onFilesChange]
  );

  const handleItemDragEnd = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, [onFilesChange]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Upload Zone */}
      <div
        className={cn(
          "upload-zone cursor-pointer",
          isDragging && "upload-zone-active"
        )}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
        />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">
          Drop your files here
        </h3>
        <p className="text-muted-foreground mb-4">
          or click to browse from your computer
        </p>
        <Button variant="outline" size="lg" className="pointer-events-none">
          Select Files
        </Button>
        <p className="mt-4 text-sm text-muted-foreground">
          {(() => {
            const lower = accept.toLowerCase();

            if (lower.includes(".pdf")) {
              return "Supports: PDF files up to 100MB each";
            }

            if (lower.includes(".jpg") || lower.includes(".jpeg") || lower.includes(".png")) {
              return "Supports: JPG, PNG files up to 100MB each";
            }

            if (lower.includes(".doc") || lower.includes(".docx")) {
              return "Supports: Word files (.doc, .docx) up to 100MB each";
            }

            if (lower.includes(".xls") || lower.includes(".xlsx")) {
              return "Supports: Excel files (.xls, .xlsx) up to 100MB each";
            }

            if (lower.includes(".ppt") || lower.includes(".pptx")) {
              return "Supports: PowerPoint files (.ppt, .pptx) up to 100MB each";
            }

            return "Supports: selected files up to 100MB each";
          })()}
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{files.length} file(s) selected</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add more
            </Button>
          </div>

          <div className="overflow-x-auto scroll-slim pb-1">
            <div className="flex gap-4 min-w-full">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="group relative flex flex-col rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-move min-w-[220px] max-w-[260px]"
                  draggable
                  onDragStart={(e) => handleItemDragStart(e, file.id)}
                  onDragOver={(e) => handleItemDragOver(e, file.id)}
                  onDragEnd={handleItemDragEnd}
                >
                <div className="absolute left-2 top-2 inline-flex items-center rounded-full bg-muted/90 px-2 py-0.5 text-[11px] font-medium text-foreground shadow-sm">
                  {formatFileSize(file.size)}
                </div>

                <button
                  type="button"
                  className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>

                <div className="flex-1 rounded-lg bg-muted/60 flex items-center justify-center mb-2 overflow-hidden max-w-[200px] mx-auto">
                  {showThumbnails && file.file && file.file.type === "application/pdf" ? (
                    <PdfThumbnail file={file.file} />
                  ) : (
                    <FileText className="h-10 w-10 text-primary" />
                  )}
                </div>

                <div className="min-h-[2.5rem] flex flex-col justify-between">
                  <p className="text-xs font-medium text-center truncate" title={file.name}>
                    {file.name}
                  </p>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    {file.status === "uploading" && (
                      <Progress value={file.progress} className="h-1.5 w-20" />
                    )}
                    {file.status === "complete" && (
                      <span className="text-[11px] font-medium text-secondary">
                        Ready
                      </span>
                    )}
                  </div>
                </div>

                <div className="absolute inset-x-0 bottom-1 flex justify-center text-[10px] text-muted-foreground">
                  <GripVertical className="h-3 w-3" />
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
