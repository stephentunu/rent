import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ChevronDown } from "lucide-react";
import { useCategories, useLocations, useStats } from "@/hooks/useProperties";

export function HeroSection() {
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const { data: locations } = useLocations();
  const { data: stats } = useStats();
  
  const [listingType, setListingType] = useState<"sale" | "rent">("sale");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    params.set("type", listingType);
    if (category) params.set("category", category);
    if (location) params.set("location", location);
    if (maxPrice) params.set("maxPrice", maxPrice);
    navigate(`/properties?${params.toString()}`);
  };

  const parentLocations = locations?.filter(l => !l.parent_id) || [];
  const parentCategories = categories?.filter(c => !c.parent_id) || [];

  return (
    <section className="relative min-h-[600px] lg:min-h-[700px] flex items-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-foreground/40" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-48 h-48 bg-secondary/20 rounded-full blur-3xl" />

      <div className="container-wide relative z-10 py-20">
        <div className="max-w-3xl">
          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-background leading-tight mb-6 animate-fade-up">
            Find Your Perfect
            <span className="text-primary block">Rental in Kenya</span>
          </h1>
          <p className="text-lg text-background/80 mb-10 max-w-xl animate-fade-up stagger-1">
            Discover thousands of properties for sale and rent across Kenya. 
            Your dream home is just a search away.
          </p>

          {/* Search Box */}
          <div className="bg-background rounded-2xl p-2 shadow-dramatic animate-fade-up stagger-2">
            {/* Tabs */}
            <Tabs value={listingType} onValueChange={(v) => setListingType(v as "sale" | "rent")} className="mb-4">
              <TabsList className="grid w-full max-w-[300px] grid-cols-2 bg-muted">
                <TabsTrigger value="sale" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  For Sale
                </TabsTrigger>
                <TabsTrigger value="rent" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  For Rent
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search Fields */}
            <div className="flex flex-col lg:flex-row gap-3">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="lg:w-[180px] h-12 border-border">
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

              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="lg:w-[180px] h-12 border-border">
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

              <Input
                type="number"
                placeholder={`Max Price (KES)`}
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="lg:w-[180px] h-12"
              />

              <Button onClick={handleSearch} size="lg" className="h-12 px-8">
                <Search className="mr-2 h-5 w-5" />
                Search
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-8 mt-10 animate-fade-up stagger-3">
            <div>
              <p className="text-3xl font-display font-bold text-primary">{stats?.properties || 0}</p>
              <p className="text-sm text-background/70">Properties Listed</p>
            </div>
            <div>
              <p className="text-3xl font-display font-bold text-primary">{stats?.agents || 0}</p>
              <p className="text-sm text-background/70">Verified Agents</p>
            </div>
            <div>
              <p className="text-3xl font-display font-bold text-primary">{stats?.locations || 0}</p>
              <p className="text-sm text-background/70">Locations</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
