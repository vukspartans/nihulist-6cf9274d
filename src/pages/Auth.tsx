import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Lock, User as UserIcon, Briefcase, Home, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Session, User } from "@supabase/supabase-js";
import PhoneInput from 'react-phone-number-input';
import { ExpertiseSelector } from "@/components/ExpertiseSelector";
import { TermsAndConditions } from "@/components/TermsAndConditions";

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
  const [signupStep, setSignupStep] = useState(1); // 1 = personal info, 2 = credentials, 3 = ToS
  const [justLoggedOut, setJustLoggedOut] = useState(false);
  const [isForcedLogin, setIsForcedLogin] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    companyName: "",
    role: "entrepreneur" as "entrepreneur" | "advisor",
    positionInOffice: "",
    expertise: [] as string[]
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log("Auth component mounting, checking URL params");
    
    // Check if we just logged out
    const wasLoggedOut = sessionStorage.getItem('just_logged_out');
    if (wasLoggedOut) {
      sessionStorage.removeItem('just_logged_out');
      setJustLoggedOut(true);
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    const mode = urlParams.get('mode');
    const loggedOutParam = urlParams.get('logged_out');
    
    console.log("URL type parameter:", type);
    console.log("URL mode parameter:", mode);
    console.log("URL logged_out parameter:", loggedOutParam);

    // Determine if we should force the login UI (after logout or explicit login mode)
    const forced = (mode === 'login') || (loggedOutParam === '1');
    setIsForcedLogin(forced);
    if (forced) {
      setJustLoggedOut(true);
    }

    // Initialize login/signup mode from URL parameter
    if (mode === 'login') {
      setIsLogin(true);
    } else if (mode === 'signup') {
      setIsLogin(false);
    }

    // Initialize role from URL parameter
    if (type && type !== 'recovery') {
      const advisorAliases = ['advisor', 'consultant', 'vendor', 'supplier'];
      const entrepreneurAliases = ['entrepreneur', 'founder', 'client', 'owner'];
      
      if (advisorAliases.includes(type.toLowerCase())) {
        setFormData(prev => ({ ...prev, role: 'advisor' }));
      } else if (entrepreneurAliases.includes(type.toLowerCase())) {
        setFormData(prev => ({ ...prev, role: 'entrepreneur' }));
      }
    }

    // Set up auth state listener FIRST - this is critical for recovery flow
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state change:", event, session ? "session exists" : "no session");
        
        // If user signed out, don't redirect
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle password recovery events
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && type === 'recovery')) {
          console.log("Password recovery detected, showing reset form");
          setIsPasswordReset(true);
          return;
        }
        
        // Handle normal authentication flow - only on SIGNED_IN event
        if (event === 'SIGNED_IN' && session?.user && !isPasswordReset && type !== 'recovery') {
          // Clear forced login flags on successful login to allow redirect
          if (forced || justLoggedOut) {
            console.log('Successful login detected, clearing forced login flags');
            setIsForcedLogin(false);
            setJustLoggedOut(false);
            sessionStorage.removeItem('just_logged_out');
          }
          setTimeout(async () => {
            try {
              // Check if user has admin role
              const { data: roles } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id);
              const isAdmin = roles?.some(r => r.role === 'admin');
              if (isAdmin) {
                navigate("/heyadmin");
                return;
              }
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

    // Check for existing session - only redirect on page load, not after logout
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log("Getting existing session:", session ? "session exists" : "no session");
      
      // Check if we were just redirected from logout BEFORE setting session
      const wasLoggedOut = sessionStorage.getItem('just_logged_out');
      if (wasLoggedOut) {
        sessionStorage.removeItem('just_logged_out');
        setSession(null);
        setUser(null);
        setJustLoggedOut(true);
        return;
      }
      
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
      
      // If forced login, do not auto-redirect; clear session to show login UI
      if (forced) {
        setSession(null);
        setUser(null);
        setJustLoggedOut(true);
        return;
      }
      
      // Normal authentication flow
      if (session?.user) {
        try {
          // Check if user has admin role
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id);
          
          const isAdmin = roles?.some(r => r.role === 'admin');
          
          // If admin, redirect to admin panel
          if (isAdmin) {
            navigate("/heyadmin");
            return;
          }
          
          // Otherwise check profile role
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
    
    // If in signup mode and on step 1, move to step 2
    if (!isLogin && signupStep === 1) {
      setSignupStep(2);
      return;
    }
    
    // If in signup mode and on step 2, move to step 3 (ToS)
    if (!isLogin && signupStep === 2) {
      setSignupStep(3);
      return;
    }
    
    // Step 3: Validate ToS acceptance
    if (!isLogin && signupStep === 3) {
      if (!tosAccepted) {
        toast({
          title: "נדרש אישור תנאי השימוש",
          description: "יש לאשר את תנאי השימוש כדי להמשיך",
          variant: "destructive"
        });
        return;
      }
    }

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
        // Signup - step 2
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
              position_in_office: formData.positionInOffice,
              expertise: formData.expertise.join(','),
              tos_accepted: true,
              tos_version: '1.0'
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
            setSignupStep(1);
            setFormData(prev => ({ ...prev, password: "" }));
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

  // Validation for step 1 button
  const isStep1Valid = () => {
    if (!formData.name || !formData.name.trim()) return false;
    
    if (formData.role === 'advisor') {
      if (!formData.phone || formData.phone.trim() === '') return false;
      if (!formData.companyName || formData.companyName.trim() === '') return false;
      if (!formData.positionInOffice || formData.positionInOffice.trim() === '') return false;
      if (!formData.expertise || formData.expertise.length === 0) return false;
    }
    
    return true;
  };

  // Validation for step 2 button
  const isStep2Valid = () => {
    if (!formData.email || !formData.email.trim()) return false;
    if (!formData.password || formData.password.length < 6) return false;
    return true;
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
    // Check if it's an advisor signup to show application review message
    const isAdvisorSignup = !isForgotPassword && formData.role === 'advisor';
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-lg construction-card">
          <CardHeader className="text-center space-y-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
              isAdvisorSignup 
                ? 'bg-gradient-to-r from-tech-purple to-accent shadow-lg shadow-tech-purple/30'
                : 'bg-gradient-to-r from-primary to-primary-glow shadow-lg shadow-primary/30'
            }`}>
              <Mail className="w-10 h-10 text-white" />
            </div>
            <CardTitle className={`text-3xl font-bold ${
              isAdvisorSignup ? 'text-tech-purple' : 'text-primary'
            }`}>
              {isForgotPassword 
                ? "מייל לאיפוס סיסמה נשלח" 
                : isAdvisorSignup
                  ? "הבקשה התקבלה בהצלחה!"
                  : "אמתו את כתובת המייל"
              }
            </CardTitle>
            <CardDescription className="text-center text-base">
              {isForgotPassword 
                ? "בדקו את תיבת הדואר שלכם ולחצו על הקישור לאיפוס הסיסמה" 
                : isAdvisorSignup
                  ? "חשבונך ממתין לאישור מנהלי המערכת. לאחר האישור תוכל להתחבר ולהופיע בהמלצות ליזמים."
                  : "בדקו את תיבת הדואר שלכם ולחצו על הקישור לאימות החשבון"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 text-center">
            {isAdvisorSignup ? (
              <div className="space-y-5">
                <div className="bg-gradient-to-br from-tech-purple/10 to-accent/10 p-6 rounded-xl border-2 border-tech-purple/20">
                  <div className="space-y-4 text-right">
                    <h3 className="font-bold text-xl text-foreground flex items-center gap-2">
                      <span className="text-2xl">✅</span>
                      מה הלאה?
                    </h3>
                    <div className="space-y-4">
                      <div className="flex gap-3 items-start p-3 bg-background/50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-tech-purple text-white flex items-center justify-center font-bold text-sm">
                          1
                        </div>
                        <div className="flex-1 text-right">
                          <p className="font-semibold text-foreground">אמתו את המייל</p>
                          <p className="text-sm text-foreground/70">נשלח אליכם קישור לכתובת {userEmail}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 items-start p-3 bg-background/50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-tech-purple text-white flex items-center justify-center font-bold text-sm">
                          2
                        </div>
                        <div className="flex-1 text-right">
                          <p className="font-semibold text-foreground">ממתינים לאישור</p>
                          <p className="text-sm text-foreground/70">צוות המערכת יבדוק את הבקשה תוך 24-48 שעות</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 items-start p-3 bg-background/50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-tech-purple text-white flex items-center justify-center font-bold text-sm">
                          3
                        </div>
                        <div className="flex-1 text-right">
                          <p className="font-semibold text-foreground">מתחילים לעבוד!</p>
                          <p className="text-sm text-foreground/70">לאחר האישור תוכלו להתחיל לקבל פרויקטים</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-foreground/60">
                  💡 לא קיבלתם מייל? בדקו בספאם או לחצו על "שלח מחדש"
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-foreground font-medium mb-1">
                    נשלח מייל לכתובת:
                  </p>
                  <p className="text-foreground/80 font-semibold">{userEmail}</p>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg text-sm space-y-2 text-right">
                  <p className="font-medium text-foreground">💡 עצות שימושיות:</p>
                  <ul className="space-y-1.5 text-foreground/70">
                    <li>• בדקו את תיקיית הספאם</li>
                    <li>• הקישור תקף למשך 24 שעות</li>
                    <li>• לא קיבלתם? לחצו על "שלח מחדש"</li>
                  </ul>
                </div>
              </div>
            )}
            
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
                  setSignupStep(1);
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

  // If user is already authenticated, show loading (but not after logout)
  if (session && !justLoggedOut && !isForcedLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/30 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">מעביר לדשבורד...</p>
        </div>
      </div>
    );
  }

  // Determine role-specific styling
  const roleConfig = formData.role === 'advisor' 
    ? {
        icon: Briefcase,
        gradient: "from-tech-purple to-accent",
        badge: "💼 יועץ מקצועי",
        badgeVariant: "secondary" as const
      }
    : {
        icon: Building2,
        gradient: "from-primary to-primary-glow",
        badge: '🏢 יזם נדל"ן',
        badgeVariant: "default" as const
      };

  const RoleIcon = roleConfig.icon;

  return (
    <div className={`min-h-screen flex flex-col p-4 transition-all duration-500 ${
      formData.role === 'entrepreneur'
        ? 'bg-gradient-to-br from-background via-primary/10 to-primary/5'
        : 'bg-gradient-to-br from-background via-tech-purple/10 to-tech-purple/5'
    }`} dir="rtl">
      {/* Top Navigation */}
      <div className="w-full max-w-7xl mx-auto py-2 sm:py-4 px-4 flex items-center justify-between">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9">
            <Home className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">חזרה לדף הבית</span>
            <span className="sm:hidden">חזרה</span>
          </Button>
        </Link>
        <div className="hidden sm:flex items-center gap-4">
          <Link to="/for-entrepreneurs">
            <Button variant="ghost" size="sm">ליזמים</Button>
          </Link>
          <Link to="/for-consultants">
            <Button variant="ghost" size="sm">ליועצים</Button>
          </Link>
        </div>
      </div>

      {/* Auth Card */}
      <div className="flex-1 flex items-center justify-center">
        <Card className={`w-full max-w-lg construction-card relative p-4 sm:p-6 ${
          formData.role === 'entrepreneur' 
            ? 'border-primary/20 shadow-lg shadow-primary/10' 
            : 'border-tech-purple/20 shadow-lg shadow-tech-purple/10'
        }`}>
          <CardHeader className="text-center space-y-3 sm:space-y-4 p-0 sm:p-6">
            {/* Role Badge */}
            <div className="flex justify-center">
              <Badge className={`text-xs sm:text-sm px-3 py-1 sm:px-4 sm:py-1.5 text-white font-medium ${
                formData.role === 'entrepreneur'
                  ? 'bg-gradient-to-r from-primary to-primary-glow'
                  : 'bg-gradient-to-r from-tech-purple to-accent'
              }`}>
                {formData.role === 'entrepreneur' ? '🏢 יזם נדל"ן' : '💼 יועץ מקצועי'}
              </Badge>
            </div>
            
            {/* Role Icon */}
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center mx-auto shadow-lg ${
              formData.role === 'entrepreneur'
                ? 'bg-gradient-to-r from-primary to-primary-glow shadow-primary/30'
                : 'bg-gradient-to-r from-tech-purple to-accent shadow-tech-purple/30'
            }`}>
              <RoleIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            
            <CardTitle className={`text-2xl sm:text-3xl font-bold ${
              formData.role === 'entrepreneur' ? 'text-primary' : 'text-tech-purple'
            }`}>
              {isLogin 
                ? "ברוך הבא" 
                : formData.role === 'advisor' ? "הצטרפות כיועץ" : "הצטרפות כיזם"
              }
            </CardTitle>
            <CardDescription className="text-center text-sm sm:text-base">
              {isLogin 
                ? formData.role === 'advisor' 
                  ? "התחבר כיועץ כדי לנהל את הפרופיל שלך ולקבל פרויקטים" 
                  : "התחבר כיזם כדי לנהל פרויקטים ולמצוא יועצים"
                : formData.role === 'advisor'
                  ? "הצטרף כיועץ וקבל גישה לפרויקטים איכותיים"
                  : "הצטרף כיזם וקבל המלצות AI למומחי בנייה"
              }
            </CardDescription>
          </CardHeader>
        
        <CardContent className="space-y-4 sm:space-y-6 p-0 sm:p-6">
          {/* Step Indicator for Signup */}
          {!isLogin && !isForgotPassword && (
            <div className="flex items-center justify-center gap-2 mb-2 sm:mb-4">
              <div className={`h-2 rounded-full transition-all ${
                signupStep === 1 ? 'bg-primary w-8' : 'bg-muted w-2'
              }`} />
              <div className={`h-2 rounded-full transition-all ${
                signupStep === 2 ? 'bg-primary w-8' : 'bg-muted w-2'
              }`} />
              <div className={`h-2 rounded-full transition-all ${
                signupStep === 3 ? 'bg-primary w-8' : 'bg-muted w-2'
              }`} />
            </div>
          )}

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-right text-sm sm:text-base">כתובת אימייל *</Label>
                <div className="relative">
                  <Mail className="absolute right-2 sm:right-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="pr-8 sm:pr-10 text-sm sm:text-base h-9 sm:h-10"
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
                className="w-full h-10 sm:h-11 text-sm sm:text-base font-medium" 
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
            {!isLogin && signupStep === 1 && (
              <div className="space-y-4">
                {/* Step 1: Personal Information */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-right text-sm sm:text-base">שם מלא *</Label>
                    <div className="relative">
                      <UserIcon className="absolute right-2 sm:right-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="הזן שם מלא..."
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className="pr-8 sm:pr-10 text-right text-sm sm:text-base h-9 sm:h-10"
                        required
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-right">
                      מספר טלפון {formData.role === 'advisor' && <span className="text-destructive">*</span>}
                    </Label>
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
                    <Label htmlFor="companyName" className="text-right text-sm sm:text-base">
                      שם המשרד {formData.role === 'advisor' && <span className="text-destructive">*</span>}
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute right-2 sm:right-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                      <Input
                        id="companyName"
                        type="text"
                        placeholder="שם המשרד שלך..."
                        value={formData.companyName}
                        onChange={(e) => handleInputChange("companyName", e.target.value)}
                        className="pr-8 sm:pr-10 text-right text-sm sm:text-base h-9 sm:h-10"
                        dir="rtl"
                      />
                    </div>
                  </div>

                  {formData.role === 'advisor' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="positionInOffice" className="text-right">תפקיד הנרשם במשרד *</Label>
                        <div className="relative">
                          <Briefcase className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="positionInOffice"
                            type="text"
                            placeholder="למשל: מנכ״ל, מייסד, בעלים, מנהלת משרד"
                            value={formData.positionInOffice}
                            onChange={(e) => handleInputChange("positionInOffice", e.target.value)}
                            className="pr-10 text-right"
                            dir="rtl"
                            required
                          />
                        </div>
                      </div>

                      <Separator className="my-4" />
                      
                      {/* Expertise Selection */}
                      <div className="space-y-2">
                        <Label className="text-right">
                          תחומי עיסוק <span className="text-destructive">*</span>
                        </Label>
                        <p className="text-xs text-muted-foreground text-right mb-2">
                          בחר לפחות תחום עיסוק אחד
                        </p>
                        <ExpertiseSelector
                          selectedExpertise={formData.expertise}
                          onExpertiseChange={(expertise) => setFormData(prev => ({ ...prev, expertise }))}
                          isEditing={true}
                          maxItems={null}
                        />
                        <p className="text-xs text-muted-foreground text-right mt-2">
                          * פרטים נוספים כמו כתובת משרד ואזורי פעילות ניתן להוסיף לאחר ההרשמה בפרופיל
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-10 sm:h-11 text-sm sm:text-base font-medium" 
                  variant="premium"
                  disabled={!isStep1Valid()}
                >
                  המשיכו ליצירת משתמש
                </Button>
              </div>
            )}

            {!isLogin && signupStep === 2 && (
              <div className="space-y-4">
                {/* Step 2: Login Credentials */}
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="text-sm text-center">שלב 2 מתוך 3: פרטי התחברות</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-right text-sm sm:text-base">כתובת אימייל *</Label>
                  <div className="relative">
                    <Mail className="absolute right-2 sm:right-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="pr-8 sm:pr-10 text-sm sm:text-base h-9 sm:h-10"
                      required
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-right text-sm sm:text-base">סיסמה *</Label>
                  <div className="relative">
                    <Lock className="absolute right-2 sm:right-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="pr-8 sm:pr-10 text-sm sm:text-base h-9 sm:h-10"
                      required
                      minLength={6}
                      dir="ltr"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">הסיסמה חייבת להכיל לפחות 6 תווים</p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    className="flex-1 h-11 text-base font-medium" 
                    variant="premium"
                    disabled={loading || !isStep2Valid()}
                  >
                    {loading ? "מתבצע..." : "המשך לתנאי שימוש"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSignupStep(1)}
                    className="px-4"
                    disabled={loading}
                  >
                    חזרה
                  </Button>
                </div>
              </div>
            )}

            {!isLogin && signupStep === 3 && (
              <div className="space-y-4 text-right" dir="rtl">
                {/* Step 3: Terms and Conditions */}
                <div className="bg-muted/30 p-4 rounded-lg">
                  <p className="text-sm text-center text-right">שלב 3 מתוך 3: תנאי שימוש</p>
                </div>

                <TermsAndConditions 
                  accepted={tosAccepted}
                  onAcceptChange={setTosAccepted}
                />

                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    className="flex-1 h-11 text-base font-medium" 
                    variant="premium"
                    disabled={loading || !tosAccepted}
                  >
                    {loading ? "מתבצע..." : "השלם הרשמה"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSignupStep(2)}
                    className="px-4"
                    disabled={loading}
                  >
                    חזרה
                  </Button>
                </div>
              </div>
            )}

            {isLogin && (
              <>
                {/* Login Form */}
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
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-medium" 
                  variant="premium"
                  disabled={loading}
                >
                  {loading ? "מתחבר..." : "התחברות למערכת"}
                </Button>
              </>
            )}

            {isLogin && (
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-sm text-muted-foreground hover:bg-black hover:text-white transition-colors"
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
              onClick={() => {
                setIsLogin(!isLogin);
                setSignupStep(1);
              }}
              className="text-primary hover:text-primary/80 font-medium"
            >
              {isLogin ? "הצטרף כעת" : "התחבר לחשבון קיים"}
            </Button>
          </div>

        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Auth;