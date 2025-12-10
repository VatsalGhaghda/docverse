import { useState, useEffect, useRef } from "react";
import { Droplets, ArrowRight, RotateCcw, Download, Image as ImageIcon, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

export default function WatermarkPDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("CONFIDENTIAL");
  const [opacity, setOpacity] = useState([40]);
  const [rotation, setRotation] = useState([30]);
  const [position, setPosition] = useState("center");
  const [imageName] = useState<string | null>(null); // placeholder until real image upload UI
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);

  const activeFile = files[0]?.file as File | undefined;
  const allReady = files.length === 1 && files[0].status === "complete";

  const handleProcess = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    if (!allReady || !activeFile) return;
    if (mode === "text" && !text.trim()) return;

    setIsProcessing(true);
    setIsComplete(false);
    setError(null);
    setProgress(8);

    const formData = new FormData();
    formData.append("file", activeFile, activeFile.name ?? "document.pdf");
    formData.append("mode", mode);
    formData.append("text", text);
    formData.append("opacity", String(opacity[0]));
    formData.append("rotation", String(rotation[0]));
    formData.append("position", position);

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", `${apiBase}/watermark-pdf`);
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
      console.error("Error watermarking PDF", err);
      setError("Something went wrong while applying the watermark. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setIsComplete(false);
    setMode("text");
    setText("CONFIDENTIAL");
    setOpacity([40]);
    setRotation([30]);
    setPosition("center");
    setError(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setUploadKey((prev) => prev + 1);
    setProgress(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (files.length > 0 && previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [files.length]);

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
      <div className="mx-auto max-w-3xl">
        {!isComplete ? (
          isProcessing ? (
            <div ref={loadingRef} className="py-16 flex flex-col items-center gap-6">
              <h2 className="text-2xl font-semibold">Applying watermark...</h2>
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
              <FileUploadZone
                key={uploadKey}
                accept=".pdf"
                multiple={false}
                maxFiles={1}
                onFilesChange={setFiles}
              />

              {files.length > 0 && (
                <div ref={previewRef} className="mt-8 space-y-6">
                  <div className="rounded-xl border border-border bg-card p-6 space-y-6">
                  <h3 className="font-semibold">Watermark Settings</h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Watermark type</Label>
                      <Select value={mode} onValueChange={setMode}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text watermark</SelectItem>
                          <SelectItem value="image">Image watermark</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Select value={position} onValueChange={setPosition}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="top-left">Top left</SelectItem>
                          <SelectItem value="top-right">Top right</SelectItem>
                          <SelectItem value="bottom-left">Bottom left</SelectItem>
                          <SelectItem value="bottom-right">Bottom right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {mode === "text" ? (
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
                        Example: "CONFIDENTIAL", "DRAFT", or your company name.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Watermark image</Label>
                      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                        <p>
                          Image upload UI will go here (logo, stamp, etc.). For now, this is a visual placeholder.
                        </p>
                        {imageName && <p className="mt-2 text-foreground">Selected: {imageName}</p>}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <Label>Opacity</Label>
                        <span className="text-xs text-muted-foreground">{opacity[0]}%</span>
                      </div>
                      <Slider value={opacity} onValueChange={setOpacity} min={10} max={100} step={5} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <Label>Rotation</Label>
                        <span className="text-xs text-muted-foreground">{rotation[0]}°</span>
                      </div>
                      <Slider value={rotation} onValueChange={setRotation} min={-90} max={90} step={5} />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Watermarks are typically applied to all pages. Later you can add per-page controls when backend supports it.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <Button
                    size="lg"
                    className="btn-hero gradient-secondary"
                    onClick={handleProcess}
                    disabled={isProcessing || !allReady || (mode === "text" && !text)}
                  >
                    Apply watermark
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
