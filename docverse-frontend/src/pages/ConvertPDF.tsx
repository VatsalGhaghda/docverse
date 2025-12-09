import { useState } from "react";
import { FileOutput, ArrowRight, RotateCcw, Download, FileText, Image, FileSpreadsheet, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

const formats = [
  { id: "word", label: "Word", icon: FileText, ext: ".docx" },
  { id: "excel", label: "Excel", icon: FileSpreadsheet, ext: ".xlsx" },
  { id: "powerpoint", label: "PowerPoint", icon: Presentation, ext: ".pptx" },
  { id: "image", label: "Images", icon: Image, ext: ".jpg/.png" },
];

export default function ConvertPDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFormat, setSelectedFormat] = useState("word");
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
      title="Convert PDF"
      description="Transform your PDF files to Word, Excel, PowerPoint, or image formats with high accuracy."
      icon={FileOutput}
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
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-4">Convert To</h3>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {formats.map((format) => (
                      <button
                        key={format.id}
                        onClick={() => setSelectedFormat(format.id)}
                        className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                          selectedFormat === format.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <format.icon className={`h-8 w-8 ${
                          selectedFormat === format.id ? "text-primary" : "text-muted-foreground"
                        }`} />
                        <span className="font-medium">{format.label}</span>
                        <span className="text-xs text-muted-foreground">{format.ext}</span>
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
                        Converting...
                      </>
                    ) : (
                      <>
                        Convert to {formats.find(f => f.id === selectedFormat)?.label}
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
              <FileOutput className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Conversion Complete!</h2>
            <p className="text-muted-foreground mb-8">
              Your PDF has been converted to {formats.find(f => f.id === selectedFormat)?.label} format.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button size="lg" className="btn-hero gradient-primary shadow-primary">
                <Download className="h-5 w-5 mr-2" />
                Download Converted Files
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
