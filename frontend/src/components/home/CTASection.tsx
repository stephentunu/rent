import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=80')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-secondary/90" />
      </div>

      {/* Decorative circles */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-background/10 rounded-full blur-2xl" />
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-background/10 rounded-full blur-3xl" />

      <div className="container-wide relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl lg:text-5xl font-display font-bold text-background leading-tight">
            Ready to Find Your
            <span className="block">Dream Property?</span>
          </h2>
          <p className="mt-4 text-lg text-background/80 max-w-xl mx-auto">
            Whether you're buying, renting, or selling, we're here to help you every step of the way.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button 
              size="lg" 
              variant="secondary"
              className="bg-background text-foreground hover:bg-background/90"
              asChild
            >
              <Link to="/properties">
                Browse Properties
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-background text-background hover:bg-background/10"
              asChild
            >
              <Link to="/list-property">
                <Plus className="mr-2 h-5 w-5" />
                List Your Property
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
