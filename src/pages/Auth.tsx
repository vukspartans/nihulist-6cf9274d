import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building2, Mail, Lock, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Session, User } from "@supabase/supabase-js";
import PhoneInput from 'react-phone-number-input';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    companyName: "",
    role: "entrepreneur" as "entrepreneur" | "advisor"
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST - avoid async callback
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch to avoid blocking auth state change
        if (session?.user) {
          setTimeout(async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('user_id', session.user.id)
                .single();
              
              if (profile?.role === 'advisor') {
                navigate("/advisor-dashboard");
              } else {
                navigate("/dashboard");
              }
            } catch (error) {
              console.error('Error fetching profile:', error);
              navigate("/dashboard"); // Default fallback
            }
          }, 100);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .single();
          
          if (profile?.role === 'advisor') {
            navigate("/advisor-dashboard");
          } else {
            navigate("/dashboard");
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          navigate("/dashboard"); // Default fallback
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: "התחברת בהצלחה!",
          description: "ברוך הבא למערכת",
        });
      } else {
        // Validate required fields for signup
        if (!formData.name || !formData.email || !formData.password || !formData.role) {
          throw new Error('אנא מלא את כל השדות הנדרשים');
        }

        if (formData.role === 'advisor' && !formData.companyName) {
          throw new Error('שם החברה נדרש עבור יועצים');
        }

        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              name: formData.name,
              phone: formData.phone,
              company_name: formData.companyName,
              role: formData.role
            }
          }
        });

        if (error) throw error;

        // Show email confirmation message
        setEmailSent(true);
        setUserEmail(formData.email);
        
        toast({
          title: "ההרשמה הושלמה בהצלחה!",
          description: "נשלח אליכם מייל לאימות החשבון",
        });
      }
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message || "אירעה שגיאה בתהליך ההתחברות",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // If email confirmation is pending, show confirmation screen
  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-lg construction-card">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              אמתו את כתובת המייל
            </CardTitle>
            <CardDescription className="text-center">
              נשלח אליכם מייל לכתובת {userEmail}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 text-center">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                לחצו על הקישור במייל כדי לאמת את החשבון ולהיכנס למערכת
              </p>
              <p className="text-sm text-muted-foreground">
                לא קיבלתם מייל? בדקו בתיקיית הספאם
              </p>
            </div>
            
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={() => {
                  setEmailSent(false);
                  setIsLogin(true);
                }}
                className="w-full"
              >
                חזרה להתחברות
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← חזרה לדף הבית
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is already authenticated, show loading
  if (session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">מעביר לדשבורד...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-lg construction-card">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            {isLogin ? "ברוך הבא" : "הצטרפות למערכת"}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin 
              ? "התחבר לחשבון שלך כדי להמשיך" 
              : "צור חשבון חדש וקבל המלצות AI לפרויקטים"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-4">
                {/* Personal Information Section */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-right">שם מלא *</Label>
                    <div className="relative">
                      <UserIcon className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="הזן שם מלא..."
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className="pr-10 text-right"
                        required
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-right">מספר טלפון</Label>
                    <div className="phone-input" dir="ltr">
                      <PhoneInput
                        international
                        countryCallingCodeEditable={false}
                        defaultCountry="IL"
                        value={formData.phone}
                        onChange={(value) => handleInputChange("phone", value || "")}
                        placeholder="הזן מספר טלפון"
                        className="text-left"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="text-right">שם החברה</Label>
                    <div className="relative">
                      <Building2 className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyName"
                        type="text"
                        placeholder="שם החברה שלך..."
                        value={formData.companyName}
                        onChange={(e) => handleInputChange("companyName", e.target.value)}
                        className="pr-10 text-right"
                        dir="rtl"
                      />
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* User Type Selection */}
                <div className="space-y-3">
                  <Label className="text-right font-medium">בחר סוג משתמש *</Label>
                  <RadioGroup 
                    value={formData.role} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as 'entrepreneur' | 'advisor' }))}
                    className="grid grid-cols-1 gap-3"
                  >
                    <div className="flex items-center space-x-3 space-x-reverse p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="entrepreneur" id="entrepreneur" />
                      <div className="flex-1 text-right">
                        <Label htmlFor="entrepreneur" className="font-medium cursor-pointer">יזם / חברה</Label>
                        <p className="text-sm text-muted-foreground">אני מחפש יועצים ומבצעי עבודות לפרויקט שלי</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 space-x-reverse p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="advisor" id="advisor" />
                      <div className="flex-1 text-right">
                        <Label htmlFor="advisor" className="font-medium cursor-pointer">יועץ / ספק</Label>
                        <p className="text-sm text-muted-foreground">אני מספק שירותי ייעוץ או ביצוע פרויקטים</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <Separator className="my-4" />
              </div>
            )}

            {/* Login Credentials Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-right">כתובת אימייל *</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pr-10"
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-right">סיסמה *</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    className="pr-10"
                    required
                    minLength={6}
                    dir="ltr"
                  />
                </div>
                {!isLogin && (
                  <p className="text-xs text-muted-foreground text-right">הסיסמה חייבת להכיל לפחות 6 תווים</p>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-base font-medium" 
              variant="premium"
              disabled={loading}
            >
              {loading ? "מתבצע..." : (isLogin ? "התחברות למערכת" : "הצטרפות למערכת")}
            </Button>
          </form>

          <Separator />

          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "אין לך חשבון?" : "יש לך כבר חשבון?"}
            </p>
            <Button
              variant="ghost"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:text-primary/80 font-medium"
            >
              {isLogin ? "הצטרף כעת" : "התחבר לחשבון קיים"}
            </Button>
          </div>

          <div className="text-center pt-2">
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← חזרה לדף הבית
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;