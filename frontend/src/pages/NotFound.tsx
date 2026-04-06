import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import logoImg from "@/assets/logo.png";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <img src={logoImg} alt="RENT IN" className="h-20 w-20 rounded-2xl object-cover" />
        </div>
        <h1 className="text-6xl font-display font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-display font-semibold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          Sorry, we couldn't find the page you're looking for. 
          It might have been moved or doesn't exist.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/properties">
              <Search className="mr-2 h-4 w-4" />
              Browse Properties
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
