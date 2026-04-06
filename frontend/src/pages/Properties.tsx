import { useState, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PropertyCard } from "@/components/property/PropertyCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useProperties, useCategories, useLocations } from "@/hooks/useProperties";
import { Search, SlidersHorizontal, X, Loader2, Home, Scale } from "lucide-react";

const FEATURES_LIST = [
  "Swimming Pool",
  "Garden",
  "Garage",
  "Security",
  "Gym",
  "Balcony",
  "Air Conditioning",
  "Furnished",
  "Parking",
  "Elevator",
];

const Properties = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: categories } = useCategories();
  const { data: locations } = useLocations();
  
  const listingType = (searchParams.get("type") as "sale" | "rent") || "sale";
  const categorySlug = searchParams.get("category") || "";
  const locationSlug = searchParams.get("location") || "";
  const compareIds = searchParams.get("ids")?.split(",").filter(Boolean) || [];
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000000]);
  const [minBedrooms, setMinBedrooms] = useState<string>("any");
  const [minBathrooms, setMinBathrooms] = useState<string>("any");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const parentCategories = categories?.filter(c => !c.parent_id) || [];
  const parentLocations = locations?.filter(l => !l.parent_id) || [];

  const selectedCategory = categories?.find(c => c.slug === categorySlug);
  const selectedLocation = locations?.find(l => l.slug === locationSlug);

  const { data: properties, isLoading } = useProperties({
    listingType: listingType,
    categoryId: selectedCategory?.id,
    locationId: selectedLocation?.id,
  });

  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    
    let filtered = [...properties];
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.address?.toLowerCase().includes(term)
      );
    }

    // Price filter
    filtered = filtered.filter(p => 
      p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    // Bedrooms filter
    if (minBedrooms !== "any") {
      const min = parseInt(minBedrooms);
      filtered = filtered.filter(p => (p.bedrooms || 0) >= min);
    }

    // Bathrooms filter
    if (minBathrooms !== "any") {
      const min = parseInt(minBathrooms);
      filtered = filtered.filter(p => (p.bathrooms || 0) >= min);
    }

    // Features filter
    if (selectedFeatures.length > 0) {
      filtered = filtered.filter(p => 
        selectedFeatures.every(feature => p.features?.includes(feature))
      );
    }

    // Sort
    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "bedrooms":
        filtered.sort((a, b) => (b.bedrooms || 0) - (a.bedrooms || 0));
        break;
      case "area":
        filtered.sort((a, b) => (b.area_sqft || 0) - (a.area_sqft || 0));
        break;
      case "newest":
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return filtered;
  }, [properties, searchTerm, sortBy, priceRange, minBedrooms, minBathrooms, selectedFeatures]);

  const updateParams = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams({ type: listingType });
    setSearchTerm("");
    setPriceRange([0, 100000000]);
    setMinBedrooms("any");
    setMinBathrooms("any");
    setSelectedFeatures([]);
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const hasFilters = categorySlug || locationSlug || searchTerm || 
    priceRange[0] > 0 || priceRange[1] < 100000000 || 
    minBedrooms !== "any" || minBathrooms !== "any" || selectedFeatures.length > 0;

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `KES ${(price / 1000000).toFixed(1)}M`;
    }
    return `KES ${(price / 1000).toFixed(0)}K`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Page Header */}
        <div className="bg-muted/50 border-b">
          <div className="container-wide py-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Link to="/" className="hover:text-primary">Home</Link>
              <span>/</span>
              <span className="text-foreground">Properties</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-display font-bold">
              Properties for {listingType === "sale" ? "Sale" : "Rent"}
              {selectedCategory && <span className="text-primary"> - {selectedCategory.name}</span>}
              {selectedLocation && <span> in {selectedLocation.name}</span>}
            </h1>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b sticky top-16 bg-background z-40">
          <div className="container-wide py-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Tabs */}
              <Tabs value={listingType} onValueChange={(v) => updateParams("type", v)}>
                <TabsList className="grid w-full max-w-[240px] grid-cols-2">
                  <TabsTrigger value="sale">For Sale</TabsTrigger>
                  <TabsTrigger value="rent">For Rent</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-1 flex-wrap gap-3">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search properties..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Category */}
                <Select value={categorySlug || "all"} onValueChange={(v) => updateParams("category", v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {parentCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.slug}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Location */}
                <Select value={locationSlug || "all"} onValueChange={(v) => updateParams("location", v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {parentLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.slug}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="bedrooms">Most Bedrooms</SelectItem>
                    <SelectItem value="area">Largest Area</SelectItem>
                  </SelectContent>
                </Select>

                {/* Advanced Filters */}
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="default">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      More Filters
                      {(minBedrooms !== "any" || minBathrooms !== "any" || selectedFeatures.length > 0 || priceRange[0] > 0 || priceRange[1] < 100000000) && (
                        <Badge variant="secondary" className="ml-2">
                          {[
                            minBedrooms !== "any" ? 1 : 0,
                            minBathrooms !== "any" ? 1 : 0,
                            selectedFeatures.length > 0 ? 1 : 0,
                            (priceRange[0] > 0 || priceRange[1] < 100000000) ? 1 : 0,
                          ].reduce((a, b) => a + b, 0)}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-[400px] sm:max-w-[400px]">
                    <SheetHeader>
                      <SheetTitle>Advanced Filters</SheetTitle>
                      <SheetDescription>
                        Narrow down your property search
                      </SheetDescription>
                    </SheetHeader>

                    <div className="mt-6 space-y-6">
                      {/* Price Range */}
                      <div className="space-y-4">
                        <Label>Price Range</Label>
                        <Slider
                          value={priceRange}
                          onValueChange={(v) => setPriceRange(v as [number, number])}
                          min={0}
                          max={100000000}
                          step={1000000}
                          className="mt-2"
                        />
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{formatPrice(priceRange[0])}</span>
                          <span>{formatPrice(priceRange[1])}</span>
                        </div>
                      </div>

                      {/* Bedrooms */}
                      <div className="space-y-2">
                        <Label>Minimum Bedrooms</Label>
                        <Select value={minBedrooms} onValueChange={setMinBedrooms}>
                          <SelectTrigger>
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="1">1+</SelectItem>
                            <SelectItem value="2">2+</SelectItem>
                            <SelectItem value="3">3+</SelectItem>
                            <SelectItem value="4">4+</SelectItem>
                            <SelectItem value="5">5+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Bathrooms */}
                      <div className="space-y-2">
                        <Label>Minimum Bathrooms</Label>
                        <Select value={minBathrooms} onValueChange={setMinBathrooms}>
                          <SelectTrigger>
                            <SelectValue placeholder="Any" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="1">1+</SelectItem>
                            <SelectItem value="2">2+</SelectItem>
                            <SelectItem value="3">3+</SelectItem>
                            <SelectItem value="4">4+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Features */}
                      <div className="space-y-3">
                        <Label>Features & Amenities</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {FEATURES_LIST.map((feature) => (
                            <div
                              key={feature}
                              className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                                selectedFeatures.includes(feature)
                                  ? "bg-primary/10 border-primary"
                                  : "hover:bg-muted"
                              }`}
                              onClick={() => toggleFeature(feature)}
                            >
                              <Checkbox checked={selectedFeatures.includes(feature)} />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setPriceRange([0, 100000000]);
                          setMinBedrooms("any");
                          setMinBathrooms("any");
                          setSelectedFeatures([]);
                        }}
                      >
                        Reset Filters
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>

                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-1 h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Active Filters */}
            {hasFilters && (
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {selectedCategory && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedCategory.name}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => updateParams("category", "")}
                    />
                  </Badge>
                )}
                {selectedLocation && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedLocation.name}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => updateParams("location", "")}
                    />
                  </Badge>
                )}
                {searchTerm && (
                  <Badge variant="secondary" className="gap-1">
                    "{searchTerm}"
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setSearchTerm("")}
                    />
                  </Badge>
                )}
                {(priceRange[0] > 0 || priceRange[1] < 100000000) && (
                  <Badge variant="secondary" className="gap-1">
                    {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setPriceRange([0, 100000000])}
                    />
                  </Badge>
                )}
                {minBedrooms !== "any" && (
                  <Badge variant="secondary" className="gap-1">
                    {minBedrooms}+ beds
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setMinBedrooms("any")}
                    />
                  </Badge>
                )}
                {minBathrooms !== "any" && (
                  <Badge variant="secondary" className="gap-1">
                    {minBathrooms}+ baths
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setMinBathrooms("any")}
                    />
                  </Badge>
                )}
                {selectedFeatures.map((feature) => (
                  <Badge key={feature} variant="secondary" className="gap-1">
                    {feature}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => toggleFeature(feature)}
                    />
                  </Badge>
                ))}
              </div>
            )}

            {/* Compare Bar */}
            {compareIds.length > 0 && (
              <div className="mt-4 p-3 bg-primary/10 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {compareIds.length} {compareIds.length === 1 ? "property" : "properties"} selected for comparison
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.delete("ids");
                      setSearchParams(newParams);
                    }}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/compare?ids=${compareIds.join(",")}`)}
                    disabled={compareIds.length < 2}
                  >
                    Compare Now
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="container-wide py-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProperties.length > 0 ? (
            <>
              <p className="text-muted-foreground mb-6">
                Showing {filteredProperties.length} {filteredProperties.length === 1 ? "property" : "properties"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProperties.map((property, index) => (
                  <div 
                    key={property.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <PropertyCard property={property} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <Home className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No properties found</h3>
              <p className="text-muted-foreground mb-6">
                Try adjusting your filters or search term
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Properties;
