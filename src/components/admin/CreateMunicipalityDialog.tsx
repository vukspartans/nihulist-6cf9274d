import { useState } from "react";
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
import { useCreateMunicipality } from "@/hooks/useMunicipalities";

interface CreateMunicipalityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateMunicipalityDialog({
  open,
  onOpenChange,
}: CreateMunicipalityDialogProps) {
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [notes, setNotes] = useState("");
  const [hasSpecialRequirements, setHasSpecialRequirements] = useState(false);

  const createMunicipality = useCreateMunicipality();

  const resetForm = () => {
    setName("");
    setRegion("");
    setNotes("");
    setHasSpecialRequirements(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    await createMunicipality.mutateAsync({
      name: name.trim(),
      region: region.trim() || undefined,
      notes: notes.trim() || undefined,
      has_special_requirements: hasSpecialRequirements,
    });

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>הוספת עירייה חדשה</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">שם העירייה *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: תל אביב-יפו"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">אזור</Label>
            <Input
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="לדוגמה: מרכז"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">הערות</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="הערות נוספות על העירייה..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="hasSpecialRequirements"
              checked={hasSpecialRequirements}
              onCheckedChange={(checked) => setHasSpecialRequirements(!!checked)}
            />
            <Label htmlFor="hasSpecialRequirements" className="cursor-pointer">
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
            <Button type="submit" disabled={createMunicipality.isPending || !name.trim()}>
              {createMunicipality.isPending ? "יוצר..." : "צור עירייה"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
