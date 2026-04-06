import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, Home, Building2, Map, Store, User, Plus, LogOut, LayoutDashboard, MessageSquare, Settings, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import logoImg from "@/assets/logo.png";
import { useIsAdmin } from "@/hooks/useAdmin";
import { NotificationBell } from "@/components/layout/NotificationBell";

const categories = [
  { name: "Houses",     slug: "houses",     icon: Home },
  { name: "Apartments", slug: "apartments", icon: Building2 },
  { name: "Land",       slug: "land",       icon: Map },
  { name: "Commercial", slug: "commercial", icon: Store },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  const handleSignOut = async () => { await signOut(); navigate("/"); };
  const initials = profile?.full_name?.split(" ").map(n => n[0]).join("").toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-wide flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoImg} alt="RENT IN" className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-display text-xl font-semibold tracking-tight">RENT <span className="text-primary">IN</span></span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent">For Sale</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                    {categories.map(cat => (
                      <li key={cat.slug}>
                        <NavigationMenuLink asChild>
                          <Link to={`/properties?type=sale&category=${cat.slug}`} className="flex items-center gap-3 rounded-md p-3 hover:bg-accent hover:text-accent-foreground transition-colors">
                            <cat.icon className="h-5 w-5 text-primary" />
                            <div><div className="text-sm font-medium">{cat.name} for Sale</div><p className="text-xs text-muted-foreground">Browse {cat.name.toLowerCase()} listings</p></div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent">For Rent</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                    {categories.slice(0, 3).map(cat => (
                      <li key={cat.slug}>
                        <NavigationMenuLink asChild>
                          <Link to={`/properties?type=rent&category=${cat.slug}`} className="flex items-center gap-3 rounded-md p-3 hover:bg-accent hover:text-accent-foreground transition-colors">
                            <cat.icon className="h-5 w-5 text-primary" />
                            <div><div className="text-sm font-medium">{cat.name} for Rent</div><p className="text-xs text-muted-foreground">Find {cat.name.toLowerCase()} to rent</p></div>
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/agents" className={cn("group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground")}>Agents</Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link to="/pricing" className={cn("group inline-flex h-10 w-max items-center justify-center rounded-md bg-transparent px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground")}>
                  <Zap className="h-3.5 w-3.5 mr-1.5 text-primary" />Pricing
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-2">
          {user ? (
            <>
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={() => navigate("/messages")}><MessageSquare className="h-4 w-4" /></Button>
              <Button size="sm" onClick={() => navigate("/list-property")}><Plus className="mr-2 h-4 w-4" />List Property</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="h-7 w-7"><AvatarImage src={profile?.avatar_url || undefined} /><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
                    <span className="max-w-[100px] truncate">{profile?.full_name || "Account"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/profile")}><Settings className="mr-2 h-4 w-4" />Profile Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/messages")}><MessageSquare className="mr-2 h-4 w-4" />Messages</DropdownMenuItem>
                  {isAdmin && <DropdownMenuItem onClick={() => navigate("/admin")}><Shield className="mr-2 h-4 w-4" />Admin Dashboard</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}><User className="mr-2 h-4 w-4" />Login</Button>
              <Button size="sm" onClick={() => navigate("/auth")}><Plus className="mr-2 h-4 w-4" />List Property</Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="lg:hidden"><Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button></SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <nav className="flex flex-col gap-4 mt-8">
              {user && (
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg mb-4">
                  <Avatar className="h-10 w-10"><AvatarImage src={profile?.avatar_url || undefined} /><AvatarFallback>{initials}</AvatarFallback></Avatar>
                  <div><p className="font-medium">{profile?.full_name || "User"}</p><p className="text-sm text-muted-foreground">{user.email}</p></div>
                </div>
              )}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">For Sale</h4>
                {categories.map(cat => (
                  <Link key={cat.slug} to={`/properties?type=sale&category=${cat.slug}`} onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent">
                    <cat.icon className="h-4 w-4 text-primary" /><span>{cat.name}</span>
                  </Link>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">For Rent</h4>
                {categories.slice(0, 3).map(cat => (
                  <Link key={cat.slug} to={`/properties?type=rent&category=${cat.slug}`} onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent">
                    <cat.icon className="h-4 w-4 text-primary" /><span>{cat.name}</span>
                  </Link>
                ))}
              </div>
              <div className="pt-2 border-t space-y-2">
                <Link to="/agents" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent"><Building2 className="h-4 w-4 text-primary" /><span>Find Agents</span></Link>
                <Link to="/pricing" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent"><Zap className="h-4 w-4 text-primary" /><span>Pricing</span></Link>
              </div>
              {user ? (
                <div className="pt-2 border-t space-y-2">
                  <Link to="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent"><LayoutDashboard className="h-4 w-4 text-primary" /><span>Dashboard</span></Link>
                  <Link to="/messages" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent"><MessageSquare className="h-4 w-4 text-primary" /><span>Messages</span></Link>
                  <Link to="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent"><Settings className="h-4 w-4 text-primary" /><span>Profile</span></Link>
                  {isAdmin && <Link to="/admin" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent"><Shield className="h-4 w-4 text-primary" /><span>Admin Dashboard</span></Link>}
                  <Button className="w-full mt-2" onClick={() => { setIsOpen(false); navigate("/list-property"); }}><Plus className="mr-2 h-4 w-4" />List Property</Button>
                  <Button variant="outline" className="w-full" onClick={() => { setIsOpen(false); handleSignOut(); }}><LogOut className="mr-2 h-4 w-4" />Sign Out</Button>
                </div>
              ) : (
                <div className="pt-2 border-t space-y-2">
                  <Button variant="outline" className="w-full" onClick={() => { setIsOpen(false); navigate("/auth"); }}><User className="mr-2 h-4 w-4" />Login</Button>
                  <Button className="w-full" onClick={() => { setIsOpen(false); navigate("/auth"); }}><Plus className="mr-2 h-4 w-4" />List Property</Button>
                </div>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
