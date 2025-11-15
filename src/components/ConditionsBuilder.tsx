import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Building, Briefcase, Palette } from 'lucide-react';

interface ConditionsBuilderProps {
  value: ProposalConditions;
  onChange: (conditions: ProposalConditions) => void;
}

export interface ProposalConditions {
  payment_terms?: string;
  assumptions?: string;
  exclusions?: string;
  validity_days?: number;
  custom_conditions?: Array<{ key: string; value: string }>;
}

const TEMPLATES = {
  construction: {
    payment_terms: "30% מקדמה, 40% באמצע הפרויקט, 30% בסיום",
    assumptions: "ההצעה מניחה קבלת כל האישורים מהרשויות המקומיות, גישה חופשית לאתר, וזמינות חשמל ומים",
    exclusions: "ההצעה אינה כוללת עבודות עפר, פיתוח, או תשתיות חיצוניות",
    validity_days: 90
  },
  consulting: {
    payment_terms: "50% בתחילת הפרויקט, 50% בסיום",
    assumptions: "שיתוף פעולה מלא מהלקוח, מתן גישה למידע ומסמכים נדרשים",
    exclusions: "ההצעה אינה כוללת הטמעת המלצות או ליווי שוטף לאחר סיום הפרויקט",
    validity_days: 60
  },
  design: {
    payment_terms: "40% בקבלת הזמנה, 30% באישור תכנון ראשוני, 30% בסיום",
    assumptions: "ההצעה מניחה עד 3 סבבי תיקונים לכל שלב",
    exclusions: "ההצעה אינה כוללת דמי רישוי, הדפסה, או ייצור",
    validity_days: 45
  }
};

export function ConditionsBuilder({ value, onChange }: ConditionsBuilderProps) {
  const [customConditions, setCustomConditions] = useState<Array<{ key: string; value: string }>>(
    value.custom_conditions || []
  );

  const handleChange = (field: keyof ProposalConditions, val: string | number) => {
    onChange({ ...value, [field]: val });
  };

  const applyTemplate = (templateKey: keyof typeof TEMPLATES) => {
    const template = TEMPLATES[templateKey];
    onChange({
      ...value,
      ...template
    });
  };

  const addCustomCondition = () => {
    const newConditions = [...customConditions, { key: '', value: '' }];
    setCustomConditions(newConditions);
    onChange({ ...value, custom_conditions: newConditions });
  };

  const removeCustomCondition = (index: number) => {
    const newConditions = customConditions.filter((_, i) => i !== index);
    setCustomConditions(newConditions);
    onChange({ ...value, custom_conditions: newConditions });
  };

  const updateCustomCondition = (index: number, field: 'key' | 'value', val: string) => {
    const newConditions = customConditions.map((cond, i) =>
      i === index ? { ...cond, [field]: val } : cond
    );
    setCustomConditions(newConditions);
    onChange({ ...value, custom_conditions: newConditions });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>תנאים והנחות</CardTitle>
        <CardDescription>
          פרטו את התנאים, ההנחות והאי-הכללות של ההצעה או בחרו תבנית מוכנה
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6" dir="rtl">
        {/* Template Buttons */}
        <div className="flex flex-wrap gap-2 pb-4 border-b">
          <Button 
            variant="outline" 
            size="sm" 
            type="button"
            onClick={() => applyTemplate('construction')}
          >
            <Building className="w-4 h-4 ml-2" />
            תבנית בניה
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            type="button"
            onClick={() => applyTemplate('consulting')}
          >
            <Briefcase className="w-4 h-4 ml-2" />
            תבנית ייעוץ
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            type="button"
            onClick={() => applyTemplate('design')}
          >
            <Palette className="w-4 h-4 ml-2" />
            תבנית עיצוב
          </Button>
        </div>
        {/* Payment Terms */}
        <div className="space-y-2">
          <Label htmlFor="payment_terms">תנאי תשלום</Label>
          <Textarea
            id="payment_terms"
            placeholder="לדוגמה: 30% מקדמה, 40% באמצע, 30% בסיום"
            value={value.payment_terms || ''}
            onChange={(e) => handleChange('payment_terms', e.target.value)}
            rows={3}
          />
        </div>

        {/* Assumptions */}
        <div className="space-y-2">
          <Label htmlFor="assumptions">הנחות יסוד</Label>
          <Textarea
            id="assumptions"
            placeholder="לדוגמה: ההצעה מניחה קבלת כל האישורים הנדרשים מהרשויות"
            value={value.assumptions || ''}
            onChange={(e) => handleChange('assumptions', e.target.value)}
            rows={3}
          />
        </div>

        {/* Exclusions */}
        <div className="space-y-2">
          <Label htmlFor="exclusions">אי-הכללות</Label>
          <Textarea
            id="exclusions"
            placeholder="לדוגמה: ההצעה אינה כוללת עבודות עפר או פיתוח"
            value={value.exclusions || ''}
            onChange={(e) => handleChange('exclusions', e.target.value)}
            rows={3}
          />
        </div>

        {/* Validity */}
        <div className="space-y-2">
          <Label htmlFor="validity_days">תוקף ההצעה (ימים)</Label>
          <Input
            id="validity_days"
            type="number"
            placeholder="90"
            value={value.validity_days || ''}
            onChange={(e) => handleChange('validity_days', parseInt(e.target.value) || 0)}
            min={1}
            max={365}
          />
        </div>

        {/* Custom Conditions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>תנאים נוספים</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomCondition}
            >
              <Plus className="ml-2 h-4 w-4" />
              הוסף תנאי
            </Button>
          </div>

          {customConditions.map((condition, index) => (
            <div key={index} className="flex gap-2 items-start">
              <Input
                placeholder="שם התנאי"
                value={condition.key}
                onChange={(e) => updateCustomCondition(index, 'key', e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="תיאור התנאי"
                value={condition.value}
                onChange={(e) => updateCustomCondition(index, 'value', e.target.value)}
                className="flex-[2]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeCustomCondition(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
