import { useParams, Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PropertyCard } from "@/components/property/PropertyCard";
import { useAgent } from "@/hooks/useProperties";
import { useAuth } from "@/contexts/AuthContext";
import { messagesApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Phone, Mail, Globe, Building2,
  ArrowLeft, Loader2, Home, MessageSquare, Calendar
} from "lucide-react";

const AgentProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: agent, isLoading, error } = useAgent(id || "");

  const handleContact = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to message this agent." });
      navigate("/auth");
      return;
    }
    if (agent.id === user.id) {
      toast({ title: "That's you!", description: "You cannot message yourself.", variant: "destructive" });
      return;
    }
    try {
      // Start a general conversation (no specific property)
      await messagesApi.startConversation("general", agent.id);
      toast({ title: "Conversation started!" });
      navigate("/messages");
    } catch (err: any) {
      // If "general" property_id fails, just navigate to messages
      navigate("/messages");
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
      <Footer />
    </div>
  );

  if (error || !agent) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Agent Not Found</h2>
          <p className="text-muted-foreground mb-6">This agent profile doesn't exist or has been removed.</p>
          <Button asChild><Link to="/agents"><ArrowLeft className="mr-2 h-4 w-4" />Back to Agents</Link></Button>
        </div>
      </main>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="bg-muted/50 border-b">
          <div className="container-wide py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-primary">Home</Link><span>/</span>
              <Link to="/agents" className="hover:text-primary">Agents</Link><span>/</span>
              <span className="text-foreground">{agent.name}</span>
            </div>
          </div>
        </div>

        <div className="container-wide py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Sidebar — Agent Card */}
            <div className="space-y-6">
              <Card className="overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-primary to-secondary" />
                <CardContent className="p-6">
                  {/* Avatar */}
                  <div className="flex flex-col items-center text-center mb-6">
                    <div className="relative mb-4">
                      <img
                        src={agent.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name || "A")}&background=random&size=120`}
                        alt={agent.name}
                        className="w-28 h-28 rounded-2xl object-cover border-4 border-border shadow"
                      />
                      {agent.is_verified && (
                        <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1 shadow-md">
                          <CheckCircle2 className="h-6 w-6 text-success" />
                        </div>
                      )}
                    </div>
                    <h1 className="text-2xl font-display font-bold">{agent.name}</h1>
                    {agent.company && (
                      <p className="text-muted-foreground flex items-center gap-1 mt-1">
                        <Building2 className="h-4 w-4" />{agent.company}
                      </p>
                    )}
                    {agent.is_verified && (
                      <Badge className="mt-2 bg-success/10 text-success border-success/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Verified Agent
                      </Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-muted rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-primary">{agent.listings?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Active Listings</p>
                    </div>
                    <div className="bg-muted rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-primary">
                        {new Date(agent.created_at).getFullYear()}
                      </p>
                      <p className="text-xs text-muted-foreground">Member Since</p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-3 mb-6">
                    {agent.phone && (
                      <a href={`tel:${agent.phone}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                        <div className="p-1.5 bg-primary/10 rounded-lg"><Phone className="h-4 w-4 text-primary" /></div>
                        <span className="text-sm font-medium">{agent.phone}</span>
                      </a>
                    )}
                    {agent.email && (
                      <a href={`mailto:${agent.email}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                        <div className="p-1.5 bg-primary/10 rounded-lg"><Mail className="h-4 w-4 text-primary" /></div>
                        <span className="text-sm font-medium truncate">{agent.email}</span>
                      </a>
                    )}
                    {agent.website && (
                      <a href={agent.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                        <div className="p-1.5 bg-primary/10 rounded-lg"><Globe className="h-4 w-4 text-primary" /></div>
                        <span className="text-sm font-medium truncate">{agent.website.replace(/^https?:\/\//, "")}</span>
                      </a>
                    )}
                  </div>

                  {/* Message Button */}
                  {user?.id !== agent.id && (
                    <Button className="w-full" onClick={handleContact}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Send Message
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Member since */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span>Member since {new Date(agent.created_at).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About */}
              {agent.description && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">About {agent.name}</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{agent.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Listings */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-display font-semibold">
                    Active Listings
                    <span className="ml-2 text-base font-normal text-muted-foreground">
                      ({agent.listings?.length || 0})
                    </span>
                  </h2>
                </div>

                {agent.listings && agent.listings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {agent.listings.map((property: any) => (
                      <PropertyCard key={property.id} property={property} />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Home className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No active listings from this agent yet.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AgentProfile;
