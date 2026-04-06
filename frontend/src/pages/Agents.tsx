import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAgents } from "@/hooks/useProperties";
import { CheckCircle2, Phone, Mail, Loader2, Search, Building2, MapPin, List } from "lucide-react";

const Agents = () => {
  const { data: agents, isLoading } = useAgents();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAgents = agents?.filter(agent =>
    agent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.company?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
              <span className="text-foreground">Agents</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-display font-bold">
              Real Estate <span className="text-primary">Agents</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Connect with verified real estate professionals who can help you find your perfect property.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="container-wide py-6 border-b">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {filteredAgents.length} agent{filteredAgents.length !== 1 ? "s" : ""} found
            </p>
          </div>
        </div>

        {/* Agents Grid */}
        <div className="container-wide py-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredAgents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map((agent, index) => (
                <Card
                  key={agent.id}
                  className="group card-hover border-0 shadow-medium animate-fade-up overflow-hidden"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Top colored band */}
                  <div className="h-2 bg-gradient-to-r from-primary to-secondary" />

                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="relative flex-shrink-0">
                        <img
                          src={agent.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name || "A")}&background=random&size=80`}
                          alt={agent.name}
                          className="w-20 h-20 rounded-xl object-cover border-2 border-border"
                        />
                        {agent.is_verified && (
                          <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow">
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display text-lg font-semibold group-hover:text-primary transition-colors truncate">
                            {agent.name}
                          </h3>
                          {agent.is_verified && (
                            <Badge variant="secondary" className="text-xs shrink-0 bg-success/10 text-success border-success/20">
                              Verified
                            </Badge>
                          )}
                        </div>
                        {agent.company && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {agent.company}
                          </p>
                        )}
                        <p className="text-sm text-primary font-medium mt-1 flex items-center gap-1">
                          <List className="h-3.5 w-3.5" />
                          {agent.listing_count || 0} active listing{agent.listing_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    {agent.description && (
                      <p className="text-sm text-muted-foreground mt-4 line-clamp-2 leading-relaxed">
                        {agent.description}
                      </p>
                    )}

                    <div className="mt-4 pt-4 border-t space-y-2">
                      {agent.phone && (
                        <a href={`tel:${agent.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                          <Phone className="h-4 w-4" />{agent.phone}
                        </a>
                      )}
                      {agent.email && (
                        <a href={`mailto:${agent.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                          <Mail className="h-4 w-4" />{agent.email}
                        </a>
                      )}
                    </div>

                    <Button className="w-full mt-4" asChild>
                      <Link to={`/agents/${agent.id}`}>View Profile & Listings</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No agents found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "Try a different search term" : "No agents available at the moment"}
              </p>
            </div>
          )}
        </div>

        {/* CTA for users to become agents */}
        <div className="bg-primary/5 border-t border-primary/10">
          <div className="container-wide py-12 text-center">
            <h2 className="text-2xl font-display font-bold mb-2">Are you a real estate professional?</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Enable your agent profile in settings to appear on this page and start receiving inquiries from clients.
            </p>
            <Button asChild>
              <Link to="/profile">Set Up Agent Profile</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Agents;
