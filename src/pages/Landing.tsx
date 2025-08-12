import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Users, FileText, Award, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-construction.jpg";

const Landing = () => {
  const [supplierToken, setSupplierToken] = useState("");
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const navigate = useNavigate();

  const handleSupplierAccess = () => {
    if (supplierToken.trim()) {
      navigate(`/submit?t=${supplierToken.trim()}`);
    }
  };

  if (showSupplierForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md construction-card">
          <CardHeader className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSupplierForm(false)}
              className="self-start mb-4"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              חזרה
            </Button>
            <CardTitle className="text-2xl font-bold text-primary">
              כניסה לספקים
            </CardTitle>
            <CardDescription>
              הזן את הקוד שקיבלת במייל כדי להגיש הצעת מחיר
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">קוד גישה</Label>
              <Input
                id="token"
                placeholder="הזן קוד גישה..."
                value={supplierToken}
                onChange={(e) => setSupplierToken(e.target.value)}
                className="text-center font-mono"
                dir="ltr"
              />
            </div>
            <Button 
              onClick={handleSupplierAccess}
              className="w-full"
              variant="construction"
              disabled={!supplierToken.trim()}
            >
              כניסה לטופס הגשת הצעה
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30" dir="rtl">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Construction Industry"
            className="w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-primary/90 to-primary-glow/80"></div>
        </div>
        
        <div className="relative container mx-auto px-6 py-24 text-center">
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="mb-4">
              <span className="inline-flex items-center px-4 py-2 bg-white/20 text-white text-sm rounded-full mb-6">
                🚀 חוסכים 80% מזמן הרכש • 500+ פרויקטים נוצרו השבוע
              </span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
              הפלטפורמה החכמה לבחירת ספקים
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed">
              בינה מלאכותית מתקדמת + רשת ספקים מובחרת = הספק המושלם לפרויקט שלך תוך דקות
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-2xl mx-auto">
              <Button
                variant="hero"
                size="xl"
                onClick={() => navigate("/auth")}
                className="w-full sm:w-auto animate-slide-up"
              >
                <Building2 className="w-6 h-6 ml-2" />
                אני יזם/ית - התחל פרויקט
              </Button>
              
              <Button
                variant="outline"
                size="xl"
                onClick={() => setShowSupplierForm(true)}
                className="w-full sm:w-auto bg-white/10 text-white border-white/30 hover:bg-white/20 animate-slide-up"
                style={{ animationDelay: "0.1s" }}
              >
                <Users className="w-6 h-6 ml-2" />
                יש לי קישור ספק
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-primary/5 to-construction-orange/5">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">500+</div>
              <div className="text-sm md:text-base text-muted-foreground">פרויקטים השבוע</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">80%</div>
              <div className="text-sm md:text-base text-muted-foreground">חיסכון בזמן</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">2,000+</div>
              <div className="text-sm md:text-base text-muted-foreground">ספקים מאומתים</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">₪50M+</div>
              <div className="text-sm md:text-base text-muted-foreground">שווי פרויקטים</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              למה אנחנו משנים את המשחק?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              בינה מלאכותית מתקדמת פוגשת רשת ספקים מובחרת במיוחד עבור תעשיית הבנייה הישראלית
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="construction-card text-center animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">יצירת פרויקט</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  הגדר פרויקט חדש, העלה מסמכים וקבל המלצות AI מותאמות אישית
                </p>
              </CardContent>
            </Card>

            <Card className="construction-card text-center animate-slide-up" style={{ animationDelay: "0.3s" }}>
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-r from-construction-orange to-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">שליחת RFP</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  שלח בקשות הצעת מחיר לספקים מומלצים עם קישור מאובטח
                </p>
              </CardContent>
            </Card>

            <Card className="construction-card text-center animate-slide-up" style={{ animationDelay: "0.4s" }}>
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-r from-construction-success to-primary-glow rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">השוואה ובחירה</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  השווה הצעות במערכת חכמה ובחר את הספק הטוב ביותר
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              מה אומרים עלינו?
            </h2>
            <p className="text-lg text-muted-foreground">
              יזמים וקבלנים מכל הארץ כבר חוסכים זמן וכסף
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="construction-card">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="text-4xl">⭐⭐⭐⭐⭐</div>
                  <p className="text-muted-foreground italic">
                    "חסכתי 3 שבועות של עבודה בפרויקט של ₪5M. הבינה המלאכותית זיהתה את הספק הטוב ביותר תוך דקות."
                  </p>
                  <div className="pt-4">
                    <div className="font-semibold">אורי כהן</div>
                    <div className="text-sm text-muted-foreground">מנכ"ל, כהן פיתוח</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="construction-card">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="text-4xl">⭐⭐⭐⭐⭐</div>
                  <p className="text-muted-foreground italic">
                    "הפלטפורמה הכי מתקדמת שראיתי. ההשוואה האוטומטית חסכה לי עשרות שעות של ניתוח ידני."
                  </p>
                  <div className="pt-4">
                    <div className="font-semibold">דנה לוי</div>
                    <div className="text-sm text-muted-foreground">מנהלת רכש, בינוי נדלן</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="construction-card">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="text-4xl">⭐⭐⭐⭐⭐</div>
                  <p className="text-muted-foreground italic">
                    "המערכת זיהתה בעיות בהצעות שלא היינו שמים לב אליהן. זה ממש שומר עלינו מטעויות יקרות."
                  </p>
                  <div className="pt-4">
                    <div className="font-semibold">יוסי שמיר</div>
                    <div className="text-sm text-muted-foreground">קבלן ראשי, שמיר בנייה</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-construction-orange">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            הצטרף ל-500+ יזמים שכבר חוסכים זמן וכסף
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            הפרויקט הבא שלך יכול להתחיל כבר היום. בינה מלאכותית + ספקים מאומתים = השילוב המושלם
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              variant="secondary"
              size="xl"
              onClick={() => navigate("/auth")}
              className="animate-slide-up"
            >
              <Building2 className="w-6 h-6 ml-2" />
              התחל חינם עכשיו
            </Button>
            <div className="text-white/80 text-sm">
              ללא כרטיס אשראי • הגדרה תוך 2 דקות
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;