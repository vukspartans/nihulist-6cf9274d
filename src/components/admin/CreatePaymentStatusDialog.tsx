import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCreatePaymentStatusDefinition } from '@/hooks/usePaymentStatusDefinitions';
import { 
  SIGNATURE_TYPES, 
  NOTIFY_ROLES, 
  STATUS_COLORS,
  type SignatureType,
  type NotifyRole,
} from '@/types/paymentStatus';
import { adminTranslations } from '@/constants/adminTranslations';

interface CreatePaymentStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePaymentStatusDialog({
  open,
  onOpenChange,
}: CreatePaymentStatusDialogProps) {
  const t = adminTranslations.payments.statuses;
  const createMutation = useCreatePaymentStatusDefinition();

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_en: '',
    description: '',
    color: '#6B7280',
    is_terminal: false,
    is_active: true,
    notify_on_enter: true,
    notify_roles: [] as string[],
    requires_signature: false,
    signature_type: 'none' as SignatureType,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createMutation.mutateAsync({
      ...formData,
    });
    
    // Reset form and close
    setFormData({
      code: '',
      name: '',
      name_en: '',
      description: '',
      color: '#6B7280',
      is_terminal: false,
      is_active: true,
      notify_on_enter: true,
      notify_roles: [],
      requires_signature: false,
      signature_type: 'none',
    });
    onOpenChange(false);
  };

  const toggleNotifyRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      notify_roles: prev.notify_roles.includes(role)
        ? prev.notify_roles.filter(r => r !== role)
        : [...prev.notify_roles, role],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{t.dialog.createTitle}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">פרטים בסיסיים</TabsTrigger>
              <TabsTrigger value="notifications">{t.dialog.notificationSection}</TabsTrigger>
              <TabsTrigger value="signature">{t.dialog.signatureSection}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="code">{t.dialog.codeLabel}</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') 
                  }))}
                  placeholder={t.dialog.codePlaceholder}
                  className="font-mono"
                  required
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">{t.dialog.codeHint}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t.dialog.nameLabel}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t.dialog.namePlaceholder}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name_en">{t.dialog.nameEnLabel}</Label>
                <Input
                  id="name_en"
                  value={formData.name_en}
                  onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                  placeholder="e.g., Legal Review"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t.dialog.descriptionLabel}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="תיאור השימוש בשלב זה..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">{t.dialog.colorLabel}</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: formData.color }}
                        />
                        {STATUS_COLORS.find(c => c.value === formData.color)?.label || formData.color}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t.dialog.isTerminalLabel}</Label>
                  <p className="text-xs text-muted-foreground">{t.dialog.isTerminalHint}</p>
                </div>
                <Switch
                  checked={formData.is_terminal}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_terminal: checked }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label>{t.dialog.notifyOnEnterLabel}</Label>
                <Switch
                  checked={formData.notify_on_enter}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, notify_on_enter: checked }))}
                />
              </div>

              {formData.notify_on_enter && (
                <div className="space-y-2">
                  <Label>{t.dialog.notifyRolesLabel}</Label>
                  <div className="space-y-2">
                    {NOTIFY_ROLES.map((role) => (
                      <div key={role.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`role-${role.value}`}
                          checked={formData.notify_roles.includes(role.value)}
                          onCheckedChange={() => toggleNotifyRole(role.value)}
                        />
                        <Label htmlFor={`role-${role.value}`} className="font-normal">
                          {role.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="signature" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label>{t.dialog.requiresSignatureLabel}</Label>
                <Switch
                  checked={formData.requires_signature}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    requires_signature: checked,
                    signature_type: checked ? 'checkbox' : 'none',
                  }))}
                />
              </div>

              {formData.requires_signature && (
                <div className="space-y-2">
                  <Label>{t.dialog.signatureTypeLabel}</Label>
                  <Select
                    value={formData.signature_type}
                    onValueChange={(value: SignatureType) => setFormData(prev => ({ ...prev, signature_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SIGNATURE_TYPES.filter(s => s.value !== 'none').map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {adminTranslations.common.cancel}
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !formData.code || !formData.name}>
              {createMutation.isPending ? '...' : adminTranslations.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
