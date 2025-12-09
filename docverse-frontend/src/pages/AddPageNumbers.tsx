import { useState } from "react";
import { ListOrdered, ArrowRight, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ToolPageLayout } from "@/components/ToolPageLayout";
import { FileUploadZone } from "@/components/FileUploadZone";

export default function AddPageNumbers() {
  const [files, setFiles] = useState<any[]>([]);
  const [format, setFormat] = useState("1");
  const [startAt, setStartAt] = useState("1");
  const [range, setRange] = useState("");
  const [position, setPosition] = useState("bottom-center");
  const [fontSize, setFontSize] = useState([12]);
  const [margin, setMargin] = useState([24]);
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
    setStartAt("1");
    setRange("");
    setFormat("1");
    setPosition("bottom-center");
    setFontSize([12]);
    setMargin([24]);
  };

  return (
    <ToolPageLayout
      title="Add Page Numbers"
      description="Insert page numbers into your PDF with full control over style, position and page range."
      icon={ListOrdered}
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
                <div className="rounded-xl border border-border bg-card p-6 space-y-6">
                  <h3 className="font-semibold">Numbering Options</h3>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Number format</Label>
                      <Select value={format} onValueChange={setFormat}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1, 2, 3...</SelectItem>
                          <SelectItem value="01">01, 02, 03...</SelectItem>
                          <SelectItem value="i">i, ii, iii...</SelectItem>
                          <SelectItem value="I">I, II, III...</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="startAt">Start numbering at</Label>
                      <Input
                        id="startAt"
                        type="number"
                        min={1}
                        value={startAt}
                        onChange={(e) => setStartAt(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="range">Page range (optional)</Label>
                    <Input
                      id="range"
                      placeholder="e.g., 1-10, 15-20 (leave empty for all pages)"
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use commas and dashes to specify ranges. Example: 1-3,5,8-10
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Select value={position} onValueChange={setPosition}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top-left">Top left</SelectItem>
                          <SelectItem value="top-center">Top center</SelectItem>
                          <SelectItem value="top-right">Top right</SelectItem>
                          <SelectItem value="bottom-left">Bottom left</SelectItem>
                          <SelectItem value="bottom-center">Bottom center</SelectItem>
                          <SelectItem value="bottom-right">Bottom right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label>Font size</Label>
                          <span className="text-xs text-muted-foreground">{fontSize[0]} pt</span>
                        </div>
                        <Slider value={fontSize} onValueChange={setFontSize} min={8} max={24} step={1} />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label>Margin from edge</Label>
                          <span className="text-xs text-muted-foreground">{margin[0]} px</span>
                        </div>
                        <Slider value={margin} onValueChange={setMargin} min={8} max={64} step={4} />
                      </div>
                    </div>
                  </div>
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
                        Applying numbers...
                      </>
                    ) : (
                      <>
                        Apply page numbers
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
              <ListOrdered className="h-10 w-10 text-accent" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Page Numbers Added!</h2>
            <p className="text-muted-foreground mb-8">
              Your PDF now includes page numbers according to your settings.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button size="lg" className="btn-hero bg-accent text-accent-foreground hover:bg-accent/90">
                <Download className="h-5 w-5 mr-2" />
                Download Updated PDF
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Add numbers to another PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
}
