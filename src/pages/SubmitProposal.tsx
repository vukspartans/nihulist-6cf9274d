import { useState, useEffect, lazy, Suspense, useCallback, useRef } from 'react';
import { useParams, useNavigate, useBeforeUnload } from 'react-router-dom';
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
import { CheckCircle, AlertCircle, Edit3, Upload, Send, ArrowRight, ArrowLeft, FileText, Receipt, PenTool, FileDown, Milestone, ListChecks, FolderOpen } from 'lucide-react';
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
import { differenceInDays } from 'date-fns';
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
  
  // Project files state
  const [projectFiles, setProjectFiles] = useState<Array<{ id: string; file_name: string; url: string }>>([]);
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
  const [paymentTermType, setPaymentTermType] = useState<'current' | 'net_30' | 'net_60' | 'net_90'>('current');
  const [paymentTermsComment, setPaymentTermsComment] = useState('');

  // Phase 3.5: Consultant response to request
  const [consultantRequestNotes, setConsultantRequestNotes] = useState('');
  const [consultantRequestFiles, setConsultantRequestFiles] = useState<any[]>([]);

  // Draft saving state
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const draftKey = `proposal-draft-${rfp_id || invite_id}`;

  // Track initial services for detecting deselected items
  const [initialSelectedServices, setInitialSelectedServices] = useState<string[]>([]);

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

  // Auto-calculate timeline from project dates
  useEffect(() => {
    if (rfpDetails?.projects?.timeline_end && rfpDetails?.projects?.timeline_start) {
      const start = new Date(rfpDetails.projects.timeline_start);
      const end = new Date(rfpDetails.projects.timeline_end);
      const days = differenceInDays(end, start);
      if (days > 0 && !timelineDays) {
        setTimelineDays(days.toString());
      }
    }
  }, [rfpDetails]);

  // Fee table handlers
  const handleFeeItemPriceChange = useCallback((itemId: string, price: number | null) => {
    setConsultantPrices(prev => ({ ...prev, [itemId]: price }));
  }, []);

  const handleAddFeeItem = useCallback((isOptional: boolean = false) => {
    const newItem: ConsultantFeeRow = {
      item_number: (entrepreneurData?.fee_items.length || 0) + additionalFeeItems.length + 1,
      description: '',
      unit: 'lump_sum',
      quantity: 1,
      charge_type: 'one_time',
      is_optional: isOptional,
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
      // Track initial services for detecting deselected items
      setInitialSelectedServices(initialSelected);
    }
  }, [entrepreneurData]);

  // Calculate deselected services (items that were initially selected but now are not)
  const getDeselectedServices = useCallback(() => {
    if (!entrepreneurData?.service_scope_items) return [];
    
    return initialSelectedServices
      .filter(serviceId => !selectedServices.includes(serviceId))
      .map(serviceId => {
        const item = entrepreneurData.service_scope_items.find(s => s.id === serviceId);
        return item?.task_name || serviceId;
      });
  }, [initialSelectedServices, selectedServices, entrepreneurData]);

  // Draft saving functions
  const saveDraft = useCallback(() => {
    if (!draftKey) return;
    
    const draftData = {
      price,
      timelineDays,
      consultantPrices,
      additionalFeeItems,
      rowComments,
      selectedServices,
      servicesNotes,
      consultantMilestones,
      consultantRequestNotes,
      conditions,
      declarationAccepted,
      activeTab,
      // Additional fields for complete persistence
      files,
      consultantRequestFiles,
      signature,
      paymentTermType,
      paymentTermsComment,
      savedAt: new Date().toISOString(),
    };
    
    try {
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      setLastSavedAt(new Date());
      setIsDraftDirty(false);
      console.log('[SubmitProposal] Draft saved');
    } catch (error) {
      console.error('[SubmitProposal] Failed to save draft:', error);
    }
  }, [draftKey, price, timelineDays, consultantPrices, additionalFeeItems, rowComments, selectedServices, servicesNotes, consultantMilestones, consultantRequestNotes, conditions, declarationAccepted, activeTab, files, consultantRequestFiles, signature, paymentTermType, paymentTermsComment]);

  const loadDraft = useCallback(() => {
    if (!draftKey) return false;
    
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (!savedDraft) return false;
      
      const draftData = JSON.parse(savedDraft);
      
      if (draftData.price) setPrice(draftData.price);
      if (draftData.price) setPriceDisplay(parseFloat(draftData.price).toLocaleString('he-IL'));
      if (draftData.timelineDays) setTimelineDays(draftData.timelineDays);
      if (draftData.consultantPrices) setConsultantPrices(draftData.consultantPrices);
      if (draftData.additionalFeeItems) setAdditionalFeeItems(draftData.additionalFeeItems);
      if (draftData.rowComments) setRowComments(draftData.rowComments);
      if (draftData.selectedServices) setSelectedServices(draftData.selectedServices);
      if (draftData.servicesNotes) setServicesNotes(draftData.servicesNotes);
      if (draftData.consultantMilestones) setConsultantMilestones(draftData.consultantMilestones);
      if (draftData.consultantRequestNotes) setConsultantRequestNotes(draftData.consultantRequestNotes);
      if (draftData.conditions) setConditions(draftData.conditions);
      if (draftData.declarationAccepted) setDeclarationAccepted(draftData.declarationAccepted);
      if (draftData.activeTab) setActiveTab(draftData.activeTab);
      if (draftData.savedAt) setLastSavedAt(new Date(draftData.savedAt));
      // Restore additional fields
      if (draftData.files) setFiles(draftData.files);
      if (draftData.consultantRequestFiles) setConsultantRequestFiles(draftData.consultantRequestFiles);
      if (draftData.signature) setSignature(draftData.signature);
      if (draftData.paymentTermType) setPaymentTermType(draftData.paymentTermType);
      if (draftData.paymentTermsComment) setPaymentTermsComment(draftData.paymentTermsComment);
      
      console.log('[SubmitProposal] Draft loaded from', draftData.savedAt);
      return true;
    } catch (error) {
      console.error('[SubmitProposal] Failed to load draft:', error);
      return false;
    }
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    if (!draftKey) return;
    try {
      localStorage.removeItem(draftKey);
      console.log('[SubmitProposal] Draft cleared');
    } catch (error) {
      console.error('[SubmitProposal] Failed to clear draft:', error);
    }
  }, [draftKey]);

  // Load draft on mount (after entrepreneur data is loaded)
  useEffect(() => {
    if (entrepreneurData && !loading) {
      const hasDraft = loadDraft();
      if (hasDraft) {
        toast({
          title: "טיוטה נטענה",
          description: "נמצאה טיוטה שמורה. המשיכו מאיפה שהפסקתם.",
        });
      }
    }
  }, [entrepreneurData, loading]);

  // Auto-save draft when form changes
  useEffect(() => {
    if (!loading && entrepreneurData) {
      setIsDraftDirty(true);
    }
  }, [price, consultantPrices, additionalFeeItems, rowComments, selectedServices, servicesNotes, consultantMilestones, consultantRequestNotes, conditions, declarationAccepted, files, consultantRequestFiles, signature, paymentTermType, paymentTermsComment]);

  // Auto-save on tab change
  useEffect(() => {
    if (isDraftDirty && !loading) {
      saveDraft();
    }
  }, [activeTab]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDraftDirty) {
        e.preventDefault();
        e.returnValue = 'יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לעזוב?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDraftDirty]);

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
    { id: 2, title: 'שכר טרחה', completed: hasFeeItems ? Object.keys(consultantPrices).length > 0 : !!price },
    ...(hasServiceScope ? [{ id: 0, title: 'שירותים', completed: selectedServices.length > 0 }] : []),
    ...(hasPaymentTerms ? [{ id: 0, title: 'אבני דרך', completed: consultantMilestones.length > 0 }] : []),
    { id: 0, title: 'קבצים מצורפים', completed: files.length > 0 },
    { id: 0, title: 'חתימה דיגיטלית', completed: !!signature },
    { id: 0, title: 'אישור והגשה', completed: declarationAccepted },
  ].map((step, index) => ({ ...step, id: index + 1 }));

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

      // Check for existing proposal for this specific invite (allows multiple proposals per project)
      const { data: proposalData } = await supabase
        .from('proposals')
        .select('id, status')
        .eq('rfp_invite_id', inviteDetails.id)
        .not('status', 'eq', 'withdrawn')
        .maybeSingle();

      if (proposalData) {
        console.log('[SubmitProposal] Existing proposal found for this invite, blocking submission:', proposalData);
        setExistingProposal(proposalData);
        toast({
          title: "כבר הגשת הצעה",
          description: "כבר הגשת הצעה להזמנה זו. לא ניתן להגיש הצעה נוספת.",
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

      // Fetch project files
      if (inviteDetails.rfps?.projects?.id) {
        const { data: pFiles } = await supabase
          .from('project_files')
          .select('id, file_name, file_url')
          .eq('project_id', inviteDetails.rfps.projects.id);
        
        if (pFiles && pFiles.length > 0) {
          const filesWithUrls = await Promise.all(pFiles.map(async (f) => {
            const { data } = await supabase.storage.from('project-files').createSignedUrl(f.file_url, 3600);
            return { id: f.id, file_name: f.file_name, url: data?.signedUrl || f.file_url };
          }));
          setProjectFiles(filesWithUrls);
        }
      }

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
    // Timeline is now optional - auto-calculated or not required
    if (timelineDays && (parseInt(timelineDays) < 1 || parseInt(timelineDays) > 1000)) {
      toast({ title: "שגיאה", description: "זמן ביצוע חייב להיות בין יום אחד ל-1000 ימים", variant: "destructive" });
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
    
    // Double-check: verify no existing proposal for this specific invite before submitting
    if (currentInviteId) {
      const { data: existingCheck } = await supabase
        .from('proposals')
        .select('id, status')
        .eq('rfp_invite_id', currentInviteId)
        .not('status', 'eq', 'withdrawn')
        .maybeSingle();

      if (existingCheck) {
        toast({
          title: "כבר הגשת הצעה",
          description: "כבר הגשת הצעה להזמנה זו. לא ניתן להגיש הצעה נוספת.",
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
      timelineDays: parseInt(timelineDays) || 30, // Default to 30 days if not specified
      scopeText: servicesNotes || 'ראה פירוט שירותים בטבלאות', // Use services notes as scope (min 20 chars)
      conditions,
      uploadedFiles: files,
      signature,
      declarationText: "אני מצהיר/ה כי אני מוסמך/ת לפעול בשם היועץ/המשרד וכי חתימתי מחייבת את היועץ/המשרד. ההצעה תקפה למשך 90 יום משליחת ההצעה.",
      
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
      
      // Phase 4: Deselected services as comment
      deselectedServicesComment: getDeselectedServices().length > 0 
        ? `שירותים שלא ייכללו בהצעה: ${getDeselectedServices().join(', ')}`
        : undefined,
      
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
      
      // Phase 4: Payment terms change tracking
      paymentTermType: paymentTermType,
      paymentTermsComment: paymentTermsComment || undefined,
      entrepreneurPaymentTermType: entrepreneurData?.payment_terms?.payment_term_type as 'current' | 'net_30' | 'net_60' | 'net_90' | undefined,
    });
    
    console.log('[SubmitProposal] Submission result:', result);
    
    if (result.success) {
      // Clear draft on successful submission
      clearDraft();
      
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
                  סה"כ שכר טרחה: ₪{parseFloat(price).toLocaleString('he-IL')}
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
          {lastSavedAt && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              נשמר לאחרונה: {lastSavedAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button 
            variant="ghost"
            size="sm"
            onClick={saveDraft}
            disabled={!isDraftDirty}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            שמור טיוטה
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              if (isDraftDirty) {
                saveDraft();
              }
              navigate(getDashboardRouteForRole(primaryRole));
            }}
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
            <TabsList className="w-full flex flex-wrap justify-start gap-1 h-auto p-1 mb-6">
              <TabsTrigger value="request" className="flex items-center gap-2">
                <span className="hidden sm:inline">פרטי הבקשה</span>
                <FileText className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="fees" className="flex items-center gap-2">
                <span className="hidden sm:inline">שכר טרחה</span>
                <Receipt className="h-4 w-4" />
              </TabsTrigger>
              {hasServiceScope && (
                <TabsTrigger value="services" className="flex items-center gap-2">
                  <span className="hidden sm:inline">שירותים</span>
                  <ListChecks className="h-4 w-4" />
                </TabsTrigger>
              )}
              {hasPaymentTerms && (
                <TabsTrigger value="milestones" className="flex items-center gap-2">
                  <span className="hidden sm:inline">אבני דרך</span>
                  <Milestone className="h-4 w-4" />
                </TabsTrigger>
              )}
              <TabsTrigger value="files" className="flex items-center gap-2">
                <span className="hidden sm:inline">קבצים</span>
                <Upload className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="signature" className="flex items-center gap-2">
                <span className="hidden sm:inline">חתימה</span>
                <PenTool className="h-4 w-4" />
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
                      <div className="mt-1 p-4 bg-muted/50 rounded-lg whitespace-pre-wrap text-right">
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
                      <div className="mt-1 p-4 bg-muted/50 rounded-lg whitespace-pre-wrap text-right">
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

                  {!hasRequestContent && !entrepreneurData?.service_details_text && !entrepreneurData?.service_details_file && projectFiles.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      לא הוזנו פרטים נוספים ע"י היזם
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Project Files Section */}
              {projectFiles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FolderOpen className="h-5 w-5" />
                      קבצי פרויקט
                    </CardTitle>
                    <CardDescription>
                      קבצים שצורפו לפרויקט ע"י היזם
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {projectFiles.map((file) => (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <FileDown className="h-5 w-5 text-primary" />
                          <span className="flex-1">{file.file_name}</span>
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

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
                      existingFiles={consultantRequestFiles}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-start">
                    <Button type="button" onClick={() => setActiveTab('fees')} className="gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      המשך לשכר טרחה
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
                  )}

                  {/* Total display for fee table mode */}
                  {hasFeeItems && (
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-lg">סה"כ הצעה:</Label>
                        <div className="text-2xl font-bold text-primary">
                          ₪{parseFloat(price || '0').toLocaleString('he-IL')}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button type="button" onClick={() => setActiveTab(hasServiceScope ? 'services' : hasPaymentTerms ? 'milestones' : 'files')} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  המשך {hasServiceScope ? 'לשירותים' : hasPaymentTerms ? 'לאבני דרך' : 'לקבצים'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setActiveTab('request')} className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  חזרה
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
                      projectFiles={projectFiles}
                      requestFiles={entrepreneurData?.request_files || []}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button type="button" onClick={() => setActiveTab(hasPaymentTerms ? 'milestones' : 'files')} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    המשך {hasPaymentTerms ? 'לאבני דרך' : 'לקבצים'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setActiveTab('fees')} className="gap-2">
                    <ArrowRight className="h-4 w-4" />
                    חזרה
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
                      paymentTermType={paymentTermType}
                      onPaymentTermTypeChange={setPaymentTermType}
                      paymentTermsComment={paymentTermsComment}
                      onPaymentTermsCommentChange={setPaymentTermsComment}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button type="button" onClick={() => setActiveTab('files')} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    המשך לקבצים
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setActiveTab(hasServiceScope ? 'services' : 'fees')} className="gap-2">
                    <ArrowRight className="h-4 w-4" />
                    חזרה
                  </Button>
                </div>
              </TabsContent>
            )}


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
                  <FileUpload 
                    onUpload={setFiles} 
                    advisorId={advisorProfile?.id}
                    existingFiles={files}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button type="button" onClick={() => setActiveTab('signature')} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  המשך לחתימה
                </Button>
                <Button type="button" variant="outline" onClick={() => setActiveTab(hasPaymentTerms ? 'milestones' : hasServiceScope ? 'services' : 'fees')} className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  חזרה
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
                      אני מצהיר/ה כי אני מוסמך/ת לפעול בשם היועץ/המשרד וכי חתימתי מחייבת את היועץ/המשרד. ההצעה תקפה למשך 90 יום משליחת ההצעה.
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <Suspense fallback={
                <Card className="border-2 border-primary shadow-lg">
                  <CardHeader>
                    <CardTitle>חתימה דיגיטלית</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-48 w-full rounded-md" />
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-24" />
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </CardContent>
                </Card>
              }>
                <SignatureCanvas 
                  onSign={setSignature} 
                  className="border-2 border-primary shadow-lg"
                />
              </Suspense>
              
              {signature && (
                <div className="flex items-center gap-2 text-green-600 text-sm p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle className="h-4 w-4" />
                  חתימה נקלטה בהצלחה
                </div>
              )}

              <div className="flex justify-between items-center">
                <Button type="button" variant="outline" onClick={() => setActiveTab('files')} className="gap-2">
                  <ArrowRight className="h-4 w-4" />
                  חזרה
                </Button>
                <Button 
                  type="submit" 
                  size="lg" 
                  className="gap-2 shadow-lg hover:shadow-xl transition-all" 
                  disabled={submitting}
                >
                  <Send className="h-4 w-4" />
                  {submitting ? "שולח..." : "סיכום ואישור"}
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
