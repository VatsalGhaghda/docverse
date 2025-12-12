import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Sun, Moon, FileText, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const tools = [
  { name: "Merge PDF", href: "/merge", icon: "📑" },
  { name: "Split PDF", href: "/split", icon: "✂️" },
  { name: "Compress PDF", href: "/compress", icon: "📦" },
  { name: "PDF to Word", href: "/pdf-to-word", icon: "📄" },
  { name: "PDF to Excel", href: "/pdf-to-excel", icon: "📊" },
  { name: "PDF to PowerPoint", href: "/pdf-to-powerpoint", icon: "📽️" },
  { name: "PDF to HTML", href: "/pdf-to-html", icon: "🌐" },
  { name: "Image to PDF", href: "/image-to-pdf", icon: "🖼️" },
  { name: "PDF to Image", href: "/pdf-to-image", icon: "🖼️" },
  { name: "OCR", href: "/ocr", icon: "👁️" },
  { name: "Add Page Numbers", href: "/page-numbers", icon: "🔢" },
  { name: "Organize PDF", href: "/organize", icon: "🧩" },
  { name: "Watermark PDF", href: "/watermark", icon: "💧" },
  { name: "Protect PDF", href: "/protect", icon: "🔐" },
  { name: "Unlock PDF", href: "/unlock", icon: "🔓" },
  { name: "Sign PDF", href: "/sign", icon: "✍️" },
  { name: "Word to PDF", href: "/word-to-pdf", icon: "📝" },
  { name: "Excel to PDF", href: "/excel-to-pdf", icon: "📈" },
  { name: "PPT to PDF", href: "/powerpoint-to-pdf", icon: "📊" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">DocVerse</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 md:flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1">
                  Tools
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48">
                {tools.map((tool) => (
                  <DropdownMenuItem key={tool.name} asChild>
                    <Link to={tool.href} className="flex items-center gap-2">
                      <span>{tool.icon}</span>
                      {tool.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" asChild>
              <Link to="/pricing">Pricing</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/about">About</Link>
            </Button>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* No authentication buttons for now */}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="border-t border-border py-4 md:hidden animate-fade-in">
            <div className="flex flex-col gap-2">
              <p className="px-3 text-sm font-medium text-muted-foreground">Tools</p>
              {tools.map((tool) => (
                <Link
                  key={tool.name}
                  to={tool.href}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => setIsOpen(false)}
                >
                  <span>{tool.icon}</span>
                  {tool.name}
                </Link>
              ))}
              <div className="my-2 border-t border-border" />
              <Link
                to="/pricing"
                className="rounded-lg px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setIsOpen(false)}
              >
                Pricing
              </Link>
              <Link
                to="/about"
                className="rounded-lg px-3 py-2 text-sm hover:bg-muted"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>
              {/* Auth actions removed for no-login experience */}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
