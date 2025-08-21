import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Users, FileText, Award, ArrowLeft, Zap, Shield, TrendingUp, Star, CheckCircle, Play, Globe, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-construction.jpg";
const Landing = () => {
  const [supplierToken, setSupplierToken] = useState("");
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showDemoVideo, setShowDemoVideo] = useState(false);
  const navigate = useNavigate();
  const handleSupplierAccess = () => {
    if (supplierToken.trim()) {
      navigate(`/submit?t=${supplierToken.trim()}`);
    }
  };
  if (showSupplierForm) {
    return <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/30 to-tech-purple-light/20 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md glass-card">
          <CardHeader className="text-center">
            <Button variant="ghost" size="sm" onClick={() => setShowSupplierForm(false)} className="self-start mb-4">
              <ArrowLeft className="w-4 h-4 ml-2" />
              חזרה
            </Button>
            <CardTitle className="text-2xl font-bold gradient-text">
              כניסה לספקים
            </CardTitle>
            <CardDescription>
              הזן את הקוד שקיבלת במייל כדי להגיש הצעת מחיר
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token" className="text-right">קוד גישה</Label>
              <Input 
                id="token" 
                placeholder="הזן קוד גישה..." 
                value={supplierToken} 
                onChange={e => setSupplierToken(e.target.value)} 
                className="text-right font-mono" 
                dir="rtl" 
              />
            </div>
            <Button onClick={handleSupplierAccess} className="w-full" variant="premium" disabled={!supplierToken.trim()}>
              כניסה לטופס הגשת הצעה
            </Button>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/20 to-tech-purple-light/10" dir="rtl">
      {/* Mobile-Optimized Navigation */}
      <nav className="relative z-50 py-4 px-4 lg:px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-tech-purple flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg lg:text-xl font-bold gradient-text">NARSHA AI</span>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <Button variant="ghost" size="sm" className="hidden md:flex">תמחור</Button>
            <Button variant="ghost" size="sm" className="hidden md:flex">צוות</Button>
            <Button variant="premium" size="sm" onClick={() => navigate("/auth")} className="text-sm lg:text-base px-4 lg:px-6">
              התחל עכשיו
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Unicorn Level */}
      <section className="relative overflow-hidden py-24 lg:py-32">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Next-Generation Construction AI Platform" className="w-full h-full object-cover opacity-5" />
          <div className="absolute inset-0 bg-gradient-to-l from-primary-deep/90 via-primary/80 to-tech-purple/70"></div>
        </div>
        
        {/* Floating elements */}
        <div className="absolute top-20 left-10 animate-float">
          <div className="w-3 h-3 bg-primary-glow rounded-full opacity-60"></div>
        </div>
        <div className="absolute top-40 right-20 animate-float" style={{
        animationDelay: "1s"
      }}>
          <div className="w-2 h-2 bg-tech-purple rounded-full opacity-40"></div>
        </div>
        
        <div className="relative container mx-auto px-4 lg:px-6 text-center">
          <div className="max-w-6xl mx-auto">
            {/* Premium badge */}
            <div className="mb-8 animate-fade-in">
              <span className="inline-flex items-center px-6 py-3 glass-card text-foreground text-sm font-medium rounded-full mb-6 animate-glow">
                <Zap className="w-4 h-4 ml-2 text-tech-purple" />
                פלטפורמת הבינה המלאכותית המובילה לבנייה • Series A Funded
              </span>
            </div>

            {/* Hero headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black mb-6 lg:mb-8 leading-tight animate-slide-up">
              <span className="gradient-text">מהפכה</span>
              <br />
              <span className="text-foreground">בעולם הבנייה</span>
            </h1>

            <p className="text-xl md:text-3xl text-white mb-12 leading-relaxed max-w-4xl mx-auto animate-slide-up font-light" style={{
            animationDelay: "0.2s"
          }}>
              בינה מלאכותית מתקדמת + רשת ספקים מאומתת = 
              <span className="font-bold text-primary"> 123 </span>
            </p>
            
            <div className="flex flex-col lg:flex-row gap-6 justify-center items-center max-w-3xl mx-auto animate-slide-up" style={{
            animationDelay: "0.4s"
          }}>
              <Button variant="hero" size="xl" onClick={() => navigate("/auth")} className="w-full lg:w-auto text-xl px-12 py-6 animate-glow">
                <Building2 className="w-7 h-7 ml-3" />
                התחל פרויקט חינם
              </Button>
              
              <Button variant="glass" size="xl" onClick={() => setShowSupplierForm(true)} className="w-full lg:w-auto text-xl px-12 py-6">
                <Users className="w-7 h-7 ml-3" />
                כניסת ספקים
              </Button>

              <Button 
                variant="ghost" 
                size="xl" 
                className="w-full lg:w-auto text-xl px-12 py-6 hover:bg-white/10"
                onClick={() => setShowDemoVideo(true)}
              >
                <Play className="w-7 h-7 ml-3" />
                צפה בדמו
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 animate-fade-in" style={{
            animationDelay: "0.6s"
          }}>
              <p className="text-sm text-muted-foreground mb-4">מובילי התעשייה בוטחים בנו</p>
              <div className="flex justify-center items-center gap-8 opacity-60">
                <span className="text-lg font-semibold">אפריקה ישראל</span>
                <span className="text-lg font-semibold">בזק בינלאומי</span>
                <span className="text-lg font-semibold">רמקו</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Mobile Optimized */}
      <section className="py-16 lg:py-20 bg-gradient-to-r from-primary/5 via-background to-tech-purple/5">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 text-center">
            <div className="space-y-2 lg:space-y-3 counter-animate">
              <div className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black gradient-text">₪2.1B+</div>
              <div className="text-sm lg:text-base font-medium text-muted-foreground">שווי פרויקטים</div>
            </div>
            <div className="space-y-2 lg:space-y-3 counter-animate" style={{
            animationDelay: "0.2s"
          }}>
              <div className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black gradient-text">90%</div>
              <div className="text-sm lg:text-base font-medium text-muted-foreground">חיסכון בזמן</div>
            </div>
            <div className="space-y-2 lg:space-y-3 counter-animate" style={{
            animationDelay: "0.4s"
          }}>
              <div className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black gradient-text">5,000+</div>
              <div className="text-sm lg:text-base font-medium text-muted-foreground">ספקים מאומתים</div>
            </div>
            <div className="space-y-2 lg:space-y-3 counter-animate" style={{
            animationDelay: "0.6s"
          }}>
              <div className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black gradient-text">50M+</div>
              <div className="text-sm lg:text-base font-medium text-muted-foreground">נקודות נתונים</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Premium */}
      <section className="py-32 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              <span className="gradient-text">למה אנחנו</span>
              <br />
              <span className="text-foreground">משנים הכל?</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              פלטפורמת הבינה המלאכותית הראשונה שבנויה במיוחד לתעשיית הבנייה הישראלית
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <Card className="construction-card text-center p-8 animate-slide-up" style={{
            animationDelay: "0.2s"
          }}>
              <CardHeader>
                <div className="w-20 h-20 bg-gradient-to-r from-primary to-primary-glow rounded-2xl flex items-center justify-center mx-auto mb-6 animate-float">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold">AI חכם ומותאם</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  בינה מלאכותית מבינה מסמכים בעברית, מזהה מפרטים טכניים ומתאימה ספקים בדיוק מנותיך
                </p>
              </CardContent>
            </Card>

            <Card className="construction-card text-center p-8 animate-slide-up" style={{
            animationDelay: "0.4s"
          }}>
              <CardHeader>
                <div className="w-20 h-20 bg-gradient-to-r from-tech-purple to-accent-glow rounded-2xl flex items-center justify-center mx-auto mb-6 animate-float" style={{
                animationDelay: "1s"
              }}>
                  <Shield className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold">ספקים מאומתים</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  רשת של אלפי ספקים שעברו אימות קפדני - רישיונות, ביטוח, איכות עבודה והיסטוריה פיננסית
                </p>
              </CardContent>
            </Card>

            <Card className="construction-card text-center p-8 animate-slide-up" style={{
            animationDelay: "0.6s"
          }}>
              <CardHeader>
                <div className="w-20 h-20 bg-gradient-to-r from-tech-success to-primary-glow rounded-2xl flex items-center justify-center mx-auto mb-6 animate-float" style={{
                animationDelay: "2s"
              }}>
                  <TrendingUp className="w-10 h-10 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold">ניתוח מתקדם</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  השוואת הצעות חכמה, זיהוי סיכונים פוטנציאליים והמלצות מבוססות נתונים לבחירה מיטבית
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof Section - Premium Testimonials */}
      <section className="py-32 bg-gradient-to-br from-muted/30 via-background to-tech-purple/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-black mb-6">
              <span className="text-foreground">מה אומרים</span>
              <br />
              <span className="gradient-text">מובילי התעשייה?</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              יזמים וקבלנים מובילים חוסכים מיליונים עם הפלטפורמה שלנו
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <Card className="glass-card p-8 animate-scale-in" style={{
            animationDelay: "0.2s"
          }}>
              <CardContent className="pt-0">
                <div className="space-y-6">
                  <div className="flex text-tech-purple text-2xl">
                    {"★".repeat(5)}
                  </div>
                  <blockquote className="text-lg italic text-muted-foreground leading-relaxed">
                    "חסכנו ₪2.5M בפרויקט אחד. הבינה המלאכותית זיהתה חוסר התאמה שלא היינו מבחינים בה בזמן."
                  </blockquote>
                  <div className="pt-4 border-t border-border">
                    <div className="font-bold text-lg">אורי כהן</div>
                    <div className="text-muted-foreground">מנכ"ל, כהן פיתוח</div>
                    <div className="text-sm text-primary font-medium">פרויקטים בשווי ₪500M+</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card p-8 animate-scale-in" style={{
            animationDelay: "0.4s"
          }}>
              <CardContent className="pt-0">
                <div className="space-y-6">
                  <div className="flex text-tech-purple text-2xl">
                    {"★".repeat(5)}
                  </div>
                  <blockquote className="text-lg italic text-muted-foreground leading-relaxed">
                    "הפלטפורמה הכי מתקדמת שראיתי. התהליך שנמשך שבועות עובר ב-15 דקות עם תוצאות טובות פי 10."
                  </blockquote>
                  <div className="pt-4 border-t border-border">
                    <div className="font-bold text-lg">דנה לוי</div>
                    <div className="text-muted-foreground">מנהלת רכש, בינוי נדלן</div>
                    <div className="text-sm text-primary font-medium">100+ פרויקטים בשנה</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card p-8 animate-scale-in" style={{
            animationDelay: "0.6s"
          }}>
              <CardContent className="pt-0">
                <div className="space-y-6">
                  <div className="flex text-tech-purple text-2xl">
                    {"★".repeat(5)}
                  </div>
                  <blockquote className="text-lg italic text-muted-foreground leading-relaxed">
                    "AI זיהה בעיות שרק מומחה עם 20 שנות ניסיון היה רואה. זה ממש שומר עלינו מטעויות מיליונים."
                  </blockquote>
                  <div className="pt-4 border-t border-border">
                    <div className="font-bold text-lg">יוסי שמיר</div>
                    <div className="text-muted-foreground">קבלן ראשי, שמיר בנייה</div>
                    <div className="text-sm text-primary font-medium">מובטחת ISO 9001</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section - Mobile Optimized for Conversion */}
      <section className="py-20 lg:py-32 bg-gradient-to-r from-primary-deep via-primary to-tech-purple relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 lg:px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white mb-6 lg:mb-8 leading-tight">
              מוכן להצטרף
              <br />
              <span className="text-tech-purple-light">למהפכה?</span>
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-white/90 mb-8 lg:mb-12 max-w-3xl mx-auto leading-relaxed px-4">
              הצטרף ל-5,000+ יזמים וקבלנים שכבר מקצרים פרויקטים בחודשים וחוסכים מיליונים
            </p>
            
            {/* Mobile-First CTA */}
            <div className="space-y-6 lg:space-y-0 lg:flex lg:flex-row lg:gap-8 justify-center items-center">
              {/* Primary CTA - Full width on mobile */}
              <Button 
                variant="glass" 
                size="xl" 
                onClick={() => navigate("/auth")} 
                className="w-full lg:w-auto text-lg lg:text-xl px-8 lg:px-12 py-4 lg:py-6 bg-white/20 text-white border-white/30 hover:bg-white/30 font-bold"
              >
                <Building2 className="w-6 lg:w-7 h-6 lg:h-7 ml-3" />
                התחל חינם עכשיו
              </Button>
              
              {/* Benefits - Stack on mobile, side by side on desktop */}
              <div className="flex flex-col lg:items-start text-white/80 text-base lg:text-lg space-y-1">
                <span>• ללא כרטיס אשראי</span>
                <span>• הגדרה תוך 60 שניות</span>
                <span>• תמיכה בעברית 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-foreground text-white">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-tech-purple flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">בנייה AI</span>
              </div>
              <p className="text-white/70">הפלטפורמה המתקדמת לניהול רכש בתעשיית הבנייה</p>
            </div>
            <div>
              <h3 className="font-bold mb-4">פתרונות</h3>
              <div className="space-y-2 text-white/70">
                <div>AI למסמכים</div>
                <div>רשת ספקים</div>
                <div>ניתוח הצעות</div>
                <div>ניהול פרויקטים</div>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-4">חברה</h3>
              <div className="space-y-2 text-white/70">
                <div>אודות</div>
                <div>צוות</div>
                <div>קריירה</div>
                <div>צור קשר</div>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-4">תמיכה</h3>
              <div className="space-y-2 text-white/70">
                <div>מרכז עזרה</div>
                <div>תנאי שימוש</div>
                <div>מדיניות פרטיות</div>
                <div>API</div>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-white/70">
            <p>© 2026 NARSHA AI. כל הזכויות שמורות. Made with ❤️ in Israel</p>
          </div>
        </div>
      </footer>

      {/* Demo Video Dialog */}
      <Dialog open={showDemoVideo} onOpenChange={setShowDemoVideo}>
        <DialogContent className="max-w-4xl w-[95vw] p-0">
          <DialogHeader className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">דמו המוצר - בנייה AI</DialogTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDemoVideo(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="aspect-video w-full">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/NCdJd5LKU_Q?autoplay=1&rel=0"
              title="בנייה AI - דמו המוצר"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-b-lg"
            ></iframe>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Landing;