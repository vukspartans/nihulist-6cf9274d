import { useState, useEffect, memo, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  FileText, 
  Award, 
  ArrowLeft, 
  Zap, 
  Shield, 
  TrendingUp, 
  Star, 
  CheckCircle, 
  Play, 
  Globe, 
  X,
  Search,
  MessageSquare,
  Trophy,
  Lock,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Briefcase,
  Target
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import HeroImageCarousel from "@/components/HeroImageCarousel";
import LazySection from "@/components/LazySection";
import MobileNav from "@/components/MobileNav";
import Logo from "@/components/Logo";
import BackToTop from "@/components/BackToTop";
import PrivacyPolicyDialog from "@/components/PrivacyPolicyDialog";
import { TermsAndConditions } from "@/components/TermsAndConditions";

// Lazy load heavy components
const OptimizedTestimonials = lazy(() => import("@/components/OptimizedTestimonials"));

const Landing = memo(() => {
  // Billding Landing Page
  const [showUserTypeDialog, setShowUserTypeDialog] = useState(false);
  const [showDemoVideo, setShowDemoVideo] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const navigate = useNavigate();
  const { user, primaryRole } = useAuth();

  // Hero images array - optimized for performance
  const heroImages = [
    "/uploads/1e5c97d5-fcff-4d72-8564-66041529e61d.png",
    // Add more images here as they're uploaded
  ];

  // Optimized testimonials data
  const testimonials = [
    {
      name: "אדר' מיכל כהן",
      role: "אדריכלית ראשית", 
      company: "כהן אדריכלות",
      image: "👩‍💼",
      quote: "Billding שינה לי את המשחק לחלוטין. מחברת אותי עם יזמי נדל\"ן איכותיים שמבינים את הערך של תכנון מקצועי ומוכנים לשלם עליו בהתאם."
    },
    {
      name: "רון אברהם",
      role: "מייסד ומנכ״ל",
      company: "אברהם נדל\"ן", 
      image: "👨‍💻",
      quote: "במקום לבזבז שבועות על חיפוש קבלני בנייה ומהנדסים, מצאתי את הצוות המושלם תוך 24 שעות. הפרויקט הושלם בזמן ובתקציב."
    },
    {
      name: "שרה לוי",
      role: "מהנדסת אזרחית",
      company: "לוי הנדסה",
      image: "👩‍💼", 
      quote: "הפלטפורמה מביאה לי רק פרויקטי בנייה איכותיים עם יזמים רציניים. הכנסותיי גדלו פי 3 מאז שהצטרפתי."
    }
  ];

  // State to track which button triggered the dialog
  const [dialogMode, setDialogMode] = useState<'signup' | 'login'>('signup');

  const handleUserTypeSelection = (userType: string) => {
    setShowUserTypeDialog(false);
    if (userType === 'entrepreneur') {
      navigate(`/auth?type=entrepreneur&mode=${dialogMode}`);
    } else {
      navigate(`/auth?type=advisor&mode=${dialogMode}`);
    }
  };

  const handleMainCTAClick = () => {
    setDialogMode('signup');
    setShowUserTypeDialog(true);
  };

  const handleLoginClick = () => {
    setDialogMode('login');
    setShowUserTypeDialog(true);
  };

  return <div className="min-h-screen bg-background" dir="rtl">
      {/* Navigation */}
      <nav className="relative z-50 py-2 sm:py-3 px-4 lg:px-6 bg-background/95 backdrop-blur-sm border-b border-border/40 sticky top-0">
        <div className="container mx-auto flex justify-between items-center">
          <div 
            onClick={() => {
              if (user && primaryRole) {
                const dashboardRoute = primaryRole === 'entrepreneur' ? '/dashboard' : '/advisor-dashboard';
                navigate(dashboardRoute);
              }
            }} 
            className={user ? "cursor-pointer" : ""}
          >
            <Logo size="xl" />
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4">
            <Button variant="ghost" size="sm">אודות</Button>
            <Button variant="ghost" size="sm">הפתרונות שלנו</Button>
            <Button variant="ghost" size="sm">עולם התוכן</Button>
            <Button variant="ghost" size="sm">תמיכה</Button>
            <Button variant="ghost" size="sm">צור קשר</Button>
            <Link to="/for-entrepreneurs">
              <Button variant="ghost" size="sm">ליזמים</Button>
            </Link>
            <Link to="/for-consultants">
              <Button variant="ghost" size="sm">ליועצים</Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleLoginClick} className="px-6">
              התחברו למערכת
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="flex lg:hidden items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleLoginClick} className="px-4 text-xs">
              התחבר
            </Button>
            <MobileNav 
              onLoginClick={handleLoginClick}
              onSignupClick={handleMainCTAClick}
              showEntrepreneurLink
              showConsultantLink
            />
          </div>
        </div>
      </nav>

      {/* Hero Section - Optimized Above the Fold */}
      <section className="relative overflow-hidden py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-background via-primary/5 to-tech-purple/5">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-7xl mx-auto">
            {/* Left content */}
            <div className="space-y-4 sm:space-y-6 lg:space-y-8 text-center lg:text-right">
              {/* Security badge */}
              <div className="animate-fade-in">
                <Badge variant="outline" className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm hover-scale">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                  <span className="hidden sm:inline">הגנה ברמה בנקאית על המידע שלכם</span>
                  <span className="sm:hidden">אבטחה מלאה</span>
                </Badge>
              </div>

              {/* Main headline - Mobile optimized */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl font-black leading-tight animate-slide-up">
                <span className="text-foreground">מחברים יזמי נדל"ן ומומחי בנייה</span>
                <br />
                <span className="gradient-text text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl">חכם יותר, מהיר יותר</span>
              </h1>

              {/* Subtext - More concise */}
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 animate-slide-up" style={{animationDelay: "0.2s"}}>
                הפלטפורמה הבטוחה למציאת המומחים המושלמים לכל פרויקט בנייה ונדל"ן.
              </p>

              {/* CTA Button - Mobile optimized */}
              <div className="animate-slide-up" style={{animationDelay: "0.4s"}}>
                <Button 
                  size="lg" 
                  onClick={handleMainCTAClick}
                  className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 hover-scale animate-glow"
                >
                  <Zap className="w-5 h-5 ml-2" />
                  התחל עכשיו
                </Button>
              </div>

              {/* Trust indicators - Mobile optimized */}
              <div className="space-y-4 animate-fade-in" style={{animationDelay: "0.6s"}}>
                <div className="flex flex-wrap justify-center lg:justify-start gap-3 sm:gap-4 lg:gap-6 text-xs sm:text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-1.5 sm:gap-2 hover-scale">
                    <Shield className="w-4 h-4 text-primary" />
                    אבטחה ארגונית
                  </span>
                  <span className="flex items-center gap-1.5 sm:gap-2 hover-scale">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    יועצים מאומתים
                  </span>
                </div>
              </div>
            </div>

            {/* Right content - Mobile optimized hero image */}
            <div className="flex justify-center lg:justify-end animate-scale-in order-first lg:order-last" style={{animationDelay: "0.3s"}}>
              <div className="relative">
                <HeroImageCarousel 
                  images={heroImages}
                  className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-3xl bg-gradient-to-br from-primary/20 to-tech-purple/20 overflow-hidden hover-scale relative"
                />
                {/* Floating elements - Hidden on mobile */}
                <div className="hidden sm:flex absolute -top-3 -right-3 w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-2xl items-center justify-center animate-float">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="hidden sm:flex absolute -bottom-3 -left-3 w-8 h-8 sm:w-10 sm:h-10 bg-tech-purple rounded-2xl items-center justify-center animate-float" style={{animationDelay: "1s"}}>
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Credibility Section - Lazy Loaded */}
      <LazySection className="py-12 sm:py-16 lg:py-24 xl:py-32 bg-muted/30 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-32 h-32 bg-primary rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-tech-purple rounded-full blur-3xl animate-float" style={{animationDelay: "2s"}}></div>
        </div>
        
        <div className="container mx-auto px-4 lg:px-6 relative">
          <div className="text-center mb-10 sm:mb-14 lg:mb-20 animate-fade-in">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black mb-4 sm:mb-6">
              <span className="text-foreground">מומחי בנייה ויזמי נדל"ן מאומתים</span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">נבדקים בקפידה להבטחת איכות ואמינות מקסימלית בתחום הבנייה והנדל"ן</p>
          </div>

          {/* Stats grid hidden for launch */}

          {/* Security Banner */}
          <div className="text-center animate-fade-in" style={{animationDelay: "0.5s"}}>
            <div className="inline-flex items-center gap-2 px-8 py-4 bg-primary/10 rounded-full hover-scale">
              <Lock className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">הגנה ברמה בנקאית על המידע שלכם</span>
            </div>
          </div>
        </div>
      </LazySection>

      {/* How It Works Section - Lazy Loaded */}
      <LazySection className="py-12 sm:py-16 lg:py-24 xl:py-32 bg-background relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 right-20 w-64 h-64 bg-tech-purple rounded-full blur-3xl animate-float" style={{animationDelay: "3s"}}></div>
        </div>
        
        <div className="container mx-auto px-4 lg:px-6 relative">
          <div className="text-center mb-10 sm:mb-16 lg:mb-24 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black mb-4 sm:mb-6 lg:mb-8">
              <span className="text-foreground">איך</span>
              <span className="gradient-text"> זה עובד</span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl xl:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              שלושה צעדים פשוטים למציאת המומחה המושלם לכל פרויקט בנייה ונדל"ן
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12 max-w-7xl mx-auto">
            {/* Step 1 */}
            <Card className="text-center p-6 sm:p-8 lg:p-10 relative overflow-hidden hover-scale animate-slide-up" style={{animationDelay: "0.2s"}}>
              <div className="absolute top-6 right-6 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              <CardHeader className="pb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-primary to-tech-purple rounded-3xl flex items-center justify-center mx-auto mb-8 animate-float">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold">צור פרויקט בנייה</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  תאר את פרויקט הבנייה או הנדל"ן שלך, לוחות זמנים ותקציב. הבינה המלאכותית מנתחת את הדרישות ומוצאת מומחים מושלמים.
                </p>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="text-center p-6 sm:p-8 lg:p-10 relative overflow-hidden hover-scale animate-slide-up" style={{animationDelay: "0.4s"}}>
              <div className="absolute top-6 right-6 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <CardHeader className="pb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-tech-purple to-primary rounded-3xl flex items-center justify-center mx-auto mb-8 animate-float" style={{animationDelay: "1s"}}>
                  <Search className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold">התאמה עם מומחים</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  קבל התאמות עם מומחי בנייה ונדל"ן מאומתים שיש להם בדיוק את המומחיות שאתה צריך. צפה בפרופילים, דירוגים ופרויקטים קודמים.
                </p>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="text-center p-6 sm:p-8 lg:p-10 relative overflow-hidden hover-scale animate-slide-up" style={{animationDelay: "0.6s"}}>
              <div className="absolute top-6 right-6 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <CardHeader className="pb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-primary to-tech-purple rounded-3xl flex items-center justify-center mx-auto mb-8 animate-float" style={{animationDelay: "2s"}}>
                  <MessageSquare className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold">השווה ובחר</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  סקור הצעות, השווה תעריפים ולוחות זמנים, ובחר במומחה שהכי מתאים לפרויקט הבנייה שלך.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </LazySection>

      {/* Audience Section */}
      <section className="py-16 sm:py-24 lg:py-32 xl:py-40 bg-muted/30 relative overflow-hidden">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-10 sm:mb-16 lg:mb-24 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black mb-4 sm:mb-6 lg:mb-8">
              <span className="text-foreground">למי</span>
              <span className="gradient-text"> אנחנו מתאימים?</span>
            </h2>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-10 lg:gap-16 max-w-7xl mx-auto">
            {/* For Entrepreneurs */}
            <Card className="p-6 sm:p-8 lg:p-12 xl:p-16 text-center lg:text-right hover-scale animate-slide-up relative overflow-hidden" style={{animationDelay: "0.2s"}}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
              <CardHeader className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-primary to-tech-purple rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto lg:mx-0 mb-4 sm:mb-6 lg:mb-8 animate-float">
                  <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">ליזמי נדל"ן</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8 relative">
                <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed">
                  מצא את מומחי הבנייה והנדל"ן הנכונים לפרויקט שלך. חסוך זמן, הפחת עלויות וקבל הדרכה מקצועית.
                </p>
                <ul className="space-y-4 text-right" dir="rtl">
                  <li className="flex items-center gap-3 hover-scale">
                    <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
                    <span className="text-lg">גישה למומחי בנייה מאומתים</span>
                  </li>
                  <li className="flex items-center gap-3 hover-scale">
                    <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
                    <span className="text-lg">התאמה מבוססת בינה מלאכותית</span>
                  </li>
                  <li className="flex items-center gap-3 hover-scale">
                    <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
                    <span className="text-lg">תמחור שקוף וברור</span>
                  </li>
                </ul>
                <Button 
                  size="xl" 
                  className="w-full lg:w-auto mt-8 text-lg px-8 py-4 hover-scale" 
                  onClick={() => handleUserTypeSelection('entrepreneur')}
                >
                  התחל כיזם
                </Button>
              </CardContent>
            </Card>

            {/* For Consultants */}
            <Card className="p-6 sm:p-8 lg:p-12 xl:p-16 text-center lg:text-right hover-scale animate-slide-up relative overflow-hidden" style={{animationDelay: "0.4s"}}>
              <div className="absolute inset-0 bg-gradient-to-br from-tech-purple/5 to-transparent"></div>
              <CardHeader className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-tech-purple to-primary rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto lg:mx-0 mb-4 sm:mb-6 lg:mb-8 animate-float" style={{animationDelay: "1s"}}>
                  <UserCheck className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <CardTitle className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">למומחי בנייה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8 relative">
                <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed">
                  הגע ליזמי נדל"ן והצמח את עסק הבנייה שלך. קבל התאמות עם פרויקטי בנייה איכותיים.
                </p>
                <ul className="space-y-4 text-right" dir="rtl">
                  <li className="flex items-center gap-3 hover-scale">
                    <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
                    <span className="text-lg">גישה לפרויקטי בנייה איכותיים</span>
                  </li>
                  <li className="flex items-center gap-3 hover-scale">
                    <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
                    <span className="text-lg">בניית מוניטין מקצועי</span>
                  </li>
                  <li className="flex items-center gap-3 hover-scale">
                    <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
                    <span className="text-lg">גמישות בלוחות זמנים</span>
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  size="xl" 
                  className="w-full lg:w-auto mt-8 text-lg px-8 py-4 hover-scale border-2" 
                  onClick={() => handleUserTypeSelection('advisor')}
                >
                  הצטרף כמומחה
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Hidden for launch */}

      {/* Final CTA Section */}
      <LazySection className="py-16 sm:py-24 lg:py-32 xl:py-40 bg-gradient-to-br from-background via-primary/5 to-tech-purple/5 relative overflow-hidden">
        <div className="container mx-auto px-4 lg:px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight">
              <span className="text-foreground">מוכן לשדרג</span>
              <br />
              <span className="text-tech-purple-light">את העסק שלך?</span>
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed">
              הצטרף ליזמים ויועצים שחווים את העתיד של שיתוף פעולה מקצועי
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button 
                variant="hero" 
                size="xl" 
                onClick={() => setShowUserTypeDialog(true)}
                className="text-base sm:text-lg lg:text-xl px-6 sm:px-8 lg:px-12 py-4 sm:py-5 lg:py-6 bg-primary text-white hover:bg-primary/90 transition-transform duration-200 hover:scale-115 w-full sm:w-auto"
              >
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 ml-2" />
                התחל את הפרויקט הראשון היום
              </Button>
              
            </div>
            
            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground animate-fade-in" style={{animationDelay: "0.3s"}}>
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                בטוח ומאומת
              </span>
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                זמין 24/7
              </span>
              <span className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                מקצועי ואיכותי
              </span>
            </div>
          </div>
        </div>
      </LazySection>

      {/* FAQ Preview Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black mb-4 sm:mb-6">
              <span className="text-foreground">שאלות</span>
              <span className="gradient-text"> נפוצות</span>
            </h2>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold mb-2">איך עובד תהליך ההתאמה?</h3>
                  <p className="text-muted-foreground">הבינה המלאכותית שלנו מנתחת את דרישות הפרויקט ומתאימה אותך ליועצים שיש להם בדיוק את המומחיות, הניסיון והזמינות שאתה צריך.</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold mb-2">איך מאמתים את היועצים?</h3>
                  <p className="text-muted-foreground">כל יועץ עובר תהליך אימות קפדני הכולל בדיקת אישורים, שיחות עם ממליצים וסקירת תיק עבודות כדי להבטיח איכות מקסימלית.</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold mb-2">איזה סוגי פרויקטים אפשר לפרסם?</h3>
                  <p className="text-muted-foreground">מאסטרטגיה עסקית ושיווק ועד ייעוץ טכני ותכנון פיננסי - אנחנו תומכים בכל סוגי הפרויקטים המקצועיים.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-primary via-tech-purple to-primary text-white py-16">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-6">
              <Logo size="lg" variant="white" />
              <p className="text-white/80 text-sm leading-relaxed">
                מחברים יזמים ויועצים דרך הפלטפורמה הבטוחה והחכמה שלנו.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-bold">פלטפורמה</h4>
              <div className="space-y-3 text-sm">
                <a href="#" className="block text-white/80 hover:text-white transition-colors">איך זה עובד</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">אבטחה</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">תמחור</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">רשת מאומתת</a>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-bold">משאבים</h4>
              <div className="space-y-3 text-sm">
                <a href="#" className="block text-white/80 hover:text-white transition-colors">מרכז עזרה</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">בלוג</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">מקרי מבחן</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">שיטות עבודה מומלצות</a>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-bold">צור קשר</h4>
              <div className="space-y-3 text-sm">
                <a href="#" className="block text-white/80 hover:text-white transition-colors">תמיכה</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">מכירות</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">שותפויות</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">אודות</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-white/80">
              <button onClick={() => setShowPrivacy(true)} className="hover:text-white transition-colors">מדיניות פרטיות</button>
              <span>•</span>
              <button onClick={() => setShowTerms(true)} className="hover:text-white transition-colors">תנאי שימוש</button>
            </div>
            <p className="text-white/70">© 2026 Billding. כל הזכויות שמורות. Made with ❤️</p>
          </div>
        </div>
      </footer>

      {/* User Type Selection Dialog */}
      <Dialog open={showUserTypeDialog} onOpenChange={setShowUserTypeDialog}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl sm:text-3xl font-bold text-center mb-3 sm:mb-4">
              בחר את המסלול שלך
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 py-4 sm:py-6">
            {/* Entrepreneur Option */}
            <Card 
              className="p-4 sm:p-6 lg:p-8 cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary group relative overflow-hidden"
              onClick={() => handleUserTypeSelection('entrepreneur')}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary-glow/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="text-center space-y-4 sm:space-y-6 relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-primary to-primary-glow rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform">
                  <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-primary">אני יזם</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    אני צריך למצוא יועצים מוכשרים לפרויקטים העסקיים שלי ולקבל הדרכה מקצועית.
                  </p>
                </div>
                <Button className="w-full text-sm sm:text-base bg-gradient-to-r from-primary to-primary-glow hover:opacity-90" size="lg">
                  המשך כיזם
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                </Button>
              </div>
            </Card>

            {/* Consultant Option */}
            <Card 
              className="p-4 sm:p-6 lg:p-8 cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-tech-purple group relative overflow-hidden"
              onClick={() => handleUserTypeSelection('advisor')}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-tech-purple/5 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="text-center space-y-4 sm:space-y-6 relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-tech-purple to-accent rounded-2xl flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform">
                  <Briefcase className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-tech-purple">אני יועץ</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    אני רוצה להציע את שירותי הייעוץ שלי ולהתחבר עם לקוחות ופרויקטים איכותיים.
                  </p>
                </div>
                <Button className="w-full text-sm sm:text-base bg-gradient-to-r from-tech-purple to-accent hover:opacity-90 text-white" size="lg">
                  המשך כיועץ
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                </Button>
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Demo Video Dialog */}
      <Dialog open={showDemoVideo} onOpenChange={setShowDemoVideo}>
        <DialogContent className="max-w-4xl w-[95vw] h-[80vh] p-0 bg-black">
          <DialogHeader className="sr-only">
            <DialogTitle>סרטון הדגמה</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-full">
            <Button onClick={() => setShowDemoVideo(false)} variant="ghost" size="sm" className="absolute top-4 right-4 z-10 text-white hover:bg-white/20">
              <X className="w-4 h-4" />
            </Button>
            <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Demo Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full rounded-lg"></iframe>
          </div>
        </DialogContent>
      </Dialog>

      {/* Back to Top Button */}
      <BackToTop />

      {/* Privacy Policy Dialog */}
      <PrivacyPolicyDialog open={showPrivacy} onOpenChange={setShowPrivacy} />

      {/* Terms of Service Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">תנאי שימוש</DialogTitle>
          </DialogHeader>
          <TermsAndConditions accepted={true} onAcceptChange={() => {}} />
        </DialogContent>
      </Dialog>
    </div>
});

Landing.displayName = "Landing";

export default Landing;