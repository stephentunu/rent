import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { plansApi, paymentsApi } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: plans, isLoading } = useQuery({ queryKey: ["plans"], queryFn: () => plansApi.list() });
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribe = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!phone || phone.length < 9) { toast({ title: "Enter a valid phone number", variant: "destructive" }); return; }
    setIsProcessing(true);
    try {
      let cleaned = phone.replace(/\D/g, "");
      if (cleaned.startsWith("0")) cleaned = "254" + cleaned.slice(1);
      if (!cleaned.startsWith("254")) cleaned = "254" + cleaned;
      await paymentsApi.subscribe(selectedPlan.id, cleaned);
      toast({ title: "Check your phone!", description: "Enter your M-Pesa PIN to activate your plan." });
      setSelectedPlan(null);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setIsProcessing(false); }
  };

  const colors = ["border-border", "border-primary ring-2 ring-primary/20", "border-border", "border-border"];
  const labels = ["", "Most Popular", "", ""];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border-b">
          <div className="container-wide py-16 text-center">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20"><Zap className="h-3 w-3 mr-1" />Simple Pricing</Badge>
            <h1 className="text-4xl lg:text-5xl font-display font-bold mb-4">Choose Your Plan</h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">List more properties and reach more buyers with a plan that fits your needs.</p>
          </div>
        </div>

        <div className="container-wide py-16">
          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {(plans || []).map((plan: any, i: number) => (
                <Card key={plan.id} className={`relative overflow-hidden ${colors[i] || "border-border"}`}>
                  {labels[i] && (
                    <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs font-semibold text-center py-1">{labels[i]}</div>
                  )}
                  <CardHeader className={labels[i] ? "pt-8" : ""}>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-4xl font-bold">{plan.price === 0 ? "Free" : `KES ${Number(plan.price).toLocaleString()}`}</span>
                      {plan.price > 0 && <span className="text-muted-foreground text-sm">/month</span>}
                    </div>
                    <CardDescription>{plan.max_listings >= 999 ? "Unlimited" : plan.max_listings} listing{plan.max_listings !== 1 ? "s" : ""}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {(plan.features || []).map((f: string) => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={i === 1 ? "default" : "outline"}
                      onClick={() => { if (!user) navigate("/auth"); else if (plan.price === 0) toast({ title: "You're on the Free plan!" }); else setSelectedPlan(plan); }}
                    >
                      {plan.price === 0 ? "Current Plan" : "Get Started"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscribe to {selectedPlan?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold text-primary">KES {Number(selectedPlan?.price || 0).toLocaleString()} / month</p>
            </div>
            <div className="space-y-2">
              <Label>M-Pesa Phone Number</Label>
              <Input placeholder="07XX XXX XXX" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <Button onClick={handleSubscribe} disabled={isProcessing} className="w-full">
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : `Pay KES ${Number(selectedPlan?.price || 0).toLocaleString()}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default Pricing;
