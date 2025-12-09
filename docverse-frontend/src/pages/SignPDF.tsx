import { useState } from "react";
import { FileSignature, ArrowRight, RotateCcw, Download, Pencil, Type, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

export default function SignPDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [signatureType, setSignatureType] = useState("draw");
  const [typedSignature, setTypedSignature] = useState("");
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
    setTypedSignature("");
  };

  return (
    <ToolPageLayout
      title="Sign PDF"
      description="Add your signature to PDF documents electronically. Draw, type, or upload your signature."
      icon={FileSignature}
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
                  <h3 className="font-semibold mb-4">Create Your Signature</h3>
                  
                  <Tabs value={signatureType} onValueChange={setSignatureType}>
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="draw" className="gap-2">
                        <Pencil className="h-4 w-4" />
                        Draw
                      </TabsTrigger>
                      <TabsTrigger value="type" className="gap-2">
                        <Type className="h-4 w-4" />
                        Type
                      </TabsTrigger>
                      <TabsTrigger value="upload" className="gap-2">
                        <Upload className="h-4 w-4" />
                        Upload
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="draw">
                      <div className="border-2 border-dashed border-border rounded-xl h-40 flex items-center justify-center bg-muted/30 cursor-crosshair">
                        <p className="text-muted-foreground">Draw your signature here</p>
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button variant="outline" size="sm">Clear</Button>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="type">
                      <Input
                        value={typedSignature}
                        onChange={(e) => setTypedSignature(e.target.value)}
                        placeholder="Type your name"
                        className="text-2xl h-14 font-serif"
                      />
                      {typedSignature && (
                        <div className="mt-4 p-4 border border-border rounded-xl bg-muted/30">
                          <p className="text-3xl font-serif italic text-center">
                            {typedSignature}
                          </p>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="upload">
                      <div className="border-2 border-dashed border-border rounded-xl h-40 flex flex-col items-center justify-center bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors">
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Upload signature image</p>
                        <p className="text-xs text-muted-foreground mt-1">PNG or JPG, transparent background preferred</p>
                      </div>
                    </TabsContent>
                  </Tabs>
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
                        Adding signature...
                      </>
                    ) : (
                      <>
                        Sign Document
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
              <FileSignature className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Document Signed!</h2>
            <p className="text-muted-foreground mb-8">
              Your signature has been added to the document.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button size="lg" className="btn-hero gradient-primary shadow-primary">
                <Download className="h-5 w-5 mr-2" />
                Download Signed PDF
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Sign another document
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
