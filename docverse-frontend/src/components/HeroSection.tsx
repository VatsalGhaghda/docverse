import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden gradient-hero py-20 lg:py-32">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
      </div>
      {/* Snow overlay */}
      <div className="snow-overlay" />

      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-4 py-2 text-sm backdrop-blur-sm animate-fade-in">
            <Sparkles className="h-4 w-4 text-accent" />
            <span>Trusted by over 1 million users worldwide</span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            Every PDF tool you need,{" "}
            <span className="text-gradient">all in one place</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            Merge, split, compress, convert, and edit your documents with ease. 
            Professional-grade tools that are simple, secure, and lightning fast.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <Button size="lg" className="btn-hero gradient-primary shadow-primary hover:opacity-90" asChild>
              <Link to="/merge">
                Start for free
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="btn-hero" asChild>
              <Link to="/about">See how it works</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <p className="mb-4 text-sm text-muted-foreground">Trusted by teams at</p>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-60 grayscale">
              {["Google", "Microsoft", "Adobe", "Stripe", "Notion"].map((company) => (
                <span key={company} className="text-lg font-semibold">
                  {company}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
