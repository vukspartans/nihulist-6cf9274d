import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, Users, BarChart3, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAccountantData, AccountantRequest } from '@/hooks/useAccountantData';
import { useApprovalChain } from '@/hooks/useApprovalChain';
import { PaymentStatusBadge } from '@/components/payments/PaymentStatusBadge';
import NavigationLogo from '@/components/NavigationLogo';
import { UserHeader } from '@/components/UserHeader';
import LegalFooter from '@/components/LegalFooter';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('he-IL') : '—';

// ── Tab 1: Liabilities ──────────────────────────────────────────────
function LiabilitiesTab({
  requests,
  onUpdateDate,
  onMarkPaid,
  onAdvance,
  getNextStep,
}: {
  requests: AccountantRequest[];
  onUpdateDate: (id: string, date: string | null) => void;
  onMarkPaid: (id: string, paidDate?: string) => void;
  onAdvance: (id: string, statusCode: string) => void;
  getNextStep: ReturnType<typeof useApprovalChain>['getNextStep'];
}) {
  const [filter, setFilter] = useState<'open' | 'closed'>('open');
  const [bulkDate, setBulkDate] = useState('');
  const [paidDateInputs, setPaidDateInputs] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    if (filter === 'open') {
      return requests.filter(r => r.status !== 'paid' && r.status !== 'rejected');
    }
    return requests.filter(r => r.status === 'paid' || r.status === 'rejected');
  }, [requests, filter]);

  const handleBulkDateApply = () => {
    if (!bulkDate) return;
    filtered.forEach(req => {
      if (req.status !== 'paid' && req.status !== 'rejected') {
        onUpdateDate(req.id, bulkDate);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'open' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('open')}
          >
            פתוחות
          </Button>
          <Button
            variant={filter === 'closed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('closed')}
          >
            סגורות
          </Button>
        </div>
        {filter === 'open' && filtered.length > 0 && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="w-36 text-sm"
              value={bulkDate}
              onChange={e => setBulkDate(e.target.value)}
              placeholder="תאריך אחיד"
            />
            <Button size="sm" variant="outline" onClick={handleBulkDateApply} disabled={!bulkDate}>
              החל על הכל
            </Button>
          </div>
        )}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table dir="rtl">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">פרויקט</TableHead>
                <TableHead className="text-right">יועץ</TableHead>
                <TableHead className="text-right">חברה</TableHead>
                <TableHead className="text-right">אבן דרך</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">סכום</TableHead>
                <TableHead className="text-right">תאריך הגשה</TableHead>
                <TableHead className="text-right">תשלום צפוי</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    אין בקשות תשלום {filter === 'open' ? 'פתוחות' : 'סגורות'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(req => {
                  const next = getNextStep(req.status);
                  const canMarkPaid = next?.code === 'paid' || req.status === 'awaiting_payment';

                  return (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.project_name}</TableCell>
                      <TableCell>{req.advisor_company_name || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{req.advisor_company_name || '—'}</TableCell>
                      <TableCell>{req.milestone_name || '—'}</TableCell>
                      <TableCell><PaymentStatusBadge status={req.status} /></TableCell>
                      <TableCell>{formatCurrency(req.total_amount || req.amount)}</TableCell>
                      <TableCell>{formatDate(req.submitted_at)}</TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          className="w-36 text-sm"
                          value={req.expected_payment_date || ''}
                          onChange={e => onUpdateDate(req.id, e.target.value || null)}
                        />
                      </TableCell>
                      <TableCell>
                        {canMarkPaid ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="date"
                              className="w-32 text-xs"
                              value={paidDateInputs[req.id] || ''}
                              onChange={e => setPaidDateInputs(prev => ({ ...prev, [req.id]: e.target.value }))}
                              placeholder="תאריך תשלום"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onMarkPaid(req.id, paidDateInputs[req.id] || undefined)}
                            >
                              <CheckCircle className="w-3.5 h-3.5 ml-1" />
                              שולם
                            </Button>
                          </div>
                        ) : next ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAdvance(req.id, next.code)}
                          >
                            <CheckCircle className="w-3.5 h-3.5 ml-1" />
                            {next.name}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// ── Tab 2: Vendor Concentration ──────────────────────────────────────
function VendorConcentrationTab({
  vendorSummaries,
}: {
  vendorSummaries: ReturnType<typeof useAccountantData>['vendorSummaries'];
}) {
  return (
    <div className="space-y-3">
      {vendorSummaries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            אין נתוני ספקים להצגה
          </CardContent>
        </Card>
      ) : (
        vendorSummaries.map(v => (
          <Collapsible key={v.advisorId}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{v.companyName}</CardTitle>
                    <div className="flex items-center gap-4 text-sm">
                      <span>שולם (שנה נוכחית): {formatCurrency(v.totalPaidYTD)}</span>
                      <Badge variant={v.totalOutstanding > 0 ? 'destructive' : 'secondary'}>
                        יתרת חוב: {formatCurrency(v.totalOutstanding)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <Table dir="rtl">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">פרויקט</TableHead>
                        <TableHead className="text-right">אבן דרך</TableHead>
                        <TableHead className="text-right">סטטוס</TableHead>
                        <TableHead className="text-right">סכום</TableHead>
                        <TableHead className="text-right">תאריך</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {v.requests.map(req => (
                        <TableRow key={req.id}>
                          <TableCell>{req.project_name}</TableCell>
                          <TableCell>{req.milestone_name || '—'}</TableCell>
                          <TableCell><PaymentStatusBadge status={req.status} /></TableCell>
                          <TableCell>{formatCurrency(req.total_amount || req.amount)}</TableCell>
                          <TableCell>{formatDate(req.submitted_at || req.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))
      )}
    </div>
  );
}

// ── Tab 3: Global Cash Flow ──────────────────────────────────────────
function GlobalCashFlowTab({ requests }: { requests: AccountantRequest[] }) {
  const chartData = useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const monthMap = new Map<string, number>(months.map(m => [m, 0]));

    // Only non-terminal, non-rejected requests
    requests
      .filter(r => r.status !== 'paid' && r.status !== 'rejected')
      .forEach(r => {
        const dateStr = r.expected_payment_date || r.milestone_due_date;
        if (!dateStr) return;
        const key = dateStr.substring(0, 7);
        if (monthMap.has(key)) {
          monthMap.set(key, (monthMap.get(key) || 0) + (r.total_amount || r.amount));
        }
      });

    const heMonths = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
    return months.map(m => {
      const [y, mo] = m.split('-');
      return {
        month: `${heMonths[parseInt(mo, 10) - 1]} ${y.slice(2)}`,
        amount: monthMap.get(m) || 0,
      };
    });
  }, [requests]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            תזרים יציאות צפוי – 6 חודשים קרובים
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.every(d => d.amount === 0) ? (
            <p className="text-center py-8 text-muted-foreground">אין תשלומים צפויים בחצי השנה הקרובה</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₪${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), 'יציאות צפויות']} />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────
export default function AccountantDashboard() {
  const navigate = useNavigate();
  const { allRequests, vendorSummaries, loading, updateExpectedDate, updateRequestStatus } = useAccountantData();
  const { getNextStep } = useApprovalChain();

  const handleMarkPaid = (requestId: string, paidDate?: string) => {
    const additionalData = paidDate ? { paid_at: new Date(paidDate).toISOString() } : undefined;
    updateRequestStatus(requestId, 'paid', additionalData);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">טוען נתונים פיננסיים...</p>
        </div>
      </div>
    );
  }

  const totalOutstanding = allRequests
    .filter(r => r.status !== 'paid' && r.status !== 'rejected')
    .reduce((sum, r) => sum + (r.total_amount || r.amount), 0);

  const totalPaid = allRequests
    .filter(r => r.status === 'paid')
    .reduce((sum, r) => sum + (r.total_amount || r.amount), 0);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background p-3 md:p-6 border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <NavigationLogo size="sm" className="flex-shrink-0" />
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowRight className="w-4 h-4 ml-1" />
              חזרה ללוח הבקרה
            </Button>
          </div>
          <UserHeader />
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <h1 className="text-2xl font-bold mb-1">מרכז פיננסי</h1>
        <p className="text-muted-foreground mb-6">ניהול התחייבויות, ספקים ותזרים מזומנים</p>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-sm text-muted-foreground">סה"כ חוב פתוח</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalOutstanding)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-sm text-muted-foreground">שולם</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalPaid)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-sm text-muted-foreground">ספקים פעילים</p>
              <p className="text-2xl font-bold">{vendorSummaries.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="liabilities" dir="rtl">
          <TabsList className="mb-4">
            <TabsTrigger value="liabilities" className="gap-1.5">
              <FileText className="w-4 h-4" />
              התחייבויות
            </TabsTrigger>
            <TabsTrigger value="vendors" className="gap-1.5">
              <Users className="w-4 h-4" />
              ריכוז ספקים
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="gap-1.5">
              <BarChart3 className="w-4 h-4" />
              תזרים גלובלי
            </TabsTrigger>
          </TabsList>

          <TabsContent value="liabilities">
            <LiabilitiesTab
              requests={allRequests}
              onUpdateDate={updateExpectedDate}
              onMarkPaid={handleMarkPaid}
              onAdvance={(id, code) => updateRequestStatus(id, code)}
              getNextStep={getNextStep}
            />
          </TabsContent>

          <TabsContent value="vendors">
            <VendorConcentrationTab vendorSummaries={vendorSummaries} />
          </TabsContent>

          <TabsContent value="cashflow">
            <GlobalCashFlowTab requests={allRequests} />
          </TabsContent>
        </Tabs>
      </div>

      <LegalFooter />
    </div>
  );
}
