import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Zap, 
  Shield, 
  CheckCircle, 
  TrendingUp,
  Clock,
  Target,
  BarChart,
  Briefcase,
  Star,
  ArrowLeft,
  ArrowRight,
  Coins,
  Award
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import MobileNav from "@/components/MobileNav";

const ForEntrepreneurs = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const navigate = useNavigate();

  const features = [
    {
      icon: <Target className="w-8 h-8" />,
      title: "התאמה מדויקת",
      description: "אלגוריתם AI מתקדם מוצא את מומחה הבנייה המושלם בהתאם לסוג הפרויקט, תקציב ולוחות זמנים שלך"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "מומחים מאומתים",
      description: "כל מומחה עבר אימות קפדני של כישורים, ניסיון, רישיונות וממליצים מהתעשייה"
    },
    {
      icon: <BarChart className="w-8 h-8" />,
      title: "השוואה חכמה",
      description: "כלים מתקדמים להשוואת הצעות קבלנים, ניתוח עלות-תועלת ובחירה מיטבית"
    }
  ];

  const benefits = [
    { title: "חיסכון של עד 80% בזמן", description: "במקום שבועות של חיפוש - מצא יועץ תוך 24 שעות" },
    { title: "הפחתת סיכונים", description: "יועצים מאומתים עם ביטוח מקצועי וערבויות איכות" },
    { title: "שקיפות מלאה", description: "תמחור ברור, ללא עמלות נסתרות או הפתעות" },
    { title: "תמיכה 24/7", description: "צוות מקצועי זמין לליווי לאורך כל הפרויקט" }
  ];

  const testimonials = [
    {
      name: "אבי שטרן",
      title: "מייסד ומנכ״ל נרשה בנייה",
      quote: "מצאתי צוות קבלנים מקצועי שהשלים לי פרויקט בנייה של 20 יחידות דיור תוך 8 חודשים. איכות ומקצועיות ברמה גבוהה.",
      savings: "₪2.5M"
    },
    {
      name: "מיכל רוזן",
      title: "מנכ״לית רוזן נדל\"ן",
      quote: "האדריכל והמהנדס שמצאתי דרך NihuList עזרו לי לתכנן ולהוציא היתרי בנייה לפרויקט מסחרי של 50 מיליון ש\"ח. מקצועיות ברמה אחרת.",
      savings: "₪5M"
    }
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Navigation */}
      <nav className="relative z-50 py-4 sm:py-6 px-4 lg:px-6 bg-background/95 backdrop-blur-sm border-b border-border/40 sticky top-0">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-primary to-tech-purple flex items-center justify-center">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-bold text-foreground">ניהוליסט</span>
              <span className="text-xs sm:text-sm text-muted-foreground">NihuList</span>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">דף הבית</Button>
            </Link>
            <Link to="/for-consultants">
              <Button variant="ghost" size="sm">ליועצים</Button>
            </Link>
            <Button 
              variant="premium" 
              size="sm" 
              onClick={() => navigate('/auth?type=entrepreneur')}
              className="px-6"
            >
              התחל עכשיו
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="flex lg:hidden">
            <MobileNav 
              showHomeLink
              showConsultantLink
              ctaText="התחל עכשיו"
              ctaAction={() => navigate('/auth?type=entrepreneur')}
            />
          </div>
        </div>
      </nav>

      {/* Hero Section - Mobile Optimized */}
      <section className="relative overflow-hidden py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-background via-primary/5 to-tech-purple/5">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            <div className="animate-fade-in">
              <Badge variant="outline" className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm mb-4 sm:mb-6">
                <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                <span className="hidden sm:inline">פתרון מותאם ליזמים חכמים</span>
                <span className="sm:hidden">ליזמים</span>
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black leading-tight animate-slide-up">
              <span className="text-foreground">מצא את</span>
              <br />
              <span className="gradient-text">מומחי הבנייה המושלמים</span>
              <br />
              <span className="text-foreground">לפרויקט שלך</span>
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto animate-slide-up" style={{animationDelay: "0.2s"}}>
              פלטפורמה חכמה שמחברת אותך עם מומחי בנייה ונדל"ן מובילים בתעשייה.
              <br className="hidden sm:inline" />
              חסוך זמן, הפחת סיכונים והשג תוצאות מעבר לציפיות.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center animate-slide-up" style={{animationDelay: "0.4s"}}>
              <Button 
                size="lg" 
                onClick={() => navigate('/auth?type=entrepreneur')}
                className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-6 hover-scale"
              >
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 ml-2" />
                התחל חינם עכשיו
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-6 hover-scale hidden sm:flex"
              >
                <BarChart className="w-5 h-5 sm:w-6 sm:h-6 ml-2" />
                צפה בדמו
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm font-medium text-muted-foreground animate-fade-in" style={{animationDelay: "0.6s"}}>
              <span className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-green-500" />
                ממוצע חיסכון: ₪250K
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                מהירות: 24 שעות
              </span>
              <span className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                דירוג: 4.9/5
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Features Section */}
      <section className="py-12 sm:py-16 lg:py-24 xl:py-32 bg-background">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              <span className="text-foreground">למה יזמי נדל"ן</span>
              <span className="gradient-text"> בוחרים בנו?</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              טכנולוגיה מתקדמת + רשת מומחי בנייה איכותית = הצלחה מובטחת בפרויקט
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center max-w-7xl mx-auto">
            {/* Interactive Feature Cards */}
            <div className="space-y-4 sm:space-y-6">
              {features.map((feature, index) => (
                <Card 
                  key={index}
                  className={`p-4 sm:p-6 cursor-pointer transition-all duration-300 hover-scale ${
                    activeFeature === index ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setActiveFeature(index)}
                  onMouseEnter={() => setActiveFeature(index)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-300 ${
                      activeFeature === index 
                        ? 'bg-gradient-to-r from-primary to-tech-purple text-white' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Visual Demo */}
            <div className="relative">
              <div className="w-full h-96 bg-gradient-to-br from-primary/10 to-tech-purple/10 rounded-3xl flex items-center justify-center">
                <div className="text-8xl animate-pulse">🎯</div>
              </div>
              
              {/* Floating Stats */}
              <div className="absolute -top-6 -right-6 bg-white p-4 rounded-2xl shadow-lg animate-float">
                <div className="text-2xl font-bold text-green-500">+300%</div>
                <div className="text-sm text-muted-foreground">ROI ממוצע</div>
              </div>
              
              <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-lg animate-float" style={{animationDelay: "1s"}}>
                <div className="text-2xl font-bold text-primary">72h</div>
                <div className="text-sm text-muted-foreground">זמן מהיר</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-12 sm:py-16 lg:py-24 xl:py-32 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              <span className="gradient-text">היתרונות</span>
              <span className="text-foreground"> שלך</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-7xl mx-auto">
            {benefits.map((benefit, index) => (
              <Card key={index} className="p-6 sm:p-8 text-center hover-scale animate-scale-in" style={{animationDelay: `${index * 0.1}s`}}>
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-tech-purple rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-4">{benefit.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-12 sm:py-16 lg:py-24 xl:py-32 bg-background">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              <span className="text-foreground">סיפורי</span>
              <span className="gradient-text"> הצלחה</span>
            </h2>
            <p className="text-xl text-muted-foreground">יזמים שהצליחו להאיץ את העסק עם היועצים הנכונים</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-6 sm:p-8 lg:p-12 relative overflow-hidden hover-scale animate-scale-in" style={{animationDelay: `${index * 0.2}s`}}>
                <div className="absolute top-4 left-4">
                  <Badge className="bg-green-100 text-green-800">
                    חסך {testimonial.savings}
                  </Badge>
                </div>
                
                <div className="mt-8 space-y-6">
                  <div className="flex text-yellow-500 text-2xl">
                    {"★".repeat(5)}
                  </div>
                  
                  <blockquote className="text-xl italic text-muted-foreground leading-relaxed">
                    "{testimonial.quote}"
                  </blockquote>
                  
                  <div>
                    <div className="font-bold text-xl">{testimonial.name}</div>
                    <div className="text-muted-foreground">{testimonial.title}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-24 xl:py-32 bg-gradient-to-r from-primary via-tech-purple to-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 lg:px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl lg:text-6xl font-black text-white leading-tight">
              מוכן להתחיל?
              <br />
              <span className="text-tech-purple-light">הפרויקט הבא שלך מחכה</span>
            </h2>
            
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              הצטרף לאלפי יזמים שכבר מצאו את היועצים המושלמים לעסק שלהם
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
              <Button 
                variant="hero" 
                size="lg" 
                onClick={() => navigate('/auth?type=entrepreneur')}
                className="w-full sm:w-auto text-base sm:text-xl px-8 sm:px-12 py-5 sm:py-6 bg-white text-primary hover:bg-white/90 hover-scale group"
              >
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 ml-2 text-white/80 group-hover:text-white transition-colors" />
                <span className="text-white/80 group-hover:text-white transition-colors">התחל עכשיו - חינם</span>
              </Button>
            </div>
            
            <div className="flex justify-center items-center gap-8 text-white/70 text-sm">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                ללא התחייבות
              </span>
              <span className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                יועצים מאומתים
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                תוצאות תוך 24 שעות
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Back to Home */}
      <div className="py-8 bg-background border-t border-border/40">
        <div className="container mx-auto px-4 lg:px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors story-link">
            <ArrowRight className="w-4 h-4 flip-rtl-180" />
            חזרה לעמוד הבית
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForEntrepreneurs;