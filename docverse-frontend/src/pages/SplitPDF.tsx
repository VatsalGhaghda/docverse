import { useState } from "react";
import { Scissors, ArrowRight, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

export default function SplitPDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [splitMode, setSplitMode] = useState("range");
  const [pageRange, setPageRange] = useState("");
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
    setPageRange("");
  };

  return (
    <ToolPageLayout
      title="Split PDF"
      description="Extract pages or split your PDF into multiple files. Select specific pages or split by range."
      icon={Scissors}
      iconColor="secondary"
    >
      <div className="mx-auto max-w-3xl">
        {!isComplete ? (
          <>
            <FileUploadZone
              accept=".pdf"
              multiple={false}
              maxFiles={1}
              onFilesChange={setFiles}
            />

            {files.length > 0 && (
              <div className="mt-8 space-y-6">
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-4">Split Options</h3>
                  
                  <RadioGroup value={splitMode} onValueChange={setSplitMode} className="space-y-4">
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="range" id="range" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="range" className="font-medium cursor-pointer">
                          Extract by page range
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Specify which pages to extract (e.g., 1-5, 8, 11-13)
                        </p>
                        {splitMode === "range" && (
                          <Input
                            className="mt-3 max-w-xs"
                            placeholder="e.g., 1-5, 8, 11-13"
                            value={pageRange}
                            onChange={(e) => setPageRange(e.target.value)}
                          />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="each" id="each" className="mt-1" />
                      <div>
                        <Label htmlFor="each" className="font-medium cursor-pointer">
                          Split into single pages
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Create a separate PDF for each page
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value="half" id="half" className="mt-1" />
                      <div>
                        <Label htmlFor="half" className="font-medium cursor-pointer">
                          Split in half
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Divide the PDF into two equal parts
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <Button
                    size="lg"
                    className="btn-hero gradient-secondary"
                    onClick={handleProcess}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-secondary-foreground border-t-transparent" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Split PDF
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
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10">
              <Scissors className="h-10 w-10 text-secondary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Split Complete!</h2>
            <p className="text-muted-foreground mb-8">
              Your PDF has been split into multiple files.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button size="lg" className="btn-hero gradient-secondary">
                <Download className="h-5 w-5 mr-2" />
                Download All Files
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Split another PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
