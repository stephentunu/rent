import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAgents } from "@/hooks/useProperties";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

export function AgentsSection() {
  const { data: agents, isLoading } = useAgents();

  return (
    <section className="py-20 bg-muted/30">
      <div className="container-wide">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h2 className="text-3xl lg:text-4xl font-display font-bold">
              Trusted <span className="text-primary">Real Estate Partners</span>
            </h2>
            <p className="text-muted-foreground mt-2">
              Work with verified agents who know the market
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/agents">
              View All Agents
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Agents Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : agents && agents.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {agents.slice(0, 6).map((agent, index) => (
              <Card 
                key={agent.id}
                className="group card-hover border-0 shadow-soft animate-fade-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CardContent className="p-4 text-center">
                  <div className="relative w-20 h-20 mx-auto mb-3">
                    <img
                      src={agent.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(agent.name)}&background=random`}
                      alt={agent.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    {agent.is_verified && (
                      <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                    {agent.name}
                  </h4>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            No agents available at the moment.
          </div>
        )}
      </div>
    </section>
  );
}
