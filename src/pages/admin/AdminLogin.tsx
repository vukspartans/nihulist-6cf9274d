import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Loader2, Lock, ArrowLeft, Home, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { adminTranslations } from "@/constants/adminTranslations";
import type { Session, User } from "@supabase/supabase-js";
import { PRODUCTION_URL } from '@/utils/urls';

const loginSchema = z.object({
  email: z.string().email(adminTranslations.login.invalidEmail),
  password: z.string().min(6, adminTranslations.login.passwordTooShort),
});

const BackToHome = () => (
  <Link 
    to="/" 
    className="absolute top-6 left-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
  >
    <Home className="w-4 h-4" />
    <span>חזרה לעמוד הראשי</span>
  </Link>
);

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();

  // Check for recovery tokens in URL hash and set session manually
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    
    // Parse hash parameters (format: #access_token=...&refresh_token=...&type=recovery...)
    const hashString = hash.substring(1); // Remove leading #
    const hashParams = new URLSearchParams(hashString);
    
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');
    
    console.log('[AdminLogin] Hash check - type:', type, 'hasAccessToken:', !!accessToken, 'hasRefreshToken:', !!refreshToken);
    
    if (type === 'recovery' && accessToken && refreshToken) {
      console.log('[AdminLogin] Recovery tokens found in hash, setting session manually');
      localStorage.setItem('adminPasswordRecovery', 'true');
      
      // Manually set the Supabase session using the tokens from the hash
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(({ data, error }) => {
        if (error) {
          console.error('[AdminLogin] Failed to set session from hash tokens:', error);
          toast.error('קישור האיפוס פג תוקף או לא תקין. נסה שוב.');
          return;
        }
        
        if (data.session) {
          console.log('[AdminLogin] Session set successfully from hash tokens');
          setSession(data.session);
          setUser(data.session.user);
          setIsPasswordReset(true);
          
          // Clean up the URL completely to avoid confusion and loops
          window.history.replaceState(null, '', window.location.pathname);
        }
      });
    }
  }, []);

  // Check for pending recovery flag on mount (set by AuthEventRouter) - fallback
  useEffect(() => {
    const recoveryPending = localStorage.getItem('passwordRecoveryPending');
    const adminRecovery = localStorage.getItem('adminPasswordRecovery');
    
    console.log('[AdminLogin] Mount check - recoveryPending:', recoveryPending, 'adminRecovery:', adminRecovery);
    
    if (recoveryPending || adminRecovery) {
      // Recovery is pending - check for session
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('[AdminLogin] Recovery pending, session:', session ? 'found' : 'not found');
        if (session?.user) {
          setSession(session);
          setUser(session.user);
          setIsPasswordReset(true);
          // Clear the pending flag (keep adminRecovery until password is actually reset)
          localStorage.removeItem('passwordRecoveryPending');
        }
      });
    }
  }, []);

  // Redirect if already admin and handle password recovery
  useEffect(() => {
    // Parse recovery type from both query string and hash
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
    const type = urlParams.get('type') || hashParams.get('type');
    
    // Check for recovery flags
    const recoveryPending = localStorage.getItem('passwordRecoveryPending');
    const adminRecovery = localStorage.getItem('adminPasswordRecovery');
    const isRecoveryMode = type === 'recovery' || recoveryPending || adminRecovery;
    
    // If this is a recovery URL or recovery is pending, prioritize showing password reset
    if (isRecoveryMode) {
      console.log('[AdminLogin] Recovery mode detected');
      localStorage.setItem('adminPasswordRecovery', 'true');
      
      // Set up auth state listener for password recovery
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          console.log('[AdminLogin] Auth state change during recovery:', event);
          setSession(session);
          setUser(session?.user ?? null);
          
          // Handle password recovery events
          if (event === 'PASSWORD_RECOVERY') {
            console.log('[AdminLogin] PASSWORD_RECOVERY event received');
            setIsPasswordReset(true);
            return;
          }
          
          // Handle SIGNED_IN during recovery flow
          if (event === 'SIGNED_IN' && session?.user) {
            const isRecoveryFlow = localStorage.getItem('adminPasswordRecovery') === 'true';
            if (isRecoveryFlow) {
              console.log('[AdminLogin] SIGNED_IN during recovery flow - showing reset form');
              setIsPasswordReset(true);
            }
          }
        }
      );

      // Check for existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('[AdminLogin] Checking session for recovery:', session ? 'found' : 'not found');
        setSession(session);
        setUser(session?.user ?? null);
        
        // If we have a session in recovery mode, show reset form
        if (session?.user) {
          setIsPasswordReset(true);
        }
      });

      return () => subscription.unsubscribe();
    }
    
    // Normal flow (not recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle normal login (but not if recovery is in progress)
        const isRecoveryFlow = localStorage.getItem('adminPasswordRecovery') === 'true';
        if (event === 'SIGNED_IN' && session?.user && !isRecoveryFlow) {
          navigate("/heyadmin");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    // Redirect if already admin (only when not in recovery mode)
    if (!authLoading && isAdmin && !isRecoveryMode) {
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
      // Store email for recovery context
      localStorage.setItem('lastAdminEmail', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${PRODUCTION_URL}/heyadmin/login?type=recovery`,
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

    if (newPassword !== confirmNewPassword) {
      toast.error("הסיסמאות אינן תואמות");
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

      toast.success("הסיסמה עודכנה בהצלחה! מעביר להתחברות...");
      
      // Clear ALL recovery flags and reset states
      localStorage.removeItem('adminPasswordRecovery');
      localStorage.removeItem('passwordRecoveryPending');
      localStorage.removeItem('lastAdminEmail');
      setIsPasswordReset(false);
      setNewPassword("");
      setConfirmNewPassword("");
      
      // Sign out and redirect to clean login URL to break the recovery loop
      await supabase.auth.signOut();
      window.location.href = '/heyadmin/login';
    } catch (error: any) {
      toast.error(error.message || "לא ניתן לעדכן את הסיסמה");
    } finally {
      setLoading(false);
    }
  };

  // Manual trigger for password reset (for logged-in users who need to reset)
  const handleManualResetRequest = async () => {
    if (!session?.user?.email) {
      toast.error("לא נמצא אימייל משתמש");
      return;
    }
    
    setLoading(true);
    try {
      localStorage.setItem('lastAdminEmail', session.user.email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, {
        redirectTo: `${PRODUCTION_URL}/heyadmin/login?type=recovery`,
      });

      if (error) throw error;
      
      toast.success("קישור לאיפוס סיסמה נשלח לאימייל שלך");
    } catch (error: any) {
      toast.error(error.message || "לא ניתן לשלוח קישור לאיפוס סיסמה");
    } finally {
      setLoading(false);
    }
  };

  // Password reset form
  if (isPasswordReset) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4" dir="rtl">
        <BackToHome />
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
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    dir="ltr"
                    className="pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">הסיסמה חייבת להכיל לפחות 6 תווים</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">אימות סיסמה חדשה</Label>
                <div className="relative">
                  <Input
                    id="confirmNewPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={loading}
                    dir="ltr"
                    className="pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
      <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4" dir="rtl">
        <BackToHome />
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
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4" dir="rtl">
      <BackToHome />
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
