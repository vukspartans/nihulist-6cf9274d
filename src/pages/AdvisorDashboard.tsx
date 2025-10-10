import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Coins, Clock, FileText, User, AlertTriangle, Star, Bell, Upload, Building2 } from 'lucide-react';
import { UserHeader } from '@/components/UserHeader';
import { useNavigate } from 'react-router-dom';

interface RFPInvite {
  id: string;
  rfp_id: string;
  status: string;
  created_at: string;
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

  useEffect(() => {
    if (user) {
      fetchAdvisorData();
    }
  }, [user]);

  const fetchAdvisorData = async () => {
    try {
      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, phone')
        .eq('user_id', user?.id)
        .single();

      setUserProfile(profile);

      // Fetch advisor profile
      const { data: advisor } = await supabase
        .from('advisors')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      setAdvisorProfile(advisor);

      if (advisor) {
        // Fetch RFP invites
        const { data: invites } = await supabase
          .from('rfp_invites')
          .select(`
            *,
            rfps (
              *,
              projects (*)
            )
          `)
          .eq('advisor_id', advisor.id)
          .order('created_at', { ascending: false });

        setRfpInvites(invites || []);

        // Fetch submitted proposals
        const { data: proposalData } = await supabase
          .from('proposals')
          .select(`
            *,
            projects (name, type, location)
          `)
          .eq('advisor_id', advisor.id)
          .order('submitted_at', { ascending: false });

        setProposals(proposalData || []);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'responded': return 'bg-blue-100 text-blue-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'reviewed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const pendingInvites = rfpInvites.filter(invite => invite.status === 'pending');
  const newInvites = rfpInvites.filter(invite => {
    const createdDate = new Date(invite.created_at);
    const hoursSinceCreated = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreated < 24;
  });
  const unsubmittedInvites = pendingInvites.filter(invite => 
    !proposals.some(p => p.id === invite.rfp_id)
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="flex justify-between items-center p-6 border-b">
        <h1 className="text-2xl font-bold text-primary">Nihulist</h1>
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
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-4 flex-1">
                {/* Logo Section */}
                <label htmlFor="dashboard-logo-upload" className="cursor-pointer group">
                  <div className="relative w-20 h-20 rounded-lg border-2 border-border bg-background overflow-hidden hover:border-primary transition-all group-hover:shadow-md">
                    {advisorProfile?.logo_url ? (
                      <img 
                        src={advisorProfile.logo_url} 
                        alt="Logo" 
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <Building2 className="h-6 w-6 text-muted-foreground mb-1 group-hover:text-primary transition-colors" />
                        <Upload className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    )}
                    {uploadingLogo && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
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
                
                <div>
                  <h1 className="text-3xl font-bold mb-2">לוח בקרה - יועץ</h1>
                  <p className="text-muted-foreground">
                    ברוכים הבאים {advisorProfile.company_name || 'יועץ'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">תפקיד:</span>
                    <span className="font-medium">יועץ מאושר</span>
                    {advisorProfile.location && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm">{advisorProfile.location}</span>
                      </>
                    )}
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">{(advisorProfile.rating * 2).toFixed(1)}/10</span>
                      <span className="text-xs text-muted-foreground">(לא פעיל)</span>
                    </div>
                  </div>
                </div>
              </div>
              {isProfileIncomplete && (
                <Card 
                  className="border-l-4 border-l-yellow-500 cursor-pointer hover:shadow-md transition-all bg-yellow-50/50"
                  onClick={() => navigate(`/profile?tab=${profileStatus.firstMissing || 'personal'}&highlight=missing`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-yellow-900 mb-1">פרופיל לא שלם ({profileStatus.percentage}%)</p>
                        <p className="text-sm text-yellow-800">
                          {profileStatus.firstMissing === 'personal' && 'חסרים פרטים אישיים'}
                          {profileStatus.firstMissing === 'company' && 'חסרים פרטי משרד'}
                          {profileStatus.firstMissing === 'professional' && 'חסרות התמחויות או אזורי פעילות'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8" dir="rtl">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <p className="text-2xl font-bold">{rfpInvites.length}</p>
                <p className="text-sm text-muted-foreground">כלל הצעות המחיר הפעילות</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center gap-3">
                <Bell className="h-8 w-8 text-orange-500" />
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{newInvites.length}</p>
                  {newInvites.length > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">חדש</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">הצעות חדשות שהתקבלו</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center gap-3">
                <Coins className="h-8 w-8 text-green-500" />
                <p className="text-2xl font-bold">{proposals.length}</p>
                <p className="text-sm text-muted-foreground">הצעות שהוגשו</p>
              </div>
            </CardContent>
          </Card>

          <Card>
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
            {rfpInvites.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">אין הזמנות להצעת מחיר כרגע</p>
                </CardContent>
              </Card>
            ) : (
              rfpInvites.map((invite) => {
                const isNew = newInvites.some(newInv => newInv.id === invite.id);
                return (
                  <Card key={invite.id} className={`hover:shadow-md transition-shadow ${isNew ? 'border-2 border-orange-400' : ''}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{invite.rfps.projects.name}</CardTitle>
                            {isNew && (
                              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">חדש</span>
                            )}
                          </div>
                          <CardDescription className="flex items-center gap-2 mt-2">
                            <MapPin className="h-4 w-4" />
                            {invite.rfps.projects.location}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(invite.status)}>
                          {invite.status === 'pending' ? 'ממתין לתגובה' : 
                           invite.status === 'responded' ? 'נענה' : invite.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <Coins className="h-4 w-4 text-muted-foreground" />
                          <span>תקציב: ₪{invite.rfps.projects.budget?.toLocaleString()}</span>
                        </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {new Date(invite.rfps.projects.timeline_start).toLocaleDateString('he-IL')} - 
                          {new Date(invite.rfps.projects.timeline_end).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>התקבל: {new Date(invite.created_at).toLocaleDateString('he-IL')}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {invite.rfps.projects.description}
                    </p>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(`/rfp-details/${invite.rfp_id}`, '_blank')}
                      >
                        צפייה בפרטים
                      </Button>
                      {invite.status === 'pending' && (
                        <Button onClick={() => window.location.href = `/submit-proposal/${invite.rfp_id}`}>
                          הגשת הצעת מחיר
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
                <Card key={proposal.id} className="hover:shadow-md transition-shadow">
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
    </div>
  );
};

export default AdvisorDashboard;