import { useState } from "react";
import { Presentation, ArrowRight, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

export default function PDFToPowerPoint() {
  const [files, setFiles] = useState<any[]>([]);
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
  };

  return (
    <ToolPageLayout
      title="PDF to PowerPoint"
      description="Turn PDF slides into editable PowerPoint (.pptx) presentations."
      icon={Presentation}
      iconColor="accent"
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
                  <h3 className="font-semibold mb-2">Slide-friendly PDFs</h3>
                  <p className="text-sm text-muted-foreground">
                    Works best when each PDF page is a slide. Some manual adjustment in PowerPoint may still be needed.
                  </p>
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
                        Converting to PowerPoint...
                      </>
                    ) : (
                      <>
                        Convert {files.length} PDF{files.length > 1 ? "s" : ""}
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
              <Presentation className="h-10 w-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Conversion Complete!</h2>
            <p className="text-muted-foreground mb-8">
              Your PDF has been converted to PowerPoint (.pptx).
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button size="lg" className="btn-hero bg-accent text-accent-foreground hover:bg-accent/90">
                <Download className="h-5 w-5 mr-2" />
                Download PowerPoint Files
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Convert more PDFs
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
