import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import coverOption1 from '@/assets/cover-option-1.jpg';
import coverOption2 from '@/assets/cover-option-2.jpg';
import coverOption3 from '@/assets/cover-option-3.jpg';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Coins, Clock, FileText, AlertTriangle, Star, Bell, Upload, Building2, ShieldCheck, AlertCircle, XCircle, Trophy } from 'lucide-react';
import { UserHeader } from '@/components/UserHeader';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import NavigationLogo from '@/components/NavigationLogo';
import { DeclineRFPDialog } from '@/components/DeclineRFPDialog';
import { useDeclineRFP } from '@/hooks/useDeclineRFP';
import BackToTop from '@/components/BackToTop';
import { ProposalStatusBadge } from '@/components/ProposalStatusBadge';
import { NotificationsDropdown } from '@/components/NotificationsDropdown';
import { AdvisorProposalViewDialog } from '@/components/AdvisorProposalViewDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';

const COVER_OPTIONS = [
  { id: '0', image: '' },
  { id: '1', image: coverOption1 },
  { id: '2', image: coverOption2 },
  { id: '3', image: coverOption3 },
];


interface RFPInvite {
  id: string;
  rfp_id: string;
  advisor_type?: string;
  status: string;
  created_at: string;
  deadline_at?: string;
  opened_at?: string | null;
  decline_reason?: string;
  decline_note?: string;
  rfps: {
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
      owner_id: string;
      entrepreneur_name?: string;
    };
  };
}

interface AdvisorProposal {
  id: string;
  price: number;
  timeline_days: number;
  status: string;
  submitted_at: string;
  project_id: string;
  projects: {
    name: string;
    type: string;
    location: string;
  };
  project_advisors?: Array<{
    selected_at: string;
    selected_by: string;
    start_date?: string;
    end_date?: string;
    fee_amount?: number;
    fee_currency?: string;
    payment_terms?: string;
    scope_of_work?: string;
    agreement_url?: string;
  }>;
}

interface AdvisorProfile {
  id: string;
  company_name: string;
  expertise: string[];
  specialties: string[];
  location: string;
  rating: number;
  founding_year: number | null;
  activity_regions: string[] | null;
  office_size: string | null;
  office_phone: string | null;
  position_in_office: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  admin_approved: boolean;
}

interface UserProfile {
  name: string | null;
  phone: string | null;
}

const AdvisorDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [rfpInvites, setRfpInvites] = useState<RFPInvite[]>([]);
  const [proposals, setProposals] = useState<AdvisorProposal[]>([]);
  const [advisorProfile, setAdvisorProfile] = useState<AdvisorProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [selectedInviteToDecline, setSelectedInviteToDecline] = useState<string | null>(null);
  const [proposalMap, setProposalMap] = useState<Map<string, AdvisorProposal>>(new Map());
  const [activeTab, setActiveTab] = useState<'rfp-invites' | 'my-proposals'>('rfp-invites');
  const [filterType, setFilterType] = useState<'all' | 'new' | 'unsubmitted'>('all');
  const [proposalFilter, setProposalFilter] = useState<'all' | 'accepted' | 'submitted' | 'under_review' | 'rejected'>('all');
  const [proposalViewDialogOpen, setProposalViewDialogOpen] = useState(false);
  const [selectedProposalToView, setSelectedProposalToView] = useState<string | null>(null);
  const { declineRFP, loading: declining } = useDeclineRFP();

  useEffect(() => {
    if (user) {
      fetchAdvisorData();
    }
  }, [user]);

  const fetchAdvisorData = async () => {
    if (!user) {
      console.debug('[AdvisorDashboard] No user, skipping fetch');
      return;
    }

    console.debug('[AdvisorDashboard] ========================================');
    console.debug('[AdvisorDashboard] Starting fetch for user:', user.id, user.email);

    try {
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, phone')
        .eq('user_id', user?.id)
        .single();

      if (profileError) {
        console.error('[AdvisorDashboard] ❌ Profile error:', profileError);
      }

      setUserProfile(profile);

      // Fetch advisor profile
      const { data: advisor, error: advisorError } = await supabase
        .from('advisors')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (advisorError) {
        console.error('[AdvisorDashboard] ❌ Advisor profile error:', advisorError);
      }

      setAdvisorProfile(advisor);

      console.debug('[AdvisorDashboard] ✅ Advisor profile:', {
        id: advisor?.id,
        company_name: advisor?.company_name,
        admin_approved: advisor?.admin_approved,
        is_active: advisor?.is_active,
      });

      if (advisor) {
        // Step 1: Fetch RFP invites with EXPLICIT error handling
        console.debug('[AdvisorDashboard] Querying rfp_invites for advisor_id:', advisor.id);
        
        const { data: invites, error: invitesError, status, statusText } = await supabase
          .from('rfp_invites')
          .select('id, rfp_id, advisor_type, status, created_at, deadline_at, opened_at, decline_reason, decline_note')
          .eq('advisor_id', advisor.id)
          .order('created_at', { ascending: false });

        console.debug('[AdvisorDashboard] RFP Invites query result:', {
          invitesCount: invites?.length || 0,
          error: invitesError,
          status,
          statusText,
        });

        if (invitesError) {
          console.error('[AdvisorDashboard] ❌ INVITES ERROR:', {
            message: invitesError.message,
            details: invitesError.details,
            hint: invitesError.hint,
            code: invitesError.code,
          });
          toast({
            title: "שגיאה",
            description: `לא ניתן לטעון הזמנות: ${invitesError.message}`,
            variant: "destructive",
          });
          setRfpInvites([]);
          setLoading(false);
          return;
        }

        if (!invites) {
          console.warn('[AdvisorDashboard] ⚠️ Invites is null (possible RLS denial without explicit error)');
          toast({
            title: "שגיאה",
            description: "לא ניתן לטעון הזמנות. ייתכן שאין לך הרשאות מתאימות.",
            variant: "destructive",
          });
          setRfpInvites([]);
          setLoading(false);
          return;
        }

        if (invites.length === 0) {
          console.debug('[AdvisorDashboard] ℹ️ No invites found (empty result set)');
          setRfpInvites([]);
        } else {
          console.debug('[AdvisorDashboard] ✅ Found', invites.length, 'invites');
          invites.forEach((inv, idx) => {
            console.debug(`[AdvisorDashboard]   Invite ${idx + 1}:`, {
              id: inv.id,
              rfp_id: inv.rfp_id,
              status: inv.status,
              advisor_type: inv.advisor_type,
            });
          });

          // Step 2: Fetch RFPs for the rfp_ids
          const rfpIds = invites.map(inv => inv.rfp_id);
          console.debug('[AdvisorDashboard] Fetching RFPs for', rfpIds.length, 'IDs');
          
          const { data: rfps, error: rfpsError } = await supabase
            .from('rfps')
            .select('id, subject, body_html, sent_at, project_id')
            .in('id', rfpIds);

          if (rfpsError) {
            console.error('[AdvisorDashboard] ❌ RFPs error:', rfpsError);
          }
          console.debug('[AdvisorDashboard] ✅ Fetched RFPs:', rfps?.length || 0);

          // Step 3: Fetch projects (even if rfps is empty, still try)
          let projects: any[] = [];
          if (rfps && rfps.length > 0) {
            const projectIds = rfps.map(rfp => rfp.project_id);
            console.debug('[AdvisorDashboard] Fetching projects for', projectIds.length, 'IDs');
            
            const { data: projectsData, error: projectsError } = await supabase
              .from('projects')
              .select('id, name, type, location, budget, timeline_start, timeline_end, description, owner_id')
              .in('id', projectIds);

            if (projectsError) {
              console.error('[AdvisorDashboard] ❌ Projects error:', projectsError);
            }
            console.debug('[AdvisorDashboard] ✅ Fetched projects:', projectsData?.length || 0);
            
            // Fetch entrepreneur names
            let entrepreneurNames: Record<string, string> = {};
            if (projectsData && projectsData.length > 0) {
              const ownerIds = [...new Set(projectsData.map(p => p.owner_id))];
              const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id, name')
                .in('user_id', ownerIds);
              
              if (profiles) {
                entrepreneurNames = Object.fromEntries(
                  profiles.map(p => [p.user_id, p.name || 'יזם'])
                );
              }
            }
            
            projects = projectsData?.map(project => ({
              ...project,
              entrepreneur_name: entrepreneurNames[project.owner_id] || 'יזם'
            })) || [];
          }

          // Step 4: Client-side merge - always keep invites, attach data when available
          const mergedInvites = invites.map(invite => {
            const rfp = rfps?.find(r => r.id === invite.rfp_id);
            const project = rfp ? projects?.find(p => p.id === rfp.project_id) : null;
            
            console.debug('[AdvisorDashboard]   Patch invite', invite.id, {
              rfp_found: !!rfp,
              rfp_id: invite.rfp_id,
              project_found: !!project,
              project_id: rfp?.project_id,
            });
            
            return {
              ...invite,
              rfps: rfp ? {
                ...rfp,
                projects: project || null
              } : null
            };
          });

          console.debug('[AdvisorDashboard] ========================================');
          console.debug('[AdvisorDashboard] ✅ FINAL: Merged', mergedInvites.length, 'invites');
          setRfpInvites(mergedInvites as any);
        }

        // Fetch submitted proposals with approval data
        const { data: proposalData } = await supabase
          .from('proposals')
          .select(`
            *,
            projects!proposals_project_id_fkey (name, type, location),
            project_advisors!project_advisors_proposal_id_fkey (
              selected_at,
              selected_by,
              start_date,
              end_date,
              fee_amount,
              fee_currency,
              payment_terms,
              scope_of_work,
              agreement_url
            )
          `)
          .eq('advisor_id', advisor.id)
          .order('submitted_at', { ascending: false });

        setProposals(proposalData || []);

        // Create a map of project_id -> proposal for quick lookup
        const proposalsByProject = new Map(
          (proposalData || []).map(p => [p.project_id, p])
        );
        setProposalMap(proposalsByProject);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load advisor data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('advisor-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('advisor-assets')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('advisors')
        .update({ logo_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAdvisorProfile(prev => prev ? { ...prev, logo_url: publicUrl } : null);
      toast({
        title: "הלוגו עודכן",
        description: "הלוגו שלך הועלה בהצלחה",
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן להעלות את הלוגו",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const getCoverImage = (coverId: string | null | undefined): string => {
    if (!coverId || coverId === '0') return ''; // No cover
    const option = COVER_OPTIONS.find(opt => opt.id === coverId);
    return option ? option.image : ''; // Default to no cover
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'opened': return 'bg-cyan-100 text-cyan-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'responded': return 'bg-blue-100 text-blue-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'reviewed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent': return 'נשלח';
      case 'opened': return 'נפתח';
      case 'in_progress': return 'בתהליך';
      case 'submitted': return 'הוגש';
      case 'declined': return 'נדחה';
      case 'expired': return 'פג תוקף';
      case 'pending': return 'ממתין לתגובה';
      case 'responded': return 'נענה';
      case 'received': return 'התקבל';
      case 'reviewed': return 'נבדק';
      default: return status;
    }
  };

  const canSubmitProposal = (status: string, deadline?: string) => {
    const statusAllows = ['sent', 'opened', 'in_progress', 'pending'].includes(status);
    const deadlineNotPassed = !deadline || new Date(deadline) > new Date();
    return statusAllows && deadlineNotPassed;
  };

  // Check if an invite is inactive (declined, expired, or past deadline)
  const isInactiveInvite = (invite: RFPInvite) => {
    if (['declined', 'expired'].includes(invite.status)) return true;
    if (invite.deadline_at && new Date(invite.deadline_at) < new Date()) return true;
    return false;
  };

  const handleDeclineClick = (inviteId: string) => {
    setSelectedInviteToDecline(inviteId);
    setDeclineDialogOpen(true);
  };

  const handleDeclineConfirm = async (reason: string, note?: string) => {
    if (!selectedInviteToDecline) return;
    
    // Map Hebrew reason to database enum
    const reasonMap: Record<string, string> = {
      'לא רלוונטי למומחיות שלי': 'outside_expertise',
      'עומס עבודה גבוה': 'no_capacity',
      'מיקום הפרויקט רחוק מדי': 'other',
      'תקציב נמוך מדי': 'budget_mismatch',
      'לוח זמנים לא מתאים': 'timeline_conflict',
      'אחר': 'other'
    };
    
    const dbReason = reasonMap[reason] || 'other';
    
    const result = await declineRFP(
      selectedInviteToDecline, 
      dbReason as any, 
      note
    );
    
    if (result.success) {
      // Refresh the invites list
      fetchAdvisorData();
      setDeclineDialogOpen(false);
      setSelectedInviteToDecline(null);
    }
  };

  const getDeclineReasonText = (reason: string) => {
    switch (reason) {
      case 'outside_expertise': return 'מחוץ לתחום ההתמחות';
      case 'no_capacity': return 'אין זמינות כרגע';
      case 'timeline_conflict': return 'קונפליקט בלוחות זמנים';
      case 'budget_mismatch': return 'אי התאמה תקציבית';
      case 'other': return 'סיבה אחרת';
      default: return reason;
    }
  };

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

  if (!advisorProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>פרופיל יועץ לא נמצא</CardTitle>
            <CardDescription>
              נדרש להשלים את פרטי הפרופיל כדי לקבל הזמנות להצעות מחיר
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/profile')}>
              השלמת פרופיל
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Profile completion check aligned with Profile page logic
  const checkRequiredFields = () => {
    const requiredFields = [
      userProfile?.name,
      userProfile?.phone,
      advisorProfile?.company_name,
      advisorProfile?.location,
      advisorProfile?.founding_year,
      advisorProfile?.position_in_office,
      advisorProfile?.activity_regions && advisorProfile.activity_regions.length > 0,
      advisorProfile?.office_size,
      (advisorProfile?.expertise && advisorProfile.expertise.length > 0) || 
      (advisorProfile?.specialties && advisorProfile.specialties.length > 0),
    ];
    
    const filledFields = requiredFields.filter(field => field).length;
    const percentage = Math.round((filledFields / requiredFields.length) * 100);
    
    return {
      percentage,
      isComplete: percentage === 100,
      firstMissing: !userProfile?.name || !userProfile?.phone ? 'personal' :
                    !advisorProfile?.company_name || !advisorProfile?.location || 
                    !advisorProfile?.founding_year || !advisorProfile?.position_in_office || 
                    !advisorProfile?.office_size ? 'company' :
                    ((!advisorProfile?.expertise || advisorProfile.expertise.length === 0) && 
                     (!advisorProfile?.specialties || advisorProfile.specialties.length === 0)) ||
                    !advisorProfile?.activity_regions || advisorProfile.activity_regions.length === 0 ? 'professional' :
                    null
    };
  };

  const profileStatus = checkRequiredFields();
  const isProfileIncomplete = !profileStatus.isComplete;

  // New invites: not yet viewed (opened_at is null) - viewing marks them as read
  const newInvites = rfpInvites.filter(invite => !invite.opened_at);

  const unsubmittedInvites = rfpInvites.filter(invite => 
    ['sent', 'opened', 'in_progress', 'pending'].includes(invite.status) && 
    !proposalMap.has(invite.rfps?.projects?.id)
  );

  // Filter proposals by type
  const winningProposals = proposals.filter(p => p.status === 'accepted');
  const activeProposals = proposals.filter(p => !['accepted', 'rejected', 'withdrawn'].includes(p.status));
  
  const filteredProposals = proposalFilter === 'all' 
    ? proposals 
    : proposals.filter(p => p.status === proposalFilter);

  const activeInvites = rfpInvites.filter(invite => !isInactiveInvite(invite));

  // Apply filter based on filterType
  let displayedInvites = showActiveOnly ? activeInvites : rfpInvites;

  if (filterType === 'new') {
    displayedInvites = displayedInvites.filter(invite => 
      newInvites.some(newInv => newInv.id === invite.id)
    );
  } else if (filterType === 'unsubmitted') {
    displayedInvites = displayedInvites.filter(invite => 
      !proposalMap.has(invite.rfps?.projects?.id)
    );
  }

  const handleStatsCardClick = (cardType: 'all' | 'new' | 'submitted' | 'unsubmitted') => {
    switch (cardType) {
      case 'new':
        setActiveTab('rfp-invites');
        setFilterType('new');
        setShowActiveOnly(false);
        break;
      case 'submitted':
        setActiveTab('my-proposals');
        break;
      case 'unsubmitted':
        setActiveTab('rfp-invites');
        setFilterType('unsubmitted');
        setShowActiveOnly(true);
        break;
      case 'all':
      default:
        setActiveTab('rfp-invites');
        setFilterType('all');
        setShowActiveOnly(false);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="sticky top-0 z-50 flex justify-between items-center p-4 md:p-6 border-b bg-background/95 backdrop-blur-sm">
          <NavigationLogo size={isMobile ? "sm" : "md"} />
        <div className="flex items-center gap-2 md:gap-4">
          <NotificationsDropdown 
            notifications={newInvites.map(inv => ({
              id: inv.id,
              projectName: inv.rfps?.projects?.name || 'פרויקט',
              advisorType: inv.advisor_type,
              createdAt: inv.created_at
            }))}
          />
          <UserHeader />
        </div>
      </div>
      
      {/* Cover Image Banner - Only show if cover is selected */}
      {getCoverImage(advisorProfile?.cover_image_url) && (
        <div className="relative h-36 md:h-48 overflow-hidden">
          <img 
            src={getCoverImage(advisorProfile?.cover_image_url)}
            alt="Cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80"></div>
        </div>
      )}
      
      <div className="p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Logo and Info Section */}
          <div className={`flex flex-col md:flex-row items-start gap-4 ${getCoverImage(advisorProfile?.cover_image_url) ? '-mt-16' : 'mb-8'} relative z-10`}>
            {/* Logo */}
            <label htmlFor="dashboard-logo-upload" className="cursor-pointer group shrink-0 self-center md:self-start">
              <div className={`relative rounded-xl border-4 bg-background overflow-hidden hover:border-primary transition-all shadow-lg group-hover:shadow-xl ${
                getCoverImage(advisorProfile?.cover_image_url) 
                  ? 'w-20 h-20 md:w-32 md:h-32 border-background' 
                  : 'w-16 h-16 md:w-20 md:h-20 border-border'
              }`}>
                {advisorProfile?.logo_url ? (
                  <img 
                    src={advisorProfile.logo_url} 
                    alt="Logo" 
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                    <Building2 className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground mb-1 group-hover:text-primary transition-colors" />
                    <Upload className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
            </label>
            <input
              id="dashboard-logo-upload"
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              onChange={handleLogoUpload}
              className="hidden"
              disabled={uploadingLogo}
            />
            
            {/* Company Info and Profile Status */}
            <div className="flex-1 flex flex-col md:flex-row items-center md:items-start justify-between gap-3 md:gap-4 w-full text-center md:text-right">
              {/* Company Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl md:text-3xl font-bold text-foreground mb-1">
                  {advisorProfile.company_name || 'יועץ'}
                </h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs md:text-sm text-muted-foreground">
                  {advisorProfile.admin_approved ? (
                    <>
                      <ShieldCheck className="h-3 w-3 md:h-4 md:w-4 text-blue-600 inline" />
                      <span className="font-medium text-blue-600">יועץ מאושר</span>
                    </>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 cursor-help">
                            <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-amber-600" />
                            <span className="font-medium text-amber-600">יועץ ממתין לאישור</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>חשבונך ממתין לאישור מנהלי המערכת. לאחר האישור תוכל להופיע בהמלצות ליזמים ולקבל הזמנות לפרויקטים.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {advisorProfile.location && (
                    <>
                      <span>•</span>
                      <span>{advisorProfile.location}</span>
                    </>
                  )}
                  <span>•</span>
                  <div className="flex items-center gap-1" dir="rtl">
                    <Star className="h-3 w-3 md:h-4 md:w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium text-foreground">5 / {advisorProfile.rating ? advisorProfile.rating.toFixed(1) : '0.0'}</span>
                  </div>
                </div>
              </div>
              
              {/* Profile Incomplete Badge */}
              {isProfileIncomplete && (
                <Card 
                  className="border-l-4 border-l-yellow-500 cursor-pointer hover:shadow-md transition-all bg-yellow-50/50 shrink-0 w-full md:w-auto"
                  onClick={() => navigate(`/profile?tab=${profileStatus.firstMissing || 'personal'}&highlight=missing`)}
                >
                  <CardContent className="p-2 md:p-3">
                    <div className="flex items-center md:items-start gap-2">
                      <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-yellow-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-yellow-900 text-xs md:text-sm whitespace-nowrap">פרופיל לא שלם ({profileStatus.percentage}%)</p>
                        <p className="text-xs text-yellow-800 mt-0.5 hidden md:block">
                          {profileStatus.firstMissing === 'personal' && 'חסרים פרטים אישיים'}
                          {profileStatus.firstMissing === 'company' && 'חסרים פרטי משרד'}
                          {profileStatus.firstMissing === 'professional' && 'חסרות התמחויות'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8" dir="rtl">
          <Card 
            className="shadow-md hover:shadow-lg transition-shadow cursor-pointer hover:scale-105"
            onClick={() => handleStatsCardClick('all')}
          >
            <CardContent className="p-3 md:p-6">
              <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                <FileText className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                <p className="text-xl md:text-2xl font-bold">{activeInvites.length}</p>
                <p className="text-xs md:text-sm text-muted-foreground leading-tight">כלל הצעות המחיר הפעילות</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="shadow-md hover:shadow-lg transition-shadow cursor-pointer hover:scale-105"
            onClick={() => handleStatsCardClick('new')}
          >
            <CardContent className="p-3 md:p-6">
              <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                <Bell className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
                <div className="flex items-center gap-1 md:gap-2">
                  <p className="text-xl md:text-2xl font-bold">{newInvites.length}</p>
                  {newInvites.length > 0 && (
                    <span className="bg-red-500 text-white text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded-full animate-fade-in">חדש</span>
                  )}
                </div>
                <p className="text-xs md:text-sm text-muted-foreground leading-tight">הצעות חדשות שהתקבלו</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="shadow-md hover:shadow-lg transition-shadow cursor-pointer hover:scale-105"
            onClick={() => handleStatsCardClick('submitted')}
          >
            <CardContent className="p-3 md:p-6">
              <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                <ShieldCheck className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
                <p className="text-xl md:text-2xl font-bold">{proposals.length}</p>
                <p className="text-xs md:text-sm text-muted-foreground leading-tight">הצעות שהוגשו</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="shadow-md hover:shadow-lg transition-shadow cursor-pointer hover:scale-105"
            onClick={() => handleStatsCardClick('unsubmitted')}
          >
            <CardContent className="p-3 md:p-6">
              <div className="flex flex-col items-center text-center gap-2 md:gap-3">
                <Clock className="h-6 w-6 md:h-8 md:w-8 text-blue-500" />
                <p className="text-xl md:text-2xl font-bold">{unsubmittedInvites.length}</p>
                <p className="text-xs md:text-sm text-muted-foreground leading-tight">הצעות שטרם הוגשו</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6" dir="rtl">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rfp-invites" className="flex items-center gap-2">
              הזמנות להצעת מחיר
              {newInvites.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {newInvites.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="my-proposals">ההצעות שלי</TabsTrigger>
          </TabsList>

          <TabsContent value="rfp-invites" className="space-y-4">
            {/* Active Filter Feedback */}
            {filterType !== 'all' && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-900">
                  {filterType === 'new' && 'מציג רק הזמנות חדשות'}
                  {filterType === 'unsubmitted' && 'מציג רק הזמנות שטרם הוגשו'}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setFilterType('all')}
                  className="mr-auto text-blue-600 hover:text-blue-700"
                >
                  נקה סינון
                </Button>
              </div>
            )}
            
            {/* Filter Toggle */}
            <div className="flex justify-between items-center mb-4">
              {isMobile ? (
                <Select 
                  value={showActiveOnly ? 'active' : 'all'} 
                  onValueChange={(v) => setShowActiveOnly(v === 'active')}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="all">הצג הכל ({rfpInvites.length})</SelectItem>
                    <SelectItem value="active">הצג רק פעילים ({activeInvites.length})</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant={!showActiveOnly ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setShowActiveOnly(false)}
                  >
                    הצג הכל ({rfpInvites.length})
                  </Button>
                  <Button 
                    variant={showActiveOnly ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setShowActiveOnly(true)}
                  >
                    הצג רק פעילים ({activeInvites.length})
                  </Button>
                </div>
              )}
            </div>

            {displayedInvites.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">
                    {showActiveOnly ? 'אין הזמנות פעילות כרגע' : 'אין הזמנות להצעת מחיר כרגע'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              displayedInvites.map((invite) => {
                const isNew = newInvites.some(newInv => newInv.id === invite.id);
                const projectName = invite.rfps?.projects?.name || 'פרויקט';
                const projectLocation = invite.rfps?.projects?.location || '—';
                const projectBudget = invite.rfps?.projects?.budget;
                const projectTimelineStart = invite.rfps?.projects?.timeline_start;
                const projectTimelineEnd = invite.rfps?.projects?.timeline_end;
                const projectDescription = invite.rfps?.projects?.description;
                
                const isInactive = isInactiveInvite(invite);
                
                return (
                  <Card key={invite.id} className={`shadow-md transition-shadow ${isInactive ? 'opacity-60 bg-muted/50' : 'hover:shadow-lg'} ${isNew && !isInactive ? 'border-2 border-orange-400' : ''}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-lg">{projectName}</CardTitle>
                            {isNew && (
                              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">חדש</span>
                            )}
                            {invite.advisor_type && (
                              <Badge variant="outline" className="text-xs">
                                {invite.advisor_type}
                              </Badge>
                            )}
                            {invite.deadline_at && (() => {
                              const hoursUntilDeadline = (new Date(invite.deadline_at).getTime() - Date.now()) / (1000 * 60 * 60);
                              if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 48) {
                                return (
                                  <Badge variant="destructive" className="text-xs animate-pulse">
                                    נותרו {Math.floor(hoursUntilDeadline)} שעות
                                  </Badge>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <CardDescription className="flex items-center gap-2 mt-2">
                            <MapPin className="h-4 w-4" />
                            {projectLocation}
                            {!invite.rfps?.projects && (
                              <span className="text-xs text-muted-foreground mr-2">• טוען פרטי פרויקט…</span>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-2">
                          {(() => {
                            const proposal = proposalMap.get(invite.rfps?.projects?.id);
                            if (proposal) {
                              return (
                                <ProposalStatusBadge 
                                  proposalStatus={proposal.status}
                                  submittedAt={proposal.submitted_at}
                                  approvedAt={proposal.project_advisors?.[0]?.selected_at}
                                />
                              );
                            }
                            return (
                              <Badge className={getStatusColor(invite.status)}>
                                {getStatusLabel(invite.status)}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium">יזם:</span>
                          <span className="truncate">{invite.rfps?.projects?.entrepreneur_name || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium">סוג:</span>
                          <span className="truncate">{invite.rfps?.projects?.type || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-red-500 flex-shrink-0" />
                          <span className="font-medium">מועד אחרון:</span>
                          <span className={`truncate ${
                            invite.deadline_at && new Date(invite.deadline_at) < new Date() 
                              ? 'text-red-600 font-semibold' 
                              : ''
                          }`}>
                            {invite.deadline_at 
                              ? new Date(invite.deadline_at).toLocaleDateString('he-IL', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '—'
                            }
                          </span>
                        </div>
                      </div>
                      
                      {projectDescription && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {projectDescription}
                        </p>
                      )}

                      {invite.status === 'declined' && invite.decline_reason && (
                        <div className="mt-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-sm font-medium text-red-900 mb-1">הזמנה נדחתה</p>
                          <p className="text-xs text-red-700">
                            סיבה: {getDeclineReasonText(invite.decline_reason)}
                          </p>
                          {invite.decline_note && (
                            <p className="text-xs text-red-600 mt-1">
                              הערה: {invite.decline_note}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          variant="outline" 
                          onClick={() => navigate(`/invite/${invite.id}/details`)}
                        >
                          צפייה בפרטים
                        </Button>
                        
                        {canSubmitProposal(invite.status, invite.deadline_at) && !proposalMap.has(invite.rfps?.projects?.id) && (
                          <Button onClick={() => navigate(`/invite/${invite.id}/submit`)}>
                            הגשת הצעת מחיר
                          </Button>
                        )}
                        
                        {proposalMap.has(invite.rfps?.projects?.id) && (
                          <Button 
                            variant="outline"
                            onClick={() => {
                              const proposal = proposalMap.get(invite.rfps?.projects?.id);
                              if (proposal) {
                                setSelectedProposalToView(proposal.id);
                                setProposalViewDialogOpen(true);
                              }
                            }}
                          >
                            צפייה בהצעה שהוגשה
                          </Button>
                        )}
                        {canSubmitProposal(invite.status, invite.deadline_at) && (
                          <Button 
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            onClick={() => handleDeclineClick(invite.id)}
                            disabled={declining}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            דחה הזמנה
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="my-proposals" className="space-y-4">
            {/* Filter Controls */}
            <Card>
              <CardContent className="p-3 md:p-4">
                {isMobile ? (
                  <Select 
                    value={proposalFilter} 
                    onValueChange={(v) => setProposalFilter(v as any)}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="all">הכל ({proposals.length})</SelectItem>
                      <SelectItem value="accepted">אושרו ({proposals.filter(p => p.status === 'accepted').length})</SelectItem>
                      <SelectItem value="submitted">ממתינות ({proposals.filter(p => p.status === 'submitted').length})</SelectItem>
                      <SelectItem value="under_review">בבדיקה ({proposals.filter(p => p.status === 'under_review').length})</SelectItem>
                      <SelectItem value="rejected">נדחו ({proposals.filter(p => p.status === 'rejected').length})</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2 items-center flex-wrap">
                    <Button 
                      size="sm" 
                      variant={proposalFilter === 'all' ? 'default' : 'outline'}
                      onClick={() => setProposalFilter('all')}
                    >
                      הכל ({proposals.length})
                    </Button>
                    <Button 
                      size="sm" 
                      variant={proposalFilter === 'accepted' ? 'default' : 'outline'}
                      onClick={() => setProposalFilter('accepted')}
                      className={proposalFilter === 'accepted' ? '' : 'text-amber-600 hover:text-amber-700'}
                    >
                      <Trophy className="h-4 w-4 ml-1" />
                      אושרו ({proposals.filter(p => p.status === 'accepted').length})
                    </Button>
                    <Button 
                      size="sm" 
                      variant={proposalFilter === 'submitted' ? 'default' : 'outline'}
                      onClick={() => setProposalFilter('submitted')}
                    >
                      ממתינות ({proposals.filter(p => p.status === 'submitted').length})
                    </Button>
                    <Button 
                      size="sm" 
                      variant={proposalFilter === 'under_review' ? 'default' : 'outline'}
                      onClick={() => setProposalFilter('under_review')}
                    >
                      בבדיקה ({proposals.filter(p => p.status === 'under_review').length})
                    </Button>
                    <Button 
                      size="sm" 
                      variant={proposalFilter === 'rejected' ? 'default' : 'outline'}
                      onClick={() => setProposalFilter('rejected')}
                    >
                      נדחו ({proposals.filter(p => p.status === 'rejected').length})
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {filteredProposals.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">
                    {proposalFilter === 'all' ? 'לא הוגשו הצעות מחיר עדיין' : 
                     proposalFilter === 'accepted' ? 'אין הצעות שאושרו' :
                     proposalFilter === 'submitted' ? 'אין הצעות ממתינות' : 
                     proposalFilter === 'under_review' ? 'אין הצעות בבדיקה' : 'אין הצעות נדחות'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredProposals.map((proposal) => (
                <Card key={proposal.id} className={proposal.status === 'accepted' ? 'shadow-lg hover:shadow-xl transition-shadow border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white' : 'shadow-md hover:shadow-lg transition-shadow'}>
                  <CardHeader className={proposal.status === 'accepted' ? 'bg-gradient-to-r from-amber-100 to-amber-50' : ''}>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className={proposal.status === 'accepted' ? 'text-xl text-amber-900' : 'text-lg'}>{proposal.projects.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-2">
                          <MapPin className="h-4 w-4" />
                          {proposal.projects.location}
                        </CardDescription>
                      </div>
                      <ProposalStatusBadge 
                        proposalStatus={proposal.status}
                        submittedAt={proposal.submitted_at}
                        approvedAt={proposal.project_advisors?.[0]?.selected_at}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Coins className={proposal.status === 'accepted' ? 'h-4 w-4 md:h-5 md:w-5 text-amber-600' : 'h-4 w-4 text-muted-foreground'} />
                        <div>
                          <p className="text-xs text-muted-foreground">המחיר שהוצע</p>
                          <p className={proposal.status === 'accepted' ? 'font-bold text-base md:text-lg' : 'font-semibold text-sm md:text-base'}>₪{proposal.price.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className={proposal.status === 'accepted' ? 'h-4 w-4 md:h-5 md:w-5 text-amber-600' : 'h-4 w-4 text-muted-foreground'} />
                        <div>
                          <p className="text-xs text-muted-foreground">זמן ביצוע</p>
                          <p className={proposal.status === 'accepted' ? 'font-bold text-sm md:text-base' : 'font-semibold text-sm'}>{proposal.timeline_days} ימים</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className={proposal.status === 'accepted' ? 'h-4 w-4 md:h-5 md:w-5 text-amber-600' : 'h-4 w-4 text-muted-foreground'} />
                        <div>
                          <p className="text-xs text-muted-foreground">תאריך הגשה</p>
                          <p className={proposal.status === 'accepted' ? 'font-bold text-sm md:text-base' : 'font-semibold text-sm'}>{new Date(proposal.submitted_at).toLocaleDateString('he-IL')}</p>
                        </div>
                      </div>
                    </div>

                    {/* View Proposal Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setSelectedProposalToView(proposal.id);
                        setProposalViewDialogOpen(true);
                      }}
                    >
                      <FileText className="h-4 w-4 me-2" />
                      צפייה בהצעה שהגשתי
                    </Button>

                    {/* Approval Information */}
                    {proposal.status === 'accepted' && proposal.project_advisors?.[0] && (
                      <div className="mt-4 p-4 bg-white border border-amber-200 rounded-lg">
                        <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4" />
                          פרטי התקשרות
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-amber-700" />
                            <span className="font-medium">תאריך אישור:</span>
                            <span>{new Date(proposal.project_advisors[0].selected_at).toLocaleDateString('he-IL', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                          {proposal.project_advisors[0].start_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-amber-700" />
                              <span className="font-medium">תאריך התחלה:</span>
                              <span>{new Date(proposal.project_advisors[0].start_date).toLocaleDateString('he-IL')}</span>
                            </div>
                          )}
                          {proposal.project_advisors[0].end_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-amber-700" />
                              <span className="font-medium">תאריך סיום:</span>
                              <span>{new Date(proposal.project_advisors[0].end_date).toLocaleDateString('he-IL')}</span>
                            </div>
                          )}
                          {proposal.project_advisors[0].fee_amount && (
                            <div className="flex items-center gap-2">
                              <Coins className="h-4 w-4 text-amber-700" />
                              <span className="font-medium">שכר מוסכם:</span>
                              <span className="font-bold">₪{proposal.project_advisors[0].fee_amount.toLocaleString()}</span>
                            </div>
                          )}
                          {proposal.project_advisors[0].payment_terms && (
                            <div className="col-span-2">
                              <p className="font-medium mb-1">תנאי תשלום:</p>
                              <p className="text-muted-foreground">{proposal.project_advisors[0].payment_terms}</p>
                            </div>
                          )}
                          {proposal.project_advisors[0].scope_of_work && (
                            <div className="col-span-2">
                              <p className="font-medium mb-1">היקף עבודה:</p>
                              <p className="text-muted-foreground">{proposal.project_advisors[0].scope_of_work}</p>
                            </div>
                          )}
                        </div>
                        {proposal.project_advisors[0].agreement_url && (
                          <Button 
                            variant="outline"
                            size="sm"
                            className="mt-3 w-full"
                            onClick={() => window.open(proposal.project_advisors![0].agreement_url, '_blank')}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            צפייה בהסכם
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

        </Tabs>
        </div>
      </div>

      <DeclineRFPDialog
        open={declineDialogOpen}
        onOpenChange={setDeclineDialogOpen}
        onDecline={handleDeclineConfirm}
        loading={declining}
      />

      {selectedProposalToView && (
        <AdvisorProposalViewDialog
          open={proposalViewDialogOpen}
          onOpenChange={setProposalViewDialogOpen}
          proposalId={selectedProposalToView}
        />
      )}
      
      <BackToTop threshold={20} />
    </div>
  );
};

export default AdvisorDashboard;