import { useState } from "react";
import { FileCode2, ArrowRight, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function PDFToHTML() {
  const [files, setFiles] = useState<any[]>([]);
  const [outputMode, setOutputMode] = useState("single");
  const [layoutMode, setLayoutMode] = useState("preserve");
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
    setOutputMode("single");
    setLayoutMode("preserve");
  };

  return (
    <ToolPageLayout
      title="PDF to HTML"
      description="Convert your PDFs into clean, responsive HTML pages for the web."
      icon={FileCode2}
      iconColor="primary"
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
                <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <h3 className="font-semibold">HTML Options</h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Output format</Label>
                      <Select value={outputMode} onValueChange={setOutputMode}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single HTML with inline assets</SelectItem>
                          <SelectItem value="separate">HTML + external assets (ZIP)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Layout</Label>
                      <Select value={layoutMode} onValueChange={setLayoutMode}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="preserve">Preserve original layout</SelectItem>
                          <SelectItem value="simplify">Simplify for reading</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Note: Very complex PDFs may not convert perfectly. Review the HTML before publishing.
                  </p>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <Button
                    size="lg"
                    className="btn-hero gradient-primary shadow-primary"
                    onClick={handleProcess}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Converting to HTML...
                      </>
                    ) : (
                      <>
                        Convert to HTML
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
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <FileCode2 className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Conversion Complete!</h2>
            <p className="text-muted-foreground mb-8">
              Your PDF has been converted into HTML. Download the HTML package below.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button size="lg" className="btn-hero gradient-primary shadow-primary">
                <Download className="h-5 w-5 mr-2" />
                Download HTML ZIP
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Convert another PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
