import { useState } from "react";
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

const Landing = () => {
  // NihuList Landing Page - Cache Bust v2
  const [showUserTypeDialog, setShowUserTypeDialog] = useState(false);
  const [showDemoVideo, setShowDemoVideo] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const navigate = useNavigate();

  const testimonials = [
    {
      name: "אדר' מיכל כהן",
      role: "אדריכלית ראשית",
      company: "כהן אדריכלות",
      image: "👩‍💼",
      quote: "NihuList שינה לי את המשחק לחלוטין. מחברת אותי עם יזמי נדל\"ן איכותיים שמבינים את הערך של תכנון מקצועי ומוכנים לשלם עליו בהתאם."
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

  const handleUserTypeSelection = (userType: string) => {
    setShowUserTypeDialog(false);
    if (userType === 'entrepreneur') {
      navigate('/auth?type=entrepreneur');
    } else {
      navigate('/auth?type=consultant');
    }
  };

  return <div className="min-h-screen bg-background" dir="rtl">
      {/* Navigation */}
      <nav className="relative z-50 py-6 px-4 lg:px-6 bg-background/95 backdrop-blur-sm border-b border-border/40 sticky top-0">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-tech-purple flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-foreground">ניהוליסט</span>
              <span className="text-sm text-muted-foreground">NihuList</span>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <Link to="/for-entrepreneurs">
              <Button variant="ghost" size="sm" className="hidden md:flex">ליזמים</Button>
            </Link>
            <Link to="/for-consultants">
              <Button variant="ghost" size="sm" className="hidden md:flex">ליועצים</Button>
            </Link>
            <Button variant="premium" size="sm" onClick={() => setShowUserTypeDialog(true)} className="text-sm lg:text-base px-6">
              התחל עכשיו
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Optimized Above the Fold */}
      <section className="relative overflow-hidden py-16 lg:py-20 bg-gradient-to-br from-background via-primary/5 to-tech-purple/5">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-7xl mx-auto">
            {/* Left content */}
            <div className="space-y-6 lg:space-y-8 text-center lg:text-right">
              {/* Security badge */}
              <div className="animate-fade-in">
                <Badge variant="outline" className="inline-flex items-center gap-2 px-4 py-2 text-xs lg:text-sm hover-scale">
                  <Shield className="w-3 h-3 lg:w-4 lg:h-4 text-primary" />
                  הגנה ברמה בנקאית על המידע שלכם
                </Badge>
              </div>

              {/* Main headline - Reduced size for better space usage */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight animate-slide-up">
                <span className="gradient-text">ניהוליסט</span>
                <br />
                <span className="text-foreground">מחברים יזמי נדל"ן ומומחי בנייה</span>
                <br />
                <span className="gradient-text text-2xl sm:text-3xl lg:text-4xl xl:text-5xl">חכם יותר, מהיר יותר</span>
              </h1>

              {/* Subtext - More concise */}
              <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 animate-slide-up" style={{animationDelay: "0.2s"}}>
                הפלטפורמה הבטוחה למציאת המומחים המושלמים לכל פרויקט בנייה ונדל"ן.
              </p>

              {/* CTA Button */}
              <div className="animate-slide-up" style={{animationDelay: "0.4s"}}>
                <Button 
                  size="lg" 
                  onClick={() => setShowUserTypeDialog(true)}
                  className="text-lg px-8 py-6 hover-scale animate-glow"
                >
                  <Zap className="w-5 h-5 ml-2" />
                  התחל עכשיו
                </Button>
              </div>

              {/* Trust indicators - Compact */}
              <div className="space-y-4 animate-fade-in" style={{animationDelay: "0.6s"}}>
                <div className="flex flex-wrap justify-center lg:justify-start gap-4 lg:gap-6 text-xs lg:text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-2 hover-scale">
                    <CheckCircle className="w-3 h-3 lg:w-4 lg:h-4 text-primary" />
                    +500 פרויקטים
                  </span>
                  <span className="flex items-center gap-2 hover-scale">
                    <UserCheck className="w-3 h-3 lg:w-4 lg:h-4 text-primary" />
                    +1,000 יועצים
                  </span>
                  <span className="flex items-center gap-2 hover-scale">
                    <Shield className="w-3 h-3 lg:w-4 lg:h-4 text-primary" />
                    אבטחה ארגונית
                  </span>
                </div>
              </div>
            </div>

            {/* Right content - Compact Hero Image */}
            <div className="flex justify-center lg:justify-end animate-scale-in" style={{animationDelay: "0.3s"}}>
              <div className="relative">
                <div className="w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 rounded-3xl bg-gradient-to-br from-primary/20 to-tech-purple/20 flex items-center justify-center hover-scale">
                  <div className="text-4xl sm:text-6xl lg:text-7xl animate-pulse">👨‍💼📱</div>
                </div>
                {/* Floating elements */}
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-primary rounded-2xl flex items-center justify-center animate-float">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-3 -left-3 w-10 h-10 bg-tech-purple rounded-2xl flex items-center justify-center animate-float" style={{animationDelay: "1s"}}>
                  <Target className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Credibility Section */}
      <section className="py-24 lg:py-32 bg-muted/30 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-10 w-32 h-32 bg-primary rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-tech-purple rounded-full blur-3xl animate-float" style={{animationDelay: "2s"}}></div>
        </div>
        
        <div className="container mx-auto px-4 lg:px-6 relative">
          <div className="text-center mb-20 animate-fade-in">
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              <span className="text-foreground">מומחי בנייה ויזמי נדל"ן מאומתים</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">נבדקים בקפידה להבטחת איכות ואמינות מקסימלית בתחום הבנייה והנדל"ן</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 text-center max-w-5xl mx-auto mb-20">
            <div className="space-y-4 animate-scale-in hover-scale" style={{animationDelay: "0.1s"}}>
                <div className="text-4xl lg:text-6xl font-black gradient-text">+500</div>
                <div className="text-sm lg:text-base font-medium text-muted-foreground">פרויקטי בנייה הושלמו</div>
            </div>
            <div className="space-y-4 animate-scale-in hover-scale" style={{animationDelay: "0.2s"}}>
                <div className="text-4xl lg:text-6xl font-black gradient-text">+1,000</div>
                <div className="text-sm lg:text-base font-medium text-muted-foreground">מומחי בנייה מאומתים</div>
            </div>
            <div className="space-y-4 animate-scale-in hover-scale" style={{animationDelay: "0.3s"}}>
              <div className="text-4xl lg:text-6xl font-black gradient-text">95%</div>
              <div className="text-sm lg:text-base font-medium text-muted-foreground">שביעות רצון</div>
            </div>
            <div className="space-y-4 animate-scale-in hover-scale" style={{animationDelay: "0.4s"}}>
              <div className="text-4xl lg:text-6xl font-black gradient-text">24/7</div>
              <div className="text-sm lg:text-base font-medium text-muted-foreground">תמיכה</div>
            </div>
          </div>

          {/* Security Banner */}
          <div className="text-center animate-fade-in" style={{animationDelay: "0.5s"}}>
            <div className="inline-flex items-center gap-2 px-8 py-4 bg-primary/10 rounded-full hover-scale">
              <Lock className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">הגנה ברמה בנקאית על המידע שלכם</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-32 lg:py-40 bg-background relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 right-20 w-64 h-64 bg-tech-purple rounded-full blur-3xl animate-float" style={{animationDelay: "3s"}}></div>
        </div>
        
        <div className="container mx-auto px-4 lg:px-6 relative">
          <div className="text-center mb-24 animate-fade-in">
            <h2 className="text-5xl lg:text-6xl font-black mb-8">
              <span className="text-foreground">איך</span>
              <span className="gradient-text"> זה עובד</span>
            </h2>
            <p className="text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              שלושה צעדים פשוטים למציאת המומחה המושלם לכל פרויקט בנייה ונדל"ן
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
            {/* Step 1 */}
            <Card className="text-center p-10 relative overflow-hidden hover-scale animate-slide-up" style={{animationDelay: "0.2s"}}>
              <div className="absolute top-6 right-6 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                1
              </div>
              <CardHeader className="pb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-primary to-tech-purple rounded-3xl flex items-center justify-center mx-auto mb-8 animate-float">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold">צור פרויקט בנייה</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  תאר את פרויקט הבנייה או הנדל"ן שלך, לוחות זמנים ותקציב. הבינה המלאכותית מנתחת את הדרישות ומוצאת מומחים מושלמים.
                </p>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="text-center p-10 relative overflow-hidden hover-scale animate-slide-up" style={{animationDelay: "0.4s"}}>
              <div className="absolute top-6 right-6 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                2
              </div>
              <CardHeader className="pb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-tech-purple to-primary rounded-3xl flex items-center justify-center mx-auto mb-8 animate-float" style={{animationDelay: "1s"}}>
                  <Search className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold">התאמה עם מומחים</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  קבל התאמות עם מומחי בנייה ונדל"ן מאומתים שיש להם בדיוק את המומחיות שאתה צריך. צפה בפרופילים, דירוגים ופרויקטים קודמים.
                </p>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="text-center p-10 relative overflow-hidden hover-scale animate-slide-up" style={{animationDelay: "0.6s"}}>
              <div className="absolute top-6 right-6 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                3
              </div>
              <CardHeader className="pb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-primary to-tech-purple rounded-3xl flex items-center justify-center mx-auto mb-8 animate-float" style={{animationDelay: "2s"}}>
                  <MessageSquare className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold">השווה ובחר</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  סקור הצעות, השווה תעריפים ולוחות זמנים, ובחר במומחה שהכי מתאים לפרויקט הבנייה שלך.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Audience Section */}
      <section className="py-32 lg:py-40 bg-muted/30 relative overflow-hidden">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-24 animate-fade-in">
            <h2 className="text-5xl lg:text-6xl font-black mb-8">
              <span className="text-foreground">למי</span>
              <span className="gradient-text"> אנחנו מתאימים?</span>
            </h2>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-16 max-w-7xl mx-auto">
            {/* For Entrepreneurs */}
            <Card className="p-12 lg:p-16 text-center lg:text-right hover-scale animate-slide-up relative overflow-hidden" style={{animationDelay: "0.2s"}}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
              <CardHeader className="relative">
                <div className="w-20 h-20 bg-gradient-to-r from-primary to-tech-purple rounded-3xl flex items-center justify-center mx-auto lg:mx-0 mb-8 animate-float">
                  <Briefcase className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-4xl font-bold mb-6">ליזמי נדל"ן</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 relative">
                <p className="text-xl text-muted-foreground leading-relaxed">
                  מצא את מומחי הבנייה והנדל"ן הנכונים לפרויקט שלך. חסוך זמן, הפחת עלויות וקבל הדרכה מקצועית.
                </p>
                <ul className="space-y-4 text-right">
                  <li className="flex items-center gap-3 justify-end hover-scale">
                    <span className="text-lg">גישה למומחי בנייה מאומתים</span>
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </li>
                  <li className="flex items-center gap-3 justify-end hover-scale">
                    <span className="text-lg">התאמה מבוססת בינה מלאכותית</span>
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </li>
                  <li className="flex items-center gap-3 justify-end hover-scale">
                    <span className="text-lg">תמחור שקוף וברור</span>
                    <CheckCircle className="w-6 h-6 text-primary" />
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
            <Card className="p-12 lg:p-16 text-center lg:text-right hover-scale animate-slide-up relative overflow-hidden" style={{animationDelay: "0.4s"}}>
              <div className="absolute inset-0 bg-gradient-to-br from-tech-purple/5 to-transparent"></div>
              <CardHeader className="relative">
                <div className="w-20 h-20 bg-gradient-to-r from-tech-purple to-primary rounded-3xl flex items-center justify-center mx-auto lg:mx-0 mb-8 animate-float" style={{animationDelay: "1s"}}>
                  <UserCheck className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-4xl font-bold mb-6">למומחי בנייה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 relative">
                <p className="text-xl text-muted-foreground leading-relaxed">
                  הגע ליזמי נדל"ן והצמח את עסק הבנייה שלך. קבל התאמות עם פרויקטי בנייה איכותיים.
                </p>
                <ul className="space-y-4 text-right">
                  <li className="flex items-center gap-3 justify-end hover-scale">
                    <span className="text-lg">גישה לפרויקטי בנייה איכותיים</span>
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </li>
                  <li className="flex items-center gap-3 justify-end hover-scale">
                    <span className="text-lg">בניית מוניטין מקצועי</span>
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </li>
                  <li className="flex items-center gap-3 justify-end hover-scale">
                    <span className="text-lg">גמישות בלוחות זמנים</span>
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </li>
                </ul>
                <Button 
                  variant="outline" 
                  size="xl" 
                  className="w-full lg:w-auto mt-8 text-lg px-8 py-4 hover-scale border-2" 
                  onClick={() => handleUserTypeSelection('consultant')}
                >
                  הצטרף כמומחה
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 lg:py-32 bg-background">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              <span className="text-foreground">מה אומרים</span>
              <br />
              <span className="gradient-text">המשתמשים שלנו</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              סיפורי הצלחה אמיתיים של יזמים ויועצים שמצאו זה את זה דרך הפלטפורמה שלנו
            </p>
          </div>

          {/* Testimonials Carousel */}
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 lg:p-12 text-center">
              <CardContent>
                <div className="space-y-8">
                  <div className="flex justify-center text-primary text-3xl">
                    {"★".repeat(5)}
                  </div>
                  
                  <blockquote className="text-xl lg:text-2xl italic text-muted-foreground leading-relaxed">
                    "{testimonials[currentTestimonial].quote}"
                  </blockquote>
                  
                  <div className="space-y-2">
                    <div className="text-6xl">{testimonials[currentTestimonial].image}</div>
                    <div className="font-bold text-xl">{testimonials[currentTestimonial].name}</div>
                    <div className="text-muted-foreground">{testimonials[currentTestimonial].role}</div>
                    <div className="text-sm text-primary font-medium">{testimonials[currentTestimonial].company}</div>
                  </div>
                  
                  {/* Navigation */}
                  <div className="flex justify-center items-center gap-4">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setCurrentTestimonial((prev) => prev === 0 ? testimonials.length - 1 : prev - 1)}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                    <div className="flex gap-2">
                      {testimonials.map((_, index) => (
                        <button
                          key={index}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentTestimonial ? 'bg-primary' : 'bg-muted'
                          }`}
                          onClick={() => setCurrentTestimonial(index)}
                        />
                      ))}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setCurrentTestimonial((prev) => prev === testimonials.length - 1 ? 0 : prev + 1)}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Secondary CTA Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-r from-primary via-tech-purple to-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 lg:px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 leading-tight">
              מוכן לשנות
              <br />
              <span className="text-tech-purple-light">את העסק שלך?</span>
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
              הצטרף לאלפי יזמים ויועצים שכבר חווים את העתיד של שיתוף פעולה מקצועי
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button 
                variant="hero" 
                size="xl" 
                onClick={() => setShowUserTypeDialog(true)}
                className="text-xl px-12 py-6 bg-white text-primary hover:bg-white/90"
              >
                <Zap className="w-6 h-6 ml-2" />
                התחל את הפרויקט הראשון היום
              </Button>
              
              <Button 
                variant="ghost" 
                size="xl" 
                onClick={() => setShowUserTypeDialog(true)}
                className="text-xl px-12 py-6 text-white border-white/30 hover:bg-white/10"
              >
                <UserCheck className="w-6 h-6 ml-2" />
                הצטרף כיועץ מאומת
              </Button>
            </div>
            
            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-white/70 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>אבטחה ארגונית</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>רשת מאומתת</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>תמיכה 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Preview Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-bold">NihuList</div>
                  <div className="text-sm text-white/70">ניהוליסט</div>
                </div>
              </div>
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
          <div className="border-t border-white/10 pt-8 text-center text-white/70">
            <p>© 2026 NihuList. כל הזכויות שמורות. Made with ❤️</p>
          </div>
        </div>
      </footer>

      {/* User Type Selection Dialog */}
      <Dialog open={showUserTypeDialog} onOpenChange={setShowUserTypeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center mb-4">
              בחר את המסלול שלך
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid md:grid-cols-2 gap-6 py-6">
            {/* Entrepreneur Option */}
            <Card 
              className="p-8 cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary"
              onClick={() => handleUserTypeSelection('entrepreneur')}
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-r from-primary to-tech-purple rounded-2xl flex items-center justify-center mx-auto">
                  <Briefcase className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3">אני יזם</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    אני צריך למצוא יועצים מוכשרים לפרויקטים העסקיים שלי ולקבל הדרכה מקצועית.
                  </p>
                </div>
                <Button className="w-full">
                  המשך כיזם
                  <ChevronLeft className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </Card>

            {/* Consultant Option */}
            <Card 
              className="p-8 cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary"
              onClick={() => handleUserTypeSelection('consultant')}
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-r from-tech-purple to-primary rounded-2xl flex items-center justify-center mx-auto">
                  <UserCheck className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3">אני יועץ</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    אני רוצה להציע את שירותי הייעוץ שלי ולהתחבר עם לקוחות ופרויקטים איכותיים.
                  </p>
                </div>
                <Button variant="outline" className="w-full">
                  המשך כיועץ
                  <ChevronLeft className="w-4 h-4 mr-2" />
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
    </div>;
};

export default Landing;