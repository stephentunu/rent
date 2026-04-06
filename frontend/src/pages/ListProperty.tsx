import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCategories, useLocations } from "@/hooks/useProperties";
import { propertiesApi, uploadApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X, Upload, Home, ImagePlus } from "lucide-react";
import { z } from "zod";

const propertySchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(20, "Description must be at least 20 characters").max(5000),
  price: z.number().positive("Price must be a positive number"),
  listing_type: z.enum(["sale", "rent"]),
  category_id: z.string().min(1, "Please select a category"),
  location_id: z.string().min(1, "Please select a location"),
  address: z.string().max(500).optional(),
  bedrooms: z.number().min(0).max(50).optional(),
  bathrooms: z.number().min(0).max(50).optional(),
  area_sqft: z.number().positive().optional(),
});

const AVAILABLE_FEATURES = [
  "Swimming Pool","Garden","Garage","Security","Gym","Balcony",
  "Air Conditioning","Furnished","Parking","Elevator","Backup Generator",
  "Water Tank","Servant Quarters","CCTV","Borehole",
];

const ListProperty = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const { data: categories } = useCategories();
  const { data: locations } = useLocations();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: "", description: "", price: "", listing_type: "sale" as "sale" | "rent",
    category_id: "", location_id: "", address: "", bedrooms: "", bathrooms: "",
    area_sqft: "", map_place_name: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      toast({ title: "Authentication Required", description: "Please sign in to list a property.", variant: "destructive" });
      navigate("/auth");
    }
  }, [user, authLoading, navigate, toast]);

  const parentCategories = categories?.filter((c) => !c.parent_id) || [];
  const parentLocations = locations?.filter((l) => !l.parent_id) || [];

  const handleAddImage = () => {
    if (newImageUrl && imageUrls.length < 10) { setImageUrls([...imageUrls, newImageUrl]); setNewImageUrl(""); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (imageUrls.length >= 10) break;
        const url = await uploadApi.uploadImage(file);
        setImageUrls((prev) => [...prev, url]);
      }
    } catch {
      toast({ title: "Upload Failed", description: "Could not upload image. Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const toggleFeature = (feature: string) =>
    setSelectedFeatures((prev) => prev.includes(feature) ? prev.filter((f) => f !== feature) : [...prev, feature]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrors({});

    const dataToValidate = {
      title: formData.title, description: formData.description,
      price: parseFloat(formData.price) || 0, listing_type: formData.listing_type,
      category_id: formData.category_id, location_id: formData.location_id,
      address: formData.address || undefined,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
      bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
      area_sqft: formData.area_sqft ? parseFloat(formData.area_sqft) : undefined,
    };

    const result = propertySchema.safeParse(dataToValidate);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => { if (err.path[0]) fieldErrors[err.path[0] as string] = err.message; });
      setErrors(fieldErrors); return;
    }

    setIsSubmitting(true);
    try {
      const data = await propertiesApi.create({
        title: formData.title, description: formData.description,
        price: parseFloat(formData.price), listing_type: formData.listing_type,
        category_id: formData.category_id, location_id: formData.location_id,
        address: formData.map_place_name || formData.address || null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        area_sqft: formData.area_sqft ? parseFloat(formData.area_sqft) : null,
        images: imageUrls, features: selectedFeatures, status: "pending",
      });
      toast({ title: "Property Submitted!", description: "Your property has been submitted for review. It will be visible once approved by an admin." });
      navigate(`/property/${data.id}`);
    } catch {
      toast({ title: "Error", description: "Failed to list property. Please try again.", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="container-wide py-8">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-display font-bold mb-2">List Your Property</h1>
              <p className="text-muted-foreground">Fill in the details below to list your property for sale or rent.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Info */}
              <Card>
                <CardHeader><CardTitle>Basic Information</CardTitle><CardDescription>Provide the essential details about your property</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Property Title *</Label>
                    <Input id="title" placeholder="e.g., Modern 3 Bedroom Apartment in Kilimani" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                    {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Listing Type *</Label>
                      <Select value={formData.listing_type} onValueChange={(v: "sale" | "rent") => setFormData({ ...formData, listing_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="sale">For Sale</SelectItem><SelectItem value="rent">For Rent</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Price (KES) * {formData.listing_type === "rent" && "/ month"}</Label>
                      <Input type="number" placeholder="e.g., 15000000" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
                      {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>{parentCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                      {errors.category_id && <p className="text-sm text-destructive">{errors.category_id}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Location *</Label>
                      <Select value={formData.location_id} onValueChange={(v) => setFormData({ ...formData, location_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                        <SelectContent>{parentLocations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                      </Select>
                      {errors.location_id && <p className="text-sm text-destructive">{errors.location_id}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Full Address</Label>
                    <Input placeholder="e.g., 123 Ngong Road, Kilimani" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description *</Label>
                    <Textarea placeholder="Describe your property in detail..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={6} />
                    {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Property Details */}
              <Card>
                <CardHeader><CardTitle>Property Details</CardTitle><CardDescription>Specify the size and rooms</CardDescription></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Bedrooms</Label><Input type="number" min="0" placeholder="e.g., 3" value={formData.bedrooms} onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Bathrooms</Label><Input type="number" min="0" placeholder="e.g., 2" value={formData.bathrooms} onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Area (sq ft)</Label><Input type="number" min="0" placeholder="e.g., 1500" value={formData.area_sqft} onChange={(e) => setFormData({ ...formData, area_sqft: e.target.value })} /></div>
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardHeader><CardTitle>Features & Amenities</CardTitle><CardDescription>Select all features that apply</CardDescription></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {AVAILABLE_FEATURES.map((feature) => (
                      <label key={feature} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${selectedFeatures.includes(feature) ? "bg-primary/10 border-primary" : "hover:bg-muted"}`}>
                        <Checkbox checked={selectedFeatures.includes(feature)} onCheckedChange={() => toggleFeature(feature)} />
                        <span className="text-sm">{feature}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader><CardTitle>Property Location</CardTitle><CardDescription>Enter the place name for your property</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Place Name</Label>
                    <Input value={formData.map_place_name} onChange={(e) => setFormData({ ...formData, map_place_name: e.target.value })} placeholder="e.g., Kilimani, Nairobi, Kenya" />
                  </div>
                </CardContent>
              </Card>

              {/* Images */}
              <Card>
                <CardHeader><CardTitle>Property Images</CardTitle><CardDescription>Add image URLs or upload files (up to 10)</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <input type="file" ref={fileInputRef} accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
                  <div className="flex gap-2">
                    <Input placeholder="Paste image URL..." value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} />
                    <Button type="button" onClick={handleAddImage} disabled={imageUrls.length >= 10}><Plus className="h-4 w-4" /></Button>
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={imageUrls.length >= 10 || isUploading}>
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    </Button>
                  </div>
                  {imageUrls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden group">
                          <img src={url} alt={`Property ${index + 1}`} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setImageUrls(imageUrls.filter((_, i) => i !== index))}
                            className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {imageUrls.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload or paste image URLs above</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Listing Property...</> : <><Home className="mr-2 h-4 w-4" />List Property</>}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ListProperty;
