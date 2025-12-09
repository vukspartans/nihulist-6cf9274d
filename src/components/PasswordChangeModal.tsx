import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PasswordChangeModalProps {
  open: boolean;
  userId: string;
  onSuccess: () => void;
}

export const PasswordChangeModal = ({ open, userId, onSuccess }: PasswordChangeModalProps) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

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

    if (newPassword === "Billding2026!") {
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

      // Update profile flag
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ requires_password_change: false })
        .eq("user_id", userId);

      if (profileError) throw profileError;

      toast({
        title: "הסיסמה שונתה בהצלחה",
        description: "כעת תוכל להמשיך להשתמש במערכת",
      });

      onSuccess();
    } catch (error: any) {
      console.error("Password change error:", error);
      setError(error.message || "אירעה שגיאה בשינוי הסיסמה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" dir="rtl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">שינוי סיסמה נדרש</DialogTitle>
          <DialogDescription className="text-center">
            חשבונך נוצר עם סיסמה זמנית. לצורכי אבטחה, נא לשנות את הסיסמה לסיסמה חדשה ומאובטחת.
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
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Billding2026!"
              disabled={loading}
              required
            />
            <p className="text-xs text-muted-foreground">
              הסיסמה הזמנית שקיבלת באימייל
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">סיסמה חדשה</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              required
            />
            <p className="text-xs text-muted-foreground">
              לפחות 8 תווים, כולל אותיות גדולות, קטנות וספרות
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">אימות סיסמה חדשה</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading} size="lg">
            {loading ? "משנה סיסמה..." : "שנה סיסמה והמשך"}
          </Button>
        </form>

        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            לא ניתן לדלג על שלב זה. שינוי הסיסמה נדרש לצורכי אבטחת החשבון שלך.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
