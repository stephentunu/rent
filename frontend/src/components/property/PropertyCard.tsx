import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Heart, MapPin, Bed, Bath, Maximize, ArrowRight, Scale } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { favoritesApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "@/types/property";

interface PropertyCardProps {
  property: Property;
  variant?: "default" | "featured";
}

export function PropertyCard({ property, variant = "default" }: PropertyCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const compareIds = searchParams.get("ids")?.split(",").filter(Boolean) || [];
  const isInCompare = compareIds.includes(property.id);

  useEffect(() => {
    if (user) {
      favoritesApi.check(property.id)
        .then((r) => setIsFavorited(r.isFavorited))
        .catch(() => {});
    }
  }, [user, property.id]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { toast({ title: "Sign in required", description: "Please sign in to save properties." }); return; }
    setIsLoading(true);
    try {
      if (isFavorited) { await favoritesApi.remove(property.id); setIsFavorited(false); toast({ title: "Removed from favorites" }); }
      else { await favoritesApi.add(property.id); setIsFavorited(true); toast({ title: "Added to favorites" }); }
    } catch { toast({ title: "Error", description: "Failed to update favorites", variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  const toggleCompare = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    let newIds: string[];
    if (isInCompare) { newIds = compareIds.filter((id) => id !== property.id); }
    else {
      if (compareIds.length >= 4) { toast({ title: "Compare limit reached", description: "You can compare up to 4 properties at a time." }); return; }
      newIds = [...compareIds, property.id];
    }
    newIds.length > 0 ? setSearchParams({ ids: newIds.join(",") }) : setSearchParams({});
  };

  const formatPrice = (price: number, type: string) => {
    const f = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(price);
    return type === "rent" ? `${f}/mo` : f;
  };

  const isFeaturedCard = variant === "featured" || property.is_featured;

  return (
    <Card className={`group overflow-hidden card-hover border-0 shadow-medium ${isFeaturedCard ? "ring-2 ring-primary/20" : ""}`}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={property.images?.[0] || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600"} alt={property.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
        <div className="absolute top-4 left-4 flex gap-2">
          <Badge variant={property.listing_type === "sale" ? "default" : "secondary"} className="font-medium">For {property.listing_type === "sale" ? "Sale" : "Rent"}</Badge>
          {property.is_new_project && <Badge className="bg-secondary text-secondary-foreground">New Project</Badge>}
          {isFeaturedCard && !property.is_new_project && <Badge className="bg-warning text-foreground">Featured</Badge>}
        </div>
        <div className="absolute top-4 right-4 flex gap-2">
          <Tooltip><TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className={`h-9 w-9 rounded-full bg-background/80 hover:bg-background ${isInCompare ? "text-primary" : "text-foreground"}`} onClick={toggleCompare}>
              <Scale className="h-4 w-4" />
            </Button>
          </TooltipTrigger><TooltipContent>{isInCompare ? "Remove from compare" : "Add to compare"}</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild>
            <Button size="icon" variant="ghost" className={`h-9 w-9 rounded-full bg-background/80 hover:bg-background ${isFavorited ? "text-destructive" : "text-foreground"}`} onClick={toggleFavorite} disabled={isLoading}>
              <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
            </Button>
          </TooltipTrigger><TooltipContent>{isFavorited ? "Remove from favorites" : "Add to favorites"}</TooltipContent></Tooltip>
        </div>
        <div className="absolute bottom-4 left-4">
          <p className="text-2xl font-display font-bold text-background">{formatPrice(property.price, property.listing_type)}</p>
        </div>
      </div>
      <CardContent className="p-5">
        <Link to={`/property/${property.id}`}>
          <h3 className="font-display text-lg font-semibold line-clamp-1 group-hover:text-primary transition-colors">{property.title}</h3>
        </Link>
        {property.location && (
          <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" /><span className="text-sm">{property.location.name}</span>
          </div>
        )}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
          {property.bedrooms && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Bed className="h-4 w-4" /><span>{property.bedrooms} Beds</span></div>}
          {property.bathrooms && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Bath className="h-4 w-4" /><span>{property.bathrooms} Baths</span></div>}
          {property.area_sqft && <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Maximize className="h-4 w-4" /><span>{property.area_sqft.toLocaleString()} sqft</span></div>}
        </div>
        <Link to={`/property/${property.id}`} className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary hover:gap-2 transition-all">
          View Details<ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
