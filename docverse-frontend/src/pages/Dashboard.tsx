import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  FileText, 
  FileStack, 
  Scissors, 
  FileDown, 
  Clock, 
  HardDrive,
  Settings,
  Download,
  Trash2,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/Navbar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const recentFiles = [
  { id: 1, name: "Report_2024.pdf", action: "Merged", date: "2 hours ago", size: "2.4 MB" },
  { id: 2, name: "Contract_v2.pdf", action: "Compressed", date: "5 hours ago", size: "1.1 MB" },
  { id: 3, name: "Presentation.pdf", action: "Split", date: "Yesterday", size: "5.8 MB" },
  { id: 4, name: "Invoice_March.pdf", action: "Converted", date: "2 days ago", size: "0.8 MB" },
];

const quickTools = [
  { name: "Merge", icon: FileStack, href: "/merge", color: "primary" },
  { name: "Split", icon: Scissors, href: "/split", color: "secondary" },
  { name: "Compress", icon: FileDown, href: "/compress", color: "accent" },
];

export default function Dashboard() {
  const [storageUsed] = useState(45);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
          <p className="text-muted-foreground">Here's what's happening with your documents.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Tools */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-3 gap-4">
                {quickTools.map((tool) => (
                  <Link
                    key={tool.name}
                    to={tool.href}
                    className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 transition-all hover:border-primary hover:bg-primary/5"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-${tool.color}/10`}>
                      <tool.icon className={`h-6 w-6 text-${tool.color}`} />
                    </div>
                    <span className="font-medium">{tool.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Recent Files */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Recent Files</h2>
                <Button variant="ghost" size="sm">View all</Button>
              </div>
              <div className="space-y-3">
                {recentFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 rounded-lg border border-border p-3 transition-all hover:bg-muted/50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {file.action} • {file.date}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">{file.size}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Storage */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold">Storage</h2>
              </div>
              <Progress value={storageUsed} className="h-2 mb-3" />
              <p className="text-sm text-muted-foreground">
                {storageUsed}% used of 5 GB
              </p>
              <Button variant="outline" size="sm" className="w-full mt-4">
                Upgrade Storage
              </Button>
            </div>

            {/* Processing Queue */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold">Processing Queue</h2>
              </div>
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No files in queue</p>
              </div>
            </div>

            {/* Settings */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold">Quick Settings</h2>
              </div>
              <div className="space-y-3">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Account Settings
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Notification Preferences
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  API Keys
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
