import { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRouteForRole } from '@/lib/roleNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { UserHeader } from '@/components/UserHeader';
import { CheckCircle, AlertCircle, Edit3, Upload, CalendarIcon, Send, ArrowRight, FileText, Receipt, Wallet, PenTool, FileDown, Milestone, ListChecks } from 'lucide-react';
import NavigationLogo from '@/components/NavigationLogo';
import BackToTop from '@/components/BackToTop';
import { FileUpload } from '@/components/FileUpload';
import { ConditionsBuilder } from '@/components/ConditionsBuilder';
import { useProposalSubmit } from '@/hooks/useProposalSubmit';
import { reportableError, formatSupabaseError } from '@/utils/errorReporting';
import { ProposalProgressStepper } from '@/components/ProposalProgressStepper';
import { ConfirmProposalDialog } from '@/components/ConfirmProposalDialog';
import { ConsultantFeeTable, ConsultantFeeRow } from '@/components/proposal/ConsultantFeeTable';
import { ConsultantPaymentTerms, ConsultantMilestone } from '@/components/proposal/ConsultantPaymentTerms';
import { ConsultantServicesSelection } from '@/components/proposal/ConsultantServicesSelection';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { PROPOSAL_VALIDATION } from '@/utils/constants';
import { useQueryClient } from '@tanstack/react-query';
import type { RFPFeeItem, PaymentTerms, ServiceScopeItem, UploadedFileMetadata } from '@/types/rfpRequest';

// Lazy load heavy components
const SignatureCanvas = lazy(() => import('@/components/SignatureCanvas').then(module => ({
  default: module.SignatureCanvas
})));

interface RFPDetails {
  id: string;
  subject: string;
  body_html: string;
  projects: {
    id: string;
    name: string;
    type: string;
    location: string;
    budget: number;
    timeline_start: string;
    timeline_end: string;
    description: string;
  };
}

interface AdvisorProfile {
  id: string;
  company_name: string;
}

interface EntrepreneurRequestData {
  request_title: string | null;
  request_content: string | null;
  request_files: UploadedFileMetadata[];
  service_details_mode: 'free_text' | 'file' | 'checklist';
  service_details_text: string | null;
  service_details_file: UploadedFileMetadata | null;
  payment_terms: PaymentTerms | null;
  fee_items: RFPFeeItem[];
  service_scope_items: ServiceScopeItem[];
}

const SubmitProposal = () => {
  const { rfp_id, invite_id } = useParams();
  const navigate = useNavigate();
  const { user, primaryRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [rfpDetails, setRfpDetails] = useState<RFPDetails | null>(null);
  const [advisorProfile, setAdvisorProfile] = useState<AdvisorProfile | null>(null);
  const [currentInviteId, setCurrentInviteId] = useState<string | null>(null);
  const [existingProposal, setExistingProposal] = useState<{ id: string; status: string } | null>(null);
  
  // Entrepreneur request data
  const [entrepreneurData, setEntrepreneurData] = useState<EntrepreneurRequestData | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('request');
  
  // Form state - original
  const [price, setPrice] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [completionDate, setCompletionDate] = useState<Date>();
  const [timelineDays, setTimelineDays] = useState('');
  const [scopeText, setScopeText] = useState('');
  const [conditions, setConditions] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<any[]>([]);
  const [signature, setSignature] = useState<any>(null);
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fee table state
  const [consultantPrices, setConsultantPrices] = useState<Record<string, number | null>>({});
  const [additionalFeeItems, setAdditionalFeeItems] = useState<ConsultantFeeRow[]>([]);
  const [rowComments, setRowComments] = useState<Record<string, string>>({});
  const [feeErrors, setFeeErrors] = useState<Record<string, string>>({});

  // Services selection state
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [servicesNotes, setServicesNotes] = useState('');

  // Payment terms / milestones state
  const [consultantMilestones, setConsultantMilestones] = useState<ConsultantMilestone[]>([]);

  // Phase 3.5: Consultant response to request
  const [consultantRequestNotes, setConsultantRequestNotes] = useState('');
  const [consultantRequestFiles, setConsultantRequestFiles] = useState<any[]>([]);

  // Format price with thousand separators
  const formatPrice = (value: string): string => {
    const num = parseFloat(value.replace(/[^\d]/g, ''));
    if (isNaN(num) || num === 0) return '';
    return num.toLocaleString('he-IL');
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^\d]/g, '');
    setPrice(rawValue);
    setPriceDisplay(formatPrice(rawValue));
  };

  const handleDateSelect = (date: Date | undefined) => {
    setCompletionDate(date);
    if (date) {
      const days = differenceInDays(date, new Date());
      setTimelineDays(Math.max(1, days).toString());
    } else {
      setTimelineDays('');
    }
  };

  // Fee table handlers
  const handleFeeItemPriceChange = useCallback((itemId: string, price: number | null) => {
    setConsultantPrices(prev => ({ ...prev, [itemId]: price }));
  }, []);

  const handleAddFeeItem = useCallback(() => {
    const newItem: ConsultantFeeRow = {
      item_number: (entrepreneurData?.fee_items.length || 0) + additionalFeeItems.length + 1,
      description: '',
      unit: 'lump_sum',
      quantity: 1,
      charge_type: 'one_time',
      is_optional: false,
      display_order: additionalFeeItems.length,
      consultant_unit_price: null,
      consultant_comment: '',
      is_entrepreneur_defined: false,
    };
    setAdditionalFeeItems(prev => [...prev, newItem]);
  }, [entrepreneurData, additionalFeeItems.length]);

  const handleRemoveFeeItem = useCallback((index: number) => {
    setAdditionalFeeItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleUpdateAdditionalItem = useCallback((index: number, field: keyof ConsultantFeeRow, value: any) => {
    setAdditionalFeeItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  }, []);

  const handleRowCommentChange = useCallback((itemId: string, comment: string) => {
    setRowComments(prev => ({ ...prev, [itemId]: comment }));
  }, []);

  // Calculate total from fee items
  const calculateTotalFromFees = useCallback(() => {
    const entrepreneurTotal = (entrepreneurData?.fee_items || []).reduce((sum, item) => {
      const price = consultantPrices[item.id || ''] ?? 0;
      const qty = item.quantity || 1;
      return sum + (price * qty);
    }, 0);

    const additionalTotal = additionalFeeItems.reduce((sum, item) => {
      const price = item.consultant_unit_price ?? 0;
      const qty = item.quantity || 1;
      return sum + (price * qty);
    }, 0);

    return entrepreneurTotal + additionalTotal;
  }, [entrepreneurData, consultantPrices, additionalFeeItems]);

  // Sync price from fees when fee items change
  useEffect(() => {
    if (entrepreneurData?.fee_items && entrepreneurData.fee_items.length > 0) {
      const total = calculateTotalFromFees();
      if (total > 0) {
        setPrice(total.toString());
        setPriceDisplay(total.toLocaleString('he-IL'));
      }
    }
  }, [entrepreneurData, consultantPrices, additionalFeeItems, calculateTotalFromFees]);

  // Initialize milestones from entrepreneur data
  useEffect(() => {
    if (entrepreneurData?.payment_terms?.milestone_payments && consultantMilestones.length === 0) {
      const milestones: ConsultantMilestone[] = entrepreneurData.payment_terms.milestone_payments.map((m, i) => ({
        id: `ent-milestone-${i}`,
        description: m.description,
        entrepreneur_percentage: m.percentage,
        consultant_percentage: m.percentage,
        trigger: m.trigger,
        is_entrepreneur_defined: true,
      }));
      setConsultantMilestones(milestones);
    }
  }, [entrepreneurData]);

  // Initialize selected services from entrepreneur data
  useEffect(() => {
    if (entrepreneurData?.service_scope_items && selectedServices.length === 0) {
      const initialSelected = entrepreneurData.service_scope_items
        .filter(item => item.is_included && item.id)
        .map(item => item.id!);
      setSelectedServices(initialSelected);
    }
  }, [entrepreneurData]);

  // Validate fee items
  const validateFeeItems = useCallback(() => {
    const errors: Record<string, string> = {};
    
    (entrepreneurData?.fee_items || []).forEach((item, index) => {
      const itemId = item.id || `ent-${index}`;
      const price = consultantPrices[itemId];
      const comment = rowComments[itemId]?.trim();
      
      if ((price === null || price === undefined) && !comment) {
        errors[itemId] = `פריט "${item.description}" - יש להזין מחיר או הערה`;
      }
    });
    
    setFeeErrors(errors);
    return Object.keys(errors).length === 0;
  }, [entrepreneurData, consultantPrices, rowComments]);

  const { submitProposal, loading: submitting } = useProposalSubmit();

  // Determine which tabs are available based on entrepreneur data
  const hasFeeItems = (entrepreneurData?.fee_items?.length || 0) > 0;
  const hasPaymentTerms = entrepreneurData?.payment_terms && 
    (entrepreneurData.payment_terms.advance_percent || 
     (entrepreneurData.payment_terms.milestone_payments?.length || 0) > 0);
  const hasServiceScope = (entrepreneurData?.service_scope_items?.length || 0) > 0 ||
    entrepreneurData?.service_details_mode !== 'free_text' ||
    entrepreneurData?.service_details_text;
  const hasRequestContent = entrepreneurData?.request_content || (entrepreneurData?.request_files?.length || 0) > 0;

  const steps = [
    { id: 1, title: 'פרטי הבקשה', completed: true },
    { id: 2, title: hasFeeItems ? 'שכר טרחה' : 'מחיר ולו"ז', completed: hasFeeItems ? Object.keys(consultantPrices).length > 0 : !!(price && timelineDays) },
    { id: 3, title: 'היקף העבודה', completed: scopeText.length >= 20 },
    { id: 4, title: 'קבצים מצורפים', completed: files.length > 0 },
    { id: 5, title: 'חתימה דיגיטלית', completed: !!signature },
    { id: 6, title: 'אישור והגשה', completed: declarationAccepted },
  ];

  useEffect(() => {
    if (user && (rfp_id || invite_id)) {
      fetchData();
    }
  }, [user, rfp_id, invite_id]);

  const fetchData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        toast({
          title: "שגיאה",
          description: "לא נמצא משתמש מחובר",
          variant: "destructive",
        });
        navigate(getDashboardRouteForRole(primaryRole));
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== authUser.id) {
        setTimeout(fetchData, 500);
        return;
      }

      const { data: advisor, error: advisorError } = await supabase
        .from('advisors')
        .select('id, company_name')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (advisorError || !advisor) {
        toast({
          title: "שגיאה",
          description: advisorError ? formatSupabaseError(advisorError) : "לא נמצא פרופיל יועץ",
          variant: "destructive",
        });
        navigate(getDashboardRouteForRole(primaryRole));
        return;
      }

      setAdvisorProfile(advisor);

      let inviteDetails = null;

      if (invite_id) {
        const { data: invite, error: inviteError } = await supabase
          .from('rfp_invites')
          .select(`*, rfps!inner (*, projects!inner (*))`)
          .eq('id', invite_id)
          .eq('advisor_id', advisor.id)
          .maybeSingle();

        if (inviteError) {
          console.error('[SubmitProposal] Invite fetch error:', inviteError);
          toast({
            title: "שגיאה",
            description: formatSupabaseError(inviteError),
            variant: "destructive",
          });
          navigate(getDashboardRouteForRole(primaryRole));
          return;
        }
        if (!invite) {
          toast({ title: "שגיאה", description: "לא נמצאה הזמנה תקפה", variant: "destructive" });
          navigate(getDashboardRouteForRole(primaryRole));
          return;
        }
        inviteDetails = invite;
        setCurrentInviteId(invite.id);
      } else if (rfp_id) {
        const { data: invite, error: inviteError } = await supabase
          .from('rfp_invites')
          .select(`*, rfps!inner (*, projects!inner (*))`)
          .eq('rfp_id', rfp_id)
          .eq('advisor_id', advisor.id)
          .maybeSingle();

        if (inviteError) {
          console.error('[SubmitProposal] Invite fetch error (via rfp_id):', inviteError);
          toast({
            title: "שגיאה",
            description: formatSupabaseError(inviteError),
            variant: "destructive",
          });
          navigate(getDashboardRouteForRole(primaryRole));
          return;
        }
        if (!invite) {
          toast({ title: "שגיאה", description: "לא נמצאה הזמנה תקפה לפרויקט זה", variant: "destructive" });
          navigate(getDashboardRouteForRole(primaryRole));
          return;
        }
        inviteDetails = invite;
        setCurrentInviteId(invite.id);
      }

      if (['declined', 'expired', 'submitted'].includes(inviteDetails?.status || '')) {
        toast({
          title: "שגיאה",
          description: inviteDetails?.status === 'submitted' ? "כבר הגשת הצעה להזמנה זו" : inviteDetails?.status === 'declined' ? "ההזמנה נדחתה" : "תוקף ההזמנה פג",
          variant: "destructive",
        });
        navigate(getDashboardRouteForRole(primaryRole));
        return;
      }

      // Check for existing proposal for this project + advisor (prevents duplicate submissions)
      const { data: proposalData } = await supabase
        .from('proposals')
        .select('id, status')
        .eq('project_id', inviteDetails.rfps.projects.id)
        .eq('advisor_id', advisor.id)
        .not('status', 'eq', 'withdrawn')
        .maybeSingle();

      if (proposalData) {
        console.log('[SubmitProposal] Existing proposal found, blocking submission:', proposalData);
        setExistingProposal(proposalData);
        toast({
          title: "כבר הגשת הצעה",
          description: "כבר הגשת הצעה לפרויקט זה. לא ניתן להגיש הצעה נוספת.",
          variant: "destructive",
        });
        navigate(getDashboardRouteForRole(primaryRole));
        return;
      }

      // Mark invite as opened if not already opened
      if (!inviteDetails.opened_at) {
        await supabase
          .from('rfp_invites')
          .update({ 
            status: 'opened',
            opened_at: new Date().toISOString(),
          })
          .eq('id', inviteDetails.id)
          .is('opened_at', null);
      }

      setRfpDetails(inviteDetails.rfps as any);

      // Fetch entrepreneur request data (fee items, service scope, payment terms)
      await fetchEntrepreneurData(inviteDetails.id);

    } catch (error) {
      toast({ title: "שגיאה", description: "אירעה שגיאה בטעינת הנתונים", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchEntrepreneurData = async (inviteId: string) => {
    try {
      // Fetch fee items
      const { data: feeItems } = await supabase
        .from('rfp_request_fee_items')
        .select('*')
        .eq('rfp_invite_id', inviteId)
        .order('display_order', { ascending: true });

      // Fetch service scope items
      const { data: scopeItems } = await supabase
        .from('rfp_service_scope_items')
        .select('*')
        .eq('rfp_invite_id', inviteId)
        .order('display_order', { ascending: true });

      // Fetch invite details for request content and payment terms
      const { data: invite } = await supabase
        .from('rfp_invites')
        .select('request_title, request_content, request_files, service_details_mode, service_details_text, service_details_file, payment_terms')
        .eq('id', inviteId)
        .single();

      if (invite) {
        const requestFiles = Array.isArray(invite.request_files) 
          ? (invite.request_files as unknown as UploadedFileMetadata[])
          : [];
        
        const serviceDetailsFile = invite.service_details_file 
          ? (invite.service_details_file as unknown as UploadedFileMetadata) 
          : null;
        const paymentTerms = invite.payment_terms 
          ? (invite.payment_terms as unknown as PaymentTerms) 
          : null;

        setEntrepreneurData({
          request_title: invite.request_title,
          request_content: invite.request_content,
          request_files: requestFiles,
          service_details_mode: (invite.service_details_mode as 'free_text' | 'file' | 'checklist') || 'free_text',
          service_details_text: invite.service_details_text,
          service_details_file: serviceDetailsFile,
          payment_terms: paymentTerms,
          fee_items: (feeItems || []).map(item => ({
            id: item.id,
            item_number: item.item_number,
            description: item.description,
            unit: item.unit as any,
            quantity: item.quantity || 1,
            unit_price: item.unit_price,
            charge_type: (item.charge_type as any) || 'one_time',
            is_optional: item.is_optional || false,
            display_order: item.display_order,
          })),
          service_scope_items: (scopeItems || []).map(item => ({
            id: item.id,
            task_name: item.task_name,
            is_included: item.is_included ?? true,
            fee_category: item.fee_category || 'כללי',
            is_optional: item.is_optional || false,
            display_order: item.display_order,
          })),
        });
      }
    } catch (error) {
      console.error('[SubmitProposal] Error fetching entrepreneur data:', error);
    }
  };

  const validateForm = () => {
    if (!declarationAccepted) {
      toast({ title: "שגיאה", description: "יש לאשר את ההצהרה לפני הגשת ההצעה", variant: "destructive" });
      return false;
    }
    if (!signature) {
      toast({ title: "שגיאה", description: "חתימה דיגיטלית נדרשת", variant: "destructive" });
      return false;
    }
    
    // Validate fee items if present
    if (hasFeeItems && !validateFeeItems()) {
      toast({ title: "שגיאה", description: "יש להשלים את טבלת שכר הטרחה", variant: "destructive" });
      setActiveTab('fees');
      return false;
    }
    
    if (!price || parseFloat(price) < PROPOSAL_VALIDATION.MIN_PRICE || parseFloat(price) > PROPOSAL_VALIDATION.MAX_PRICE) {
      toast({ title: "שגיאה", description: `מחיר ההצעה חייב להיות בין ₪${PROPOSAL_VALIDATION.MIN_PRICE.toLocaleString('he-IL')} ל-₪${PROPOSAL_VALIDATION.MAX_PRICE.toLocaleString('he-IL')}`, variant: "destructive" });
      return false;
    }
    if (!timelineDays || parseInt(timelineDays) < 1 || parseInt(timelineDays) > 1000) {
      toast({ title: "שגיאה", description: "זמן ביצוע חייב להיות בין יום אחד ל-1000 ימים", variant: "destructive" });
      return false;
    }
    if (scopeText.length < 20) {
      toast({ title: "שגיאה", description: "היקף העבודה חייב להכיל לפחות 20 תווים", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setShowConfirmDialog(true);
  };

  const handleFinalSubmit = async () => {
    setShowConfirmDialog(false);
    
    // Double-check: verify no existing proposal before submitting
    if (rfpDetails?.projects.id && advisorProfile?.id) {
      const { data: existingCheck } = await supabase
        .from('proposals')
        .select('id, status')
        .eq('project_id', rfpDetails.projects.id)
        .eq('advisor_id', advisorProfile.id)
        .not('status', 'eq', 'withdrawn')
        .maybeSingle();

      if (existingCheck) {
        toast({
          title: "כבר הגשת הצעה",
          description: "כבר הגשת הצעה לפרויקט זה. לא ניתן להגיש הצעה נוספת.",
          variant: "destructive",
        });
        navigate(getDashboardRouteForRole(primaryRole));
        return;
      }
    }
    
    const result = await submitProposal({
      inviteId: currentInviteId || invite_id || '',
      rfpId: (rfp_id || rfpDetails?.id || ''),
      projectId: rfpDetails?.projects.id || '',
      advisorId: advisorProfile?.id || '',
      supplierName: advisorProfile?.company_name || '',
      price: parseFloat(price),
      timelineDays: parseInt(timelineDays),
      scopeText: scopeText,
      conditions,
      uploadedFiles: files,
      signature,
      declarationText: "אני מצהיר/ה כי אני מוסמך/ת לפעול בשם היועץ/המשרד ולהגיש הצעה מחייבת לפרויקט זה",
      
      // Phase 3.6: Structured fee data
      feeLineItems: hasFeeItems ? [
        // Map entrepreneur items with consultant prices
        ...(entrepreneurData?.fee_items || []).map(item => ({
          item_id: item.id,
          description: item.description,
          unit: item.unit,
          quantity: item.quantity || 1,
          unit_price: consultantPrices[item.id || ''] ?? null,
          comment: rowComments[item.id || ''],
          is_entrepreneur_defined: true,
          is_optional: item.is_optional,
        })),
        // Add consultant's additional items
        ...additionalFeeItems.map(item => ({
          description: item.description,
          unit: item.unit,
          quantity: item.quantity || 1,
          unit_price: item.consultant_unit_price,
          comment: item.consultant_comment,
          is_entrepreneur_defined: false,
          is_optional: item.is_optional,
        })),
      ] : undefined,
      
      // Phase 3.6: Selected services
      selectedServices: hasServiceScope ? selectedServices : undefined,
      servicesNotes: servicesNotes || undefined,
      
      // Phase 3.6: Milestone adjustments
      milestoneAdjustments: hasPaymentTerms ? consultantMilestones.map(m => ({
        id: m.id,
        description: m.description,
        entrepreneur_percentage: m.entrepreneur_percentage,
        consultant_percentage: m.consultant_percentage,
        trigger: m.trigger,
        is_entrepreneur_defined: m.is_entrepreneur_defined,
      })) : undefined,
      
      // Phase 3.5: Request response
      consultantRequestNotes: consultantRequestNotes || undefined,
      consultantRequestFiles: consultantRequestFiles.length > 0 ? consultantRequestFiles : undefined,
    });
    
    console.log('[SubmitProposal] Submission result:', result);
    
    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['rfp-invites'] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['advisor-profile'] });
      
      toast({
        title: "הצעה נשלחה בהצלחה!",
        description: "הצעת המחיר שלך נשלחה ליזם ותופיע ברשימת ההצעות שלך",
      });
      
      navigate(getDashboardRouteForRole(primaryRole));
    } else {
      console.error('[SubmitProposal] Submission failed:', result);
      toast({
        title: "שגיאה בהגשת הצעה",
        description: "אירעה שגיאה בהגשת ההצעה. אנא נסה שוב.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <UserHeader />
        <div className="container max-w-5xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-16 w-full mb-8" />
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="flex justify-between items-center p-6 border-b"><UserHeader /></div>
        <div className="flex items-center justify-center p-6">
          <Card className="w-full max-w-md text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-green-700">הצעה נשלחה בהצלחה!</CardTitle>
              <CardDescription className="space-y-2">
                <p>הצעת המחיר שלך נשלחה ליזם ותופיע ברשימת ההצעות שלך</p>
                <p className="text-sm font-medium text-foreground mt-4">
                  מחיר הצעה: ₪{parseFloat(price).toLocaleString('he-IL')}
                </p>
                <p className="text-sm text-muted-foreground">
                  תאריך סיום: {completionDate ? format(completionDate, "PPP", { locale: he }) : `${timelineDays} ימים`}
                </p>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['rfp-invites'] });
                  queryClient.invalidateQueries({ queryKey: ['proposals'] });
                  queryClient.invalidateQueries({ queryKey: ['advisor-profile'] });
                  navigate(getDashboardRouteForRole(primaryRole));
                }} 
                className="w-full"
              >
                חזרה ללוח הבקרה
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate(`/rfp/${rfp_id}/details`)}
                className="w-full"
              >
                צפייה בפרטי הבקשה
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="sticky top-0 z-50 flex justify-between items-center p-6 border-b bg-background/95 backdrop-blur-sm">
        <NavigationLogo size="md" />
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate(getDashboardRouteForRole(primaryRole))}
            className="flex items-center gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה לדשבורד
          </Button>
          <UserHeader />
        </div>
      </div>
      
      <div className="container max-w-5xl mx-auto px-4 py-8" dir="rtl">
        <ProposalProgressStepper steps={steps} className="mb-8" />
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full flex flex-wrap justify-start gap-1 h-auto p-1 mb-6">
              <TabsTrigger value="request" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">פרטי הבקשה</span>
              </TabsTrigger>
              <TabsTrigger value="fees" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">שכר טרחה</span>
              </TabsTrigger>
              {hasServiceScope && (
                <TabsTrigger value="services" className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  <span className="hidden sm:inline">שירותים</span>
                </TabsTrigger>
              )}
              {hasPaymentTerms && (
                <TabsTrigger value="milestones" className="flex items-center gap-2">
                  <Milestone className="h-4 w-4" />
                  <span className="hidden sm:inline">אבני דרך</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="scope" className="flex items-center gap-2">
                <FileDown className="h-4 w-4" />
                <span className="hidden sm:inline">היקף עבודה</span>
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">קבצים</span>
              </TabsTrigger>
              <TabsTrigger value="signature" className="flex items-center gap-2">
                <PenTool className="h-4 w-4" />
                <span className="hidden sm:inline">חתימה</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Request Details */}
            <TabsContent value="request" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>פרטי הבקשה מהיזם</CardTitle>
                  <CardDescription>צפו בדרישות היזם לפני הגשת ההצעה</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {entrepreneurData?.request_title && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">כותרת הבקשה</Label>
                      <p className="mt-1 font-medium">{entrepreneurData.request_title}</p>
                    </div>
                  )}
                  
                  {entrepreneurData?.request_content && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">תיאור הבקשה</Label>
                      <div className="mt-1 p-4 bg-muted/50 rounded-lg whitespace-pre-wrap">
                        {entrepreneurData.request_content}
                      </div>
                    </div>
                  )}

                  {entrepreneurData?.request_files && entrepreneurData.request_files.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">קבצים מצורפים מהיזם</Label>
                      <div className="mt-2 space-y-2">
                        {entrepreneurData.request_files.map((file, index) => (
                          <a
                            key={index}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <FileDown className="h-4 w-4 text-primary" />
                            <span className="text-sm">{file.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {entrepreneurData?.service_details_mode === 'free_text' && entrepreneurData.service_details_text && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">פירוט השירותים</Label>
                      <div className="mt-1 p-4 bg-muted/50 rounded-lg whitespace-pre-wrap">
                        {entrepreneurData.service_details_text}
                      </div>
                    </div>
                  )}

                  {entrepreneurData?.service_details_mode === 'file' && entrepreneurData.service_details_file && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">קובץ פירוט שירותים</Label>
                      <a
                        href={entrepreneurData.service_details_file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <FileDown className="h-5 w-5 text-primary" />
                        <span>{entrepreneurData.service_details_file.name}</span>
                      </a>
                    </div>
                  )}

                  {!hasRequestContent && !entrepreneurData?.service_details_text && !entrepreneurData?.service_details_file && (
                    <p className="text-muted-foreground text-center py-8">
                      לא הוזנו פרטים נוספים ע"י היזם
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Phase 3.5: Consultant Response Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit3 className="h-5 w-5" />
                    תגובה לבקשה (אופציונלי)
                  </CardTitle>
                  <CardDescription>
                    הוסיפו הערות או קבצים נוספים בתגובה לבקשת היזם
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="consultant-notes">הערות / שאלות / הבהרות</Label>
                    <Textarea
                      id="consultant-notes"
                      value={consultantRequestNotes}
                      onChange={(e) => setConsultantRequestNotes(e.target.value)}
                      placeholder="הוסיפו הערות, שאלות הבהרה, או מידע נוסף שברצונכם לשתף עם היזם..."
                      rows={4}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>קבצים נלווים (תיק עבודות, הסמכות, וכד׳)</Label>
                    <FileUpload 
                      onUpload={setConsultantRequestFiles} 
                      advisorId={advisorProfile?.id}
                      maxFiles={5}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="button" onClick={() => setActiveTab('fees')}>
                  המשך לשכר טרחה
                  <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                </Button>
              </div>
            </TabsContent>

            {/* Tab 2: Fees */}
            <TabsContent value="fees" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>שכר טרחה</CardTitle>
                  <CardDescription>
                    {hasFeeItems 
                      ? 'מלאו את המחירים עבור כל פריט בהתאם לדרישות היזם'
                      : 'הזינו את המחיר המוצע ולוח הזמנים המשוער'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {hasFeeItems ? (
                    <ConsultantFeeTable
                      entrepreneurItems={entrepreneurData?.fee_items || []}
                      consultantPrices={consultantPrices}
                      onPriceChange={handleFeeItemPriceChange}
                      additionalItems={additionalFeeItems}
                      onAddItem={handleAddFeeItem}
                      onRemoveItem={handleRemoveFeeItem}
                      onUpdateAdditionalItem={handleUpdateAdditionalItem}
                      rowComments={rowComments}
                      onCommentChange={handleRowCommentChange}
                      errors={feeErrors}
                    />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="price">מחיר הצעה (₪) *</Label>
                        <div className="relative">
                          <Input
                            id="price"
                            type="text"
                            value={priceDisplay}
                            onChange={handlePriceChange}
                            placeholder="0"
                            className="text-left pr-8 focus:ring-2 focus:ring-primary focus:border-primary"
                            dir="ltr"
                            required
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₪</span>
                        </div>
                        {price && parseFloat(price) >= 1000 && parseFloat(price) <= 10000000 && (
                          <div className="flex items-center gap-2 mt-2 text-green-600 text-sm">
                            <CheckCircle className="h-4 w-4" />
                            <span>מחיר תקין: ₪{parseFloat(price).toLocaleString('he-IL')}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="timeline">תאריך סיום משוער</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              id="timeline"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-right font-normal",
                                !completionDate && "text-muted-foreground"
                              )}
                              dir="rtl"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {completionDate ? (
                                format(completionDate, "PPP", { locale: he })
                              ) : (
                                <span>בחרו תאריך סיום</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={completionDate}
                              onSelect={handleDateSelect}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {timelineDays && (
                          <p className="text-xs text-muted-foreground">
                            משך ביצוע: {timelineDays} ימים
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timeline selection for fee table mode */}
                  {hasFeeItems && (
                    <div className="border-t pt-6 mt-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="timeline-fees">תאריך סיום משוער *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="timeline-fees"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-right font-normal",
                                  !completionDate && "text-muted-foreground"
                                )}
                                dir="rtl"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {completionDate ? (
                                  format(completionDate, "PPP", { locale: he })
                                ) : (
                                  <span>בחרו תאריך סיום</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={completionDate}
                                onSelect={handleDateSelect}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          {timelineDays && (
                            <p className="text-xs text-muted-foreground">
                              משך ביצוע: {timelineDays} ימים
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>סה"כ הצעה</Label>
                          <div className="text-2xl font-bold text-primary">
                            ₪{parseFloat(price || '0').toLocaleString('he-IL')}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setActiveTab('request')}>
                  <ArrowRight className="h-4 w-4 ml-2" />
                  חזרה
                </Button>
                <Button type="button" onClick={() => setActiveTab(hasServiceScope ? 'services' : hasPaymentTerms ? 'milestones' : 'scope')}>
                  המשך {hasServiceScope ? 'לשירותים' : hasPaymentTerms ? 'לאבני דרך' : 'להיקף עבודה'}
                  <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                </Button>
              </div>
            </TabsContent>

            {/* Tab: Services Selection */}
            {hasServiceScope && (
              <TabsContent value="services" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ListChecks className="h-5 w-5" />
                      בחירת שירותים
                    </CardTitle>
                    <CardDescription>
                      סמנו את השירותים שתספקו במסגרת ההצעה
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ConsultantServicesSelection
                      mode={entrepreneurData?.service_details_mode || 'free_text'}
                      serviceItems={entrepreneurData?.service_scope_items || []}
                      serviceText={entrepreneurData?.service_details_text || null}
                      serviceFile={entrepreneurData?.service_details_file || null}
                      selectedServices={selectedServices}
                      onSelectionChange={setSelectedServices}
                      consultantNotes={servicesNotes}
                      onNotesChange={setServicesNotes}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setActiveTab('fees')}>
                    <ArrowRight className="h-4 w-4 ml-2" />
                    חזרה
                  </Button>
                  <Button type="button" onClick={() => setActiveTab(hasPaymentTerms ? 'milestones' : 'scope')}>
                    המשך {hasPaymentTerms ? 'לאבני דרך' : 'להיקף עבודה'}
                    <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                  </Button>
                </div>
              </TabsContent>
            )}

            {/* Tab: Payment Terms / Milestones */}
            {hasPaymentTerms && (
              <TabsContent value="milestones" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Milestone className="h-5 w-5" />
                      אבני דרך ותנאי תשלום
                    </CardTitle>
                    <CardDescription>
                      התאימו את אחוזי התשלום לכל אבן דרך
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ConsultantPaymentTerms
                      entrepreneurTerms={entrepreneurData?.payment_terms || null}
                      consultantMilestones={consultantMilestones}
                      onMilestonesChange={setConsultantMilestones}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setActiveTab(hasServiceScope ? 'services' : 'fees')}>
                    <ArrowRight className="h-4 w-4 ml-2" />
                    חזרה
                  </Button>
                  <Button type="button" onClick={() => setActiveTab('scope')}>
                    המשך להיקף עבודה
                    <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                  </Button>
                </div>
              </TabsContent>
            )}

            {/* Tab: Scope */}
            <TabsContent value="scope" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>היקף עבודה</CardTitle>
                  <CardDescription>תארו את היקף העבודה המוצע</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="scope">תיאור מפורט</Label>
                    <Textarea 
                      id="scope" 
                      value={scopeText} 
                      onChange={(e) => setScopeText(e.target.value)} 
                      placeholder="פרט את היקף העבודה המוצע (מינימום 20 תווים)" 
                      rows={6} 
                      required 
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>מינימום 20 תווים</span>
                      <span className={cn("font-medium", scopeText.length < 20 ? "text-destructive" : "text-green-600")} dir="rtl">
                        20 / {scopeText.length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <ConditionsBuilder value={conditions} onChange={setConditions} />

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setActiveTab(hasPaymentTerms ? 'milestones' : hasServiceScope ? 'services' : 'fees')}>
                  <ArrowRight className="h-4 w-4 ml-2" />
                  חזרה
                </Button>
                <Button type="button" onClick={() => setActiveTab('files')}>
                  המשך לקבצים
                  <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                </Button>
              </div>
            </TabsContent>

            {/* Tab 4: Files */}
            <TabsContent value="files" className="space-y-6">
              <Card className="border-2 border-dashed border-primary/50 hover:border-primary transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    קבצים נלווים (אופציונלי)
                  </CardTitle>
                  <CardDescription>
                    העלו תוכניות, מפרטים טכניים, או מסמכים רלוונטיים
                    <span className="block mt-1 text-xs">גודל מקסימלי: 10MB לקובץ | עד 10 קבצים</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FileUpload onUpload={setFiles} advisorId={advisorProfile?.id} />
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setActiveTab('scope')}>
                  <ArrowRight className="h-4 w-4 ml-2" />
                  חזרה
                </Button>
                <Button type="button" onClick={() => setActiveTab('signature')}>
                  המשך לחתימה
                  <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                </Button>
              </div>
            </TabsContent>

            {/* Tab 5: Signature */}
            <TabsContent value="signature" className="space-y-6">
              <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="text-orange-900 dark:text-orange-200">
                  <strong>שימו לב:</strong> חתימה דיגיטלית זו תהווה התחייבות משפטית מחייבת ותאושר באמצעות חותמת זמן וזיהוי דיגיטלי
                </AlertDescription>
              </Alert>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      id="declaration" 
                      checked={declarationAccepted} 
                      onCheckedChange={(checked) => setDeclarationAccepted(checked as boolean)} 
                    />
                    <Label htmlFor="declaration" className="text-sm cursor-pointer">
                      אני מצהיר/ה כי אני מוסמך/ת לפעול בשם היועץ/המשרד ולהגיש הצעה מחייבת לפרויקט זה. ההצעה תקפה למשך 90 יום מהיום.
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit3 className="h-5 w-5" />
                    חתימה דיגיטלית
                  </CardTitle>
                  <CardDescription>חתמו בתיבה למטה לאישור ההצעה</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={
                    <div className="space-y-3">
                      <Skeleton className="h-48 w-full rounded-md" />
                      <div className="flex gap-2">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                      </div>
                    </div>
                  }>
                    <SignatureCanvas onSign={setSignature} />
                  </Suspense>
                  {signature && (
                    <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
                      <CheckCircle className="h-4 w-4" />
                      חתימה נקלטה בהצלחה
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between items-center">
                <Button type="button" variant="outline" onClick={() => setActiveTab('files')}>
                  <ArrowRight className="h-4 w-4 ml-2" />
                  חזרה
                </Button>
                <Button 
                  type="submit" 
                  size="lg" 
                  className="shadow-lg hover:shadow-xl transition-all" 
                  disabled={submitting}
                >
                  {submitting ? "שולח..." : "סיכום ואישור"}
                  <Send className="mr-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </form>

        <ConfirmProposalDialog 
          open={showConfirmDialog} 
          onOpenChange={setShowConfirmDialog} 
          onConfirm={handleFinalSubmit} 
          price={price} 
          timelineDays={timelineDays} 
          scopeText={scopeText} 
          fileCount={files.length} 
          hasSignature={!!signature}
          feeLineItems={[
            ...(entrepreneurData?.fee_items || []).map(item => ({
              description: item.description,
              quantity: item.quantity || 1,
              unit_price: consultantPrices[item.id] || 0,
              total: (consultantPrices[item.id] || 0) * (item.quantity || 1),
              is_optional: item.is_optional,
            })),
            ...additionalFeeItems.map(item => ({
              description: item.description,
              quantity: item.quantity || 1,
              unit_price: item.consultant_unit_price || 0,
              total: (item.consultant_unit_price || 0) * (item.quantity || 1),
              is_optional: item.is_optional,
            }))
          ]}
          milestones={consultantMilestones.map(m => ({
            description: m.description,
            percentage: m.consultant_percentage,
          }))}
        />
      </div>
      <BackToTop />
    </div>
  );
};

export default SubmitProposal;
