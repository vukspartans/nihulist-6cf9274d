import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { SignatureCanvas, SignatureData } from '@/components/SignatureCanvas';
import { useProposalApproval } from '@/hooks/useProposalApproval';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, FileSignature, Plus, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    const formatted = new Intl.NumberFormat('he-IL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return `₪${formatted}`;
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
      <DialogContent className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader className="shrink-0 pb-2 sm:pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            אישור הצעת מחיר
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {step === 'review' 
              ? 'סקור את פרטי ההצעה ובחר פריטים אופציונליים' 
              : 'חתום דיגיטלית לאישור סופי'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
          <div className="space-y-4 sm:space-y-6 py-2 sm:py-4 pb-4">
            {step === 'review' && (
              <>
                {/* Hero Total Card */}
                <div className="bg-gradient-to-l from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border border-green-200 dark:border-green-800 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center">
                  <p className="text-xs sm:text-sm text-green-700 dark:text-green-400 mb-0.5 sm:mb-1">סה"כ לתשלום</p>
                  <p className="text-2xl sm:text-4xl font-bold text-green-600 dark:text-green-400 tracking-tight tabular-nums">
                    {formatCurrency(grandTotal)}
                  </p>
                  {selectedOptionalItems.size > 0 && (
                    <p className="text-[10px] sm:text-xs text-green-600/70 dark:text-green-400/70 mt-0.5 sm:mt-1">
                      כולל {selectedOptionalItems.size} פריטים אופציונליים
                    </p>
                  )}
                </div>

                {/* Vendor Identity Card */}
                <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/30 rounded-lg border">
                  <Avatar className="h-10 w-10 sm:h-14 sm:w-14 ring-2 ring-primary/10 shrink-0">
                    {proposal.advisor_logo_url && (
                      <AvatarImage src={proposal.advisor_logo_url} alt={proposal.supplier_name} />
                    )}
                    <AvatarFallback className="text-sm sm:text-lg bg-primary/10 text-primary font-semibold">
                      {getInitials(proposal.supplier_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base sm:text-lg truncate">{proposal.supplier_name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                      {proposal.rfp_invite?.advisor_type && (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs">
                          {proposal.rfp_invite.advisor_type}
                        </Badge>
                      )}
                      {proposal.current_version && proposal.current_version > 1 && (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700 text-[10px] sm:text-xs">
                          גרסה {proposal.current_version}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Project Name */}
                {projectName && (
                  <div className="text-center py-1.5 sm:py-2 bg-muted/20 rounded-lg">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">עבור פרויקט</p>
                    <p className="font-semibold text-sm sm:text-base">{projectName}</p>
                  </div>
                )}

                {/* Mandatory Items Table */}
                {mandatoryItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-xs sm:text-sm flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600" />
                      פריטי חובה
                    </h4>
                    <div className="border rounded-lg overflow-hidden bg-background">
                      <div className="overflow-x-auto">
                        <Table className="min-w-[300px]" dir="rtl">
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="text-start font-medium text-xs sm:text-sm">תיאור השירות</TableHead>
                              <TableHead className="text-center font-medium w-14 sm:w-20 text-xs sm:text-sm">כמות</TableHead>
                              <TableHead className="text-end font-medium w-20 sm:w-28 text-xs sm:text-sm">סכום</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mandatoryItems.map((item, idx) => (
                              <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                                <TableCell className="py-2 sm:py-3 text-xs sm:text-sm">
                                  <span className="line-clamp-2">{item.description}</span>
                                </TableCell>
                                <TableCell className="py-2 sm:py-3 text-center text-muted-foreground text-xs sm:text-sm">
                                  {item.quantity || 1}
                                </TableCell>
                                <TableCell className="py-2 sm:py-3 text-end font-medium tabular-nums text-xs sm:text-sm">
                                  {formatCurrency(item.total || (item.unit_price || 0) * (item.quantity || 1))}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="p-2 sm:p-3 bg-green-50/50 dark:bg-green-950/20 border-t flex justify-between items-center">
                        <span className="font-semibold text-xs sm:text-sm">סה"כ פריטי חובה:</span>
                        <span className="font-bold text-green-600 dark:text-green-400 tabular-nums text-sm sm:text-base">
                          {formatCurrency(mandatoryTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Optional Items - Interactive Selection */}
                {optionalItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
                      פריטים אופציונליים
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">
                        (בחר כדי להוסיף)
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
                                "flex items-center gap-2 sm:gap-3 p-3 sm:p-4 cursor-pointer transition-all",
                                isSelected 
                                  ? "bg-blue-100/70 dark:bg-blue-900/30" 
                                  : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              )}
                              onClick={() => toggleOptionalItem(idx)}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleOptionalItem(idx)}
                                className="shrink-0 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={cn("text-xs sm:text-sm line-clamp-2", isSelected && "font-medium")}>
                                  {item.description}
                                </p>
                                {item.quantity && item.quantity > 1 && (
                                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                                    כמות: {item.quantity}
                                  </p>
                                )}
                              </div>
                              <span className={cn(
                                "text-xs sm:text-sm font-medium shrink-0 tabular-nums",
                                isSelected ? "text-blue-700 dark:text-blue-300" : "text-muted-foreground"
                              )}>
                                {formatCurrency(itemTotal)}+
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {selectedOptionalItems.size > 0 && (
                        <div className="p-2 sm:p-3 bg-blue-100/60 dark:bg-blue-900/40 border-t border-blue-200 dark:border-blue-800 flex justify-between items-center">
                          <span className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-300">
                            סה"כ אופציונלי נבחר:
                          </span>
                          <span className="font-bold text-blue-700 dark:text-blue-300 tabular-nums text-sm sm:text-base">
                            {formatCurrency(selectedOptionalTotal)}+
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Collapsible Notes */}
                <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-2 sm:p-3 h-auto">
                      <span className="flex items-center gap-2 text-xs sm:text-sm">
                        <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        הערות (אופציונלי)
                      </span>
                      {notesOpen ? <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="הוסף הערות לאישור..."
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            {step === 'signature' && (
              <>
                {/* Compact Summary */}
                <div className="bg-muted/50 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                      {proposal.advisor_logo_url && (
                        <AvatarImage src={proposal.advisor_logo_url} alt={proposal.supplier_name} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
                        {getInitials(proposal.supplier_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">{proposal.supplier_name}</p>
                      {proposal.rfp_invite?.advisor_type && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{proposal.rfp_invite.advisor_type}</p>
                      )}
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm sm:text-base">סה"כ לתשלום:</span>
                    <span className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums" dir="ltr">
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>
                  {selectedOptionalItems.size > 0 && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                      כולל {selectedOptionalItems.size} פריטים אופציונליים
                    </p>
                  )}
                </div>

                {/* Warning */}
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">
                    <strong>חשוב:</strong> חתימתך מאשרת את תנאי ההצעה ומחייבת את הארגון שלך כלפי היועץ.
                  </p>
                </div>

                {/* Authorization Checkbox */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Checkbox
                      id="authorization"
                      checked={authorizationAccepted}
                      onCheckedChange={(checked) => setAuthorizationAccepted(checked === true)}
                      className="mt-0.5 shrink-0"
                    />
                    <label htmlFor="authorization" className="text-xs sm:text-sm font-medium leading-relaxed cursor-pointer">
                      אני מאשר/ת כי יש לי את הסמכות המשפטית להתחייב בשם הארגון לתנאי הצעה זו
                      <span className="text-destructive mr-1">*</span>
                    </label>
                  </div>
                </div>

                {/* Signature Canvas */}
                <SignatureCanvas 
                  onSign={setSignature} 
                  required
                  compact
                />
              </>
            )}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 pt-2 sm:pt-3 border-t flex gap-2 sm:gap-3 justify-end">
          {step === 'review' ? (
            <>
              <Button variant="outline" size="sm" className="sm:h-10 sm:px-4" onClick={() => handleOpenChange(false)}>
                ביטול
              </Button>
              <Button onClick={handleNext} size="sm" className="sm:h-10 sm:px-4">
                <FileSignature className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
                המשך לחתימה
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="sm:h-10 sm:px-4" onClick={() => setStep('review')}>
                חזור
              </Button>
              <Button 
                onClick={handleApprove} 
                disabled={!signature || !authorizationAccepted || loading}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white sm:h-10 sm:px-4"
                size="sm"
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
