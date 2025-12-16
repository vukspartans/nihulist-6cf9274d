import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface RejectProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierName: string;
  onConfirm: (reason?: string) => void;
  loading?: boolean;
}

export const RejectProposalDialog = ({
  open,
  onOpenChange,
  supplierName,
  onConfirm,
  loading = false,
}: RejectProposalDialogProps) => {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason || undefined);
    setReason("");
  };

  const handleCancel = () => {
    setReason("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl" className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            דחיית הצעת מחיר
          </AlertDialogTitle>
          <AlertDialogDescription className="text-right">
            האם אתה בטוח שברצונך לדחות את ההצעה מ-
            <strong>{supplierName}</strong>?
            <br />
            <span className="text-destructive font-medium">
              פעולה זו בלתי הפיכה.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <Label htmlFor="rejection-reason">סיבת הדחייה (אופציונלי)</Label>
          <Textarea
            id="rejection-reason"
            placeholder="הזן סיבה לדחיית ההצעה..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[80px] text-right"
            dir="rtl"
          />
          <p className="text-xs text-muted-foreground">
            הסיבה תישלח ליועץ בהודעת הדחייה
          </p>
        </div>

        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel onClick={handleCancel} disabled={loading}>
            ביטול
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "מעבד..." : "דחה הצעה"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
