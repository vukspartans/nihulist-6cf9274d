import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, Receipt } from 'lucide-react';
import { useProjectPayments } from '@/hooks/useProjectPayments';
import { useApprovalChain } from '@/hooks/useApprovalChain';
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

  const approvalChain = useApprovalChain();

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
    const nextStep = approvalChain.getNextStep(request.status);
    const targetStatus = nextStep?.code || 'paid';

    await updatePaymentRequestStatus(request.id, targetStatus, {
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
      <div className="space-y-6" dir="rtl">
        {/* Summary cards skeleton */}
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
        {/* Milestones skeleton */}
        <Card>
          <CardHeader className="pb-3"><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        {/* Requests skeleton */}
        <Card>
          <CardHeader className="pb-3"><Skeleton className="h-6 w-36" /></CardHeader>
          <CardContent className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Compute next step for selected request (used by ApprovePaymentDialog)
  const selectedNextStep = selectedRequest
    ? approvalChain.getNextStep(selectedRequest.status)
    : null;

  return (
    <div className="space-y-6" dir="rtl">
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

      <CashFlowChart milestones={milestones} paymentRequests={paymentRequests} />

      {milestones.some(m => m.status === 'due') && (
        <Alert className="border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
          <Receipt className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-400 text-sm">
            ישנן אבני דרך שהושלמו – ניתן להגיש חשבון עבורן.
          </AlertDescription>
        </Alert>
      )}

      <PaymentMilestoneList
        milestones={milestones}
        onCreateMilestone={handleCreateMilestone}
        onRequestPayment={handleRequestPaymentFromMilestone}
      />

      <PaymentRequestsTable
        requests={paymentRequests}
        onCreateRequest={handleCreateRequest}
        onApprove={handleApprove}
        onReject={handleReject}
        onMarkPaid={handleMarkPaid}
        onView={handleView}
        onDelete={handleDelete}
        approvalChain={approvalChain}
      />

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
        nextStepName={selectedNextStep?.name || 'מאושר'}
        requiresSignature={selectedNextStep?.requiresSignature ?? false}
        signatureType={selectedNextStep?.signatureType ?? 'none'}
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
