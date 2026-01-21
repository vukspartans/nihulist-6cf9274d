import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useUpdateMunicipality, type Municipality } from "@/hooks/useMunicipalities";

interface EditMunicipalityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  municipality: Municipality | null;
}

export function EditMunicipalityDialog({
  open,
  onOpenChange,
  municipality,
}: EditMunicipalityDialogProps) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [notes, setNotes] = useState("");
  const [hasSpecialRequirements, setHasSpecialRequirements] = useState(false);

  const updateMunicipality = useUpdateMunicipality();

  useEffect(() => {
    if (municipality) {
      setName(municipality.name);
      setRegion(municipality.region || "");
      setNotes(municipality.notes || "");
      setHasSpecialRequirements(municipality.has_special_requirements);
    }
  }, [municipality]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!municipality || !name.trim()) return;

    await updateMunicipality.mutateAsync({
      id: municipality.id,
      name: name.trim(),
      region: region.trim() || undefined,
      notes: notes.trim() || undefined,
      has_special_requirements: hasSpecialRequirements,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת עירייה</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">שם העירייה *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: תל אביב-יפו"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-region">אזור</Label>
            <Input
              id="edit-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="לדוגמה: מרכז"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">הערות</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות נוספות על העירייה..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-hasSpecialRequirements"
              checked={hasSpecialRequirements}
              onCheckedChange={(checked) => setHasSpecialRequirements(!!checked)}
            />
            <Label htmlFor="edit-hasSpecialRequirements" className="cursor-pointer">
              יש דרישות מיוחדות
            </Label>
          </div>

          <DialogFooter className="flex-row-reverse gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={updateMunicipality.isPending || !name.trim()}>
              {updateMunicipality.isPending ? "שומר..." : "שמור שינויים"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
