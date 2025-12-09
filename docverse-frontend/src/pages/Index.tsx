import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ToolsSection } from "@/components/ToolsSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { Footer } from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <ToolsSection />
        <FeaturesSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
