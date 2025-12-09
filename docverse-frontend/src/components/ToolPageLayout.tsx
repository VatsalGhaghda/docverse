import { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LucideIcon } from "lucide-react";

interface ToolPageLayoutProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: "primary" | "secondary" | "accent";
  children: ReactNode;
}

const colorClasses = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  accent: "bg-accent/10 text-accent",
};

export function ToolPageLayout({
  title,
  description,
  icon: Icon,
  iconColor,
  children,
}: ToolPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Header */}
        <section className="border-b border-border bg-muted/30 py-12 lg:py-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center text-center">
              <div className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl ${colorClasses[iconColor]}`}>
                <Icon className="h-8 w-8" />
              </div>
              <h1 className="mb-3 text-3xl font-bold sm:text-4xl">{title}</h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                {description}
              </p>
            </div>
          </div>
        </section>

        {/* Tool Content */}
        <section className="py-12 lg:py-16">
          <div className="container mx-auto px-4">
            {children}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
