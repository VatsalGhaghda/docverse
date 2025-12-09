import { useState } from "react";
import { FileDown, ArrowRight, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

export default function CompressPDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [quality, setQuality] = useState([70]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleProcess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
    }, 2000);
  };

  const handleReset = () => {
    setFiles([]);
    setIsComplete(false);
    setQuality([70]);
  };

  const getQualityLabel = (value: number) => {
    if (value >= 80) return "High Quality";
    if (value >= 50) return "Balanced";
    return "Maximum Compression";
  };

  return (
    <ToolPageLayout
      title="Compress PDF"
      description="Reduce PDF file size while maintaining quality. Perfect for email attachments and web uploads."
      icon={FileDown}
      iconColor="accent"
    >
      <div className="mx-auto max-w-3xl">
        {!isComplete ? (
          <>
            <FileUploadZone
              accept=".pdf"
              multiple
              maxFiles={10}
              onFilesChange={setFiles}
            />

            {files.length > 0 && (
              <div className="mt-8 space-y-6">
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-4">Compression Level</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Quality: {quality[0]}%</Label>
                      <span className="text-sm text-muted-foreground">
                        {getQualityLabel(quality[0])}
                      </span>
                    </div>
                    <Slider
                      value={quality}
                      onValueChange={setQuality}
                      max={100}
                      min={10}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Smaller file</span>
                      <span>Better quality</span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {[
                      { label: "Extreme", value: 20, desc: "~90% smaller" },
                      { label: "Balanced", value: 50, desc: "~70% smaller" },
                      { label: "Light", value: 80, desc: "~40% smaller" },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => setQuality([preset.value])}
                        className={`rounded-lg border p-3 text-center transition-all ${
                          quality[0] === preset.value
                            ? "border-accent bg-accent/10"
                            : "border-border hover:border-accent/50"
                        }`}
                      >
                        <p className="font-medium">{preset.label}</p>
                        <p className="text-xs text-muted-foreground">{preset.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <Button
                    size="lg"
                    className="btn-hero bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={handleProcess}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
                        Compressing...
                      </>
                    ) : (
                      <>
                        Compress {files.length} PDF{files.length > 1 ? "s" : ""}
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Start over
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
              <FileDown className="h-10 w-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Compression Complete!</h2>
            <p className="text-muted-foreground mb-2">
              Your files have been compressed successfully.
            </p>
            <p className="text-sm text-secondary mb-8">
              Reduced from 15.4 MB to 3.2 MB (79% smaller)
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button size="lg" className="btn-hero bg-accent text-accent-foreground hover:bg-accent/90">
                <Download className="h-5 w-5 mr-2" />
                Download Compressed Files
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Compress more files
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
