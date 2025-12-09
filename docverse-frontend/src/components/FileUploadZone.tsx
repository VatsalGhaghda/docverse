import { useState, useCallback } from "react";
import { Upload, X, FileText, GripVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "complete" | "error";
}

interface FileUploadZoneProps {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  onFilesChange?: (files: UploadedFile[]) => void;
  className?: string;
}

export function FileUploadZone({
  accept = ".pdf",
  multiple = true,
  maxFiles = 20,
  onFilesChange,
  className,
}: FileUploadZoneProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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
      }));

    // Simulate upload progress
    newFiles.forEach((file, index) => {
      setTimeout(() => {
        const interval = setInterval(() => {
          setFiles((prev) =>
            prev.map((f) => {
              if (f.id === file.id && f.progress < 100) {
                const newProgress = Math.min(f.progress + Math.random() * 30, 100);
                return {
                  ...f,
                  progress: newProgress,
                  status: newProgress === 100 ? "complete" : "uploading",
                };
              }
              return f;
            })
          );
        }, 200);

        setTimeout(() => clearInterval(interval), 2000);
      }, index * 300);
    });

    setFiles((prev) => {
      const updated = [...prev, ...newFiles];
      onFilesChange?.(updated);
      return updated;
    });
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

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      onFilesChange?.(updated);
      return updated;
    });
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

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
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
          
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all hover:bg-muted/50"
              >
                <div className="cursor-move text-muted-foreground hover:text-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                    {file.status === "uploading" && (
                      <Progress value={file.progress} className="h-1.5 w-24" />
                    )}
                    {file.status === "complete" && (
                      <span className="text-sm text-secondary">Ready</span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
