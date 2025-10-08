import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Coins, Clock, FileText, User, AlertTriangle, Star, Bell } from 'lucide-react';
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
  years_experience: number | null;
  hourly_rate: number | null;
  activity_regions: string[] | null;
  office_size: string | null;
}

const AdvisorDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rfpInvites, setRfpInvites] = useState<RFPInvite[]>([]);
  const [proposals, setProposals] = useState<AdvisorProposal[]>([]);
  const [advisorProfile, setAdvisorProfile] = useState<AdvisorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAdvisorData();
    }
  }, [user]);

  const fetchAdvisorData = async () => {
    try {
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

  // Enhanced profile completion check with detailed tracking
  const getFirstMissingField = () => {
    // Check personal info first
    // Note: name and phone are checked in Profile component, not here
    
    // Check company info
    if (!advisorProfile.company_name || !advisorProfile.location || 
        !advisorProfile.years_experience || !advisorProfile.hourly_rate || 
        !advisorProfile.office_size) {
      return 'company';
    }
    
    // Check professional info
    if (!advisorProfile.specialties || advisorProfile.specialties.length === 0) {
      return 'professional';
    }
    
    // Check activity regions
    if (!advisorProfile.activity_regions || advisorProfile.activity_regions.length === 0) {
      return 'professional';
    }
    
    return null;
  };

  const firstMissingField = getFirstMissingField();
  const isProfileIncomplete = firstMissingField !== null;

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
      <div className="flex justify-end items-center p-6 border-b">
        <div className="flex items-center gap-4">
          <UserHeader />
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -left-1 h-4 w-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
              3
            </span>
          </Button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
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
              {isProfileIncomplete && (
                <div 
                  className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 cursor-pointer hover:bg-yellow-100 transition-all hover:shadow-md hover:scale-[1.02] animate-fade-in"
                  onClick={() => navigate(`/profile?tab=${firstMissingField || 'personal'}&highlight=missing`)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 animate-pulse" />
                    <span className="text-sm font-bold text-yellow-800">⚠️ פרופיל לא שלם - לחצו להשלמה</span>
                  </div>
                  <p className="text-sm text-yellow-700 font-medium">
                    {firstMissingField === 'company' && '📋 חסרים פרטי משרד (שם, מיקום, ניסיון, תעריף, גודל משרד)'}
                    {firstMissingField === 'professional' && '🎯 חסרות התמחויות מקצועיות או אזורי פעילות'}
                    {!firstMissingField && '✨ השלימו את הפרטים לקבלת יותר הזמנות'}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">לחצו כאן למעבר ישיר לסעיף החסר 👆</p>
                </div>
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