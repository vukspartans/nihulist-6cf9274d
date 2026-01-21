import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Filter } from 'lucide-react';
import { PaymentRequest } from '@/types/payment';
import { PaymentRequestCard } from './PaymentRequestCard';

interface PaymentRequestsTableProps {
  requests: PaymentRequest[];
  onCreateRequest: () => void;
  onApprove: (request: PaymentRequest) => void;
  onReject: (request: PaymentRequest) => void;
  onMarkPaid: (request: PaymentRequest) => void;
  onView: (request: PaymentRequest) => void;
  onDelete: (request: PaymentRequest) => void;
}

export function PaymentRequestsTable({ 
  requests, 
  onCreateRequest,
  onApprove,
  onReject,
  onMarkPaid,
  onView,
  onDelete,
}: PaymentRequestsTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRequests = requests.filter(request => {
    if (statusFilter === 'all') return true;
    return request.status === statusFilter;
  });

  const statusCounts = {
    all: requests.length,
    prepared: requests.filter(r => r.status === 'prepared').length,
    submitted: requests.filter(r => r.status === 'submitted').length,
    approved: requests.filter(r => r.status === 'approved').length,
    paid: requests.filter(r => r.status === 'paid').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  return (
    <Card dir="rtl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5" />
            בקשות תשלום
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select dir="rtl" value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger dir="rtl" className="w-[140px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל ({statusCounts.all})</SelectItem>
                  <SelectItem value="prepared">טיוטה ({statusCounts.prepared})</SelectItem>
                  <SelectItem value="submitted">הוגש ({statusCounts.submitted})</SelectItem>
                  <SelectItem value="approved">מאושר ({statusCounts.approved})</SelectItem>
                  <SelectItem value="paid">שולם ({statusCounts.paid})</SelectItem>
                  <SelectItem value="rejected">נדחה ({statusCounts.rejected})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={onCreateRequest}>
              <Plus className="w-4 h-4 ml-1" />
              בקשת תשלום
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>אין בקשות תשלום {statusFilter !== 'all' ? 'בסטטוס זה' : ''}</p>
            <p className="text-sm">צרו בקשת תשלום חדשה לניהול תזרים המזומנים</p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <PaymentRequestCard
              key={request.id}
              request={request}
              onApprove={onApprove}
              onReject={onReject}
              onMarkPaid={onMarkPaid}
              onView={onView}
              onDelete={onDelete}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
