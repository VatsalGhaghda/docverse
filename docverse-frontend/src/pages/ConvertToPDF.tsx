import { useState } from "react";
import { FileInput, ArrowRight, RotateCcw, Download, FileText, Image, FileSpreadsheet, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

const inputTypes = [
  { id: "word", label: "Word", icon: FileText, exts: ".doc/.docx" },
  { id: "excel", label: "Excel", icon: FileSpreadsheet, exts: ".xls/.xlsx" },
  { id: "powerpoint", label: "PowerPoint", icon: Presentation, exts: ".ppt/.pptx" },
  { id: "images", label: "Images", icon: Image, exts: ".jpg/.jpeg/.png" },
];

export default function ConvertToPDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState("word");
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

  const acceptByType: Record<string, string> = {
    word: ".doc,.docx",
    excel: ".xls,.xlsx",
    powerpoint: ".ppt,.pptx",
    images: ".jpg,.jpeg,.png",
  };

  const currentType = inputTypes.find((t) => t.id === selectedType) ?? inputTypes[0];

  return (
    <ToolPageLayout
      title="Convert to PDF"
      description="Turn Word, Excel, PowerPoint and image files into high-quality PDFs ready to share or archive."
      icon={FileInput}
      iconColor="primary"
    >
      <div className="mx-auto max-w-3xl">
        {!isComplete ? (
          <>
            <FileUploadZone
              accept={acceptByType[selectedType]}
              multiple={false}
              maxFiles={1}
              onFilesChange={setFiles}
            />

            {files.length > 0 && (
              <div className="mt-8 space-y-6">
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-4">Source File Type</h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {inputTypes.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSelectedType(type.id)}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                          selectedType === type.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <type.icon
                          className={`h-8 w-8 ${
                            selectedType === type.id ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <span className="font-medium">{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.exts}</span>
                      </button>
                    ))}
                  </div>
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
                        Converting to PDF...
                      </>
                    ) : (
                      <>
                        Convert to PDF
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
              <FileInput className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Conversion Complete!</h2>
            <p className="text-muted-foreground mb-8">
              Your files have been converted to PDF format.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button size="lg" className="btn-hero gradient-primary shadow-primary">
                <Download className="h-5 w-5 mr-2" />
                Download PDF Files
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Convert more files
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
