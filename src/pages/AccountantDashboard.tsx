import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, Users, BarChart3, CheckCircle, Filter, RotateCcw, Paperclip, FlaskConical, Download, CalendarIcon, Save } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
  if (!url) return <span className="text-muted-foreground">—</span>;
  return (
    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openFileUrl(url)}>
      <Paperclip className="w-4 h-4 text-muted-foreground hover:text-primary" />
    </Button>
  );
}

// ── Date Picker Helper ─────────────────────────────────────────────
function DatePickerField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  className?: string;
}) {
  const date = value ? new Date(value + 'T00:00:00') : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-8 text-sm justify-start font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="w-3.5 h-3.5 ml-1 flex-shrink-0" />
          {date ? format(date, 'dd/MM/yyyy') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="end" dir="ltr">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? format(d, 'yyyy-MM-dd') : '')}
          initialFocus
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

// ── Urgency Badge/Selector ──────────────────────────────────────────
const URGENCY_OPTIONS = [
  { value: 'normal', label: 'רגילה', color: 'bg-muted text-muted-foreground' },
  { value: 'medium', label: 'בינונית', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'urgent', label: 'דחופה', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'immediate', label: 'מיידית', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
] as const;

function UrgencySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const current = URGENCY_OPTIONS.find(o => o.value === value) || URGENCY_OPTIONS[0];
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-7 text-xs w-[90px] p-1 flex-row text-right">
        <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', current.color)}>
          {current.label}
        </span>
      </SelectTrigger>
      <SelectContent dir="rtl">
        {URGENCY_OPTIONS.map(o => (
          <SelectItem key={o.value} value={o.value}>
            <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', o.color)}>{o.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Inline Accountant Notes ──────────────────────────────────────────
function AccountantNotesCell({ value, onSave }: { value: string | null; onSave: (v: string) => void }) {
  const [text, setText] = useState(value || '');
  const [dirty, setDirty] = useState(false);

  const handleChange = (v: string) => {
    setText(v);
    setDirty(v !== (value || ''));
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        className="h-7 text-xs min-w-[100px]"
        placeholder="הוסף הערה..."
        value={text}
        onChange={e => handleChange(e.target.value)}
        dir="rtl"
      />
      {dirty && (
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { onSave(text); setDirty(false); }}>
          <Save className="w-3.5 h-3.5 text-primary" />
        </Button>
      )}
    </div>
  );
}

// Specialty label translation helper
const SPECIALTY_LABELS: Record<string, string> = {
  architect: 'אדריכל',
  structural_engineer: 'מהנדס קונסטרוקציה',
  mep_engineer: 'מהנדס מערכות',
  project_manager: 'מנהל פרויקט',
  surveyor: 'מודד',
  safety_consultant: 'יועץ בטיחות',
  environmental_consultant: 'יועץ סביבה',
  traffic_consultant: 'יועץ תנועה',
  landscape_architect: 'אדריכל נוף',
  interior_designer: 'מעצב פנים',
  accessibility_consultant: 'יועץ נגישות',
  fire_safety_consultant: 'יועץ כיבוי אש',
  acoustics_consultant: 'יועץ אקוסטיקה',
  energy_consultant: 'יועץ אנרגיה',
  geotechnical_engineer: 'מהנדס גיאוטכני',
  real_estate_appraiser: 'שמאי מקרקעין',
  lawyer: 'עורך דין',
  tax_consultant: 'יועץ מס',
  accountant: 'רואה חשבון',
};

// ── Tab 1: Liabilities ──────────────────────────────────────────────

interface LiabilityFilters {
  project: string;
  advisor: string;
  submittedFrom: string;
  submittedTo: string;
  expectedFrom: string;
  expectedTo: string;
  amountMin: string;
  amountMax: string;
  overdueOnly: boolean;
}

const emptyFilters: LiabilityFilters = {
  project: '', advisor: '',
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
  onUpdateUrgency,
  onUpdateNotes,
  getNextStep,
}: {
  requests: AccountantRequest[];
  onUpdateDate: (id: string, date: string | null) => void;
  onMarkPaid: (id: string, paidDate?: string) => void;
  onAdvance: (id: string, statusCode: string) => void;
  onUpdateUrgency: (id: string, urgency: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
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
    const header = ['פרויקט', 'שם היועץ', 'תחום', 'תאריך הגשה', 'מס׳ חשבון', 'סכום ללא מע״מ', 'אבן דרך', 'הערות היועץ', 'סטטוס', 'דחיפות', 'הערות חשבונאי'];
    const urgencyLabels: Record<string, string> = { normal: 'רגילה', medium: 'בינונית', urgent: 'דחופה', immediate: 'מיידית' };
    const rows = filtered.map(r => [
      r.project_name,
      r.advisor_company_name || '',
      r.specialty ? (SPECIALTY_LABELS[r.specialty] || r.specialty) : '',
      r.submitted_at ? new Date(r.submitted_at).toLocaleDateString('he-IL') : '',
      r.request_number || '',
      String(r.amount),
      r.milestone_name || '',
      r.notes || '',
      r.status,
      urgencyLabels[r.urgency] || r.urgency,
      r.accountant_notes || '',
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
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')}>
            ממתין לאישור ({pendingCount})
          </Button>
          <Button variant={filter === 'approved' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('approved')}>
            מאושר ({approvedCount})
          </Button>
          <Button variant={filter === 'paid' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('paid')}>
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
          <DatePickerField
            value={bulkDate}
            onChange={setBulkDate}
            placeholder="תאריך אחיד"
            className="w-[140px]"
          />
          <Button size="sm" variant="outline" onClick={handleBulkDateApply} disabled={!bulkDate}>
            החל על הכל
          </Button>
        </div>
      )}

      {/* Advanced Filters */}
      {filtersOpen && (
        <div className="border rounded-md p-3" dir="rtl">
          <div className="flex flex-wrap items-end gap-2">
            <Select value={filters.project} onValueChange={v => setFilters(p => ({ ...p, project: v === '__all__' ? '' : v }))}>
              <SelectTrigger className="h-8 text-sm w-[140px] flex-row text-right"><SelectValue placeholder="פרויקט" /></SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="__all__">הכל</SelectItem>
                {projectOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.advisor} onValueChange={v => setFilters(p => ({ ...p, advisor: v === '__all__' ? '' : v }))}>
              <SelectTrigger className="h-8 text-sm w-[140px] flex-row text-right"><SelectValue placeholder="יועץ" /></SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="__all__">הכל</SelectItem>
                {advisorOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Input type="number" className="h-8 text-sm w-[80px]" placeholder="סכום מ-" value={filters.amountMin} onChange={e => setFilters(p => ({ ...p, amountMin: e.target.value }))} dir="rtl" />
              <span className="text-xs text-muted-foreground">–</span>
              <Input type="number" className="h-8 text-sm w-[80px]" placeholder="עד" value={filters.amountMax} onChange={e => setFilters(p => ({ ...p, amountMax: e.target.value }))} dir="rtl" />
            </div>
            <div className="flex items-center gap-1">
              <DatePickerField value={filters.submittedFrom} onChange={v => setFilters(p => ({ ...p, submittedFrom: v }))} placeholder="הגשה מ-" className="w-[130px]" />
              <span className="text-xs text-muted-foreground">–</span>
              <DatePickerField value={filters.submittedTo} onChange={v => setFilters(p => ({ ...p, submittedTo: v }))} placeholder="הגשה עד" className="w-[130px]" />
            </div>
            <div className="flex items-center gap-1">
              <DatePickerField value={filters.expectedFrom} onChange={v => setFilters(p => ({ ...p, expectedFrom: v }))} placeholder="צפוי מ-" className="w-[130px]" />
              <span className="text-xs text-muted-foreground">–</span>
              <DatePickerField value={filters.expectedTo} onChange={v => setFilters(p => ({ ...p, expectedTo: v }))} placeholder="צפוי עד" className="w-[130px]" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="overdue"
                checked={filters.overdueOnly}
                onCheckedChange={v => setFilters(p => ({ ...p, overdueOnly: !!v }))}
              />
              <Label htmlFor="overdue" className="text-sm cursor-pointer whitespace-nowrap">חריגות בלבד</Label>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={() => setFilters(emptyFilters)}>
                <RotateCcw className="w-3.5 h-3.5 ml-1" />
                נקה
              </Button>
            )}
          </div>
        </div>
      )}

      <Card>
        <div className="overflow-x-auto">
          <Table dir="rtl" className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="text-right whitespace-nowrap">פרויקט</TableHead>
                <TableHead className="text-right whitespace-nowrap">שם היועץ</TableHead>
                <TableHead className="text-right whitespace-nowrap">תחום</TableHead>
                <TableHead className="text-right whitespace-nowrap">תאריך ההגשה</TableHead>
                <TableHead className="text-right whitespace-nowrap w-[80px]">מס׳ חשבון</TableHead>
                <TableHead className="text-right whitespace-nowrap">סכום ללא מע״מ</TableHead>
                <TableHead className="text-right whitespace-nowrap">אבן דרך</TableHead>
                <TableHead className="text-right whitespace-nowrap max-w-[100px]">הערות היועץ</TableHead>
                <TableHead className="text-right whitespace-nowrap w-[60px]">ניתוח AI</TableHead>
                <TableHead className="text-right whitespace-nowrap">סטטוס</TableHead>
                <TableHead className="text-right whitespace-nowrap w-10">קבצים</TableHead>
                <TableHead className="text-right whitespace-nowrap w-[80px]">דחיפות</TableHead>
                <TableHead className="text-right whitespace-nowrap">הוסף הערות</TableHead>
                <TableHead className="text-right whitespace-nowrap">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                    אין בקשות תשלום בקטגוריה זו
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(req => {
                  const next = getNextStep(req.status);
                  const canMarkPaid = next?.code === 'paid' || req.status === 'awaiting_payment';

                  return (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium text-right whitespace-nowrap">{req.project_name}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{req.advisor_company_name || '—'}</TableCell>
                      <TableCell className="text-right">{req.specialty ? (SPECIALTY_LABELS[req.specialty] || req.specialty) : '—'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatDate(req.submitted_at)}</TableCell>
                      <TableCell className="text-right">{req.request_number || '—'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatCurrency(req.amount)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{req.milestone_name || '—'}</TableCell>
                      <TableCell className="text-right max-w-[100px] truncate" title={req.notes || undefined}>{req.notes || '—'}</TableCell>
                      <TableCell className="text-right text-muted-foreground">—</TableCell>
                      <TableCell className="text-right"><PaymentStatusBadge status={req.status} /></TableCell>
                      <TableCell className="text-right"><FileCell url={req.invoice_file_url} /></TableCell>
                      <TableCell className="text-right">
                        <UrgencySelect value={req.urgency} onChange={(v) => onUpdateUrgency(req.id, v)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <AccountantNotesCell value={req.accountant_notes} onSave={(v) => onUpdateNotes(req.id, v)} />
                      </TableCell>
                      <TableCell className="text-right">
                        {canMarkPaid ? (
                          <div className="flex items-center gap-1">
                            <DatePickerField
                              value={paidDateInputs[req.id] || ''}
                              onChange={v => setPaidDateInputs(prev => ({ ...prev, [req.id]: v }))}
                              placeholder="תאריך"
                              className="w-[100px]"
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
                          <Button size="sm" variant="outline" onClick={() => onAdvance(req.id, next.code)}>
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
    <div className="space-y-3" dir="rtl">
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
        vendorSummaries.map(vendor => (
          <Card key={vendor.advisorId}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{vendor.companyName}</CardTitle>
                <div className="flex gap-3 text-sm">
                  <span>שולם השנה: <strong>{formatCurrency(vendor.totalPaidYTD)}</strong></span>
                  <span className={vendor.totalOutstanding > 0 ? 'text-destructive' : ''}>
                    יתרת חוב: <strong>{formatCurrency(vendor.totalOutstanding)}</strong>
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table dir="rtl">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">פרויקט</TableHead>
                    <TableHead className="text-right">אבן דרך</TableHead>
                    <TableHead className="text-right">סכום</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">תאריך הגשה</TableHead>
                    <TableHead className="text-right w-10">קובץ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendor.requests.map(req => (
                    <TableRow key={req.id}>
                      <TableCell className="text-right">{req.project_name}</TableCell>
                      <TableCell className="text-right">{req.milestone_name || '—'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(req.total_amount || req.amount)}</TableCell>
                      <TableCell className="text-right"><PaymentStatusBadge status={req.status} /></TableCell>
                      <TableCell className="text-right">{formatDate(req.submitted_at)}</TableCell>
                      <TableCell className="text-right"><FileCell url={req.invoice_file_url} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ── Tab 3: Manager Summary ───────────────────────────────────────────
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
    const map = new Map<string, ProjectSummary>();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

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
        const dateStr = req.expected_payment_date || req.milestone_due_date;
        if (dateStr && dateStr.substring(0, 7) === currentMonth) {
          s.currentMonthForecast += amt;
        }
      }
    });

    // Count unique advisors per project
    const advisorsByProject = new Map<string, Set<string>>();
    requests.forEach(req => {
      if (req.project_advisor_id) {
        if (!advisorsByProject.has(req.project_id)) advisorsByProject.set(req.project_id, new Set());
        advisorsByProject.get(req.project_id)!.add(req.project_advisor_id);
      }
    });
    advisorsByProject.forEach((advisors, projectId) => {
      const s = map.get(projectId);
      if (s) s.advisorCount = advisors.size;
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
    <div className="space-y-4" dir="rtl">
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
                        <TableCell className="font-medium text-right">{s.projectName}</TableCell>
                        <TableCell className="text-right">{s.advisorCount}</TableCell>
                        <TableCell className="text-right">{s.totalRequests}</TableCell>
                        <TableCell className="text-right">
                          {s.openRequests > 0 ? (
                            <Badge variant="secondary">{s.openRequests}</Badge>
                          ) : '0'}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(s.totalPaid)}</TableCell>
                        <TableCell className={cn('text-right', s.totalOutstanding > 0 && 'text-destructive font-medium')}>
                          {formatCurrency(s.totalOutstanding)}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(s.currentMonthForecast)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold border-t-2">
                      <TableCell className="text-right">סה"כ</TableCell>
                      <TableCell className="text-right">{totals.advisorCount}</TableCell>
                      <TableCell className="text-right">{totals.totalRequests}</TableCell>
                      <TableCell className="text-right">{totals.openRequests}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totals.totalPaid)}</TableCell>
                      <TableCell className="text-destructive text-right">{formatCurrency(totals.totalOutstanding)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totals.currentMonthForecast)}</TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
  const { allRequests, vendorSummaries, loading, updateExpectedDate, updateRequestStatus, updateUrgency, updateAccountantNotes } = useAccountantData();
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
              onUpdateUrgency={updateUrgency}
              onUpdateNotes={updateAccountantNotes}
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
