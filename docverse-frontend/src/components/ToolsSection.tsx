import { 
  FileStack, 
  Scissors, 
  FileDown, 
  FileOutput, 
  ScanText, 
  Lock,
  Unlock,
  FileSignature,
  FileImage,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCode2,
  ListOrdered,
  PanelsTopLeft,
  Image as ImageIcon,
} from "lucide-react";
import { ToolCard } from "./ToolCard";

const tools = [
  {
    title: "Merge PDF",
    description: "Combine multiple PDF files into one seamless document.",
    icon: FileStack,
    href: "/merge",
    color: "primary" as const,
  },
  {
    title: "Split PDF",
    description: "Extract pages or split your PDF into multiple files.",
    icon: Scissors,
    href: "/split",
    color: "secondary" as const,
  },
  {
    title: "Compress PDF",
    description: "Reduce file size while maintaining document quality.",
    icon: FileDown,
    href: "/compress",
    color: "accent" as const,
  },
  {
    title: "PDF to Word",
    description: "Turn PDFs into editable Word documents.",
    icon: FileText,
    href: "/pdf-to-word",
    color: "primary" as const,
  },
  {
    title: "PDF to Excel",
    description: "Extract tables and data from PDFs to Excel.",
    icon: FileSpreadsheet,
    href: "/pdf-to-excel",
    color: "secondary" as const,
  },
  {
    title: "PDF to PowerPoint",
    description: "Convert PDF slides into PowerPoint presentations.",
    icon: Presentation,
    href: "/pdf-to-powerpoint",
    color: "accent" as const,
  },
  {
    title: "Word to PDF",
    description: "Create print-ready PDFs from Word files.",
    icon: FileText,
    href: "/word-to-pdf",
    color: "primary" as const,
  },
  {
    title: "Excel to PDF",
    description: "Convert spreadsheets into polished PDFs.",
    icon: FileSpreadsheet,
    href: "/excel-to-pdf",
    color: "secondary" as const,
  },
  {
    title: "PowerPoint to PDF",
    description: "Share slide decks safely as PDFs.",
    icon: Presentation,
    href: "/powerpoint-to-pdf",
    color: "accent" as const,
  },
  {
    title: "PDF to HTML",
    description: "Convert PDFs into clean HTML for the web.",
    icon: FileCode2,
    href: "/pdf-to-html",
    color: "primary" as const,
  },
  {
    title: "Image to PDF",
    description: "Combine JPG/PNG images into a single PDF.",
    icon: ImageIcon,
    href: "/image-to-pdf",
    color: "secondary" as const,
  },
  {
    title: "OCR Scanner",
    description: "Extract text from scanned documents and images.",
    icon: ScanText,
    href: "/ocr",
    color: "secondary" as const,
  },
  {
    title: "Protect PDF",
    description: "Add password protection to secure your documents.",
    icon: Lock,
    href: "/protect",
    color: "accent" as const,
  },
  {
    title: "Unlock PDF",
    description: "Remove password protection from PDFs you own.",
    icon: Unlock,
    href: "/unlock",
    color: "secondary" as const,
  },
  {
    title: "Sign PDF",
    description: "Add your signature to documents electronically.",
    icon: FileSignature,
    href: "/sign",
    color: "primary" as const,
  },
  {
    title: "PDF to Image",
    description: "Convert PDF pages to high-quality images.",
    icon: FileImage,
    href: "/pdf-to-image",
    color: "secondary" as const,
  },
  {
    title: "Add Page Numbers",
    description: "Insert page numbers into your PDF.",
    icon: ListOrdered,
    href: "/page-numbers",
    color: "accent" as const,
  },
  {
    title: "Organize PDF",
    description: "Reorder and prepare pages in your PDF.",
    icon: PanelsTopLeft,
    href: "/organize",
    color: "primary" as const,
  },
];

export function ToolsSection() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            All the tools you need
          </h2>
          <p className="text-lg text-muted-foreground">
            Process your documents with our comprehensive suite of PDF tools. 
            Fast, secure, and incredibly easy to use.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool, index) => (
            <div
              key={tool.title}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <ToolCard {...tool} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
