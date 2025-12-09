import { Shield, Zap, Cloud, Globe } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Process documents in seconds with our optimized cloud infrastructure. No waiting, no delays.",
  },
  {
    icon: Shield,
    title: "Bank-Level Security",
    description: "Your files are encrypted during transfer and automatically deleted after processing.",
  },
  {
    icon: Cloud,
    title: "Works Everywhere",
    description: "Access from any device, any browser. No software installation required.",
  },
  {
    icon: Globe,
    title: "20+ Languages",
    description: "OCR and document processing in multiple languages for global teams.",
  },
];

export function FeaturesSection() {
  return (
    <section className="border-y border-border bg-muted/30 py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Why choose DocVerse?
          </h2>
          <p className="text-lg text-muted-foreground">
            Built for professionals who value speed, security, and simplicity.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="feature-card text-center animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary">
                <feature.icon className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
