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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateMunicipality } from "@/hooks/useMunicipalities";

const ISRAEL_REGIONS = [
  { value: "צפון", label: "צפון" },
  { value: "חיפה", label: "חיפה" },
  { value: "מרכז", label: "מרכז" },
  { value: "תל אביב", label: "תל אביב" },
  { value: "ירושלים", label: "ירושלים" },
  { value: "דרום", label: "דרום" },
  { value: "יהודה ושומרון", label: "יהודה ושומרון" },
];

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
            <Label>אזור</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger>
                <SelectValue placeholder="בחר אזור" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {ISRAEL_REGIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <DialogFooter className="gap-2">
            <Button type="submit" disabled={createMunicipality.isPending || !name.trim()}>
              {createMunicipality.isPending ? "יוצר..." : "צור עירייה"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ביטול
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
