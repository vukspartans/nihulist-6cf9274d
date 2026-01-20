import { useState } from "react";
import PrivacyPolicyDialog from "./PrivacyPolicyDialog";
import { TermsAndConditions } from "./TermsAndConditions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const LegalFooter = () => {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  return (
    <>
      <footer className="mt-8 py-4 border-t border-border/40 bg-muted/30" dir="rtl">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>© 2026 Billding</span>
            <span className="hidden sm:inline">•</span>
            <button
              onClick={() => setShowPrivacy(true)}
              className="hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              מדיניות פרטיות
            </button>
            <span>•</span>
            <button
              onClick={() => setShowTerms(true)}
              className="hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              תנאי שימוש
            </button>
            <span className="hidden sm:inline">•</span>
            <a
              href="mailto:contact@billding.ai"
              className="hover:text-primary transition-colors underline-offset-4 hover:underline"
            >
              contact@billding.ai
            </a>
          </div>
        </div>
      </footer>

      {/* Privacy Policy Dialog */}
      <PrivacyPolicyDialog open={showPrivacy} onOpenChange={setShowPrivacy} />

      {/* Terms of Service Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">תנאי שימוש</DialogTitle>
          </DialogHeader>
          <TermsAndConditions accepted={true} onAcceptChange={() => {}} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LegalFooter;
