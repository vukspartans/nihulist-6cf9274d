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
  const [resendLoading, setResendLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    companyName: "",
    role: "entrepreneur" as "entrepreneur" | "advisor",
    location: "",
    activityRegions: [] as string[],
    officeSize: ""
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log("Auth component mounting, checking URL params");
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    
    console.log("URL type parameter:", type);

    // Set up auth state listener FIRST - this is critical for recovery flow
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state change:", event, session ? "session exists" : "no session");
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle password recovery events
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && type === 'recovery')) {
          console.log("Password recovery detected, showing reset form");
          setIsPasswordReset(true);
          return;
        }
        
        // Handle normal authentication flow
        if (session?.user && !isPasswordReset && type !== 'recovery') {
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
              navigate("/dashboard");
            }
          }, 100);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log("Getting existing session:", session ? "session exists" : "no session");
      setSession(session);
      setUser(session?.user ?? null);
      
      // If this is a recovery URL and we have a session, show reset form
      if (type === 'recovery' && session?.user) {
        console.log("Recovery URL with existing session, showing reset form");
        setIsPasswordReset(true);
        return;
      }
      
      // If this is a recovery URL but no session, wait for auth state change
      if (type === 'recovery' && !session?.user) {
        console.log("Recovery URL but no session yet, waiting for auth state change");
        return;
      }
      
      // Normal authentication flow
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
          navigate("/dashboard");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isPasswordReset]);

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
          throw new Error('שם המשרד נדרש עבור יועצים');
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
              role: formData.role,
              location: formData.location,
              activity_regions: formData.activityRegions.join(','),
              office_size: formData.officeSize
            }
          }
        });

        if (error) {
          // Check if user already exists
          if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
            toast({
              title: "המשתמש כבר קיים",
              description: "החשבון כבר קיים במערכת. עובר להתחברות...",
            });
            setIsLogin(true);
            setFormData(prev => ({ ...prev, password: "" })); // Clear password for security
            return;
          }
          throw error;
        }

        // Show email confirmation message
        setEmailSent(true);
        setUserEmail(formData.email);
        
        toast({
          title: "ההרשמה הושלמה בהצלחה!",
          description: "נשלח אליכם מייל לאימות החשבון",
        });
      }
    } catch (error: any) {
      let errorMessage = error.message || "אירעה שגיאה בתהליך ההתחברות";
      
      if (isLogin && error.message?.includes('Email not confirmed')) {
        errorMessage = "החשבון טרם אומת. אנא בדקו את המייל שלכם ולחצו על קישור האימות.";
      }
      
      toast({
        title: "שגיאה",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      toast({
        title: "המייל נשלח מחדש",
        description: "בדקו את תיבת הדואר שלכם לקישור האימות",
      });
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן לשלוח מייל באת זה",
        variant: "destructive",
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });

      if (error) throw error;

      toast({
        title: "מייל לאיפוס סיסמה נשלח",
        description: "בדקו את תיבת הדואר שלכם ולחצו על הקישור לאיפוס הסיסמה",
      });

      setEmailSent(true);
      setUserEmail(formData.email);
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן לשלוח מייל לאיפוס סיסמה",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("Attempting password reset, session:", session ? "exists" : "missing");
      console.log("User:", user ? "exists" : "missing");
      
      if (!session || !user) {
        throw new Error("Auth session missing. Please click the recovery link again.");
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error("Password update error:", error);
        throw error;
      }

      toast({
        title: "הסיסמה עודכנה בהצלחה",
        description: "הסיסמה שלכם הוחלפה בהצלחה",
      });

      // Reset states and redirect to login
      setIsPasswordReset(false);
      setNewPassword("");
      navigate("/auth");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן לעדכן את הסיסמה",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // If password reset is requested, show reset form
  if (isPasswordReset) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-lg construction-card">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              איפוס סיסמה
            </CardTitle>
            <CardDescription className="text-center">
              הזינו את הסיסמה החדשה שלכם
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-right">סיסמה חדשה *</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                    required
                    minLength={6}
                    dir="ltr"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">הסיסמה חייבת להכיל לפחות 6 תווים</p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium" 
                variant="premium"
                disabled={loading}
              >
                {loading ? "מעדכן..." : "עדכן סיסמה"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              {isForgotPassword ? "מייל לאיפוס סיסמה נשלח" : "אמתו את כתובת המייל"}
            </CardTitle>
            <CardDescription className="text-center">
              {isForgotPassword 
                ? "בדקו את תיבת הדואר שלכם ולחצו על הקישור לאיפוס הסיסמה" 
                : "בדקו את תיבת הדואר שלכם ולחצו על הקישור לאימות החשבון"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 text-center">
            <div className="space-y-4">
              <p className="text-muted-foreground">
                נשלח מייל לכתובת <strong>{userEmail}</strong>
              </p>
              <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
                <p className="mb-2">עצות:</p>
                <ul className="text-right space-y-1">
                  <li>• בדקו את תיקיית הספאם או ההודעות הלא רצויות</li>
                  <li>• הקישור תקף למשך 24 שעות</li>
                  <li>• אם לא קיבלתם מייל, לחצו על "שלח מחדש"</li>
                </ul>
              </div>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={handleResendEmail}
                disabled={resendLoading}
                className="w-full"
                variant="outline"
              >
                {resendLoading ? "שולח..." : "שלח מייל אימות מחדש"}
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => {
                  setEmailSent(false);
                  setIsForgotPassword(false);
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
          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
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
                <p className="text-xs text-muted-foreground text-right">
                  נשלח אליכם מייל עם קישור לאיפוס הסיסמה
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium" 
                variant="premium"
                disabled={loading}
              >
                {loading ? "שולח..." : "שלח מייל לאיפוס סיסמה"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsForgotPassword(false)}
                className="w-full"
              >
                חזרה להתחברות
              </Button>
            </form>
          ) : (
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
                    <Label htmlFor="companyName" className="text-right">שם המשרד</Label>
                    <div className="relative">
                      <Building2 className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyName"
                        type="text"
                        placeholder="שם המשרד שלך..."
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

                {formData.role === 'advisor' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="location">מיקום</Label>
                      <Input
                        id="location"
                        type="text"
                        placeholder="למשל: תל אביב"
                        value={formData.location}
                        onChange={(e) => handleInputChange("location", e.target.value)}
                        className="text-right"
                        dir="rtl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>אזורי פעילות</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          'הצפון',
                          'חיפה והסביבה',
                          'השרון',
                          'גוש דן',
                          'השפלה',
                          'ירושלים והסביבה',
                          'דרום',
                          'אילת והערבה'
                        ].map((region) => (
                          <label key={region} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.activityRegions.includes(region)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    activityRegions: [...prev.activityRegions, region] 
                                  }));
                                } else {
                                  setFormData(prev => ({ 
                                    ...prev, 
                                    activityRegions: prev.activityRegions.filter(r => r !== region) 
                                  }));
                                }
                              }}
                              className="rounded border-input"
                            />
                            <span className="text-sm">{region}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="officeSize">גודל המשרד</Label>
                      <select
                        id="officeSize"
                        value={formData.officeSize}
                        onChange={(e) => handleInputChange("officeSize", e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-right"
                        dir="rtl"
                      >
                        <option value="">בחר גודל משרד</option>
                        <option value="קטן מאוד/בוטיק - 1-2 עובדים">קטן מאוד/בוטיק - 1-2 עובדים</option>
                        <option value="קטן - 3-5 עובדים">קטן - 3-5 עובדים</option>
                        <option value="בינוני - 6-15 עובדים">בינוני - 6-15 עובדים</option>
                        <option value="גדול - 16-30 עובדים">גדול - 16-30 עובדים</option>
                        <option value="גדול מאוד - 31+ עובדים">גדול מאוד - 31+ עובדים</option>
                      </select>
                    </div>
                  </>
                )}

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

            {isLogin && (
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  שכחת סיסמה?
                </Button>
              </div>
            )}
          </form>
          )}

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