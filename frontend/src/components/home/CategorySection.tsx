import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Building2, Map, Store, Castle, Briefcase, ArrowRight } from "lucide-react";

const categories = [
  {
    name: "Houses",
    slug: "houses",
    icon: Home,
    description: "Family homes, bungalows & villas",
    color: "bg-primary/10 text-primary",
  },
  {
    name: "Apartments",
    slug: "apartments",
    icon: Building2,
    description: "Flats, penthouses & studios",
    color: "bg-secondary/10 text-secondary",
  },
  {
    name: "Land",
    slug: "land",
    icon: Map,
    description: "Residential & commercial plots",
    color: "bg-accent/10 text-accent",
  },
  {
    name: "Commercial",
    slug: "commercial",
    icon: Store,
    description: "Offices, shops & warehouses",
    color: "bg-info/10 text-info",
  },
  {
    name: "Villas",
    slug: "villas",
    icon: Castle,
    description: "Luxury villas & mansions",
    color: "bg-warning/10 text-warning",
  },
  {
    name: "Offices",
    slug: "offices",
    icon: Briefcase,
    description: "Modern office spaces",
    color: "bg-success/10 text-success",
  },
];

export function CategorySection() {
  return (
    <section className="py-20">
      <div className="container-wide">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl lg:text-4xl font-display font-bold">
            Browse by <span className="text-primary">Category</span>
          </h2>
          <p className="text-muted-foreground mt-3">
            Find exactly what you're looking for with our property categories
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => (
            <Link
              key={category.slug}
              to={`/properties?category=${category.slug}`}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Card className="group h-full card-hover border-0 shadow-soft hover:shadow-elevated">
                <CardContent className="p-6 flex items-center gap-5">
                  <div className={`flex items-center justify-center w-16 h-16 rounded-xl ${category.color} transition-transform group-hover:scale-110`}>
                    <category.icon className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {category.description}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
