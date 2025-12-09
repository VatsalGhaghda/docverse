import { useState } from "react";
import { ScanText, ArrowRight, RotateCcw, Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

const languages = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
];

export default function OCRPDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [language, setLanguage] = useState("en");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleProcess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
    }, 3000);
  };

  const handleReset = () => {
    setFiles([]);
    setIsComplete(false);
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ToolPageLayout
      title="OCR Scanner"
      description="Extract text from scanned documents and images. Convert non-selectable PDFs into searchable text."
      icon={ScanText}
      iconColor="secondary"
    >
      <div className="mx-auto max-w-3xl">
        {!isComplete ? (
          <>
            <FileUploadZone
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              maxFiles={10}
              onFilesChange={setFiles}
            />

            {files.length > 0 && (
              <div className="mt-8 space-y-6">
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-4">OCR Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Document Language
                      </label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger className="w-full max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {languages.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
                        Scanning...
                      </>
                    ) : (
                      <>
                        Start OCR
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
          <div className="py-8">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                <ScanText className="h-8 w-8 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">OCR Complete!</h2>
              <p className="text-muted-foreground">
                Text has been extracted from your document.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Extracted Text</h3>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
                <br />
                <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-3">
                <Button size="lg" className="btn-hero gradient-secondary">
                  <Download className="h-5 w-5 mr-2" />
                  Download as PDF
                </Button>
                <Button size="lg" variant="outline">
                  <Download className="h-5 w-5 mr-2" />
                  Download as TXT
                </Button>
              </div>
              <Button variant="ghost" onClick={handleReset}>
                Scan another document
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
