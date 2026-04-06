import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { propertiesApi } from "@/services/api";
import { 
  Loader2, X, Plus, MapPin, Bed, Bath, Maximize, 
  CheckCircle2, XCircle, ArrowLeft, Scale
} from "lucide-react";
import type { Property } from "@/types/property";

const Compare = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const propertyIds = searchParams.get("ids")?.split(",").filter(Boolean) || [];

  useEffect(() => {
    if (propertyIds.length > 0) {
      fetchProperties();
    } else {
      setIsLoading(false);
    }
  }, [searchParams]);

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const data = await propertiesApi.byIds(propertyIds);
      setProperties(data as Property[]);
    } catch (err) {
      console.error("Error fetching properties:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const removeProperty = (id: string) => {
    const newIds = propertyIds.filter((pid) => pid !== id);
    if (newIds.length > 0) {
      setSearchParams({ ids: newIds.join(",") });
    } else {
      setSearchParams({});
    }
  };

  const formatPrice = (price: number, type: string) => {
    const formatted = new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(price);
    return type === "rent" ? `${formatted}/mo` : formatted;
  };

  // Get all unique features across all properties
  const allFeatures = [...new Set(properties.flatMap((p) => p.features || []))].sort();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="bg-background border-b">
          <div className="container-wide py-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link to="/" className="hover:text-primary">Home</Link>
              <span>/</span>
              <Link to="/properties" className="hover:text-primary">Properties</Link>
              <span>/</span>
              <span className="text-foreground">Compare</span>
            </div>
            <div className="flex items-center gap-4">
              <Scale className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl lg:text-3xl font-display font-bold">
                  Compare Properties
                </h1>
                <p className="text-muted-foreground">
                  {properties.length} {properties.length === 1 ? "property" : "properties"} selected
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container-wide py-8">
          {properties.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <Scale className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No Properties to Compare</h2>
                <p className="text-muted-foreground mb-6">
                  Add properties to compare their features side by side.
                </p>
                <Button asChild>
                  <Link to="/properties">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Browse Properties
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr>
                    <th className="text-left p-4 bg-muted font-semibold sticky left-0 min-w-[200px]">
                      Property Details
                    </th>
                    {properties.map((property) => (
                      <th key={property.id} className="p-4 text-left min-w-[300px]">
                        <Card className="overflow-hidden">
                          <div className="relative aspect-[16/10]">
                            <img
                              src={
                                property.images?.[0] ||
                                "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"
                              }
                              alt={property.title}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => removeProperty(property.id)}
                              className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full"
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <Badge
                              className="absolute bottom-2 left-2"
                              variant={property.listing_type === "sale" ? "default" : "secondary"}
                            >
                              For {property.listing_type === "sale" ? "Sale" : "Rent"}
                            </Badge>
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold line-clamp-2 mb-2">
                              <Link
                                to={`/property/${property.id}`}
                                className="hover:text-primary"
                              >
                                {property.title}
                              </Link>
                            </h3>
                            <p className="text-xl font-bold text-primary">
                              {formatPrice(property.price, property.listing_type)}
                            </p>
                          </CardContent>
                        </Card>
                      </th>
                    ))}
                    {properties.length < 4 && (
                      <th className="p-4 min-w-[200px]">
                        <Button variant="outline" asChild className="h-full min-h-[200px] w-full">
                          <Link to="/properties">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Property
                          </Link>
                        </Button>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {/* Location */}
                  <tr className="border-t">
                    <td className="p-4 bg-muted font-medium sticky left-0">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        Location
                      </div>
                    </td>
                    {properties.map((property) => (
                      <td key={property.id} className="p-4">
                        {property.location?.name || "-"}
                      </td>
                    ))}
                    {properties.length < 4 && <td />}
                  </tr>

                  {/* Category */}
                  <tr className="border-t">
                    <td className="p-4 bg-muted font-medium sticky left-0">
                      Category
                    </td>
                    {properties.map((property) => (
                      <td key={property.id} className="p-4">
                        {property.category?.name || "-"}
                      </td>
                    ))}
                    {properties.length < 4 && <td />}
                  </tr>

                  {/* Bedrooms */}
                  <tr className="border-t">
                    <td className="p-4 bg-muted font-medium sticky left-0">
                      <div className="flex items-center gap-2">
                        <Bed className="h-4 w-4 text-primary" />
                        Bedrooms
                      </div>
                    </td>
                    {properties.map((property) => (
                      <td key={property.id} className="p-4">
                        {property.bedrooms || "-"}
                      </td>
                    ))}
                    {properties.length < 4 && <td />}
                  </tr>

                  {/* Bathrooms */}
                  <tr className="border-t">
                    <td className="p-4 bg-muted font-medium sticky left-0">
                      <div className="flex items-center gap-2">
                        <Bath className="h-4 w-4 text-primary" />
                        Bathrooms
                      </div>
                    </td>
                    {properties.map((property) => (
                      <td key={property.id} className="p-4">
                        {property.bathrooms || "-"}
                      </td>
                    ))}
                    {properties.length < 4 && <td />}
                  </tr>

                  {/* Area */}
                  <tr className="border-t">
                    <td className="p-4 bg-muted font-medium sticky left-0">
                      <div className="flex items-center gap-2">
                        <Maximize className="h-4 w-4 text-primary" />
                        Area (sq ft)
                      </div>
                    </td>
                    {properties.map((property) => (
                      <td key={property.id} className="p-4">
                        {property.area_sqft?.toLocaleString() || "-"}
                      </td>
                    ))}
                    {properties.length < 4 && <td />}
                  </tr>

                  {/* Features Header */}
                  {allFeatures.length > 0 && (
                    <tr className="border-t">
                      <td
                        colSpan={properties.length + 2}
                        className="p-4 bg-muted/50 font-semibold"
                      >
                        Features & Amenities
                      </td>
                    </tr>
                  )}

                  {/* Individual Features */}
                  {allFeatures.map((feature) => (
                    <tr key={feature} className="border-t">
                      <td className="p-4 bg-muted font-medium sticky left-0">
                        {feature}
                      </td>
                      {properties.map((property) => (
                        <td key={property.id} className="p-4 text-center">
                          {property.features?.includes(feature) ? (
                            <CheckCircle2 className="h-5 w-5 text-success inline" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground/40 inline" />
                          )}
                        </td>
                      ))}
                      {properties.length < 4 && <td />}
                    </tr>
                  ))}

                  {/* View Property Button */}
                  <tr className="border-t">
                    <td className="p-4 bg-muted sticky left-0" />
                    {properties.map((property) => (
                      <td key={property.id} className="p-4">
                        <Button asChild className="w-full">
                          <Link to={`/property/${property.id}`}>View Details</Link>
                        </Button>
                      </td>
                    ))}
                    {properties.length < 4 && <td />}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Compare;
