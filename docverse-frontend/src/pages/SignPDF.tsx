import { useState, useEffect, useRef } from "react";
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
    formData.append("signatureType", signatureType);
    formData.append("typedSignature", typedSignature);

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", `${apiBase}/sign-pdf`);
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
      console.error("Error signing PDF", err);
      setError("Something went wrong while signing your PDF. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setIsComplete(false);
    setTypedSignature("");
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
      title="Sign PDF"
      description="Add your signature to PDF documents electronically. Draw, type, or upload your signature."
      icon={FileSignature}
      iconColor="primary"
    >
      <div className="mx-auto max-w-3xl">
        {!isComplete ? (
          isProcessing ? (
            <div ref={loadingRef} className="py-16 flex flex-col items-center gap-6">
              <h2 className="text-2xl font-semibold">Adding signature...</h2>
              <div className="relative h-24 w-24">
                <div className="h-24 w-24 rounded-full border-[6px] border-primary-foreground/10" />
                <div className="absolute inset-0 rounded-full border-[6px] border-primary border-t-transparent animate-spin" />
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
                    disabled={isProcessing || !allReady}
                  >
                    Sign Document
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
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <FileSignature className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Document Signed!</h2>
            <p className="text-muted-foreground mb-8">
              Your signature has been added to the document.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="btn-hero gradient-primary shadow-primary"
                onClick={() => {
                  if (!downloadUrl) return;
                  const link = document.createElement("a");
                  link.href = downloadUrl;
                  const baseName = (files[0]?.name || "document").replace(/\.pdf$/i, "");
                  link.download = `${baseName}-signed.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                disabled={!downloadUrl}
              >
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
