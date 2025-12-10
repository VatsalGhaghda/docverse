import { useState, useEffect, useRef } from "react";
import { Unlock, ArrowRight, RotateCcw, Download, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

export default function UnlockPDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isEncrypted, setIsEncrypted] = useState<boolean | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const uploadRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);

  const activeFile = files[0]?.file as File | undefined;
  const allReady = files.length === 1 && files[0].status === "complete";

  const handleProcess = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    if (!allReady || !activeFile || !password) return;
    if (isEncrypted === false) return;

    setIsProcessing(true);
    setIsComplete(false);
    setError(null);
    setProgress(8);

    const formData = new FormData();
    formData.append("file", activeFile, activeFile.name ?? "document.pdf");
    formData.append("password", password);

    let handledError = false;
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open("POST", `${apiBase}/unlock-pdf`);
        xhr.responseType = "arraybuffer";

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
            const buffer = xhr.response as ArrayBuffer;
            const blob = new Blob([buffer], { type: "application/pdf" });
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setProgress(100);
            setIsComplete(true);
            resolve();
          } else {
            try {
              const buffer = xhr.response as ArrayBuffer;
              const text = new TextDecoder().decode(buffer);
              const data = JSON.parse(text);
              setError(
                data.message ||
                  "Could not unlock this PDF. Please verify the password or file and try again."
              );
            } catch {
              setError(
                "Could not unlock this PDF. Please verify the password or file and try again."
              );
            }
            handledError = true;
            reject(new Error(`Request failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => {
          window.clearInterval(interval);
          handledError = true;
          reject(new Error("Network error while uploading file"));
        };

        xhr.send(formData);
      });
    } catch (err) {
      if (!handledError) {
        console.error("Error unlocking PDF", err);
        setError(
          "Something went wrong while unlocking your PDF. Please check the password and try again."
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setPassword("");
    setIsComplete(false);
    setError(null);
    setIsEncrypted(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setUploadKey((prev) => prev + 1);
    setProgress(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    if (files.length === 0) {
      setIsEncrypted(null);
      return;
    }

    const first = files[0]?.file as File | undefined;
    if (!first) return;

    if (uploadRef.current) {
      const rect = uploadRef.current.getBoundingClientRect();
      const offset = window.scrollY + rect.top + 270;
      window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
    }

    const checkEncryption = async () => {
      try {
        const formData = new FormData();
        formData.append("file", first, first.name ?? "document.pdf");

        const res = await fetch(`${apiBase}/pdf-encryption-status`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          console.error("Failed to check encryption status", await res.text());
          return;
        }

        const data = await res.json();
        if (!data.encrypted) {
          setIsEncrypted(false);
          setError("This PDF is not password-protected and does not need unlocking.");
        } else {
          setIsEncrypted(true);
          // Clear stale not-protected error, if any
          setError((prev) =>
            prev === "This PDF is not password-protected and does not need unlocking."
              ? null
              : prev
          );
        }
      } catch (err) {
        console.error("Error checking encryption status (unlock)", err);
      }
    };

    checkEncryption();
  }, [files]);

  useEffect(() => {
    if (isProcessing && !isComplete && loadingRef.current) {
      const rect = loadingRef.current.getBoundingClientRect();
      const offset = window.scrollY + rect.top - 180;
      window.scrollTo({ top: Math.max(offset, 0), behavior: "smooth" });
    }
  }, [isProcessing, isComplete]);

  return (
    <ToolPageLayout
      title="Unlock PDF"
      description="Remove password protection from PDFs you own by entering the correct password."
      icon={Unlock}
      iconColor="secondary"
    >
      <div className="mx-auto max-w-3xl">
        {!isComplete ? (
          isProcessing ? (
            <div ref={loadingRef} className="py-16 flex flex-col items-center gap-6">
              <h2 className="text-2xl font-semibold">Unlocking PDF...</h2>
              <div className="relative h-24 w-24">
                <div className="h-24 w-24 rounded-full border-[6px] border-secondary-foreground/10" />
                <div className="absolute inset-0 rounded-full border-[6px] border-secondary border-t-transparent animate-spin" />
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
              {error && (
                <p className="mb-4 text-sm text-destructive text-center max-w-md mx-auto">{error}</p>
              )}

              <div ref={uploadRef}>
                <FileUploadZone
                  key={uploadKey}
                  accept=".pdf"
                  multiple={false}
                  maxFiles={1}
                  showThumbnails={false}
                  onFilesChange={setFiles}
                />
              </div>

              {files.length > 0 && (
                <div ref={previewRef} className="mt-8 space-y-6">
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h3 className="font-semibold mb-4">Enter Password</h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="unlock-password">PDF Password</Label>
                        <div className="relative mt-1">
                          <Input
                            id="unlock-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password to unlock"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        We do not store your password or files. Unlocking happens securely on the server.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-4">
                    <Button
                      size="lg"
                      className="btn-hero gradient-secondary"
                      onClick={handleProcess}
                      disabled={isProcessing || !allReady || !password || isEncrypted === false}
                    >
                      Unlock PDF
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
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/10">
              <Unlock className="h-10 w-10 text-secondary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Unlocked Successfully!</h2>
            <p className="text-muted-foreground mb-8">
              Your PDF is now unlocked and free of password protection.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                className="btn-hero gradient-secondary"
                onClick={() => {
                  if (!downloadUrl) return;
                  const link = document.createElement("a");
                  link.href = downloadUrl;
                  const baseName = (files[0]?.name || "document").replace(/\.pdf$/i, "");
                  link.download = `${baseName}-unlocked.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                disabled={!downloadUrl}
              >
                <Download className="h-5 w-5 mr-2" />
                Download Unlocked PDF
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Unlock another PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
