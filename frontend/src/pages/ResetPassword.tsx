import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/services/api";
import { Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) navigate("/forgot-password");
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    if (password.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return; }
    setIsLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate("/auth"), 3000);
    } catch (err: any) {
      toast({ title: "Reset Failed", description: err.message, variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-display">Set New Password</CardTitle>
            <CardDescription>Choose a strong password for your account</CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <h3 className="font-semibold text-lg">Password Reset!</h3>
                <p className="text-muted-foreground text-sm">Your password has been updated. Redirecting to login...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required minLength={6} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="confirm" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} className="pl-10" required />
                  </div>
                  {confirm && password !== confirm && (
                    <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />Passwords don't match</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || (!!confirm && password !== confirm)}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resetting...</> : "Reset Password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};
export default ResetPassword;
