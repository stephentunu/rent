import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturedProperties } from "@/components/home/FeaturedProperties";
import { CategorySection } from "@/components/home/CategorySection";
import { AgentsSection } from "@/components/home/AgentsSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturedProperties />
        <CategorySection />
        <AgentsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
