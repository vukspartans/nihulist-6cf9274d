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
  UserCheck,
  Star,
  ArrowLeft,
  ArrowRight,
  Coins,
  Award,
  Briefcase,
  Globe,
  MessageSquare
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import MobileNav from "@/components/MobileNav";
import Logo from "@/components/Logo";
import BackToTop from "@/components/BackToTop";

const ForConsultants = () => {
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();

  const onboardingSteps = [
    {
      icon: <UserCheck className="w-8 h-8" />,
      title: "הרשמה ואימות",
      description: "תהליך אימות מקצועי קצר שמוודא את המומחיות והניסיון שלך"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "בניית פרופיל",
      description: "יצירת פרופיל מרשים שמציג את החוזקות וההישגים המקצועיים שלך"
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "קבלת פרויקטים",
      description: "התאמה אוטומטית לפרויקטים מתאימים + הזדמנות להציע הצעות מותאמות"
    }
  ];

  const benefits = [
    { 
      title: "פרויקטים איכותיים", 
      description: "רק לקוחות רציניים עם תקציבים אמיתיים ודרישות ברורות",
      stat: "₪50K+ ממוצע פרויקט"
    },
    { 
      title: "תשלומים מובטחים", 
      description: "מערכת תשלומים מאובטחת עם ערבויות תשלום",
      stat: "100% ביטחון תשלום"
    },
    { 
      title: "גמישות מלאה", 
      description: "עבוד בקצב שלך, בחר פרויקטים ולקוחות שמתאימים לך",
      stat: "לוחות זמנים גמישים"
    },
    { 
      title: "צמיחה מקצועית", 
      description: "חשיפה לפרויקטים מגוונים ולקוחות מובילים בתעשייה",
      stat: "+40% גידול הכנסות"
    }
  ];

  const testimonials = [
    {
      name: "אדר' רונית כהן",
      title: "אדריכלית ומתכננת ערים",
      expertise: "15 שנות ניסיון",
      quote: "NihuList שינה לי את הקריירה. מפרויקטים קטנים עברתי לתכנון פרויקטי נדל\"ן מובילים. ההכנסות שלי גדלו פי 3.",
      earnings: "₪2.5M השנה"
    },
    {
      name: "אבי לוי",
      title: "קבלן ראשי ומהנדס בנייה",
      expertise: "מומחה בבנייה ירוקה",
      quote: "הפלטפורמה מביאה לי רק פרויקטי בנייה איכותיים שמבינים את הערך של בנייה מקצועית. לא מבזבז זמן על הצעות מחיר חינם.",
      earnings: "₪500K חודשיים"
    }
  ];

  const pricingPlans = [
    {
      name: "בסיסי",
      price: "0",
      period: "לחודש",
      description: "מושלם להתחלה",
      features: [
        "עד 3 הצעות חודשיות",
        "פרופיל בסיסי",
        "תמיכה בצ'אט",
        "5% עמלה"
      ],
      cta: "התחל חינם",
      popular: false
    },
    {
      name: "מקצועי",
      price: "299",
      period: "לחודש",
      description: "לפעילות מתמשכת",
      features: [
        "הצעות ללא הגבלה",
        "פרופיל מורחב",
        "תמיכה טלפונית",
        "3% עמלה",
        "אימות מוגבר",
        "חשיפה מועדפת"
      ],
      cta: "שדרג עכשיו",
      popular: true
    }
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Navigation */}
      <nav className="relative z-50 py-4 sm:py-6 px-4 lg:px-6 bg-background/95 backdrop-blur-sm border-b border-border/40 sticky top-0">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center">
            <Logo size="sm" className="sm:h-10" />
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">דף הבית</Button>
            </Link>
            <Link to="/for-entrepreneurs">
              <Button variant="ghost" size="sm">ליזמים</Button>
            </Link>
            <Button 
              variant="premium" 
              size="sm" 
              onClick={() => navigate('/auth?type=advisor')}
              className="px-6"
            >
              הצטרף עכשיו
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="flex lg:hidden">
            <MobileNav 
              showHomeLink
              showEntrepreneurLink
              ctaText="הצטרף עכשיו"
              ctaAction={() => navigate('/auth?type=advisor')}
            />
          </div>
        </div>
      </nav>

      {/* Hero Section - Mobile Optimized */}
      <section className="relative overflow-hidden py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-background via-tech-purple/5 to-primary/5">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-4 sm:space-y-6 lg:space-y-8">
            <div className="animate-fade-in">
                <Badge variant="outline" className="inline-flex items-center gap-2 px-4 py-2 text-xs lg:text-sm">
                  <Award className="w-3 h-3 lg:w-4 lg:h-4 text-tech-purple" />
                  רשת מומחי הבנייה המובילה בישראל
                </Badge>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black leading-tight animate-slide-up">
              <span className="text-foreground">הצמח את</span>
              <br />
              <span className="gradient-text">עסק הבנייה</span>
              <br />
              <span className="text-foreground text-2xl sm:text-3xl lg:text-4xl xl:text-5xl">שלך</span>
            </h1>

            <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto animate-slide-up" style={{animationDelay: "0.2s"}}>
              הצטרף לרשת מומחי הבנייה המובילה והתחבר עם יזמי נדל"ן איכותיים שמחפשים את המומחיות שלך.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center animate-slide-up" style={{animationDelay: "0.4s"}}>
              <Button 
                size="lg" 
                onClick={() => navigate('/auth?type=advisor')}
                className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 hover-scale"
              >
                <UserCheck className="w-5 h-5 ml-2" />
                הצטרף עכשיו
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 hover-scale hidden sm:flex"
              >
                <BarChart className="w-5 h-5 ml-2" />
                צפה איך זה עובד
              </Button>
            </div>

            {/* Trust Indicators - Compact */}
            <div className="flex flex-wrap justify-center items-center gap-4 lg:gap-6 text-xs lg:text-sm font-medium text-muted-foreground animate-fade-in" style={{animationDelay: "0.6s"}}>
              <span className="flex items-center gap-2">
                <Coins className="w-3 h-3 lg:w-4 lg:h-4 text-green-500" />
                +40% הכנסות
              </span>
              <span className="flex items-center gap-2">
                <Shield className="w-3 h-3 lg:w-4 lg:h-4 text-tech-purple" />
                תשלומים מובטחים
              </span>
              <span className="flex items-center gap-2">
                <Star className="w-3 h-3 lg:w-4 lg:h-4 text-yellow-500" />
                לקוחות איכותיים
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-12 sm:py-16 lg:py-24 xl:py-32 bg-background">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              <span className="text-foreground">איך</span>
              <span className="gradient-text"> זה עובד?</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              תהליך פשוט ומהיר להצטרפות לרשת מומחי הבנייה המובילה
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto mb-12 sm:mb-16">
            {onboardingSteps.map((step, index) => (
              <Card 
                key={index}
                className={`p-8 text-center cursor-pointer transition-all duration-500 hover-scale ${
                  activeStep === index ? 'border-tech-purple bg-tech-purple/5 transform scale-105' : ''
                }`}
                onMouseEnter={() => setActiveStep(index)}
              >
                <div className="relative">
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-tech-purple rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-300 ${
                    activeStep === index 
                      ? 'bg-gradient-to-r from-tech-purple to-primary text-white' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {step.icon}
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button 
              size="xl" 
              onClick={() => navigate('/auth?type=advisor')}
              className="hover-scale"
            >
              התחל את התהליך עכשיו
              <ArrowLeft className="w-5 h-5 mr-2 flip-rtl-180" />
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 sm:py-16 lg:py-24 xl:py-32 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              <span className="gradient-text">היתרונות</span>
              <span className="text-foreground"> שלך</span>
            </h2>
            <p className="text-xl text-muted-foreground">למה אלפי יועצים כבר בחרו בנו</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 max-w-7xl mx-auto">
            {benefits.map((benefit, index) => (
              <Card key={index} className="p-8 text-center hover-scale animate-scale-in" style={{animationDelay: `${index * 0.1}s`}}>
                <div className="w-16 h-16 bg-gradient-to-r from-tech-purple to-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                
                <div className="mb-4">
                  <Badge variant="outline" className="text-xs">
                    {benefit.stat}
                  </Badge>
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
              <span className="text-foreground">יועצים</span>
              <span className="gradient-text"> מצליחים</span>
            </h2>
            <p className="text-xl text-muted-foreground">סיפורי הצלחה של יועצים שהצמיחו את העסק דרך הפלטפורמה</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="p-8 lg:p-12 relative overflow-hidden hover-scale animate-scale-in" style={{animationDelay: `${index * 0.2}s`}}>
                <div className="absolute top-4 left-4">
                  <Badge className="bg-green-100 text-green-800">
                    {testimonial.earnings}
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
                    <div className="text-sm text-tech-purple font-medium">{testimonial.expertise}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-12 sm:py-16 lg:py-24 xl:py-32 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              <span className="text-foreground">תוכניות</span>
              <span className="gradient-text"> מחיר</span>
            </h2>
            <p className="text-xl text-muted-foreground">בחר את התוכנית שהכי מתאימה לך</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index}
                className={`p-8 lg:p-12 relative hover-scale animate-scale-in ${
                  plan.popular ? 'border-tech-purple border-2 bg-tech-purple/5' : ''
                }`}
                style={{animationDelay: `${index * 0.2}s`}}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-tech-purple text-white px-4 py-1">
                      הכי פופולרי
                    </Badge>
                  </div>
                )}

                <div className="text-center space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold">{plan.name}</h3>
                    <p className="text-muted-foreground">{plan.description}</p>
                  </div>

                  <div>
                    <span className="text-5xl font-black">₪{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>

                  <ul className="space-y-4 text-right">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3 justify-end">
                        <span>{feature}</span>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className={`w-full ${plan.popular ? 'bg-tech-purple hover:bg-tech-purple/90' : ''}`}
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => navigate('/auth?type=advisor')}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-24 xl:py-32 bg-gradient-to-r from-tech-purple via-primary to-tech-purple relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 lg:px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl lg:text-6xl font-black text-white leading-tight">
              מוכן להצטרף?
              <br />
              <span className="text-tech-purple-light">הלקוחות הבאים שלך מחכים</span>
            </h2>
            
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              התחל להרוויח יותר עם פרויקטים איכותיים מלקוחות רציניים
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button 
                variant="hero" 
                size="xl" 
                onClick={() => navigate('/auth?type=advisor')}
                className="text-xl px-12 py-6 bg-white text-tech-purple hover:bg-white/90 hover-scale"
              >
                <UserCheck className="w-6 h-6 ml-2" />
                הצטרף עכשיו - חינם
              </Button>
            </div>
            
            <div className="flex justify-center items-center gap-8 text-white/70 text-sm">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                ללא התחייבות
              </span>
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                אימות מהיר
              </span>
              <span className="flex items-center gap-2">
                <Coins className="w-4 h-4" />
                תשלומים מובטחים
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Back to Home */}
      <div className="py-8 bg-background border-t border-border/40">
        <div className="container mx-auto px-4 lg:px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors story-link">
            <ArrowRight className="w-4 h-4" />
            חזרה לעמוד הבית
          </Link>
        </div>
      </div>

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
};

export default ForConsultants;