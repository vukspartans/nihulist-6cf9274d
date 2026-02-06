import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRouteForRole } from '@/lib/roleNavigation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserHeader } from '@/components/UserHeader';
import { MapPin, Calendar, DollarSign, Clock, FileText, Send, X, MessageSquare, ArrowRight, Download, CheckCircle, XCircle, Coins, CreditCard, Home, List, Building2, User, Eye } from 'lucide-react';
import NavigationLogo from '@/components/NavigationLogo';
import BackToTop from '@/components/BackToTop';
import { DeadlineCountdown } from '@/components/DeadlineCountdown';
import { DeclineRFPDialog } from '@/components/DeclineRFPDialog';
import { useDeclineRFP } from '@/hooks/useDeclineRFP';
import { reportableError, formatSupabaseError } from '@/utils/errorReporting';
import { AdvisorProposalViewDialog } from '@/components/AdvisorProposalViewDialog';
import { getPaymentTermLabel, PAYMENT_TERM_LABELS } from '@/constants/paymentTerms';
import JSZip from 'jszip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
interface RFPDetails {
  id: string;
  subject: string;
  body_html: string;
  sent_at: string;
  projects: {
    id: string;
    name: string;
    type: string;
    location: string;
    budget: number;
    timeline_start: string;
    timeline_end: string;
    description: string;
    phase: string;
    owner_id: string;
    entrepreneur_name?: string;
  };
}

interface RFPInvite {
  id: string;
  status: string;
  created_at: string;
  deadline_at?: string;
  advisor_type?: string;
  request_title?: string;
  request_content?: string;
  request_files?: Array<{
    name: string;
    url: string;
    size: number;
    path: string;
  }>;
  // New fields for service details
  service_details_mode?: 'free_text' | 'file' | 'checklist';
  service_details_text?: string;
  service_details_file?: {
    name: string;
    url: string;
    size: number;
    path: string;
  };
  payment_terms?: {
    advance_percent?: number;
    milestone_payments?: Array<{
      description: string;
      percentage: number;
      trigger?: string;
    }>;
    payment_term_type?: 'current' | 'net_30' | 'net_60' | 'net_90';
    notes?: string;
  };
}

interface ServiceScopeItem {
  id: string;
  task_name: string;
  is_included: boolean;
  is_optional: boolean;
  fee_category: string;
  display_order: number;
}

interface FeeItem {
  id: string;
  item_number: number;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number | null;
  charge_type: string;
  is_optional: boolean;
  display_order: number;
}

const UNIT_LABELS: Record<string, string> = {
  'lump_sum': 'קומפ\'',
  'sqm': 'מ"ר',
  'unit': 'יח"ד',
  'hourly': 'ש"ע',
  'per_consultant': 'לי"ע',
  'per_floor': 'לקומה',
  'percentage': '%'
};

const CHARGE_TYPE_LABELS: Record<string, string> = {
  'one_time': 'חד פעמי',
  'monthly': 'חודשי',
  'hourly': 'לש"ע',
  'per_visit': 'לביקור',
  'per_unit': 'ליח"ד'
};

// Use PAYMENT_TERM_LABELS from constants - kept for backward compatibility in this file

const RFPDetails = () => {
  const { rfp_id, invite_id } = useParams();
  const navigate = useNavigate();
  const { user, primaryRole } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [rfpDetails, setRfpDetails] = useState<RFPDetails | null>(null);
  const [inviteDetails, setInviteDetails] = useState<RFPInvite | null>(null);
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [scopeItems, setScopeItems] = useState<ServiceScopeItem[]>([]);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [existingProposal, setExistingProposal] = useState<{ id: string; status: string } | null>(null);
  const [viewProposalDialogOpen, setViewProposalDialogOpen] = useState(false);
  const [projectFiles, setProjectFiles] = useState<Array<{
    id: string;
    file_name: string;
    file_url: string;
    size_mb?: number;
    file_type?: string;
    custom_name?: string;
  }>>([]);

  const { declineRFP, loading: declining } = useDeclineRFP();
  const [fileLoading, setFileLoading] = useState<string | null>(null);

  const downloadFile = async (file: { url: string; name: string }) => {
    try {
      setFileLoading(file.name);
      const response = await fetch(file.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('[RFPDetails] Error downloading file:', error);
      toast({
        title: "שגיאה בהורדת הקובץ",
        variant: "destructive",
      });
    } finally {
      setFileLoading(null);
    }
  };

  const downloadAllFiles = async (files: Array<{ url: string; name: string }>) => {
    try {
      setFileLoading('all');
      toast({
        title: "מכין הורדה...",
        description: `מוריד ${files.length} קבצים`,
      });

      const zip = new JSZip();
      
      for (const file of files) {
        const response = await fetch(file.url);
        if (!response.ok) {
          console.error(`Failed to fetch ${file.name}`);
          continue;
        }
        const blob = await response.blob();
        zip.file(file.name, blob);
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(zipBlob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'rfp-attachments.zip';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      
      toast({
        title: "ההורדה הושלמה",
        description: `${files.length} קבצים הורדו בהצלחה`,
      });
    } catch (error) {
      console.error('[RFPDetails] Error downloading all files:', error);
      toast({
        title: "שגיאה בהורדת הקבצים",
        variant: "destructive",
      });
    } finally {
      setFileLoading(null);
    }
  };

  useEffect(() => {
    if (user && (rfp_id || invite_id)) {
      fetchRFPDetails();
      markAsOpened();
    }
  }, [user, rfp_id, invite_id]);

  const markAsOpened = async () => {
    if (!user) return;

    try {
      if (invite_id) {
        // Mark by invite_id - only update if opened_at is null (not already opened)
        await supabase
          .from('rfp_invites')
          .update({ 
            status: 'opened',
            opened_at: new Date().toISOString(),
          })
          .eq('id', invite_id)
          .is('opened_at', null);
      } else if (rfp_id) {
        // Fallback: mark by rfp_id
        const { data: advisor } = await supabase
          .from('advisors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (advisor) {
          await supabase
            .from('rfp_invites')
            .update({ 
              status: 'opened',
              opened_at: new Date().toISOString(),
            })
            .eq('rfp_id', rfp_id)
            .eq('advisor_id', advisor.id)
            .is('opened_at', null);
        }
      }
    } catch (error) {
      console.warn('Error marking RFP as opened (non-critical):', error);
    }
  };

  // Helper to safely parse request_files (handles double-encoded JSON string data)
  const parseRequestFiles = (files: any): Array<{name: string, url: string, size: number, path: string}> => {
    if (!files) return [];
    
    // If it's already an array, use it directly
    if (Array.isArray(files)) return files;
    
    // If it's a string (double-encoded JSON), parse it
    if (typeof files === 'string') {
      try {
        const parsed = JSON.parse(files);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    
    return [];
  };

  const refreshFileUrls = async (files: Array<{name: string, url: string, size: number, path: string}>) => {
    try {
      console.log('[RFPDetails] Refreshing signed URLs for files:', files.length);
      
      const refreshedFiles = await Promise.all(
        files.map(async (file) => {
          // Skip if no path (shouldn't happen, but safety check)
          if (!file.path) {
            console.warn('[RFPDetails] File has no path:', file.name);
            return file;
          }

          // Generate fresh signed URL (24 hours expiry)
          const { data: signedData, error: signedError } = await supabase.storage
            .from('rfp-request-files')
            .createSignedUrl(file.path, 86400); // 24 hours

          if (signedError || !signedData) {
            console.error('[RFPDetails] Error generating signed URL:', signedError);
            return file; // Return original if refresh fails
          }

          console.log('[RFPDetails] Refreshed signed URL for:', file.name);
          
          return {
            ...file,
            url: signedData.signedUrl
          };
        })
      );

      return refreshedFiles;
    } catch (error) {
      console.error('[RFPDetails] Unexpected error refreshing URLs:', error);
      return files; // Return original files if refresh fails
    }
  };

  const fetchRFPDetails = async () => {
    try {
      // Step 1: Verify user is authenticated
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

      // Step 2: Wait for valid session to ensure auth.uid() is set for RLS
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.id !== authUser.id) {
        console.warn('[RFPDetails] Session mismatch, retrying...', {
          userId: authUser.id,
          sessionUserId: session?.user?.id || 'null',
        });
        // Retry after a short delay
        setTimeout(fetchRFPDetails, 500);
        return;
      }

      console.log('[RFPDetails] Session verified:', {
        userId: authUser.id,
        param: invite_id ? `invite_id=${invite_id}` : `rfp_id=${rfp_id}`,
      });

      // Step 3: Fetch advisor profile
      const { data: advisor, error: advisorError } = await supabase
        .from('advisors')
        .select('id')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (advisorError || !advisor) {
        console.error('[RFPDetails] Advisor fetch error:', advisorError);
        toast({
          title: "שגיאה",
          description: reportableError(
            "שגיאה בטעינת פרופיל יועץ",
            formatSupabaseError(advisorError),
            { userId: authUser.id }
          ),
          variant: "destructive",
        });
        navigate(getDashboardRouteForRole(primaryRole));
        return;
      }

      setAdvisorId(advisor.id);

      // Step 4: Fetch RFP invitation - prefer invite_id, fallback to rfp_id
      let invite, inviteError;
      
      if (invite_id) {
        // Primary path: fetch by unique invite_id
        const result = await supabase
          .from('rfp_invites')
          .select(`
            *,
            rfps!rfp_invites_rfp_id_fkey!inner (
              *,
              projects!inner (*, owner_id)
            )
          `)
          .eq('id', invite_id)
          .maybeSingle();
        
        invite = result.data;
        inviteError = result.error;
      } else if (rfp_id) {
        // Fallback path: fetch by rfp_id + advisor_id
        const result = await supabase
          .from('rfp_invites')
          .select(`
            *,
            rfps!rfp_invites_rfp_id_fkey!inner (
              *,
              projects!inner (*, owner_id)
            )
          `)
          .eq('rfp_id', rfp_id)
          .eq('advisor_id', advisor.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        invite = result.data;
        inviteError = result.error;
      }

      if (inviteError || !invite) {
        console.error('[RFPDetails] Invite fetch error:', inviteError);
        toast({
          title: "שגיאה בטעינת ההזמנה",
          description: reportableError(
            "לא נמצאה הזמנה להצעת מחיר",
            formatSupabaseError(inviteError),
            { invite_id, rfp_id, advisor_id: advisor.id }
          ),
          variant: "destructive",
        });
        navigate(getDashboardRouteForRole(primaryRole));
        return;
      }

      // Fetch entrepreneur organization name (with fallback to profile name)
      let entrepreneurName = 'יזם';
      if (invite.rfps?.projects?.owner_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, organization_id')
          .eq('user_id', invite.rfps.projects.owner_id)
          .maybeSingle();
        
        if (profile) {
          if (profile.organization_id) {
            // Fetch organization name
            const { data: company } = await supabase
              .from('companies')
              .select('name')
              .eq('id', profile.organization_id)
              .maybeSingle();
            
            entrepreneurName = company?.name || profile.name || 'יזם';
          } else {
            entrepreneurName = profile.name || 'יזם';
          }
        }
      }

      // Merge entrepreneur name into rfpData
      const enrichedRfpData = {
        ...invite.rfps,
        projects: {
          ...invite.rfps.projects,
          entrepreneur_name: entrepreneurName
        }
      };

      setRfpDetails(enrichedRfpData as any);
      
      // Parse request_files (handles double-encoded JSON from database)
      const parsedFiles = parseRequestFiles(invite.request_files);
      
      const inviteData: RFPInvite = {
        id: invite.id,
        status: invite.status,
        created_at: invite.created_at,
        deadline_at: invite.deadline_at,
        advisor_type: invite.advisor_type,
        request_title: invite.request_title,
        request_content: invite.request_content,
        request_files: parsedFiles,
        service_details_mode: invite.service_details_mode,
        service_details_text: invite.service_details_text,
        service_details_file: invite.service_details_file,
        payment_terms: invite.payment_terms
      };

      // Refresh file URLs if files exist
      if (inviteData.request_files && inviteData.request_files.length > 0) {
        const refreshedFiles = await refreshFileUrls(inviteData.request_files);
        inviteData.request_files = refreshedFiles;
      }

      // Refresh service details file URL if exists
      if (inviteData.service_details_file?.path) {
        const { data: signedData } = await supabase.storage
          .from('rfp-request-files')
          .createSignedUrl(inviteData.service_details_file.path, 86400);
        
        if (signedData) {
          inviteData.service_details_file = {
            ...inviteData.service_details_file,
            url: signedData.signedUrl
          };
        }
      }

      setInviteDetails(inviteData);

      // Fetch service scope items
      const { data: scopeData } = await supabase
        .from('rfp_service_scope_items')
        .select('*')
        .eq('rfp_invite_id', invite.id)
        .order('display_order', { ascending: true });

      if (scopeData) {
        setScopeItems(scopeData);
      }

      // Fetch fee items
      const { data: feeData } = await supabase
        .from('rfp_request_fee_items')
        .select('*')
        .eq('rfp_invite_id', invite.id)
        .order('display_order', { ascending: true });

      if (feeData) {
        setFeeItems(feeData);
      }

      // Check for existing proposal for this specific invite (not project-wide)
      const { data: proposalData } = await supabase
        .from('proposals')
        .select('id, status')
        .eq('rfp_invite_id', invite.id)
        .not('status', 'eq', 'withdrawn')
        .maybeSingle();

      if (proposalData) {
        console.log('[RFPDetails] Existing proposal found:', proposalData);
        setExistingProposal(proposalData);
      }

      // Fetch project files
      const projectId = invite.rfps.projects.id;
      const { data: projectFilesData, error: projectFilesError } = await supabase
        .from('project_files')
        .select('id, file_name, file_url, size_mb, file_type, custom_name')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (projectFilesData && !projectFilesError) {
        console.log('[RFPDetails] Project files fetched:', projectFilesData.length);
        // Generate signed URLs for the files
        const filesWithUrls = await Promise.all(
          projectFilesData.map(async (file) => {
            // Extract storage path from file_url if it's a full URL, or use file_url as path
            let storagePath = file.file_url;
            
            // If it's already a signed URL, extract the path
            if (file.file_url.includes('project-files/')) {
              const match = file.file_url.match(/project-files\/(.+?)(\?|$)/);
              if (match) {
                storagePath = match[1];
              }
            }

            const { data: signedData } = await supabase.storage
              .from('project-files')
              .createSignedUrl(storagePath, 86400); // 24 hours

            return { 
              ...file, 
              file_url: signedData?.signedUrl || file.file_url 
            };
          })
        );
        setProjectFiles(filesWithUrls);
      }

    } catch (error) {
      console.error('[RFPDetails] Unexpected error:', error);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בטעינת פרטי ההזמנה",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'responded': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'ממתין לתגובה';
      case 'sent': return 'נשלח';
      case 'opened': return 'נפתח';
      case 'in_progress': return 'בעבודה';
      case 'submitted': return 'הוגש';
      case 'declined': return 'נדחה';
      case 'expired': return 'פג תוקף';
      default: return status;
    }
  };

  const handleDecline = async (
    reason: 'no_capacity' | 'outside_expertise' | 'timeline_conflict' | 'budget_mismatch' | 'other', 
    note?: string
  ) => {
    if (!inviteDetails?.id) return;
    
    const result = await declineRFP(inviteDetails.id, reason, note);
    if (result.success) {
      navigate(getDashboardRouteForRole(primaryRole));
    }
  };

  // Helper functions for rendering have been moved inline to the Tabs component

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">טוען...</p>
        </div>
      </div>
    );
  }

  if (!rfpDetails) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle>הזמנה לא נמצאה</CardTitle>
            <CardDescription>לא נמצאה הזמנה להצעת מחיר</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(getDashboardRouteForRole(primaryRole))}>
              חזרה ללוח הבקרה
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if actions should be shown - block if proposal already exists
  const showActions = ['sent', 'opened', 'pending', 'in_progress'].includes(inviteDetails?.status || '') && 
    (inviteDetails?.status !== 'expired') &&
    (!inviteDetails?.deadline_at || new Date(inviteDetails.deadline_at) > new Date()) &&
    !existingProposal;

  return (
    <div className="min-h-screen bg-background pb-24" dir="rtl">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 flex justify-between items-center px-4 py-3 md:px-6 md:py-4 border-b bg-background/95 backdrop-blur-sm">
        <NavigationLogo size="md" />
        <div className="flex items-center gap-2 md:gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(getDashboardRouteForRole(primaryRole))}
            className="hidden md:flex items-center gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה לדשבורד
          </Button>
          <UserHeader />
        </div>
      </div>
      
      <div className="px-4 py-4 md:px-6 md:py-6">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
          {/* Header with status */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold truncate">{rfpDetails.projects.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">אם בקשה זו רלוונטית עבורך, אנו מזמינים אותך להגיש הצעת מחיר דרך המערכת.</p>
            </div>
            <Badge className={`${getStatusColor(inviteDetails?.status || '')} self-start md:self-auto flex-shrink-0`}>
              {getStatusText(inviteDetails?.status || '')}
            </Badge>
          </div>

          {/* Invite Details Card - Moved to top */}
          <Card>
            <CardContent className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {inviteDetails?.advisor_type && (
                  <div>
                    <Label className="text-xs text-muted-foreground">סוג היועץ</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="text-xs">{inviteDetails.advisor_type}</Badge>
                    </div>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">תאריך שליחה</Label>
                  <p className="text-sm font-medium mt-1">
                    {rfpDetails?.sent_at 
                      ? new Date(rfpDetails.sent_at).toLocaleDateString('he-IL')
                      : inviteDetails?.created_at 
                        ? new Date(inviteDetails.created_at).toLocaleDateString('he-IL')
                        : '—'
                    }
                  </p>
                </div>
                {/* Deadline - Compact inline */}
                {inviteDetails?.deadline_at && ['sent', 'opened', 'in_progress'].includes(inviteDetails.status) && (
                  <div className="col-span-2 md:col-span-1">
                    <Label className="text-xs text-muted-foreground">זמן להגשה</Label>
                    <div className="mt-1">
                      <DeadlineCountdown deadline={inviteDetails.deadline_at} compact />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Project Summary Card - Compact */}
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              פרטי הפרויקט
            </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">שם הארגון</Label>
                  <p className="text-sm font-medium flex items-center gap-1 mt-0.5">
                    <Building2 className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{rfpDetails.projects.entrepreneur_name || 'לא צוין'}</span>
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">מיקום</Label>
                  <p className="text-sm font-medium flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{rfpDetails.projects.location || 'לא צוין'}</span>
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">סוג הפרויקט</Label>
                  <p className="text-sm font-medium mt-0.5 truncate">{rfpDetails.projects.type || 'לא צוין'}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">שלב</Label>
                  <p className="text-sm font-medium mt-0.5 truncate">{rfpDetails.projects.phase || 'לא צוין'}</p>
                </div>
              </div>
              {rfpDetails.projects.description && (
                <div className="mt-3 pt-3 border-t">
                  <Label className="text-xs text-muted-foreground">תיאור הפרויקט</Label>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-3">
                    {rfpDetails.projects.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Tabbed Content */}
          <Card>
            <CardContent className="p-4">
              <Tabs defaultValue="main" dir="rtl">
                <TabsList className="w-full grid grid-cols-4 h-auto p-1 bg-muted/50">
                  <TabsTrigger value="main" className="flex items-center gap-1.5 text-xs md:text-sm py-2 data-[state=active]:bg-background">
                    <Home className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">ראשי</span>
                  </TabsTrigger>
                  <TabsTrigger value="services" className="flex items-center gap-1.5 text-xs md:text-sm py-2 data-[state=active]:bg-background">
                    <List className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">שירותים</span>
                  </TabsTrigger>
                  <TabsTrigger value="fees" className="flex items-center gap-1.5 text-xs md:text-sm py-2 data-[state=active]:bg-background">
                    <Coins className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">שכ"ט</span>
                  </TabsTrigger>
                  <TabsTrigger value="payment" className="flex items-center gap-1.5 text-xs md:text-sm py-2 data-[state=active]:bg-background">
                    <CreditCard className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">תשלום</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: ראשי (Main) */}
                <TabsContent value="main" className="space-y-4 mt-4">
                  {inviteDetails?.request_title && (
                    <div>
                      <Label className="font-medium text-sm">כותרת הבקשה</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {inviteDetails.request_title}
                      </p>
                    </div>
                  )}
                  
                  {inviteDetails?.request_content ? (
                    <div>
                      <Label className="font-medium text-sm">תיאור הבקשה</Label>
                      <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm whitespace-pre-wrap">
                          {inviteDetails.request_content}
                        </p>
                      </div>
                    </div>
                  ) : (
                    !inviteDetails?.request_title && (!inviteDetails?.request_files || inviteDetails.request_files.length === 0) && (
                      <div className="text-center py-6 text-muted-foreground">
                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">לא צורף תיאור לבקשה</p>
                      </div>
                    )
                  )}
                  
                  {inviteDetails?.request_files && Array.isArray(inviteDetails.request_files) && inviteDetails.request_files.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-medium text-sm">קבצים מצורפים ({inviteDetails.request_files.length})</Label>
                        {inviteDetails.request_files.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadAllFiles(inviteDetails.request_files!)}
                            disabled={fileLoading === 'all'}
                            className="gap-1.5 text-xs h-8"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {fileLoading === 'all' ? 'מוריד...' : 'הורד הכל'}
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {inviteDetails.request_files.map((file, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center gap-2 p-2.5 bg-muted rounded-lg"
                          >
                            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="flex-1 text-sm truncate">{file.name}</span>
                            <Badge variant="outline" className="text-xs hidden sm:flex">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadFile(file)}
                              disabled={fileLoading === file.name || fileLoading === 'all'}
                              className="gap-1.5 h-8 text-xs"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">{fileLoading === file.name ? 'מוריד...' : 'הורד'}</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Project Files Section */}
                  {projectFiles.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-medium text-sm">קבצי הפרויקט ({projectFiles.length})</Label>
                        {projectFiles.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadAllFiles(projectFiles.map(f => ({ 
                              url: f.file_url, 
                              name: f.custom_name || f.file_name 
                            })))}
                            disabled={fileLoading === 'all'}
                            className="gap-1.5 text-xs h-8"
                          >
                            <Download className="h-3.5 w-3.5" />
                            {fileLoading === 'all' ? 'מוריד...' : 'הורד הכל'}
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {projectFiles.map((file) => (
                          <div 
                            key={file.id}
                            className="flex items-center gap-2 p-2.5 bg-muted rounded-lg"
                          >
                            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="flex-1 text-sm truncate">{file.custom_name || file.file_name}</span>
                            {file.size_mb && (
                              <Badge variant="outline" className="text-xs hidden sm:flex">
                                {file.size_mb.toFixed(2)} MB
                              </Badge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadFile({ url: file.file_url, name: file.custom_name || file.file_name })}
                              disabled={fileLoading === file.file_name || fileLoading === 'all'}
                              className="gap-1.5 h-8 text-xs"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">{fileLoading === file.file_name ? 'מוריד...' : 'הורד'}</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 2: פירוט שירותים (Service Details) */}
                <TabsContent value="services" className="space-y-4 mt-4">
                  {/* Show all available content, not just the selected mode */}
                  {(inviteDetails?.service_details_text || inviteDetails?.service_details_file || scopeItems.length > 0) ? (
                    <div className="space-y-6">
                      {/* Free text section - show if text exists */}
                      {inviteDetails?.service_details_text && (
                        <div>
                          <Label className="font-medium text-sm">תיאור השירותים</Label>
                          <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm whitespace-pre-wrap">
                              {inviteDetails.service_details_text}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* File section - show if file exists */}
                      {inviteDetails?.service_details_file && (
                        <div>
                          <Label className="font-medium text-sm">קובץ פירוט שירותים</Label>
                          <div className="flex items-center gap-2 p-2.5 bg-muted rounded-lg mt-2">
                            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="flex-1 text-sm truncate">{inviteDetails.service_details_file.name}</span>
                            <Badge variant="outline" className="text-xs hidden sm:flex">
                              {(inviteDetails.service_details_file.size / 1024 / 1024).toFixed(2)} MB
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadFile(inviteDetails.service_details_file!)}
                              disabled={fileLoading === inviteDetails.service_details_file.name}
                              className="gap-1.5 h-8 text-xs"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">{fileLoading === inviteDetails.service_details_file.name ? 'מוריד...' : 'הורד'}</span>
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Checklist section - show if items exist */}
                      {scopeItems.length > 0 && (
                        <div>
                          <Label className="font-medium text-sm">רשימת שירותים</Label>
                          <div className="space-y-1.5 mt-2">
                            {scopeItems.map((item) => (
                              <div 
                                key={item.id} 
                                className={`flex items-center gap-2 p-2.5 rounded-lg ${
                                  item.is_included ? 'bg-green-50 dark:bg-green-950/20' : 'bg-muted'
                                }`}
                              >
                                {item.is_included ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                )}
                                <span className={`flex-1 text-sm ${item.is_included ? '' : 'text-muted-foreground line-through'}`}>
                                  {item.task_name}
                                </span>
                                <div className="flex gap-1.5 flex-shrink-0">
                                  {item.is_optional && (
                                    <Badge variant="outline" className="text-xs">אופציונלי</Badge>
                                  )}
                                  {item.fee_category && item.fee_category !== 'כללי' && (
                                    <Badge variant="secondary" className="text-xs hidden sm:flex">{item.fee_category}</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <List className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">לא הוגדרו פרטי שירותים</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 3: שכר טרחה (Fees) */}
                <TabsContent value="fees" className="space-y-4 mt-4">
                  {feeItems.length > 0 ? (
                    <>
                      {/* Required items */}
                      {feeItems.filter(item => !item.is_optional).length > 0 && (
                        <div className="space-y-2">
                          <Label className="font-medium text-sm">סעיפים חובה</Label>
                          <div className="border rounded-lg overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="text-right text-xs">#</TableHead>
                                  <TableHead className="text-right text-xs">תיאור</TableHead>
                                  <TableHead className="text-right text-xs hidden sm:table-cell">יחידה</TableHead>
                                  <TableHead className="text-right text-xs">כמות</TableHead>
                                  <TableHead className="text-right text-xs hidden md:table-cell">מחיר</TableHead>
                                  <TableHead className="text-right text-xs hidden lg:table-cell">סוג</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {feeItems.filter(item => !item.is_optional).map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-medium text-sm">{item.item_number}</TableCell>
                                    <TableCell className="text-sm">{item.description || 'לא צוין'}</TableCell>
                                    <TableCell className="text-sm hidden sm:table-cell">{UNIT_LABELS[item.unit] || item.unit || 'לא צוין'}</TableCell>
                                    <TableCell className="text-sm">{item.quantity || '—'}</TableCell>
                                    <TableCell className="text-sm hidden md:table-cell">
                                      {item.unit_price ? `₪${item.unit_price.toLocaleString()}` : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm hidden lg:table-cell">{CHARGE_TYPE_LABELS[item.charge_type] || item.charge_type || '—'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}

                      {/* Optional items */}
                      {feeItems.filter(item => item.is_optional).length > 0 && (
                        <div className="space-y-2">
                          <Label className="font-medium text-sm">סעיפים אופציונליים</Label>
                          <div className="border rounded-lg overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="text-right text-xs">#</TableHead>
                                  <TableHead className="text-right text-xs">תיאור</TableHead>
                                  <TableHead className="text-right text-xs hidden sm:table-cell">יחידה</TableHead>
                                  <TableHead className="text-right text-xs">כמות</TableHead>
                                  <TableHead className="text-right text-xs hidden md:table-cell">מחיר</TableHead>
                                  <TableHead className="text-right text-xs hidden lg:table-cell">סוג</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {feeItems.filter(item => item.is_optional).map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="font-medium text-sm">{item.item_number}</TableCell>
                                    <TableCell className="text-sm">{item.description || 'לא צוין'}</TableCell>
                                    <TableCell className="text-sm hidden sm:table-cell">{UNIT_LABELS[item.unit] || item.unit || 'לא צוין'}</TableCell>
                                    <TableCell className="text-sm">{item.quantity || '—'}</TableCell>
                                    <TableCell className="text-sm hidden md:table-cell">
                                      {item.unit_price ? `₪${item.unit_price.toLocaleString()}` : '—'}
                                    </TableCell>
                                    <TableCell className="text-sm hidden lg:table-cell">{CHARGE_TYPE_LABELS[item.charge_type] || item.charge_type || '—'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Coins className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">לא הוגדרו סעיפי שכר טרחה</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 4: תשלום (Payment) */}
                <TabsContent value="payment" className="space-y-4 mt-4">
                  {inviteDetails?.payment_terms && (
                    inviteDetails.payment_terms.milestone_payments?.length || 
                    inviteDetails.payment_terms.payment_term_type ||
                    inviteDetails.payment_terms.notes
                  ) ? (
                    <>
                      {/* Milestone payments */}
                      {inviteDetails.payment_terms.milestone_payments && inviteDetails.payment_terms.milestone_payments.length > 0 && (
                        <div className="space-y-2">
                          <Label className="font-medium text-sm">אבני דרך לתשלום</Label>
                          <div className="border rounded-lg overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/50">
                                  <TableHead className="text-right text-xs">תיאור</TableHead>
                                  <TableHead className="text-right text-xs">אחוז</TableHead>
                                  <TableHead className="text-right text-xs hidden sm:table-cell">טריגר</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {inviteDetails.payment_terms.milestone_payments.map((milestone, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="text-sm">{milestone.description || 'לא צוין'}</TableCell>
                                    <TableCell className="text-sm">{milestone.percentage}%</TableCell>
                                    <TableCell className="text-sm hidden sm:table-cell">{milestone.trigger || '—'}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            סה"כ: {inviteDetails.payment_terms.milestone_payments.reduce((sum, m) => sum + m.percentage, 0)}%
                          </div>
                        </div>
                      )}

                      {/* Payment term type */}
                      {inviteDetails.payment_terms.payment_term_type && (
                        <div>
                          <Label className="font-medium text-sm">תנאי תשלום</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {PAYMENT_TERM_LABELS[inviteDetails.payment_terms.payment_term_type] || inviteDetails.payment_terms.payment_term_type}
                          </p>
                        </div>
                      )}

                      {/* Notes */}
                      {inviteDetails.payment_terms.notes && (
                        <div>
                          <Label className="font-medium text-sm">הערות נוספות</Label>
                          <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm whitespace-pre-wrap">
                              {inviteDetails.payment_terms.notes}
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">לא הוגדרו תנאי תשלום</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t p-3 md:p-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
          {showActions ? (
            <>
              <Button 
                onClick={() => {
                  if (invite_id) {
                    navigate(`/invite/${invite_id}/submit`);
                  } else if (rfp_id) {
                    navigate(`/submit-proposal/${rfp_id}`);
                  }
                }}
                size="lg"
                className="flex-1 sm:flex-none sm:min-w-[180px] gap-2"
              >
                <Send className="w-4 h-4" />
                הגש הצעת מחיר
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeclineDialogOpen(true)}
                size="lg"
                className="flex-1 sm:flex-none gap-2"
              >
                <X className="w-4 h-4" />
                דחה בקשה
              </Button>
            </>
          ) : existingProposal ? (
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
              <div className="flex items-center gap-2">
                {existingProposal.status === 'accepted' && (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-700 font-medium">הצעתך אושרה</span>
                  </>
                )}
                {existingProposal.status === 'rejected' && (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-700 font-medium">הצעתך נדחתה</span>
                  </>
                )}
                {existingProposal.status === 'submitted' && (
                  <>
                    <Send className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-700 font-medium">הצעתך הוגשה בהצלחה</span>
                  </>
                )}
                {existingProposal.status === 'negotiation_requested' && (
                  <>
                    <MessageSquare className="h-4 w-4 text-orange-600" />
                    <span className="text-orange-700 font-medium">הצעתך במשא ומתן</span>
                  </>
                )}
                {existingProposal.status === 'under_review' && (
                  <>
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-700 font-medium">הצעתך בבדיקה</span>
                  </>
                )}
                {existingProposal.status === 'resubmitted' && (
                  <>
                    <Send className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-700 font-medium">הצעתך הוגשה מחדש</span>
                  </>
                )}
              </div>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => setViewProposalDialogOpen(true)}
                className="sm:me-auto gap-2"
              >
                <Eye className="w-4 h-4" />
                צפה בהצעה שלי
              </Button>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-1">
              {inviteDetails?.status === 'submitted' && 'ההצעה הוגשה בהצלחה'}
              {inviteDetails?.status === 'declined' && 'הבקשה נדחתה'}
              {inviteDetails?.status === 'expired' && 'פג תוקף ההגשה'}
            </div>
          )}
          <Button 
            variant="ghost" 
            onClick={() => navigate(getDashboardRouteForRole(primaryRole))}
            size="lg"
            className="sm:hidden gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            חזרה לדשבורד
          </Button>
        </div>
      </div>

      <DeclineRFPDialog
        open={declineDialogOpen}
        onOpenChange={setDeclineDialogOpen}
        onDecline={handleDecline}
        loading={declining}
      />

      {existingProposal && (
        <AdvisorProposalViewDialog
          open={viewProposalDialogOpen}
          onOpenChange={setViewProposalDialogOpen}
          proposalId={existingProposal.id}
        />
      )}
    </div>
  );
};

export default RFPDetails;
