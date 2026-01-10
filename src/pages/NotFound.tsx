import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <div className="text-center space-y-6 p-8">
        <div className="space-y-2">
          <h1 className="text-7xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">
            הדף לא נמצא
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            מצטערים, הדף שחיפשת אינו קיים או שהוסר מהמערכת.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button asChild>
            <Link to="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              חזרה לדף הבית
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard" className="flex items-center gap-2">
              לוח בקרה
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-4">
          Billding.ai - הפלטפורמה למציאת מומחי בנייה
        </p>
      </div>
    </div>
  );
};

export default NotFound;
