import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PropertyCard } from "@/components/property/PropertyCard";
import { WalletCard } from "@/components/wallet/WalletCard";
import { useToast } from "@/hooks/use-toast";
import { Plus, Home, Heart, MessageSquare, Settings, Loader2, Building2, Eye, Edit, Trash2, Wallet, TrendingUp } from "lucide-react";
import type { Property } from "@/types/property";
import { propertiesApi, favoritesApi, messagesApi } from "@/services/api";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [myProperties, setMyProperties] = useState<Property[]>([]);
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);
  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [props, favs, unread] = await Promise.all([
        propertiesApi.myListings(), favoritesApi.list(), messagesApi.unreadCount(),
      ]);
      setMyProperties(props as Property[]);
      setFavorites(favs as Property[]);
      setUnreadMessages(unread.count);

      // Fetch analytics for each property
      const analyticsData: Record<string, any> = {};
      await Promise.all((props as Property[]).slice(0, 5).map(async (p) => {
        try { analyticsData[p.id] = await propertiesApi.analytics(p.id); } catch {}
      }));
      setAnalytics(analyticsData);
    } catch {
      toast({ title: "Error", description: "Failed to load dashboard", variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this property?")) return;
    try {
      await propertiesApi.delete(id);
      setMyProperties(prev => prev.filter(p => p.id !== id));
      toast({ title: "Property deleted" });
    } catch { toast({ title: "Error", description: "Failed to delete", variant: "destructive" }); }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  const initials = profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || "U";
  const totalViews = Object.values(analytics).reduce((s: number, a: any) => s + (a?.total_views || 0), 0);
  const totalInquiries = Object.values(analytics).reduce((s: number, a: any) => s + (a?.inquiries || 0), 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        {/* Profile Header */}
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border-b">
          <div className="container-wide py-8">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-display font-bold">{profile?.full_name || "User"}</h1>
                  {profile?.is_agent && <Badge variant="secondary">Agent</Badge>}
                  {profile?.is_verified && <Badge className="bg-success text-success-foreground">Verified</Badge>}
                </div>
                <p className="text-muted-foreground mt-1">{profile?.email}</p>
                {profile?.company && <p className="text-sm text-muted-foreground">{profile.company}</p>}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => navigate("/profile")}><Settings className="mr-2 h-4 w-4" />Edit Profile</Button>
                <Button onClick={() => navigate("/list-property")}><Plus className="mr-2 h-4 w-4" />List Property</Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[
                { icon: Building2, label: "My Listings", value: myProperties.length, color: "bg-primary/10 text-primary" },
                { icon: Heart, label: "Saved", value: favorites.length, color: "bg-destructive/10 text-destructive" },
                { icon: Eye, label: "Total Views", value: totalViews, color: "bg-secondary/10 text-secondary" },
                { icon: MessageSquare, label: "Unread", value: unreadMessages, color: "bg-accent text-accent-foreground" },
              ].map(({ icon: Icon, label, value, color }) => (
                <Card key={label}><CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
                    <div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          </div>
        </div>

        <div className="container-wide py-8">
          <Tabs defaultValue="properties" className="space-y-6">
            <TabsList>
              <TabsTrigger value="properties">My Listings</TabsTrigger>
              <TabsTrigger value="favorites">Saved</TabsTrigger>
              <TabsTrigger value="analytics"><TrendingUp className="mr-1.5 h-4 w-4" />Analytics</TabsTrigger>
              <TabsTrigger value="wallet"><Wallet className="mr-1.5 h-4 w-4" />Wallet</TabsTrigger>
              <TabsTrigger value="messages">
                Messages {unreadMessages > 0 && <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">{unreadMessages}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="properties">
              {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                : myProperties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myProperties.map(p => (
                      <div key={p.id} className="relative group">
                        <PropertyCard property={p} />
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => navigate(`/edit-property/${p.id}`)}><Edit className="h-4 w-4" /></Button>
                          <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                        <Badge variant={p.status === "active" ? "default" : "secondary"} className="absolute bottom-4 right-4">{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card className="text-center py-12"><CardContent>
                    <Home className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Properties Yet</h3>
                    <Button onClick={() => navigate("/list-property")}><Plus className="mr-2 h-4 w-4" />List Your First Property</Button>
                  </CardContent></Card>
                )}
            </TabsContent>

            <TabsContent value="favorites">
              {isLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                : favorites.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map(p => <PropertyCard key={p.id} property={p} />)}
                  </div>
                ) : (
                  <Card className="text-center py-12"><CardContent>
                    <Heart className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Saved Properties</h3>
                    <Button variant="outline" asChild><Link to="/properties">Browse Properties</Link></Button>
                  </CardContent></Card>
                )}
            </TabsContent>

            <TabsContent value="analytics">
              {myProperties.length === 0 ? (
                <Card className="text-center py-12"><CardContent>
                  <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Data Yet</h3>
                  <p className="text-muted-foreground">List properties to see analytics</p>
                </CardContent></Card>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[
                      { label: "Total Views", value: totalViews, icon: Eye },
                      { label: "Total Inquiries", value: totalInquiries, icon: MessageSquare },
                      { label: "Active Listings", value: myProperties.filter(p => p.status === "active").length, icon: Building2 },
                    ].map(({ label, value, icon: Icon }) => (
                      <Card key={label}><CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
                          <div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>
                        </div>
                      </CardContent></Card>
                    ))}
                  </div>
                  {myProperties.map(p => {
                    const a = analytics[p.id];
                    return (
                      <Card key={p.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div>
                              <p className="font-semibold">{p.title}</p>
                              <Badge variant={p.status === "active" ? "default" : "secondary"} className="mt-1">{p.status}</Badge>
                            </div>
                            {a ? (
                              <div className="flex gap-6 text-center">
                                <div><p className="text-2xl font-bold text-primary">{a.total_views}</p><p className="text-xs text-muted-foreground">Total Views</p></div>
                                <div><p className="text-2xl font-bold text-primary">{a.views_week}</p><p className="text-xs text-muted-foreground">This Week</p></div>
                                <div><p className="text-2xl font-bold text-primary">{a.favorites}</p><p className="text-xs text-muted-foreground">Saved</p></div>
                                <div><p className="text-2xl font-bold text-primary">{a.inquiries}</p><p className="text-xs text-muted-foreground">Inquiries</p></div>
                              </div>
                            ) : <p className="text-sm text-muted-foreground">Loading...</p>}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="wallet"><WalletCard /></TabsContent>

            <TabsContent value="messages">
              <Card className="text-center py-12"><CardContent>
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Messages</h3>
                <Button variant="outline" onClick={() => navigate("/messages")}>Open Messages</Button>
              </CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};
export default Dashboard;
