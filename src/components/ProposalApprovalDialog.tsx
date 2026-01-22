import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SignatureCanvas, SignatureData } from '@/components/SignatureCanvas';
import { useProposalApproval } from '@/hooks/useProposalApproval';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, FileSignature, FileText, AlertCircle, Building2, Calendar, Download, Eye, Image, FileSpreadsheet, File, MessageSquare, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import FilePreviewModal from '@/components/FilePreviewModal';

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
  const [step, setStep] = useState<'notes' | 'signature'>('notes');
  const { approveProposal, loading } = useProposalApproval();
  const { toast } = useToast();
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

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
      price: proposal.price,
      timelineDays: proposal.timeline_days,
      signature,
      notes: notes.trim() || undefined,
    });

    if (result.success) {
      onOpenChange(false);
      setNotes('');
      setSignature(null);
      setAuthorizationAccepted(false);
      setStep('notes');
    }
  };

  const handleNext = () => {
    if (step === 'notes') {
      setStep('signature');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate mandatory total (excluding optional items)
  const getMandatoryTotal = () => {
    if (!proposal.fee_line_items || proposal.fee_line_items.length === 0) {
      return proposal.price;
    }
    return proposal.fee_line_items
      .filter(item => !item.is_optional)
      .reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="h-4 w-4 text-blue-500" />;
    }
    if (ext === 'pdf') {
      return <FileText className="h-4 w-4 text-red-500" />;
    }
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
    }
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const handleFilePreview = async (file: { name: string; url: string; type?: string }) => {
    try {
      // Get signed URL for the file
      const { data, error } = await supabase.storage
        .from('proposal-files')
        .createSignedUrl(file.url, 3600);

      if (error) throw error;

      setPreviewFile({
        url: data.signedUrl,
        name: file.name,
      });
    } catch (error) {
      console.error('Error getting signed URL:', error);
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לפתוח את הקובץ',
        variant: 'destructive'
      });
    }
  };

  const mandatoryTotal = getMandatoryTotal();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              אישור הצעת מחיר
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 flex-wrap">
              {projectName && <span className="font-medium">{projectName}</span>}
              {projectName && proposal.rfp_invite?.advisor_type && <span>•</span>}
              {proposal.rfp_invite?.advisor_type && (
                <span>{proposal.rfp_invite.advisor_type}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {step === 'notes' && (
            <div className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg max-h-[400px] overflow-y-auto">
                
                {/* Header Card - Project & Vendor Context with Total */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {projectName && (
                        <h3 className="font-bold text-lg mb-1">{projectName}</h3>
                      )}
                      {proposal.rfp_invite?.advisor_type && (
                        <Badge variant="secondary" className="mb-2">
                          <Briefcase className="h-3 w-3 ml-1" />
                          {proposal.rfp_invite.advisor_type}
                        </Badge>
                      )}
                      {proposal.current_version && proposal.current_version > 1 && (
                        <Badge variant="outline" className="mr-2 mb-2">
                          גרסה {proposal.current_version} (לאחר משא ומתן)
                        </Badge>
                      )}
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(mandatoryTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground">סה"כ לתשלום</p>
                    </div>
                  </div>
                </div>

                {/* Vendor Details */}
                <div className="bg-background p-3 rounded-lg border mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">ספק</span>
                  </div>
                  <p className="font-semibold">{proposal.supplier_name}</p>
                </div>

                {/* Fee Breakdown Table - Mandatory Items */}
                {proposal.fee_line_items && proposal.fee_line_items.filter(i => !i.is_optional).length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-semibold mb-2 text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      פירוט שכר טרחה
                    </h5>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-right p-2 font-medium">תיאור</th>
                            <th className="text-center p-2 font-medium">כמות</th>
                            <th className="text-left p-2 font-medium">סה"כ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proposal.fee_line_items
                            .filter(item => !item.is_optional)
                            .map((item, idx) => (
                              <tr key={idx} className="border-t">
                                <td className="p-2">{item.description}</td>
                                <td className="p-2 text-center">{item.quantity || 1}</td>
                                <td className="p-2 text-left font-medium" dir="ltr">
                                  {formatCurrency(item.total || (item.unit_price || 0) * (item.quantity || 1))}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-green-50 font-bold">
                          <tr>
                            <td colSpan={2} className="p-2 text-right">סה"כ חובה:</td>
                            <td className="p-2 text-left text-green-600" dir="ltr">
                              {formatCurrency(mandatoryTotal)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Optional Items Notice */}
                {proposal.fee_line_items && proposal.fee_line_items.filter(i => i.is_optional).length > 0 && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>פריטים אופציונליים:</strong> קיימים {proposal.fee_line_items.filter(i => i.is_optional).length} פריטים אופציונליים שאינם כלולים בסכום לעיל.
                    </p>
                  </div>
                )}

                {/* Consultant Response Section */}
                {(proposal.consultant_request_notes || (proposal.consultant_request_files && proposal.consultant_request_files.length > 0)) && (
                  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-orange-600" />
                      <span className="font-semibold text-sm text-orange-800">תגובת היועץ לבקשה</span>
                    </div>
                    {proposal.consultant_request_notes && (
                      <p className="text-sm whitespace-pre-wrap mb-2">{proposal.consultant_request_notes}</p>
                    )}
                    {proposal.consultant_request_files && proposal.consultant_request_files.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">קבצים שצורפו על ידי היועץ:</p>
                        {proposal.consultant_request_files.map((file, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm bg-background p-2 rounded border">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Files with Preview */}
                {proposal.files && proposal.files.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-semibold mb-3 text-sm text-muted-foreground">קבצים מצורפים</h5>
                    <div className="space-y-2">
                      {proposal.files.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-background p-2 rounded border"
                        >
                          <div className="flex items-center gap-2">
                            {getFileIcon(file.name)}
                            <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFilePreview(file)}
                              className="h-7 px-2"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Signature Status */}
                <div className="flex items-center gap-2 pt-4 border-t">
                  {proposal.signature_blob ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600 font-medium">ההצעה נחתמה דיגיטלית</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm text-yellow-600">ללא חתימה דיגיטלית</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">הערות (אופציונלי)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="הוסף הערות או דרישות נוספות (לא חובה)..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  ניתן להוסיף הערות או דרישות נוספות. שדה זה אינו חובה.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  ביטול
                </Button>
                <Button onClick={handleNext}>
                  <FileSignature className="w-4 h-4 ml-2" />
                  המשך לחתימה
                </Button>
              </div>
            </div>
          )}

          {step === 'signature' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>חשוב:</strong> חתימתך מאשרת את תנאי ההצעה ומחייבת אותך כלפי היועץ.
                </p>
              </div>

              {/* Authorization Checkbox - MANDATORY */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="authorization"
                    checked={authorizationAccepted}
                    onCheckedChange={(checked) => setAuthorizationAccepted(checked as boolean)}
                    className="mt-1"
                  />
                  <label
                    htmlFor="authorization"
                    className="text-sm font-medium leading-relaxed cursor-pointer flex-1"
                  >
                    אני מצהיר/ה כי אני מוסמך/ת לפעול בשם היזם/החברה לאישור ההצעה ולהתקשרות מול היועץ
                    <span className="text-red-500 mr-1">*</span>
                  </label>
                </div>
              </div>

              <SignatureCanvas
                onSign={setSignature}
                required
              />

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setStep('notes')}>
                  חזור
                </Button>
                <Button 
                  onClick={handleApprove} 
                  disabled={!signature || !authorizationAccepted || loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'מאשר...' : 'אשר הצעה'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* File Preview Modal */}
      <FilePreviewModal
        open={!!previewFile}
        onOpenChange={(open) => !open && setPreviewFile(null)}
        fileUrl={previewFile?.url || null}
        fileName={previewFile?.name || ''}
      />
    </>
  );
};
