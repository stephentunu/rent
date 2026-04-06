import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container-wide py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <img src={logoImg} alt="RENT IN" className="h-9 w-9 rounded-lg object-cover" />
              <span className="font-display text-xl font-semibold">
                RENT <span className="text-primary">IN</span>
              </span>
            </Link>
            <p className="text-sm text-background/70 leading-relaxed">
              Your trusted partner in finding the perfect property in Kenya. 
              Whether you're buying, renting, or selling, we're here to help.
            </p>
            <div className="flex gap-3">
              <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-background/10">
                <Facebook className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-background/10">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-background/10">
                <Instagram className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-background/10">
                <Linkedin className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-display text-lg font-semibold">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/properties?type=sale" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Properties for Sale
                </Link>
              </li>
              <li>
                <Link to="/properties?type=rent" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Properties for Rent
                </Link>
              </li>
              <li>
                <Link to="/agents" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Find an Agent
                </Link>
              </li>
              <li>
                <Link to="/list-property" className="text-sm text-background/70 hover:text-primary transition-colors">
                  List Your Property
                </Link>
              </li>
            </ul>
          </div>

          {/* Property Types */}
          <div className="space-y-4">
            <h4 className="font-display text-lg font-semibold">Property Types</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/properties?category=houses" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Houses
                </Link>
              </li>
              <li>
                <Link to="/properties?category=apartments" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Apartments
                </Link>
              </li>
              <li>
                <Link to="/properties?category=land" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Land
                </Link>
              </li>
              <li>
                <Link to="/properties?category=commercial" className="text-sm text-background/70 hover:text-primary transition-colors">
                  Commercial
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-4">
            <h4 className="font-display text-lg font-semibold">Stay Updated</h4>
            <p className="text-sm text-background/70">
              Get the latest properties and real estate tips in your inbox.
            </p>
            <div className="flex gap-2">
              <Input 
                type="email" 
                placeholder="Your email" 
                className="bg-background/10 border-background/20 text-background placeholder:text-background/50"
              />
              <Button>Subscribe</Button>
            </div>
            <div className="pt-4 space-y-2 text-sm text-background/70">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>+254 700 000 000</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>info@nestfinder.ke</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Nairobi, Kenya</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-background/20 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-background/60">
            © {new Date().getFullYear()} RENT IN. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-sm text-background/60 hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm text-background/60 hover:text-primary transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
