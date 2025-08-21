import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SupplierSubmit = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [token, setToken] = useState("");
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Form fields
  const [supplierName, setSupplierName] = useState("");
  const [price, setPrice] = useState("");
  const [timeline, setTimeline] = useState("");
  const [terms, setTerms] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const urlToken = searchParams.get('t');
    if (urlToken) {
      setToken(urlToken);
      // Simple token validation - in real app this would be server-side
      if (urlToken.length >= 6) {
        setIsValidToken(true);
      }
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!supplierName.trim() || !price.trim() || !timeline.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא מלא את כל השדות הנדרשים",
        variant: "destructive",
      });
      return;
    }

    // Here you would submit to your backend
    console.log("Supplier submission:", {
      token,
      supplierName,
      price,
      timeline,
      terms,
      description
    });

    setIsSubmitted(true);
    
    toast({
      title: "הצעה נשלחה בהצלחה!",
      description: "תקבל אישור במייל בקרוב",
    });
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/30 to-tech-purple-light/20 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md text-center glass-card">
          <CardHeader>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-700">
              הצעה נשלחה בהצלחה!
            </CardTitle>
            <CardDescription>
              הצעת המחיר שלך נקלטה במערכת. תקבל אישור במייל בתוך 24 שעות.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate("/")} 
              variant="outline" 
              className="w-full"
            >
              חזרה לעמוד הבית
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/30 to-tech-purple-light/20 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md text-center glass-card">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-destructive">
              קוד גישה לא תקין
            </CardTitle>
            <CardDescription>
              הקוד שהזנת אינו תקף או פג תוקפו
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate("/")} 
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 ml-2" />
              חזרה לעמוד הבית
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/30 to-tech-purple-light/20 p-4" dir="rtl">
      {/* Header */}
      <nav className="py-4 px-4 lg:px-6 mb-8">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-tech-purple flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg lg:text-xl font-bold gradient-text">NARSHA AI</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4 ml-2" />
            חזרה
          </Button>
        </div>
      </nav>

      <div className="container mx-auto max-w-2xl">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-2xl font-bold gradient-text text-center">
              הגשת הצעת מחיר
            </CardTitle>
            <CardDescription className="text-center">
              מלא את הפרטים להגשת הצעת המחיר שלך
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Supplier Name */}
              <div className="space-y-2">
                <Label htmlFor="supplierName" className="text-right">
                  שם הספק / החברה *
                </Label>
                <Input
                  id="supplierName"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="הזן שם הספק או החברה"
                  className="text-right"
                  dir="rtl"
                  required
                />
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="price" className="text-right">
                  מחיר מוצע *
                </Label>
                <Input
                  id="price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="הזן מחיר בשקלים (לדוגמה: 250,000)"
                  className="text-right"
                  dir="rtl"
                  required
                />
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <Label htmlFor="timeline" className="text-right">
                  לוח זמנים מוצע *
                </Label>
                <Input
                  id="timeline"
                  value={timeline}
                  onChange={(e) => setTimeline(e.target.value)}
                  placeholder="לדוגמה: 3 חודשים, 6 שבועות"
                  className="text-right"
                  dir="rtl"
                  required
                />
              </div>

              {/* Terms */}
              <div className="space-y-2">
                <Label htmlFor="terms" className="text-right">
                  תנאי תשלום
                </Label>
                <Input
                  id="terms"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="לדוגמה: 30% מקדמה, יתרה בתשלומים"
                  className="text-right"
                  dir="rtl"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-right">
                  פירוט העבודה ופתרונות מוצעים
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="פרט את העבודה שתבוצע, החומרים שיש בשימוש ופתרונות נוספים..."
                  className="text-right min-h-[120px]"
                  dir="rtl"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                variant="premium"
                size="lg"
              >
                שלח הצעת מחיר
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupplierSubmit;