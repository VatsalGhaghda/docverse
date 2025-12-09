import { useState } from "react";
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

  const handleProcess = () => {
    if (!password) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
    }, 2000);
  };

  const handleReset = () => {
    setFiles([]);
    setPassword("");
    setIsComplete(false);
  };

  return (
    <ToolPageLayout
      title="Unlock PDF"
      description="Remove password protection from PDFs you own by entering the correct password."
      icon={Unlock}
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
                    disabled={isProcessing || !password}
                  >
                    {isProcessing ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-secondary-foreground border-t-transparent" />
                        Unlocking...
                      </>
                    ) : (
                      <>
                        Unlock PDF
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
              <Unlock className="h-10 w-10 text-secondary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Unlocked Successfully!</h2>
            <p className="text-muted-foreground mb-8">
              Your PDF is now unlocked and free of password protection.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button size="lg" className="btn-hero gradient-secondary">
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
