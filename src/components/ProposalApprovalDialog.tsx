import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SignatureCanvas, SignatureData } from '@/components/SignatureCanvas';
import { useProposalApproval } from '@/hooks/useProposalApproval';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, FileSignature, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FeeLineItem {
  description?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  total?: number;
  is_optional?: boolean;
}

interface ProposalApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: {
    id: string;
    project_id: string;
    advisor_id: string;
    supplier_name: string;
    price: number;
    timeline_days: number;
    scope_text?: string;
    conditions_json?: {
      payment_terms?: string;
      assumptions?: string;
      exclusions?: string;
      validity_days?: number;
    };
    files?: Array<{ name: string; url: string; type?: string; size?: number }>;
    fee_line_items?: FeeLineItem[];
    signature_blob?: string;
    submitted_at: string;
    consultant_request_notes?: string;
    consultant_request_files?: Array<{ name: string; path?: string; url?: string; size?: number }>;
    services_notes?: string;
    current_version?: number;
    rfp_invite?: {
      advisor_type?: string | null;
      request_title?: string | null;
    };
    advisor_logo_url?: string | null;
  };
  projectName?: string;
  onSuccess?: () => void;
}

export const ProposalApprovalDialog = ({
  open,
  onOpenChange,
  proposal,
  projectName,
}: ProposalApprovalDialogProps) => {
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState<SignatureData | null>(null);
  const [authorizationAccepted, setAuthorizationAccepted] = useState(false);
  const [step, setStep] = useState<'review' | 'signature'>('review');
  const [selectedOptionalItems, setSelectedOptionalItems] = useState<Set<number>>(new Set());
  const [notesOpen, setNotesOpen] = useState(false);
  
  const { approveProposal, loading } = useProposalApproval();
  const { toast } = useToast();

  // Parse items
  const mandatoryItems = proposal.fee_line_items?.filter(item => !item.is_optional) || [];
  const optionalItems = proposal.fee_line_items?.filter(item => item.is_optional) || [];

  // Calculate totals
  const mandatoryTotal = mandatoryItems.reduce((sum, item) => 
    sum + (item.total || (item.unit_price || 0) * (item.quantity || 1)), 0);
  
  const selectedOptionalTotal = optionalItems
    .filter((_, idx) => selectedOptionalItems.has(idx))
    .reduce((sum, item) => sum + (item.total || (item.unit_price || 0) * (item.quantity || 1)), 0);

  const grandTotal = mandatoryTotal + selectedOptionalTotal;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const handleApprove = async () => {
    if (!signature) {
      toast({
        title: 'חתימה חסרה',
        description: 'יש לחתום על האישור לפני המשך',
        variant: 'destructive'
      });
      return;
    }

    if (!authorizationAccepted) {
      toast({
        title: 'נדרש אישור הרשאה',
        description: 'יש לאשר כי הנך מוסמך/ת לפעול בשם היזם/החברה',
        variant: 'destructive'
      });
      return;
    }

    const result = await approveProposal({
      proposalId: proposal.id,
      projectId: proposal.project_id,
      advisorId: proposal.advisor_id,
      price: grandTotal,
      timelineDays: proposal.timeline_days,
      signature,
      notes: notes.trim() || undefined,
    });

    if (result.success) {
      onOpenChange(false);
      // Reset state
      setNotes('');
      setSignature(null);
      setAuthorizationAccepted(false);
      setStep('review');
      setSelectedOptionalItems(new Set());
      setNotesOpen(false);
    }
  };

  const handleNext = () => {
    if (step === 'review') {
      setStep('signature');
    }
  };

  const toggleOptionalItem = (idx: number) => {
    const newSet = new Set(selectedOptionalItems);
    if (newSet.has(idx)) {
      newSet.delete(idx);
    } else {
      newSet.add(idx);
    }
    setSelectedOptionalItems(newSet);
  };

  // Reset state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setNotes('');
      setSignature(null);
      setAuthorizationAccepted(false);
      setStep('review');
      setSelectedOptionalItems(new Set());
      setNotesOpen(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle className="w-6 h-6 text-green-600" />
            אישור הצעת מחיר
          </DialogTitle>
        </DialogHeader>

        {step === 'review' && (
          <div className="flex-1 overflow-y-auto space-y-5 py-2">
            
            {/* Hero Total Card */}
            <div className="bg-gradient-to-l from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
              <p className="text-sm text-green-700 dark:text-green-400 mb-1">סה"כ לתשלום</p>
              <p className="text-4xl font-bold text-green-600 dark:text-green-400 tracking-tight" dir="ltr">
                {formatCurrency(grandTotal)}
              </p>
              {selectedOptionalItems.size > 0 && (
                <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-2">
                  כולל {selectedOptionalItems.size} פריטים אופציונליים שנבחרו
                </p>
              )}
            </div>

            {/* Vendor Card */}
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border">
              <Avatar className="h-14 w-14 ring-2 ring-primary/10 shrink-0">
                {proposal.advisor_logo_url && (
                  <AvatarImage src={proposal.advisor_logo_url} alt={proposal.supplier_name} />
                )}
                <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                  {getInitials(proposal.supplier_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg truncate">{proposal.supplier_name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {proposal.rfp_invite?.advisor_type && (
                    <Badge variant="secondary" className="text-xs">
                      {proposal.rfp_invite.advisor_type}
                    </Badge>
                  )}
                  {proposal.current_version && proposal.current_version > 1 && (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700 text-xs">
                      גרסה {proposal.current_version}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Project Context */}
            {projectName && (
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground">עבור פרויקט</p>
                <p className="font-semibold text-lg">{projectName}</p>
              </div>
            )}

            {/* Mandatory Items Table */}
            {mandatoryItems.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  פריטי חובה
                </h4>
                <div className="border rounded-lg overflow-hidden bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-right font-medium">תיאור השירות</TableHead>
                        <TableHead className="text-center font-medium w-20">כמות</TableHead>
                        <TableHead className="text-left font-medium w-28">סכום</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mandatoryItems.map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/20">
                          <TableCell className="py-3">{item.description}</TableCell>
                          <TableCell className="py-3 text-center text-muted-foreground">
                            {item.quantity || 1}
                          </TableCell>
                          <TableCell className="py-3 text-left font-medium" dir="ltr">
                            {formatCurrency(item.total || (item.unit_price || 0) * (item.quantity || 1))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter className="bg-green-50/50 dark:bg-green-900/10">
                      <TableRow>
                        <TableCell colSpan={2} className="text-right font-semibold">
                          סה"כ חובה:
                        </TableCell>
                        <TableCell className="text-left font-bold text-green-600 dark:text-green-400" dir="ltr">
                          {formatCurrency(mandatoryTotal)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>
            )}

            {/* Optional Items - Interactive Selection */}
            {optionalItems.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Plus className="h-4 w-4 text-blue-600" />
                  פריטים אופציונליים
                  <span className="text-xs text-muted-foreground font-normal mr-1">
                    (בחר כדי להוסיף לסכום)
                  </span>
                </h4>
                <div className="border rounded-lg overflow-hidden bg-blue-50/30 dark:bg-blue-950/20">
                  <div className="divide-y divide-blue-100 dark:divide-blue-900">
                    {optionalItems.map((item, idx) => {
                      const isSelected = selectedOptionalItems.has(idx);
                      const itemTotal = item.total || (item.unit_price || 0) * (item.quantity || 1);
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center gap-3 p-4 cursor-pointer transition-all",
                            isSelected 
                              ? "bg-blue-100/70 dark:bg-blue-900/30" 
                              : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          )}
                          onClick={() => toggleOptionalItem(idx)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleOptionalItem(idx)}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm",
                              isSelected && "font-medium"
                            )}>
                              {item.description}
                            </p>
                            {item.quantity && item.quantity > 1 && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                כמות: {item.quantity}
                              </p>
                            )}
                          </div>
                          <span className={cn(
                            "text-sm font-medium shrink-0 tabular-nums",
                            isSelected ? "text-blue-700 dark:text-blue-300" : "text-muted-foreground"
                          )} dir="ltr">
                            +{formatCurrency(itemTotal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {selectedOptionalItems.size > 0 && (
                    <div className="p-3 bg-blue-100/60 dark:bg-blue-900/40 border-t border-blue-200 dark:border-blue-800 flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        סה"כ אופציונלי נבחר:
                      </span>
                      <span className="font-bold text-blue-700 dark:text-blue-300 tabular-nums" dir="ltr">
                        +{formatCurrency(selectedOptionalTotal)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes Collapsible */}
            <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
                  <span className="text-sm">הוסף הערות (אופציונלי)</span>
                  {notesOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="הוסף הערות או דרישות נוספות..."
                  rows={3}
                  className="resize-none"
                />
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {step === 'signature' && (
          <div className="flex-1 overflow-y-auto space-y-5 py-2">
            
            {/* Compact Summary Before Signing */}
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 shrink-0">
                  {proposal.advisor_logo_url && (
                    <AvatarImage src={proposal.advisor_logo_url} alt={proposal.supplier_name} />
                  )}
                  <AvatarFallback className="text-sm bg-primary/10 text-primary font-medium">
                    {getInitials(proposal.supplier_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{proposal.supplier_name}</p>
                  {proposal.rfp_invite?.advisor_type && (
                    <p className="text-sm text-muted-foreground">{proposal.rfp_invite.advisor_type}</p>
                  )}
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-semibold">סה"כ לתשלום:</span>
                <span className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums" dir="ltr">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              {selectedOptionalItems.size > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  כולל {selectedOptionalItems.size} פריטים אופציונליים
                </p>
              )}
            </div>

            {/* Warning */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>חשוב:</strong> חתימתך מאשרת את תנאי ההצעה ומחייבת אותך כלפי היועץ.
              </p>
            </div>

            {/* Authorization Checkbox */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="authorization"
                  checked={authorizationAccepted}
                  onCheckedChange={(checked) => setAuthorizationAccepted(checked as boolean)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="authorization"
                  className="text-sm font-medium leading-relaxed cursor-pointer flex-1"
                >
                  אני מצהיר/ה כי אני מוסמך/ת לפעול בשם היזם/החברה לאישור ההצעה ולהתקשרות מול היועץ
                  <span className="text-destructive mr-1">*</span>
                </label>
              </div>
            </div>

            {/* Signature Canvas */}
            <SignatureCanvas
              onSign={setSignature}
              required
            />
          </div>
        )}

        {/* Fixed Footer */}
        <div className="shrink-0 pt-4 border-t flex gap-3 justify-end">
          {step === 'review' ? (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                ביטול
              </Button>
              <Button onClick={handleNext} size="lg">
                <FileSignature className="w-4 h-4 ml-2" />
                המשך לחתימה
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep('review')}>
                חזור
              </Button>
              <Button 
                onClick={handleApprove} 
                disabled={!signature || !authorizationAccepted || loading}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
                size="lg"
              >
                {loading ? 'מאשר...' : 'אשר הצעה'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
