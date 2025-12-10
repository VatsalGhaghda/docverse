import { useState, useEffect, useRef } from "react";
import { ListOrdered, ArrowRight, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

export default function AddPageNumbers() {
  const [files, setFiles] = useState<any[]>([]);
  const [format, setFormat] = useState("1");
  const [startAt, setStartAt] = useState("1");
  const [range, setRange] = useState("");
  const [position, setPosition] = useState("bottom-center");
  const [fontSize, setFontSize] = useState([12]);
  const [margin, setMargin] = useState([24]);
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

    setIsProcessing(true);
    setIsComplete(false);
    setError(null);
    setProgress(8);

    const formData = new FormData();
    formData.append("file", activeFile, activeFile.name ?? "document.pdf");
    formData.append("format", format);
    formData.append("startAt", startAt);
    formData.append("range", range);
    formData.append("position", position);
    formData.append("fontSize", String(fontSize[0]));
    formData.append("margin", String(margin[0]));

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
    setFormat("1");
    setPosition("bottom-center");
    setFontSize([12]);
    setMargin([24]);
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
      title="Add Page Numbers"
      description="Insert page numbers into your PDF with full control over style, position and page range."
      icon={ListOrdered}
      iconColor="accent"
    >
      <div className="mx-auto max-w-3xl">
        {!isComplete ? (
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
                  <h3 className="font-semibold">Numbering Options</h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Number format</Label>
                      <Select value={format} onValueChange={setFormat}>
                        <SelectTrigger>
                          <SelectValue />
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
                      <Label htmlFor="startAt">Start numbering at</Label>
                      <Input
                        id="startAt"
                        type="number"
                        min={1}
                        value={startAt}
                        onChange={(e) => setStartAt(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="range">Page range (optional)</Label>
                    <Input
                      id="range"
                      placeholder="e.g., 1-10, 15-20 (leave empty for all pages)"
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use commas and dashes to specify ranges. Example: 1-3,5,8-10
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Select value={position} onValueChange={setPosition}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top-left">Top left</SelectItem>
                          <SelectItem value="top-center">Top center</SelectItem>
                          <SelectItem value="top-right">Top right</SelectItem>
                          <SelectItem value="bottom-left">Bottom left</SelectItem>
                          <SelectItem value="bottom-center">Bottom center</SelectItem>
                          <SelectItem value="bottom-right">Bottom right</SelectItem>
                        </SelectContent>
                      </Select>
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
                    </div>
                  </div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <Button
                      size="lg"
                      className="btn-hero bg-accent text-accent-foreground hover:bg-accent/90"
                      onClick={handleProcess}
                      disabled={isProcessing || !allReady}
                    >
                      Apply page numbers
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
