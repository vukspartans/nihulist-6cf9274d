import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MobileNavProps {
  onLoginClick?: () => void;
  onSignupClick?: () => void;
  showEntrepreneurLink?: boolean;
  showConsultantLink?: boolean;
  showHomeLink?: boolean;
  ctaText?: string;
  ctaAction?: () => void;
}

const MobileNav = ({
  onLoginClick,
  onSignupClick,
  showEntrepreneurLink = false,
  showConsultantLink = false,
  showHomeLink = false,
  ctaText = "התחל עכשיו",
  ctaAction,
}: MobileNavProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="text-right">תפריט</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-4 mt-8">
          {showHomeLink && (
            <Link to="/">
              <Button variant="ghost" className="w-full justify-end text-base" size="lg">
                דף הבית
              </Button>
            </Link>
          )}
          {showEntrepreneurLink && (
            <Link to="/for-entrepreneurs">
              <Button variant="ghost" className="w-full justify-end text-base" size="lg">
                ליזמים
              </Button>
            </Link>
          )}
          {showConsultantLink && (
            <Link to="/for-consultants">
              <Button variant="ghost" className="w-full justify-end text-base" size="lg">
                ליועצים
              </Button>
            </Link>
          )}
          <Button variant="ghost" className="w-full justify-end text-base" size="lg">
            אודות
          </Button>
          <Button variant="ghost" className="w-full justify-end text-base" size="lg">
            הפתרונות שלנו
          </Button>
          <Button variant="ghost" className="w-full justify-end text-base" size="lg">
            עולם התוכן
          </Button>
          <Button variant="ghost" className="w-full justify-end text-base" size="lg">
            תמיכה
          </Button>
          <Button variant="ghost" className="w-full justify-end text-base" size="lg">
            צור קשר
          </Button>
          
          <div className="border-t border-border mt-4 pt-4 space-y-3">
            {onLoginClick && (
              <Button 
                variant="outline" 
                className="w-full text-base" 
                size="lg"
                onClick={onLoginClick}
              >
                התחברו למערכת
              </Button>
            )}
            {(ctaAction || onSignupClick) && (
              <Button 
                variant="premium" 
                className="w-full text-base" 
                size="lg"
                onClick={ctaAction || onSignupClick}
              >
                {ctaText}
              </Button>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
