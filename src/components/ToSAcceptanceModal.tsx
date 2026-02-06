import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TermsAndConditions } from "@/components/TermsAndConditions";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

export const ToSAcceptanceModal = () => {
  const { profile, user } = useAuth();
  const [tosAccepted, setTosAccepted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showError, setShowError] = useState(false);
  const checkboxRef = useRef<HTMLButtonElement>(null);

  // Check if user needs to accept ToS
  useEffect(() => {
    if (profile && !profile.tos_accepted_at && user) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [profile, user]);

  // Clear error when checkbox is checked
  const handleAcceptChange = (accepted: boolean) => {
    setTosAccepted(accepted);
    if (accepted && showError) {
      setShowError(false);
    }
  };

  const handleAccept = async () => {
    // Validate checkbox is checked
    if (!tosAccepted) {
      setShowError(true);
      // Focus checkbox for accessibility
      checkboxRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          tos_accepted_at: new Date().toISOString(),
          tos_version: '3.0'
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      toast.success("תנאי השימוש אושרו בהצלחה");
      setIsOpen(false);
      
      // Refresh the profile to update the UI
      window.location.reload();
    } catch (error) {
      console.error('Error accepting ToS:', error);
      toast.error("שגיאה באישור תנאי השימוש");
    } finally {
      setLoading(false);
    }
  };

  const isCTADisabled = !tosAccepted || loading;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto" 
        dir="rtl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        role="alertdialog"
        aria-describedby="tos-description"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-primary">
            תנאי שימוש - עדכון חשבון
          </DialogTitle>
          <DialogDescription id="tos-description" className="text-center text-sm">
            אישור תנאי השימוש נדרש להמשך השימוש במערכת
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 text-right">
          {/* Notice Section */}
          <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              על מנת להמשיך להשתמש במערכת, נדרש לאשר את תנאי השימוש המעודכנים
            </p>
          </div>
          
          <TermsAndConditions 
            accepted={tosAccepted}
            onAcceptChange={handleAcceptChange}
            showError={showError}
            checkboxRef={checkboxRef}
          />
          
          <Button
            onClick={handleAccept}
            disabled={isCTADisabled}
            className="w-full h-11 text-base font-medium"
            variant="premium"
            aria-disabled={isCTADisabled}
          >
            {loading ? "מעדכן..." : "אשר והמשך"}
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            * לא ניתן להמשיך להשתמש במערכת ללא אישור תנאי השימוש
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};