import { useState } from "react";
import { Lock, ArrowRight, RotateCcw, Download, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

export default function ProtectPDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [restrictions, setRestrictions] = useState({
    printing: true,
    copying: true,
    editing: true,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleProcess = () => {
    if (password !== confirmPassword) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
    }, 2000);
  };

  const handleReset = () => {
    setFiles([]);
    setIsComplete(false);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <ToolPageLayout
      title="Protect PDF"
      description="Add password protection to your PDF files. Control who can view, print, or edit your documents."
      icon={Lock}
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
                  <h3 className="font-semibold mb-4">Set Password</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <div className="relative mt-1">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
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
                    
                    <div>
                      <Label htmlFor="confirm">Confirm Password</Label>
                      <Input
                        id="confirm"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="mt-1"
                      />
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-sm text-destructive mt-1">Passwords do not match</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold mb-4">Permissions</h3>
                  
                  <div className="space-y-3">
                    {[
                      { key: "printing", label: "Allow printing" },
                      { key: "copying", label: "Allow copying text" },
                      { key: "editing", label: "Allow editing" },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center gap-3">
                        <Checkbox
                          id={item.key}
                          checked={restrictions[item.key as keyof typeof restrictions]}
                          onCheckedChange={(checked) =>
                            setRestrictions((prev) => ({ ...prev, [item.key]: checked }))
                          }
                        />
                        <Label htmlFor={item.key} className="cursor-pointer">
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4">
                  <Button
                    size="lg"
                    className="btn-hero bg-accent text-accent-foreground hover:bg-accent/90"
                    onClick={handleProcess}
                    disabled={isProcessing || !password || password !== confirmPassword}
                  >
                    {isProcessing ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-foreground border-t-transparent" />
                        Protecting...
                      </>
                    ) : (
                      <>
                        Protect PDF
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
              <Lock className="h-10 w-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Protection Added!</h2>
            <p className="text-muted-foreground mb-8">
              Your PDF files are now password protected.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button size="lg" className="btn-hero bg-accent text-accent-foreground hover:bg-accent/90">
                <Download className="h-5 w-5 mr-2" />
                Download Protected Files
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Protect more files
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
