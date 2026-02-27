import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, Users, BarChart3, CheckCircle, Filter, RotateCcw, Paperclip, FlaskConical, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAccountantData, AccountantRequest } from '@/hooks/useAccountantData';
import { supabase } from '@/integrations/supabase/client';
import { useApprovalChain } from '@/hooks/useApprovalChain';
import { PaymentStatusBadge } from '@/components/payments/PaymentStatusBadge';
import NavigationLogo from '@/components/NavigationLogo';
import { UserHeader } from '@/components/UserHeader';
import LegalFooter from '@/components/LegalFooter';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('he-IL') : '—';

async function openFileUrl(filePath: string) {
  const { data } = await supabase.storage
    .from('payment-files')
    .createSignedUrl(filePath, 300);
  if (data?.signedUrl) window.open(data.signedUrl, '_blank');
}

function FileCell({ url }: { url: string | null }) {
  if (!url) return <span />;
  return (
    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openFileUrl(url)}>
      <Paperclip className="w-4 h-4 text-muted-foreground hover:text-primary" />
    </Button>
  );
}

// ── Tab 1: Liabilities ──────────────────────────────────────────────

interface LiabilityFilters {
  project: string;
  advisor: string;
  status: string;
  submittedFrom: string;
  submittedTo: string;
  expectedFrom: string;
  expectedTo: string;
  amountMin: string;
  amountMax: string;
  overdueOnly: boolean;
}

const emptyFilters: LiabilityFilters = {
  project: '', advisor: '', status: '',
  submittedFrom: '', submittedTo: '',
  expectedFrom: '', expectedTo: '',
  amountMin: '', amountMax: '',
  overdueOnly: false,
};

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
  const PENDING_STATUSES = ['submitted', 'in_accounting', 'professionally_approved'];
  const APPROVED_STATUSES = ['budget_approved', 'awaiting_payment'];
  const [filter, setFilter] = useState<'pending' | 'approved' | 'paid'>('pending');
  const [bulkDate, setBulkDate] = useState('');
  const [paidDateInputs, setPaidDateInputs] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<LiabilityFilters>(emptyFilters);

  // Derive unique values for dropdowns
  const projectOptions = useMemo(() =>
    [...new Set(requests.map(r => r.project_name).filter(Boolean))].sort(),
    [requests]
  );
  const advisorOptions = useMemo(() =>
    [...new Set(requests.map(r => r.advisor_company_name).filter(Boolean) as string[])].sort(),
    [requests]
  );
  const statusOptions = useMemo(() =>
    [...new Set(requests.map(r => r.status))].sort(),
    [requests]
  );

  const filtered = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let list = requests;

    // Status group toggle
    if (filter === 'pending') {
      list = list.filter(r => PENDING_STATUSES.includes(r.status));
    } else if (filter === 'approved') {
      list = list.filter(r => APPROVED_STATUSES.includes(r.status));
    } else if (filter === 'paid') {
      list = list.filter(r => r.status === 'paid');
    }

    // Advanced filters
    if (filters.project) list = list.filter(r => r.project_name === filters.project);
    if (filters.advisor) list = list.filter(r => r.advisor_company_name === filters.advisor);
    if (filters.status) list = list.filter(r => r.status === filters.status);
    if (filters.submittedFrom) list = list.filter(r => r.submitted_at && r.submitted_at >= filters.submittedFrom);
    if (filters.submittedTo) list = list.filter(r => r.submitted_at && r.submitted_at <= filters.submittedTo + 'T23:59:59');
    if (filters.expectedFrom) list = list.filter(r => r.expected_payment_date && r.expected_payment_date >= filters.expectedFrom);
    if (filters.expectedTo) list = list.filter(r => r.expected_payment_date && r.expected_payment_date <= filters.expectedTo);
    if (filters.amountMin) list = list.filter(r => (r.total_amount || r.amount) >= parseFloat(filters.amountMin));
    if (filters.amountMax) list = list.filter(r => (r.total_amount || r.amount) <= parseFloat(filters.amountMax));
    if (filters.overdueOnly) list = list.filter(r => r.expected_payment_date && r.expected_payment_date < today && r.status !== 'paid');

    return list;
  }, [requests, filter, filters]);

  const hasActiveFilters = Object.entries(filters).some(([k, v]) => k === 'overdueOnly' ? v : !!v);

  // Counts for buttons
  const pendingCount = requests.filter(r => PENDING_STATUSES.includes(r.status)).length;
  const approvedCount = requests.filter(r => APPROVED_STATUSES.includes(r.status)).length;
  const paidCount = requests.filter(r => r.status === 'paid').length;

  const exportCSV = useCallback(() => {
    const header = ['פרויקט', 'יועץ', 'אבן דרך', 'סטטוס', 'סכום', 'תאריך הגשה', 'תשלום צפוי'];
    const rows = filtered.map(r => [
      r.project_name,
      r.advisor_company_name || '',
      r.milestone_name || '',
      r.status,
      String(r.total_amount || r.amount),
      r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('he-IL') : '',
      r.expected_payment_date || '',
    ]);
    const bom = '\uFEFF';
    const csv = bom + [header, ...rows].map(row => row.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `התחייבויות_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

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
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            ממתין לאישור ({pendingCount})
          </Button>
          <Button
            variant={filter === 'approved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('approved')}
          >
            מאושר ({approvedCount})
          </Button>
          <Button
            variant={filter === 'paid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('paid')}
          >
            שולם ({paidCount})
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={filtersOpen || hasActiveFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter className="w-3.5 h-3.5 ml-1" />
            סינון
            {hasActiveFilters && <span className="mr-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5">!</span>}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5 ml-1" />
            ייצוא
          </Button>
        </div>
      </div>
      {filter === 'pending' && filtered.length > 0 && (
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

      {/* Advanced Filters */}
      {filtersOpen && (
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">פרויקט</Label>
              <Select value={filters.project} onValueChange={v => setFilters(p => ({ ...p, project: v === '__all__' ? '' : v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="הכל" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">הכל</SelectItem>
                  {projectOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">יועץ</Label>
              <Select value={filters.advisor} onValueChange={v => setFilters(p => ({ ...p, advisor: v === '__all__' ? '' : v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="הכל" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">הכל</SelectItem>
                  {advisorOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">סכום (טווח)</Label>
              <div className="flex gap-1">
                <Input type="number" className="h-8 text-sm" placeholder="מ-" value={filters.amountMin} onChange={e => setFilters(p => ({ ...p, amountMin: e.target.value }))} />
                <Input type="number" className="h-8 text-sm" placeholder="עד" value={filters.amountMax} onChange={e => setFilters(p => ({ ...p, amountMax: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">תאריך הגשה</Label>
              <div className="flex gap-1">
                <Input type="date" className="h-8 text-sm" value={filters.submittedFrom} onChange={e => setFilters(p => ({ ...p, submittedFrom: e.target.value }))} />
                <Input type="date" className="h-8 text-sm" value={filters.submittedTo} onChange={e => setFilters(p => ({ ...p, submittedTo: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">תשלום צפוי</Label>
              <div className="flex gap-1">
                <Input type="date" className="h-8 text-sm" value={filters.expectedFrom} onChange={e => setFilters(p => ({ ...p, expectedFrom: e.target.value }))} />
                <Input type="date" className="h-8 text-sm" value={filters.expectedTo} onChange={e => setFilters(p => ({ ...p, expectedTo: e.target.value }))} />
              </div>
            </div>
            <div className="flex items-end gap-2 col-span-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="overdue"
                  checked={filters.overdueOnly}
                  onCheckedChange={v => setFilters(p => ({ ...p, overdueOnly: !!v }))}
                />
                <Label htmlFor="overdue" className="text-sm cursor-pointer">חריגות בלבד</Label>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={() => setFilters(emptyFilters)} className="mr-auto">
                  <RotateCcw className="w-3.5 h-3.5 ml-1" />
                  נקה סינון
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <Table dir="rtl" className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">פרויקט</TableHead>
                <TableHead className="text-right">יועץ</TableHead>
                <TableHead className="text-right">אבן דרך</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">סכום</TableHead>
                <TableHead className="text-right">תאריך הגשה</TableHead>
                <TableHead className="text-right">תשלום צפוי</TableHead>
                <TableHead className="text-right w-10">קובץ</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    אין בקשות תשלום בקטגוריה זו
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
                      <TableCell><FileCell url={req.invoice_file_url} /></TableCell>
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
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-muted">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-muted-foreground">אין נתוני ספקים להצגה</p>
                <p className="text-sm text-muted-foreground/70 mt-1">נתונים יופיעו כאשר יוגשו בקשות תשלום מיועצים</p>
              </div>
            </div>
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
                        <TableHead className="text-right w-10">קובץ</TableHead>
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
                          <TableCell><FileCell url={req.invoice_file_url} /></TableCell>
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

// ── Tab 3: Manager Summary (per-project) ─────────────────────────────
interface ProjectSummary {
  projectId: string;
  projectName: string;
  advisorCount: number;
  totalRequests: number;
  openRequests: number;
  totalPaid: number;
  totalOutstanding: number;
  currentMonthForecast: number;
}

function ManagerSummaryTab({ requests }: { requests: AccountantRequest[] }) {
  const projectSummaries = useMemo(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const map = new Map<string, ProjectSummary>();

    requests.forEach(req => {
      if (!map.has(req.project_id)) {
        map.set(req.project_id, {
          projectId: req.project_id,
          projectName: req.project_name,
          advisorCount: 0,
          totalRequests: 0,
          openRequests: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          currentMonthForecast: 0,
        });
      }
      const s = map.get(req.project_id)!;
      s.totalRequests++;
      const amt = req.total_amount || req.amount;

      if (req.status === 'paid') {
        s.totalPaid += amt;
      } else if (req.status !== 'rejected') {
        s.openRequests++;
        s.totalOutstanding += amt;
        const epd = req.expected_payment_date;
        if (epd && epd.substring(0, 7) === currentMonth) {
          s.currentMonthForecast += amt;
        }
      }
    });

    // Count distinct advisors per project
    const advisorSets = new Map<string, Set<string>>();
    requests.forEach(req => {
      if (!req.project_advisor_id) return;
      if (!advisorSets.has(req.project_id)) advisorSets.set(req.project_id, new Set());
      advisorSets.get(req.project_id)!.add(req.project_advisor_id);
    });
    advisorSets.forEach((set, pid) => {
      const s = map.get(pid);
      if (s) s.advisorCount = set.size;
    });

    return Array.from(map.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  }, [requests]);

  const totals = useMemo(() => projectSummaries.reduce(
    (t, s) => ({
      advisorCount: t.advisorCount + s.advisorCount,
      totalRequests: t.totalRequests + s.totalRequests,
      openRequests: t.openRequests + s.openRequests,
      totalPaid: t.totalPaid + s.totalPaid,
      totalOutstanding: t.totalOutstanding + s.totalOutstanding,
      currentMonthForecast: t.currentMonthForecast + s.currentMonthForecast,
    }),
    { advisorCount: 0, totalRequests: 0, openRequests: 0, totalPaid: 0, totalOutstanding: 0, currentMonthForecast: 0 }
  ), [projectSummaries]);

  // Keep the existing 6-month chart data
  const chartData = useMemo(() => {
    const now = new Date();
    const months: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const monthMap = new Map<string, number>(months.map(m => [m, 0]));
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
      return { month: `${heMonths[parseInt(mo, 10) - 1]} ${y.slice(2)}`, amount: monthMap.get(m) || 0 };
    });
  }, [requests]);

  return (
    <div className="space-y-4">
      {/* Per-project summary table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">סיכום לפי פרויקט</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table dir="rtl">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">פרויקט</TableHead>
                  <TableHead className="text-right">יועצים</TableHead>
                  <TableHead className="text-right">סה"כ חשבונות</TableHead>
                  <TableHead className="text-right">פתוחים</TableHead>
                  <TableHead className="text-right">שולם</TableHead>
                  <TableHead className="text-right">יתרת חוב</TableHead>
                  <TableHead className="text-right">צפי חודש נוכחי</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectSummaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 rounded-full bg-muted">
                          <BarChart3 className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">אין נתונים להצגה</p>
                          <p className="text-sm text-muted-foreground/70 mt-1">נתוני סיכום יופיעו כאשר יהיו בקשות תשלום בפרויקטים שלך</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {projectSummaries.map(s => (
                      <TableRow key={s.projectId}>
                        <TableCell className="font-medium">{s.projectName}</TableCell>
                        <TableCell>{s.advisorCount}</TableCell>
                        <TableCell>{s.totalRequests}</TableCell>
                        <TableCell>
                          {s.openRequests > 0 ? (
                            <Badge variant="secondary">{s.openRequests}</Badge>
                          ) : '0'}
                        </TableCell>
                        <TableCell>{formatCurrency(s.totalPaid)}</TableCell>
                        <TableCell className={s.totalOutstanding > 0 ? 'text-destructive font-medium' : ''}>
                          {formatCurrency(s.totalOutstanding)}
                        </TableCell>
                        <TableCell>{formatCurrency(s.currentMonthForecast)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="bg-muted/50 font-bold border-t-2">
                      <TableCell>סה"כ</TableCell>
                      <TableCell>{totals.advisorCount}</TableCell>
                      <TableCell>{totals.totalRequests}</TableCell>
                      <TableCell>{totals.openRequests}</TableCell>
                      <TableCell>{formatCurrency(totals.totalPaid)}</TableCell>
                      <TableCell className="text-destructive">{formatCurrency(totals.totalOutstanding)}</TableCell>
                      <TableCell>{formatCurrency(totals.currentMonthForecast)}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Existing 6-month forecast chart */}
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
  const { getNextStep, isLoading: approvalChainLoading } = useApprovalChain();

  const handleMarkPaid = (requestId: string, paidDate?: string) => {
    const additionalData = paidDate ? { paid_at: new Date(paidDate).toISOString() } : undefined;
    updateRequestStatus(requestId, 'paid', additionalData);
  };

  if (loading || approvalChainLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="sticky top-0 z-50 bg-background px-3 py-2 md:px-6 md:py-2 border-b">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <NavigationLogo size="lg" className="flex-shrink-0" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-5 w-72 mb-6" />
          <Skeleton className="h-10 w-80 mb-4" />
          <Card>
            <CardContent className="p-0">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background px-3 py-2 md:px-6 md:py-2 border-b">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <NavigationLogo size="lg" className="flex-shrink-0" />
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

        <Alert variant="warning" className="mb-4 border-amber-300 bg-amber-50">
          <FlaskConical className="h-4 w-4" />
          <AlertDescription>פיצ'ר זה נמצא בגרסת אלפא — ייתכנו שינויים ושיפורים</AlertDescription>
        </Alert>

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
            <TabsTrigger value="manager" className="gap-1.5">
              <BarChart3 className="w-4 h-4" />
              ריכוז מנהלים
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

          <TabsContent value="manager">
            <ManagerSummaryTab requests={allRequests} />
          </TabsContent>
        </Tabs>
      </div>

      <LegalFooter />
    </div>
  );
}
