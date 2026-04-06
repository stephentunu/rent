import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProperty } from "@/hooks/useProperties";
import { useAuth } from "@/contexts/AuthContext";
import {
  MapPin, Bed, Bath, Maximize, Heart, Share2, Mail, CheckCircle2,
  Loader2, ArrowLeft, Calendar, Home, MessageSquare, Phone, Eye, Star,
} from "lucide-react";
import { favoritesApi, inquiriesApi, messagesApi, propertiesApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { PropertyMap } from "@/components/property/PropertyMap";
import { MpesaPayment } from "@/components/payment/MpesaPayment";
import { MortgageCalculator } from "@/components/property/MortgageCalculator";
import { ReviewStars } from "@/components/property/ReviewStars";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: property, isLoading, error } = useProperty(id || "");
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeImage, setActiveImage] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  const { data: reviews } = useQuery({
    queryKey: ["property-reviews", id],
    queryFn: () => propertiesApi.getReviews(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (user && id) favoritesApi.check(id).then(r => setIsFavorited(r.isFavorited)).catch(() => {});
  }, [user, id]);

  const toggleFavorite = async () => {
    if (!user) { toast({ title: "Sign in required" }); navigate("/auth"); return; }
    try {
      if (isFavorited) { await favoritesApi.remove(id!); setIsFavorited(false); toast({ title: "Removed from favorites" }); }
      else { await favoritesApi.add(id!); setIsFavorited(true); toast({ title: "Added to favorites" }); }
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const startConversation = async () => {
    if (!user) { toast({ title: "Sign in required" }); navigate("/auth"); return; }
    if (!property?.user_id || property.user_id === user.id) {
      toast({ title: "Cannot message", description: "You cannot message yourself.", variant: "destructive" }); return;
    }
    try {
      await messagesApi.startConversation(property.id, property.user_id);
      toast({ title: "Conversation started!" });
      navigate("/messages");
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;
    setIsSubmitting(true);
    try {
      await inquiriesApi.create({ property_id: property.id, name: formData.name, email: formData.email, phone: formData.phone || undefined, message: formData.message });
      toast({ title: "Inquiry Sent!", description: "The owner will get back to you soon." });
      setFormData({ name: "", email: "", phone: "", message: "" });
    } catch { toast({ title: "Error", description: "Failed to send inquiry.", variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const handleReview = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!userRating) { toast({ title: "Please select a rating", variant: "destructive" }); return; }
    setIsReviewing(true);
    try {
      await propertiesApi.addReview(id!, userRating, reviewComment);
      toast({ title: "Review submitted!" });
      setUserRating(0); setReviewComment("");
      qc.invalidateQueries({ queryKey: ["property-reviews", id] });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setIsReviewing(false); }
  };

  const shareProperty = () => {
    if (navigator.share) {
      navigator.share({ title: property?.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link copied to clipboard!" });
    }
  };

  const formatPrice = (price: number, type: string) => {
    const f = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(price);
    return type === "rent" ? `${f}/month` : f;
  };

  if (isLoading) return (
    <div className="min-h-screen flex flex-col"><Header />
      <main className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main>
      <Footer /></div>
  );
  if (error || !property) return (
    <div className="min-h-screen flex flex-col"><Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center"><Home className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Property Not Found</h2>
          <Button asChild><Link to="/properties"><ArrowLeft className="mr-2 h-4 w-4" />Back to Properties</Link></Button>
        </div>
      </main><Footer /></div>
  );

  const images = property.images?.length > 0 ? property.images : ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200"];
  const whatsappMsg = encodeURIComponent(`Hi, I'm interested in your property: ${property.title}\n${window.location.href}`);
  const ownerPhone = property.owner?.phone;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-muted/50 border-b">
          <div className="container-wide py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-primary">Home</Link><span>/</span>
              <Link to="/properties" className="hover:text-primary">Properties</Link><span>/</span>
              <span className="text-foreground line-clamp-1">{property.title}</span>
            </div>
          </div>
        </div>

        <div className="container-wide py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ─── Main ─── */}
            <div className="lg:col-span-2 space-y-8">
              {/* Gallery */}
              <div className="space-y-4">
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden">
                  <img src={images[activeImage]} alt={property.title} className="w-full h-full object-cover" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <Badge variant={property.listing_type === "sale" ? "default" : "secondary"}>For {property.listing_type === "sale" ? "Sale" : "Rent"}</Badge>
                    {property.is_featured && <Badge className="bg-warning text-foreground">Featured</Badge>}
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Button size="icon" variant="secondary" className={`rounded-full ${isFavorited ? "text-destructive" : ""}`} onClick={toggleFavorite}>
                      <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
                    </Button>
                    <Button size="icon" variant="secondary" className="rounded-full" onClick={shareProperty}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {property.view_count > 0 && (
                    <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <Eye className="h-3 w-3" />{property.view_count} views
                    </div>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {images.map((img: string, i: number) => (
                      <button key={i} onClick={() => setActiveImage(i)}
                        className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all ${activeImage === i ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}>
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Info */}
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h1 className="text-2xl lg:text-3xl font-display font-bold">{property.title}</h1>
                  <p className="text-2xl lg:text-3xl font-display font-bold text-primary whitespace-nowrap">{formatPrice(property.price, property.listing_type)}</p>
                </div>
                {property.location && (
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <MapPin className="h-5 w-5 text-primary" /><span>{property.location.name}</span>
                    {property.address && <span>• {property.address}</span>}
                  </div>
                )}
                {property.avg_rating && (
                  <div className="flex items-center gap-2 mb-4">
                    <ReviewStars rating={Number(property.avg_rating)} size="sm" />
                    <span className="text-sm font-medium">{property.avg_rating}</span>
                    <span className="text-sm text-muted-foreground">({property.review_count} reviews)</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-6 p-4 bg-muted rounded-xl">
                  {property.bedrooms && <div className="flex items-center gap-2"><Bed className="h-5 w-5 text-primary" /><div><p className="font-semibold">{property.bedrooms}</p><p className="text-xs text-muted-foreground">Bedrooms</p></div></div>}
                  {property.bathrooms && <div className="flex items-center gap-2"><Bath className="h-5 w-5 text-primary" /><div><p className="font-semibold">{property.bathrooms}</p><p className="text-xs text-muted-foreground">Bathrooms</p></div></div>}
                  {property.area_sqft && <div className="flex items-center gap-2"><Maximize className="h-5 w-5 text-primary" /><div><p className="font-semibold">{property.area_sqft.toLocaleString()}</p><p className="text-xs text-muted-foreground">Sq Ft</p></div></div>}
                  <div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /><div><p className="font-semibold">{new Date(property.created_at).toLocaleDateString()}</p><p className="text-xs text-muted-foreground">Listed</p></div></div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-xl font-display font-semibold mb-4">Description</h2>
                <p className="text-muted-foreground leading-relaxed">{property.description || "No description available."}</p>
              </div>

              {/* Features */}
              {property.features?.length > 0 && (
                <div>
                  <h2 className="text-xl font-display font-semibold mb-4">Features & Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {property.features.map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" /><span className="text-sm">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Owner / Agent info */}
              {property.owner && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">Listed by</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={property.owner.avatar_url || undefined} />
                        <AvatarFallback>{property.owner.full_name?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{property.owner.full_name}</p>
                          {property.owner.is_agent && (
                            <Badge variant="secondary" className="text-xs">
                              {property.owner.is_verified ? "✓ Verified Agent" : "Agent"}
                            </Badge>
                          )}
                        </div>
                        {property.owner.company && <p className="text-sm text-muted-foreground">{property.owner.company}</p>}
                      </div>
                      {property.owner.is_agent && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/agents/${property.owner.id}`}>View Profile</Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Map */}
              {(property.address || (property.latitude && property.longitude)) && (
                <div>
                  <h2 className="text-xl font-display font-semibold mb-4">Location</h2>
                  <PropertyMap placeName={property.address || undefined} latitude={property.latitude ? Number(property.latitude) : undefined} longitude={property.longitude ? Number(property.longitude) : undefined} title={property.title} className="h-[300px] w-full rounded-xl" />
                </div>
              )}

              {/* Reviews */}
              <div>
                <h2 className="text-xl font-display font-semibold mb-4">
                  Reviews {reviews && reviews.length > 0 && <span className="text-base font-normal text-muted-foreground">({reviews.length})</span>}
                </h2>
                {user && user.id !== property.user_id && (
                  <Card className="mb-6">
                    <CardContent className="pt-6 space-y-4">
                      <p className="font-medium text-sm">Write a Review</p>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Your rating</p>
                        <ReviewStars rating={userRating} size="lg" interactive onRate={setUserRating} />
                      </div>
                      <Textarea placeholder="Share your experience with this property..." value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={3} />
                      <Button onClick={handleReview} disabled={isReviewing || !userRating} size="sm">
                        {isReviewing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Submit Review"}
                      </Button>
                    </CardContent>
                  </Card>
                )}
                {reviews && reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((r: any) => (
                      <div key={r.id} className="flex gap-4 p-4 bg-muted/50 rounded-xl">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={r.avatar_url} />
                          <AvatarFallback>{r.full_name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{r.full_name}</p>
                            <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                          </div>
                          <ReviewStars rating={r.rating} size="sm" />
                          {r.comment && <p className="text-sm text-muted-foreground mt-2">{r.comment}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No reviews yet. Be the first to review this property.</p>
                )}
              </div>
            </div>

            {/* ─── Sidebar ─── */}
            <div className="space-y-6">
              {/* WhatsApp Button */}
              {ownerPhone && (
                <a href={`https://wa.me/${ownerPhone.replace(/\D/g, "")}?text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#1ebe57] text-white font-semibold py-3 px-4 rounded-xl transition-colors">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                  Chat on WhatsApp
                </a>
              )}

              {/* Message Owner */}
              {property.user_id && property.user_id !== user?.id && (
                <Card><CardContent className="pt-6">
                  <Button className="w-full" variant="outline" onClick={startConversation}>
                    <MessageSquare className="mr-2 h-4 w-4" />Message Owner
                  </Button>
                </CardContent></Card>
              )}

              {/* M-Pesa */}
              <Card><CardContent className="pt-6">
                <MpesaPayment propertyId={property.id} propertyTitle={property.title} amount={property.price} />
              </CardContent></Card>

              {/* Inquiry form */}
              <Card className="sticky top-24">
                <CardHeader><CardTitle className="text-lg">Send Inquiry</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleInquiry} className="space-y-3">
                    <Input placeholder="Your Name *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                    <Input type="email" placeholder="Your Email *" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                    <Input type="tel" placeholder="Your Phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    <Textarea placeholder="Your Message *" value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} required rows={3} />
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : <><Mail className="mr-2 h-4 w-4" />Send Inquiry</>}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Mortgage Calculator - only for sale */}
              {property.listing_type === "sale" && <MortgageCalculator defaultPrice={property.price} />}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};
export default PropertyDetail;
