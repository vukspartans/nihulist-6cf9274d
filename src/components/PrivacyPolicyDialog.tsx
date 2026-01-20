import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PrivacyPolicy from "./PrivacyPolicy";

interface PrivacyPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PrivacyPolicyDialog = ({ open, onOpenChange }: PrivacyPolicyDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">מדיניות פרטיות</DialogTitle>
        </DialogHeader>
        <PrivacyPolicy showHeader={false} />
      </DialogContent>
    </Dialog>
  );
};

export default PrivacyPolicyDialog;
