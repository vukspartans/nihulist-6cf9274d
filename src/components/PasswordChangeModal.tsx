import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Lock, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PasswordChangeModalProps {
  open: boolean;
  userId: string;
  onSuccess: () => void;
  required?: boolean; // true = forced (no cancel), false = voluntary (can cancel)
}

export const PasswordChangeModal = ({ 
  open, 
  userId, 
  onSuccess, 
  required = true 
}: PasswordChangeModalProps) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    if (!required) {
      resetForm();
      onSuccess();
    }
  };

  const validatePassword = (password: string): boolean => {
    if (password.length < 8) {
      setError("הסיסמה חייבת להכיל לפחות 8 תווים");
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError("הסיסמה חייבת להכיל לפחות אות גדולה אחת באנגלית");
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setError("הסיסמה חייבת להכיל לפחות אות קטנה אחת באנגלית");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setError("הסיסמה חייבת להכיל לפחות ספרה אחת");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPassword) {
      setError("נא להזין את הסיסמה הנוכחית");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("נא למלא את כל השדות");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("הסיסמאות אינן תואמות");
      return;
    }

    // Only block temp password usage when it's a required change
    if (required && newPassword === "Billding2026!") {
      setError("אינך יכול להשתמש בסיסמה הזמנית כסיסמה חדשה");
      return;
    }

    if (!validatePassword(newPassword)) {
      return;
    }

    setLoading(true);

    try {
      // First, verify current password by trying to sign in with it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || "",
        password: currentPassword,
      });

      if (signInError) {
        setError("הסיסמה הנוכחית שגויה");
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Update profile flag only if it was a required change
      if (required) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ requires_password_change: false })
          .eq("user_id", userId);

        if (profileError) throw profileError;
      }

      toast({
        title: "הסיסמה שונתה בהצלחה",
        description: required ? "כעת תוכל להמשיך להשתמש במערכת" : "הסיסמה החדשה נשמרה",
      });

      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error("Password change error:", error);
      setError(error.message || "אירעה שגיאה בשינוי הסיסמה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={required ? () => {} : handleClose}>
      <DialogContent 
        className="sm:max-w-md" 
        dir="rtl" 
        onInteractOutside={(e) => required && e.preventDefault()}
        hideCloseButton={required}
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            {required ? "שינוי סיסמה נדרש" : "שינוי סיסמה"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {required 
              ? "חשבונך נוצר עם סיסמה זמנית. לצורכי אבטחה, נא לשנות את הסיסמה לסיסמה חדשה ומאובטחת."
              : "הזן את הסיסמה הנוכחית שלך ובחר סיסמה חדשה מאובטחת."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="current-password">סיסמה נוכחית</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={required ? "Billding2026!" : "הסיסמה הנוכחית שלך"}
                disabled={loading}
                required
                className="pl-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {required && (
              <p className="text-xs text-muted-foreground">
                הסיסמה הזמנית שקיבלת באימייל
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">סיסמה חדשה</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
                className="pl-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              לפחות 8 תווים, כולל אותיות גדולות, קטנות וספרות
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">אימות סיסמה חדשה</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
                className="pl-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className={required ? "" : "flex gap-2"}>
            {!required && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose} 
                disabled={loading}
                className="flex-1"
              >
                ביטול
              </Button>
            )}
            <Button 
              type="submit" 
              className={required ? "w-full" : "flex-1"} 
              disabled={loading} 
              size="lg"
            >
              {loading ? "משנה סיסמה..." : (required ? "שנה סיסמה והמשך" : "שנה סיסמה")}
            </Button>
          </div>
        </form>

        {required && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              לא ניתן לדלג על שלב זה. שינוי הסיסמה נדרש לצורכי אבטחת החשבון שלך.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
