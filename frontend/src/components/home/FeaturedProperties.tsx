import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PropertyCard } from "@/components/property/PropertyCard";
import { useProperties } from "@/hooks/useProperties";
import { ArrowRight, Loader2, Home } from "lucide-react";

export function FeaturedProperties() {
  // First try featured properties
  const { data: featured, isLoading: loadingFeatured } = useProperties({
    isFeatured: true,
    limit: 6,
  });

  // Fallback: latest active properties when no featured ones exist
  const { data: latest, isLoading: loadingLatest } = useProperties({
    limit: 6,
  });

  const isLoading = loadingFeatured || (featured?.length === 0 && loadingLatest);
  const hasFeatured = featured && featured.length > 0;
  const properties = hasFeatured ? featured : latest;

  return (
    <section className="py-20 bg-muted/30">
      <div className="container-wide">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h2 className="text-3xl lg:text-4xl font-display font-bold">
              {hasFeatured ? (
                <>Featured <span className="text-primary">Properties</span></>
              ) : (
                <>Latest <span className="text-primary">Properties</span></>
              )}
            </h2>
            <p className="text-muted-foreground mt-2">
              {hasFeatured
                ? "Handpicked properties that stand out from the rest"
                : "Browse the most recently listed properties across Kenya"}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/properties">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : properties && properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property, index) => (
              <div
                key={property.id}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <PropertyCard property={property} variant={hasFeatured ? "featured" : "default"} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Home className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No properties yet</h3>
            <p className="text-muted-foreground mb-6">
              Be the first to list a property on Rent In.
            </p>
            <Button asChild>
              <Link to="/list-property">List a Property</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}