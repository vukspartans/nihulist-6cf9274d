import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, Loader2, Receipt } from 'lucide-react';
import { useProjectPayments } from '@/hooks/useProjectPayments';
import { PaymentMilestone, PaymentRequest } from '@/types/payment';
import { PaymentSummaryCards } from './PaymentSummaryCards';
import { PaymentMilestoneList } from './PaymentMilestoneList';
import { PaymentRequestsTable } from './PaymentRequestsTable';
import { CreateMilestoneDialog } from './CreateMilestoneDialog';
import { CreatePaymentRequestDialog } from './CreatePaymentRequestDialog';
import { ApprovePaymentDialog } from './ApprovePaymentDialog';
import { RejectPaymentDialog } from './RejectPaymentDialog';
import { PaymentRequestDetailDialog } from './PaymentRequestDetailDialog';
import { CashFlowChart } from './CashFlowChart';
import { useAuth } from '@/hooks/useAuth';

interface PaymentDashboardProps {
  projectId: string;
}

export function PaymentDashboard({ projectId }: PaymentDashboardProps) {
  const { user } = useAuth();
  const {
    milestones,
    paymentRequests,
    summary,
    loading,
    createMilestone,
    createPaymentRequest,
    updatePaymentRequestStatus,
    deletePaymentRequest,
    updateMilestoneStatus,
  } = useProjectPayments(projectId);

  // Dialog states
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // Selected items
  const [selectedMilestone, setSelectedMilestone] = useState<PaymentMilestone | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);

  const handleCreateMilestone = () => {
    setMilestoneDialogOpen(true);
  };

  const handleCreateRequest = () => {
    setSelectedMilestone(null);
    setRequestDialogOpen(true);
  };

  const handleRequestPaymentFromMilestone = (milestone: PaymentMilestone) => {
    setSelectedMilestone(milestone);
    setRequestDialogOpen(true);
  };

  const handleApprove = (request: PaymentRequest) => {
    setSelectedRequest(request);
    setApproveDialogOpen(true);
  };

  const handleReject = (request: PaymentRequest) => {
    setSelectedRequest(request);
    setRejectDialogOpen(true);
  };

  const handleMarkPaid = async (request: PaymentRequest) => {
    await updatePaymentRequestStatus(request.id, 'paid');
    // Also update milestone if linked
    if (request.payment_milestone_id) {
      await updateMilestoneStatus(request.payment_milestone_id, 'paid');
    }
  };

  const handleView = (request: PaymentRequest) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const handleDelete = async (request: PaymentRequest) => {
    if (confirm('האם אתה בטוח שברצונך למחוק את בקשת התשלום?')) {
      await deletePaymentRequest(request.id);
    }
  };

  const handleApproveSubmit = async (request: PaymentRequest, signatureId?: string) => {
    await updatePaymentRequestStatus(request.id, 'approved', {
      approved_by: user?.id,
      approver_signature_id: signatureId,
    });
  };

  const handleRejectSubmit = async (request: PaymentRequest, reason: string) => {
    await updatePaymentRequestStatus(request.id, 'rejected', {
      rejected_by: user?.id,
      rejection_reason: reason,
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Wallet className="w-6 h-6" />
            ניהול תשלומים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentSummaryCards summary={summary} />
        </CardContent>
      </Card>

      {/* Cash Flow Chart */}
      <CashFlowChart milestones={milestones} paymentRequests={paymentRequests} />

      {/* Invoice-ready milestones alert */}
      {milestones.some(m => m.status === 'due') && (
        <Alert className="border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
          <Receipt className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-400 text-sm">
            ישנן אבני דרך שהושלמו – ניתן להגיש חשבון עבורן.
          </AlertDescription>
        </Alert>
      )}

      {/* Milestones */}
      <PaymentMilestoneList
        milestones={milestones}
        onCreateMilestone={handleCreateMilestone}
        onRequestPayment={handleRequestPaymentFromMilestone}
      />

      {/* Payment Requests */}
      <PaymentRequestsTable
        requests={paymentRequests}
        onCreateRequest={handleCreateRequest}
        onApprove={handleApprove}
        onReject={handleReject}
        onMarkPaid={handleMarkPaid}
        onView={handleView}
        onDelete={handleDelete}
      />

      {/* Dialogs */}
      <CreateMilestoneDialog
        open={milestoneDialogOpen}
        onOpenChange={setMilestoneDialogOpen}
        projectId={projectId}
        onSubmit={createMilestone}
      />

      <CreatePaymentRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        projectId={projectId}
        milestones={milestones}
        preselectedMilestone={selectedMilestone}
        onSubmit={createPaymentRequest}
      />

      <ApprovePaymentDialog
        open={approveDialogOpen}
        onOpenChange={setApproveDialogOpen}
        request={selectedRequest}
        onApprove={handleApproveSubmit}
      />

      <RejectPaymentDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        request={selectedRequest}
        onReject={handleRejectSubmit}
      />

      <PaymentRequestDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        request={selectedRequest}
      />
    </div>
  );
}
