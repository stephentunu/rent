import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Lock, User } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { if (user) navigate("/"); }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setErrors({});
    const result = loginSchema.safeParse(loginData);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach(err => { if (err.path[0]) fe[err.path[0] as string] = err.message; });
      setErrors(fe); return;
    }
    setIsLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    setIsLoading(false);
    if (error) {
      toast({ title: "Login Failed", description: error.message === "Invalid login credentials" ? "Invalid email or password." : error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Welcome back!" });
    navigate("/");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setErrors({});
    const result = signupSchema.safeParse(signupData);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.errors.forEach(err => { if (err.path[0]) fe[err.path[0] as string] = err.message; });
      setErrors(fe); return;
    }
    setIsLoading(true);
    const { error } = await signUp(signupData.email, signupData.password, signupData.fullName);
    setIsLoading(false);
    if (error) {
      toast({ title: error.message.includes("already") ? "Account Exists" : "Signup Failed", description: error.message.includes("already") ? "An account with this email already exists." : error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Account Created!", description: "Welcome to Rent Hub! A welcome email has been sent." });
    navigate("/");
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logoImg} alt="RENT IN" className="h-12 w-12 rounded-xl object-cover" />
            </div>
            <CardTitle className="text-2xl font-display">Welcome to RENT IN</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="login-email" type="email" placeholder="you@example.com" value={loginData.email} onChange={e => setLoginData({ ...loginData, email: e.target.value })} className="pl-10" />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="login-password" type="password" placeholder="••••••••" value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} className="pl-10" />
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-name" placeholder="John Doe" value={signupData.fullName} onChange={e => setSignupData({ ...signupData, fullName: e.target.value })} className="pl-10" />
                    </div>
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-email" type="email" placeholder="you@example.com" value={signupData.email} onChange={e => setSignupData({ ...signupData, email: e.target.value })} className="pl-10" />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-password" type="password" placeholder="••••••••" value={signupData.password} onChange={e => setSignupData({ ...signupData, password: e.target.value })} className="pl-10" />
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-confirm" type="password" placeholder="••••••••" value={signupData.confirmPassword} onChange={e => setSignupData({ ...signupData, confirmPassword: e.target.value })} className="pl-10" />
                    </div>
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</> : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}and{" "}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};
export default Auth;
