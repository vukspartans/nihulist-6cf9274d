import { useEffect, useState } from 'react';
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
import { Calendar, MapPin, Coins, Clock, FileText, AlertTriangle, Star, Bell, Upload, Building2, ShieldCheck, AlertCircle, XCircle } from 'lucide-react';
import { UserHeader } from '@/components/UserHeader';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Logo from '@/components/Logo';
import { DeclineRFPDialog } from '@/components/DeclineRFPDialog';
import { useDeclineRFP } from '@/hooks/useDeclineRFP';
import BackToTop from '@/components/BackToTop';

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
          .select('id, rfp_id, advisor_type, status, created_at, deadline_at, decline_reason, decline_note')
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
              .select('id, name, type, location, budget, timeline_start, timeline_end, description')
              .in('id', projectIds);

            if (projectsError) {
              console.error('[AdvisorDashboard] ❌ Projects error:', projectsError);
            }
            console.debug('[AdvisorDashboard] ✅ Fetched projects:', projectsData?.length || 0);
            projects = projectsData || [];
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

        // Fetch submitted proposals (keep existing logic)
        const { data: proposalData } = await supabase
          .from('proposals')
          .select(`
            *,
            projects!proposals_project_id_fkey (name, type, location)
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

  const canSubmitProposal = (status: string) => {
    return ['sent', 'opened', 'in_progress', 'pending'].includes(status);
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

  const newInvites = rfpInvites.filter(invite => {
    const createdDate = new Date(invite.created_at);
    const hoursSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreated < 24;
  });

  const activeInvites = rfpInvites.filter(invite => 
    ['sent', 'opened', 'in_progress', 'pending'].includes(invite.status)
  );

  const displayedInvites = showActiveOnly ? activeInvites : rfpInvites;

  const unsubmittedInvites = activeInvites.filter(invite => 
    !proposals.some(p => p.id === invite.rfp_id)
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="sticky top-0 z-50 flex justify-between items-center p-6 border-b bg-background/95 backdrop-blur-sm">
        <Logo size="md" />
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -left-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              3
            </span>
          </Button>
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
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Logo and Info Section */}
          <div className={`flex items-start gap-4 ${getCoverImage(advisorProfile?.cover_image_url) ? '-mt-16' : 'mb-8'} relative z-10`}>
            {/* Logo */}
            <label htmlFor="dashboard-logo-upload" className="cursor-pointer group shrink-0">
              <div className={`relative rounded-xl border-4 bg-background overflow-hidden hover:border-primary transition-all shadow-lg group-hover:shadow-xl ${
                getCoverImage(advisorProfile?.cover_image_url) 
                  ? 'w-24 h-24 md:w-32 md:h-32 border-background' 
                  : 'w-20 h-20 border-border'
              }`}>
                {advisorProfile?.logo_url ? (
                  <img 
                    src={advisorProfile.logo_url} 
                    alt="Logo" 
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
                    <Building2 className="h-8 w-8 text-muted-foreground mb-1 group-hover:text-primary transition-colors" />
                    <Upload className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
              <div className="flex-1 flex items-start justify-between gap-4">
              {/* Company Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                  {advisorProfile.company_name || 'יועץ'}
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {advisorProfile.admin_approved ? (
                    <>
                      <ShieldCheck className="h-4 w-4 text-blue-600 inline" />
                      <span className="font-medium text-blue-600">יועץ מאושר</span>
                    </>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5 cursor-help">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
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
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium text-foreground">{(advisorProfile.rating * 2).toFixed(1)}/10</span>
                  </div>
                </div>
              </div>
              
              {/* Profile Incomplete Badge - Right Side */}
              {isProfileIncomplete && (
                <Card 
                  className="border-l-4 border-l-yellow-500 cursor-pointer hover:shadow-md transition-all bg-yellow-50/50 shrink-0"
                  onClick={() => navigate(`/profile?tab=${profileStatus.firstMissing || 'personal'}&highlight=missing`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-yellow-900 text-sm whitespace-nowrap">פרופיל לא שלם ({profileStatus.percentage}%)</p>
                        <p className="text-xs text-yellow-800 mt-0.5">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8" dir="rtl">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <p className="text-2xl font-bold">{rfpInvites.length}</p>
                <p className="text-sm text-muted-foreground">כלל הצעות המחיר הפעילות</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center gap-3">
                <Bell className="h-8 w-8 text-orange-500" />
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{newInvites.length}</p>
                  {newInvites.length > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-fade-in">חדש</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">הצעות חדשות שהתקבלו</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center gap-3">
                <Coins className="h-8 w-8 text-green-500" />
                <p className="text-2xl font-bold">{proposals.length}</p>
                <p className="text-sm text-muted-foreground">הצעות שהוגשו</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center gap-3">
                <Clock className="h-8 w-8 text-blue-500" />
                <p className="text-2xl font-bold">{unsubmittedInvites.length}</p>
                <p className="text-sm text-muted-foreground">הצעות שטרם הוגשו</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="rfp-invites" className="space-y-6" dir="rtl">
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
            {/* Filter Toggle */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex gap-2">
                <Button 
                  variant={showActiveOnly ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setShowActiveOnly(true)}
                >
                  הצג רק פעילים ({activeInvites.length})
                </Button>
                <Button 
                  variant={!showActiveOnly ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setShowActiveOnly(false)}
                >
                  הצג הכל ({rfpInvites.length})
                </Button>
              </div>
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
                
                return (
                  <Card key={invite.id} className={`shadow-md hover:shadow-lg transition-shadow ${isNew ? 'border-2 border-orange-400' : ''}`}>
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
                          </div>
                          <CardDescription className="flex items-center gap-2 mt-2">
                            <MapPin className="h-4 w-4" />
                            {projectLocation}
                            {!invite.rfps?.projects && (
                              <span className="text-xs text-muted-foreground mr-2">• טוען פרטי פרויקט…</span>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={getStatusColor(invite.status)}>
                            {getStatusLabel(invite.status)}
                          </Badge>
                          
                          {proposalMap.has(invite.rfps?.projects?.id) && (
                            <Badge className="bg-green-100 text-green-800 border-green-300 animate-fade-in">
                              ✓ הצעה הוגשה
                            </Badge>
                          )}
                          
                          <span className="text-xs text-muted-foreground">סטטוס</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Coins className="h-4 w-4 text-muted-foreground" />
                          <span>תקציב: {projectBudget ? `₪${projectBudget.toLocaleString()}` : '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {projectTimelineStart && projectTimelineEnd ? (
                              `${new Date(projectTimelineStart).toLocaleDateString('he-IL')} - ${new Date(projectTimelineEnd).toLocaleDateString('he-IL')}`
                            ) : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>התקבל: {new Date(invite.created_at).toLocaleDateString('he-IL')}</span>
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
                        
                        {canSubmitProposal(invite.status) && !proposalMap.has(invite.rfps?.projects?.id) && (
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
                                toast({
                                  title: "הצעה הוגשה",
                                  description: `הוגשה ב-${new Date(proposal.submitted_at).toLocaleDateString('he-IL')} • סטטוס: ${proposal.status}`,
                                });
                              }
                            }}
                          >
                            צפייה בהצעה שהוגשה
                          </Button>
                        )}
                        {['sent', 'opened', 'in_progress', 'pending'].includes(invite.status) && (
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
            {proposals.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">לא הוגשו הצעות מחיר עדיין</p>
                </CardContent>
              </Card>
            ) : (
              proposals.map((proposal) => (
                <Card key={proposal.id} className="shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{proposal.projects.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-2">
                          <MapPin className="h-4 w-4" />
                          {proposal.projects.location}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(proposal.status)}>
                        {proposal.status === 'received' ? 'התקבל' : 
                         proposal.status === 'reviewed' ? 'נבדק' : proposal.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-muted-foreground" />
                        <span>המחיר שלי: ₪{proposal.price.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>זמן ביצוע: {proposal.timeline_days} ימים</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>הוגש: {new Date(proposal.submitted_at).toLocaleDateString('he-IL')}</span>
                      </div>
                    </div>
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
      
      <BackToTop threshold={20} />
    </div>
  );
};

export default AdvisorDashboard;