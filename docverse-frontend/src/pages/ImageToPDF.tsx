import { useState } from "react";
import { Image as ImageIcon, ArrowRight, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

export default function ImageToPDF() {
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
      title="Image to PDF"
      description="Combine JPG and PNG images into a single, clean PDF document."
      icon={ImageIcon}
      iconColor="secondary"
    >
      <div className="mx-auto max-w-3xl">
        {!isComplete ? (
          <>
            <FileUploadZone
              accept=".jpg,.jpeg,.png"
              multiple
              maxFiles={50}
              onFilesChange={setFiles}
            />

            {files.length > 0 && (
              <div className="mt-8 space-y-6">
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-2">Page order</h3>
                  <p className="text-sm text-muted-foreground">
                    Images will appear in the PDF in the same order they are listed. Use the list above to arrange
                    them before converting.
                  </p>
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
                        Creating PDF...
                      </>
                    ) : (
                      <>
                        Convert {files.length} image{files.length > 1 ? "s" : ""}
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
              <ImageIcon className="h-10 w-10 text-secondary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">PDF Created!</h2>
            <p className="text-muted-foreground mb-8">
              Your images have been combined into a single PDF document.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button size="lg" className="btn-hero gradient-secondary">
                <Download className="h-5 w-5 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Convert more images
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
