import { Users, Globe, Shield, Zap } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const stats = [
  { label: "Users worldwide", value: "10M+" },
  { label: "Documents processed", value: "500M+" },
  { label: "Countries served", value: "190+" },
  { label: "Uptime", value: "99.9%" },
];

const values = [
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your documents are encrypted and automatically deleted after processing. We never store or access your files.",
  },
  {
    icon: Zap,
    title: "Speed & Efficiency",
    description: "Our cloud infrastructure processes documents in seconds, not minutes. Get your work done faster.",
  },
  {
    icon: Globe,
    title: "Accessible Anywhere",
    description: "Work from any device, any browser. No downloads or installations required.",
  },
  {
    icon: Users,
    title: "Built for Everyone",
    description: "From students to enterprises, our tools are designed to be intuitive and powerful.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-muted/30 py-20 lg:py-28">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-6 text-4xl font-bold sm:text-5xl">
                Making document processing{" "}
                <span className="text-gradient">simple for everyone</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                DocVerse was founded with a simple mission: to give everyone access to 
                professional-grade PDF tools without the complexity or cost.
              </p>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-3xl font-bold text-gradient sm:text-4xl">{stat.value}</p>
                  <p className="text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="border-y border-border bg-muted/30 py-20">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">Our Values</h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {values.map((value) => (
                <div key={value.title} className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl gradient-primary">
                    <value.icon className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h3 className="mb-2 font-semibold">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-6 text-3xl font-bold">Our Story</h2>
              <div className="prose prose-lg text-muted-foreground">
                <p className="mb-4">
                  DocVerse started in 2020 when our founders, frustrated with expensive and 
                  complicated PDF software, decided to build something better. Something that 
                  anyone could use, from anywhere, without breaking the bank.
                </p>
                <p className="mb-4">
                  Today, we serve millions of users across 190+ countries. From students 
                  preparing assignments to enterprises processing thousands of documents daily, 
                  our tools help people get things done.
                </p>
                <p>
                  We're committed to continuous improvement, regularly adding new features and 
                  optimizing our tools based on user feedback. Your success is our success.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
