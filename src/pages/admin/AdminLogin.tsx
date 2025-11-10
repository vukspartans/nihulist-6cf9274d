import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Loader2, Lock, ArrowLeft } from "lucide-react";
import { z } from "zod";
import { adminTranslations } from "@/constants/adminTranslations";
import type { Session, User } from "@supabase/supabase-js";

const loginSchema = z.object({
  email: z.string().email(adminTranslations.login.invalidEmail),
  password: z.string().min(6, adminTranslations.login.passwordTooShort),
});

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();

  // Redirect if already admin and handle password recovery
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type');
    
    // Set up auth state listener for password recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle password recovery events
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && type === 'recovery')) {
          setIsPasswordReset(true);
          return;
        }
        
        // Handle normal login
        if (event === 'SIGNED_IN' && session?.user && !isPasswordReset && type !== 'recovery') {
          navigate("/heyadmin");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // If this is a recovery URL and we have a session, show reset form
      if (type === 'recovery' && session?.user) {
        setIsPasswordReset(true);
        return;
      }
    });

    // Redirect if already admin
    if (!authLoading && isAdmin) {
      navigate("/heyadmin", { replace: true });
    }

    return () => subscription.unsubscribe();
  }, [isAdmin, authLoading, navigate, isPasswordReset]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has admin role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roles) {
        await supabase.auth.signOut();
        toast.error(adminTranslations.login.accessDenied);
        return;
      }

      toast.success(adminTranslations.login.welcomeBack);
      navigate("/heyadmin");
    } catch (error: any) {
      toast.error(error.message || adminTranslations.login.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("נא להזין כתובת אימייל");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/heyadmin/login?type=recovery`,
      });

      if (error) throw error;

      toast.success("מייל לאיפוס סיסמה נשלח. בדוק את תיבת הדואר שלך.");
      setEmailSent(true);
    } catch (error: any) {
      toast.error(error.message || "לא ניתן לשלוח מייל לאיפוס סיסמה");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || newPassword.length < 6) {
      toast.error("הסיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }

    setLoading(true);

    try {
      if (!session || !user) {
        throw new Error("Auth session missing. Please click the recovery link again.");
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("הסיסמה עודכנה בהצלחה");
      
      // Reset states and redirect to login
      setIsPasswordReset(false);
      setNewPassword("");
      navigate("/heyadmin/login");
    } catch (error: any) {
      toast.error(error.message || "לא ניתן לעדכן את הסיסמה");
    } finally {
      setLoading(false);
    }
  };

  // Password reset form
  if (isPasswordReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">איפוס סיסמה</CardTitle>
            <CardDescription>הזן את הסיסמה החדשה שלך</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">סיסמה חדשה</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">הסיסמה חייבת להכיל לפחות 6 תווים</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מעדכן...
                  </>
                ) : (
                  "עדכן סיסמה"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Forgot password form
  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">שכחת סיסמה?</CardTitle>
            <CardDescription>
              {emailSent 
                ? "נשלח מייל לאיפוס סיסמה. בדוק את תיבת הדואר שלך."
                : "הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס סיסמה"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailSent ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  נשלח מייל לכתובת {email}
                </p>
                <Button 
                  onClick={() => {
                    setIsForgotPassword(false);
                    setEmailSent(false);
                  }}
                  className="w-full"
                  variant="outline"
                >
                  <ArrowLeft className="w-4 h-4 ml-2" />
                  חזרה להתחברות
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{adminTranslations.login.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={adminTranslations.login.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                        שולח...
                      </>
                    ) : (
                      "שלח מייל לאיפוס סיסמה"
                    )}
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="w-full"
                    variant="outline"
                  >
                    <ArrowLeft className="w-4 h-4 ml-2" />
                    חזרה להתחברות
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Login form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">{adminTranslations.login.title}</CardTitle>
          <CardDescription>
            {adminTranslations.login.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{adminTranslations.login.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder={adminTranslations.login.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{adminTranslations.login.password}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-sm text-primary hover:underline"
                disabled={loading}
              >
                שכחת סיסמה?
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  {adminTranslations.login.signingIn}
                </>
              ) : (
                adminTranslations.login.signIn
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;
