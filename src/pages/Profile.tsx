import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, User, Building, Shield, KeyRound, Edit, Save, X, Target, MapPin, Users, Globe, Linkedin, Instagram, CheckCircle, Briefcase, Link2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { ExpertiseSelector } from '@/components/ExpertiseSelector';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

// Activity Regions Options
const ACTIVITY_REGIONS = [
  'הצפון',
  'חיפה והסביבה',
  'השרון',
  'גוש דן',
  'השפלה',
  'ירושלים והסביבה',
  'דרום',
  'אילת והערבה',
];

// Office Size Options
const OFFICE_SIZES = [
  'קטן מאוד/בוטיק - 1-2 עובדים',
  'קטן - 3-5 עובדים',
  'בינוני - 6-15 עובדים',
  'גדול - 16-30 עובדים',
  'גדול מאוד - 31+ עובדים',
];

interface UserProfile {
  name: string | null;
  phone: string | null;
  company_name: string | null;
  role: string | null;
}

interface AdvisorProfile {
  specialties: string[];
  expertise?: string[];
  company_name?: string | null;
  location?: string | null;
  years_experience?: number | null;
  hourly_rate?: number | null;
  activity_regions?: string[] | null;
  office_size?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
}

const Profile = () => {
  const { user, profile: authProfile } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [advisorProfile, setAdvisorProfile] = useState<AdvisorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [editMode, setEditMode] = useState({ name: false, phone: false, specialties: false, company: false, activityRegions: false, officeSize: false, socialUrls: false });
  const [editedData, setEditedData] = useState({ 
    name: '', 
    phone: '', 
    companyName: '', 
    location: '', 
    yearsExperience: 0, 
    hourlyRate: 0,
    activityRegions: [] as string[],
    officeSize: '',
    website: '',
    linkedinUrl: '',
    instagramUrl: ''
  });
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  // Handle URL parameters for tab navigation
  useEffect(() => {
    const tab = searchParams.get('tab');
    const highlight = searchParams.get('highlight');
    
    if (tab) {
      setActiveTab(tab);
      
      // Clear the URL params after navigation
      if (highlight === 'missing') {
        setTimeout(() => {
          const element = document.querySelector('.border-red-500');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a temporary highlight effect
            element.classList.add('animate-pulse');
            setTimeout(() => element.classList.remove('animate-pulse'), 2000);
          }
        }, 300);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, phone, company_name, role')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
      if (data) {
        // Fetch advisor profile if user is an advisor
        if (data.role === 'advisor') {
          const { data: advisorData, error: advisorError } = await supabase
            .from('advisors')
            .select('specialties, expertise, company_name, location, years_experience, hourly_rate, activity_regions, office_size, website, linkedin_url, instagram_url')
            .eq('user_id', user?.id)
            .maybeSingle();
            
          if (!advisorError && advisorData) {
            setAdvisorProfile(advisorData);
            // Set expertise from advisors table
            const expertise = advisorData.expertise || advisorData.specialties || [];
            setSelectedExpertise(expertise);
            setEditedData({ 
              name: data.name || '', 
              phone: data.phone || '',
              companyName: advisorData.company_name || '',
              location: advisorData.location || '',
              yearsExperience: advisorData.years_experience || 0,
              hourlyRate: advisorData.hourly_rate || 0,
              activityRegions: advisorData.activity_regions || [],
              officeSize: advisorData.office_size || '',
              website: advisorData.website || '',
              linkedinUrl: advisorData.linkedin_url || '',
              instagramUrl: advisorData.instagram_url || '',
            });
          }
        } else {
          setEditedData({ 
            name: data.name || '', 
            phone: data.phone || '', 
            companyName: '', 
            location: '', 
            yearsExperience: 0, 
            hourlyRate: 0,
            activityRegions: [],
            officeSize: '',
            website: '',
            linkedinUrl: '',
            instagramUrl: ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את פרטי הפרופיל",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (field: 'name' | 'phone' | 'company' | 'activityRegions' | 'officeSize' | 'socialUrls') => {
    setSaving(true);
    try {
      if (field === 'company') {
        // Update advisor table for company info
        const { error } = await supabase
          .from('advisors')
          .update({
            company_name: editedData.companyName,
            location: editedData.location,
            years_experience: editedData.yearsExperience,
            hourly_rate: editedData.hourlyRate,
            office_size: editedData.officeSize,
          })
          .eq('user_id', user?.id);

        if (error) throw error;

        setAdvisorProfile(prev => prev ? {
          ...prev,
          company_name: editedData.companyName,
          location: editedData.location,
          years_experience: editedData.yearsExperience,
          hourly_rate: editedData.hourlyRate,
          office_size: editedData.officeSize,
        } : null);
        setEditMode(prev => ({ ...prev, company: false }));
        toast({
          title: "עודכן בהצלחה",
          description: "פרטי החברה עודכנו",
        });
      } else if (field === 'activityRegions') {
        const { error } = await supabase
          .from('advisors')
          .update({ activity_regions: editedData.activityRegions })
          .eq('user_id', user?.id);

        if (error) throw error;

        setAdvisorProfile(prev => prev ? { ...prev, activity_regions: editedData.activityRegions } : null);
        setEditMode(prev => ({ ...prev, activityRegions: false }));
        toast({
          title: "עודכן בהצלחה",
          description: "אזורי הפעילות עודכנו",
        });
      } else if (field === 'officeSize') {
        const { error } = await supabase
          .from('advisors')
          .update({ office_size: editedData.officeSize })
          .eq('user_id', user?.id);

        if (error) throw error;

        setAdvisorProfile(prev => prev ? { ...prev, office_size: editedData.officeSize } : null);
        setEditMode(prev => ({ ...prev, officeSize: false }));
        toast({
          title: "עודכן בהצלחה",
          description: "גודל המשרד עודכן",
        });
      } else if (field === 'socialUrls') {
        const { error } = await supabase
          .from('advisors')
          .update({
            website: editedData.website || null,
            linkedin_url: editedData.linkedinUrl || null,
            instagram_url: editedData.instagramUrl || null,
          })
          .eq('user_id', user?.id);

        if (error) throw error;

        setAdvisorProfile(prev => prev ? {
          ...prev,
          website: editedData.website,
          linkedin_url: editedData.linkedinUrl,
          instagram_url: editedData.instagramUrl,
        } : null);
        setEditMode(prev => ({ ...prev, socialUrls: false }));
        toast({
          title: "עודכן בהצלחה",
          description: "הקישורים עודכנו",
        });
      } else {
        const updateData = { [field]: editedData[field] };
        
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('user_id', user?.id);

        if (error) throw error;

        setProfile(prev => prev ? { ...prev, [field]: editedData[field] } : null);
        setEditMode(prev => ({ ...prev, [field]: false }));
        
        toast({
          title: "עודכן בהצלחה",
          description: "הפרטים שלך עודכנו",
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את הפרטים",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth?type=recovery`,
      });

      if (error) throw error;

      toast({
        title: "איפוס סיסמה נשלח",
        description: "קישור לאיפוס הסיסמה נשלח לכתובת המייל שלך",
      });
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "שגיאה", 
        description: "לא ניתן לשלוח איפוס סיסמה. נסה שוב מאוחר יותר.",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const updateSpecialties = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('advisors')
        .update({ expertise: selectedExpertise })
        .eq('user_id', user?.id);

      if (error) throw error;

      setAdvisorProfile(prev => prev ? { ...prev, expertise: selectedExpertise } : null);
      setEditMode(prev => ({ ...prev, specialties: false }));
      
      toast({
        title: "עודכן בהצלחה",
        description: "ההתמחויות שלך עודכנו",
      });
    } catch (error) {
      console.error('Error updating specialties:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את ההתמחויות",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditToggle = (field: 'name' | 'phone' | 'specialties' | 'company' | 'activityRegions' | 'officeSize' | 'socialUrls') => {
    if (field === 'specialties') {
      if (editMode.specialties) {
        const expertise = advisorProfile?.expertise || advisorProfile?.specialties || [];
        setSelectedExpertise(expertise);
      }
      setEditMode(prev => ({ ...prev, specialties: !prev.specialties }));
    } else if (field === 'company') {
      if (editMode.company) {
        setEditedData(prev => ({
          ...prev,
          companyName: advisorProfile?.company_name || '',
          location: advisorProfile?.location || '',
          yearsExperience: advisorProfile?.years_experience || 0,
          hourlyRate: advisorProfile?.hourly_rate || 0,
          officeSize: advisorProfile?.office_size || '',
        }));
      }
      setEditMode(prev => ({ ...prev, company: !prev.company }));
    } else if (field === 'activityRegions') {
      if (editMode.activityRegions) {
        setEditedData(prev => ({
          ...prev,
          activityRegions: advisorProfile?.activity_regions || [],
        }));
      }
      setEditMode(prev => ({ ...prev, activityRegions: !prev.activityRegions }));
    } else if (field === 'officeSize') {
      if (editMode.officeSize) {
        setEditedData(prev => ({
          ...prev,
          officeSize: advisorProfile?.office_size || '',
        }));
      }
      setEditMode(prev => ({ ...prev, officeSize: !prev.officeSize }));
    } else if (field === 'socialUrls') {
      if (editMode.socialUrls) {
        setEditedData(prev => ({
          ...prev,
          website: advisorProfile?.website || '',
          linkedinUrl: advisorProfile?.linkedin_url || '',
          instagramUrl: advisorProfile?.instagram_url || '',
        }));
      }
      setEditMode(prev => ({ ...prev, socialUrls: !prev.socialUrls }));
    } else {
      if (editMode[field]) {
        setEditedData(prev => ({ 
          ...prev, 
          [field]: field === 'name' ? (profile?.name || '') : (profile?.phone || '') 
        }));
      }
      setEditMode(prev => ({ ...prev, [field]: !prev[field] }));
    }
  };

  const getDashboardRoute = () => {
    const userRole = authProfile?.role || profile?.role;
    return userRole === 'advisor' ? '/advisor-dashboard' : '/dashboard';
  };

  const getRoleDisplay = (role: string | null) => {
    switch (role) {
      case 'entrepreneur':
        return 'יזם';
      case 'consultant':
        return 'יועץ';
      case 'advisor':
        return 'יועץ';
      case 'admin':
        return 'מנהל';
      default:
        return 'לא מוגדר';
    }
  };

  const calculateProfileCompletion = () => {
    if (profile?.role !== 'advisor' && authProfile?.role !== 'advisor') return 100;
    
    const requiredFields = [
      profile?.name,
      profile?.phone,
      advisorProfile?.company_name,
      advisorProfile?.location,
      advisorProfile?.years_experience,
      advisorProfile?.hourly_rate,
      advisorProfile?.activity_regions && advisorProfile.activity_regions.length > 0,
      advisorProfile?.office_size,
      selectedExpertise && selectedExpertise.length > 0,
    ];
    
    const filledFields = requiredFields.filter(field => field).length;
    return Math.round((filledFields / requiredFields.length) * 100);
  };

  const getFirstIncompleteSection = () => {
    if (!profile?.name || !profile?.phone) return 'personal';
    if (!advisorProfile?.company_name || !advisorProfile?.location || 
        !advisorProfile?.years_experience || !advisorProfile?.hourly_rate || 
        !advisorProfile?.office_size) return 'company';
    if ((!selectedExpertise || selectedExpertise.length === 0) ||
        !advisorProfile?.activity_regions || advisorProfile.activity_regions.length === 0) return 'professional';
    return null;
  };

  const completionPercentage = calculateProfileCompletion();
  const firstIncompleteSection = getFirstIncompleteSection();

  const toggleAllRegions = () => {
    if (editedData.activityRegions.length === ACTIVITY_REGIONS.length) {
      setEditedData(prev => ({ ...prev, activityRegions: [] }));
    } else {
      setEditedData(prev => ({ ...prev, activityRegions: [...ACTIVITY_REGIONS] }));
    }
  };

  const toggleRegion = (region: string) => {
    setEditedData(prev => ({
      ...prev,
      activityRegions: prev.activityRegions.includes(region)
        ? prev.activityRegions.filter(r => r !== region)
        : [...prev.activityRegions, region]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6" dir="rtl">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to={getDashboardRoute()} className="hover:text-foreground transition-colors">
              דשבורד
            </Link>
            <ArrowRight className="h-4 w-4" />
            <span>הפרופיל שלי</span>
          </div>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isAdvisor = profile?.role === 'advisor' || authProfile?.role === 'advisor';

  return (
    <div className="min-h-screen bg-background p-6 animate-fade-in" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to={getDashboardRoute()} className="hover:text-foreground transition-colors">
            דשבורד
          </Link>
          <ArrowRight className="h-4 w-4" />
          <span>הפרופיל שלי</span>
        </div>

        {/* Page Header with Completion */}
        <Card className="border-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold">הפרופיל שלי</h1>
                <p className="text-muted-foreground">ניהול פרטי החשבון והגדרות אישיות</p>
              </div>
              {isAdvisor && (
                <div 
                  className={`text-center space-y-2 ${completionPercentage < 100 ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                  onClick={() => {
                    if (completionPercentage < 100 && firstIncompleteSection) {
                      setActiveTab(firstIncompleteSection);
                      toast({
                        title: "נווט לסעיף החסר",
                        description: `עבור לכרטיסייה "${firstIncompleteSection === 'personal' ? 'פרטים אישיים' : firstIncompleteSection === 'company' ? 'פרטי חברה' : 'מקצועי'}"`,
                      });
                    }
                  }}
                  title={completionPercentage < 100 ? 'לחץ למעבר לסעיף החסר הראשון' : ''}
                >
                  <div className={`flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-br from-secondary to-secondary/50 border-2 ${completionPercentage < 100 ? 'border-yellow-400 shadow-lg' : ''}`}>
                    <CheckCircle className={`h-6 w-6 ${completionPercentage >= 80 ? 'text-green-500' : completionPercentage >= 50 ? 'text-orange-500' : 'text-red-500'}`} />
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${completionPercentage >= 80 ? 'text-green-500' : completionPercentage >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                        {completionPercentage}%
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">
                        {completionPercentage < 100 ? 'לחץ להשלמה' : 'הושלם'}
                      </div>
                    </div>
                  </div>
                  <Progress value={completionPercentage} className="h-2" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Organization */}
        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="personal" className="gap-2 py-3 relative">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">פרטים אישיים</span>
              <span className="sm:hidden">אישי</span>
              {(!profile?.name || !profile?.phone) && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            {isAdvisor && (
              <>
                <TabsTrigger value="company" className="gap-2 py-3 relative">
                  <Building className="h-4 w-4" />
                  <span className="hidden sm:inline">פרטי משרד</span>
                  <span className="sm:hidden">משרד</span>
                  {(!advisorProfile?.company_name || !advisorProfile?.location || 
                    !advisorProfile?.years_experience || !advisorProfile?.hourly_rate || 
                    !advisorProfile?.office_size) && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="professional" className="gap-2 py-3 relative">
                  <Briefcase className="h-4 w-4" />
                  <span className="hidden sm:inline">מקצועי</span>
                  <span className="sm:hidden">מקצועי</span>
                  {((!selectedExpertise || selectedExpertise.length === 0) ||
                    !advisorProfile?.activity_regions || advisorProfile.activity_regions.length === 0) && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="settings" className="gap-2 py-3">
              <KeyRound className="h-4 w-4" />
              <span className="hidden sm:inline">הגדרות</span>
              <span className="sm:hidden">הגדרות</span>
            </TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="personal" className="space-y-4 mt-6 animate-fade-in">
            {/* Personal Information */}
            <Card dir="rtl" className="hover-scale">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  פרטים אישיים
                </CardTitle>
                <CardDescription>מידע בסיסי על המשתמש</CardDescription>
              </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-muted-foreground">שם מלא</label>
                    {editMode.name ? (
                      <div className="flex items-center gap-2 mt-1 animate-scale-in">
                        <Input
                          value={editedData.name}
                          onChange={(e) => setEditedData(prev => ({ ...prev, name: e.target.value }))}
                          className="flex-1"
                          placeholder="הזן שם מלא"
                          autoFocus
                        />
                        <Button 
                          size="sm" 
                          onClick={() => updateProfile('name')} 
                          disabled={saving}
                          className="shrink-0"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEditToggle('name')}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                  ) : (
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-foreground">{profile?.name || 'לא מוגדר'}</p>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleEditToggle('name')}
                        className="shrink-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">כתובת מייל</label>
                <p className="text-foreground">{user?.email}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-sm font-medium text-muted-foreground">טלפון</label>
                  {editMode.phone ? (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1">
                        <PhoneInput
                          international
                          countryCallingCodeEditable={false}
                          defaultCountry="IL"
                          value={editedData.phone}
                          onChange={(value) => setEditedData(prev => ({ ...prev, phone: value || '' }))}
                          className="phone-input"
                        />
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => updateProfile('phone')} 
                        disabled={saving}
                        className="shrink-0"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleEditToggle('phone')}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-foreground">{profile?.phone || 'לא מוגדר'}</p>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleEditToggle('phone')}
                        className="shrink-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          {/* Company Info Tab - Only for advisors */}
          {isAdvisor && (
            <TabsContent value="company" className="space-y-4 mt-6 animate-fade-in">
              {/* Company Information */}
              <Card dir="rtl" className={`hover-scale ${
                (authProfile?.role === 'advisor' || profile?.role === 'advisor') && 
                (!advisorProfile?.company_name || !advisorProfile?.location || !advisorProfile?.years_experience || !advisorProfile?.hourly_rate)
                ? 'border-2 border-red-500 animate-pulse' : ''
              }`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-primary" />
                        פרטי משרד
                        {(authProfile?.role === 'advisor' || profile?.role === 'advisor') && 
                         (!advisorProfile?.company_name || !advisorProfile?.location || !advisorProfile?.years_experience || !advisorProfile?.hourly_rate) && (
                          <Badge variant="destructive" className="mr-2">מידע חסר</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>פרטי המשרד או העסק שלך</CardDescription>
                    </div>
                {(authProfile?.role === 'advisor' || profile?.role === 'advisor') && !editMode.company && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleEditToggle('company')}
                  >
                    <Edit className="h-4 w-4 ml-2" />
                    ערוך
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editMode.company ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>שם המשרד *</Label>
                    <Input
                      value={editedData.companyName}
                      onChange={(e) => setEditedData({ ...editedData, companyName: e.target.value })}
                      placeholder="הזן שם משרד"
                      className={!editedData.companyName ? 'border-red-500' : ''}
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>מיקום *</Label>
                    <Input
                      value={editedData.location}
                      onChange={(e) => setEditedData({ ...editedData, location: e.target.value })}
                      placeholder="הזן מיקום"
                      className={!editedData.location ? 'border-red-500' : ''}
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>שנות ניסיון *</Label>
                    <Input
                      type="number"
                      value={editedData.yearsExperience}
                      onChange={(e) => setEditedData({ ...editedData, yearsExperience: parseInt(e.target.value) || 0 })}
                      placeholder="הזן שנות ניסיון"
                      className={!editedData.yearsExperience ? 'border-red-500' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>תעריף לשעה (₪) *</Label>
                    <Input
                      type="number"
                      value={editedData.hourlyRate}
                      onChange={(e) => setEditedData({ ...editedData, hourlyRate: parseFloat(e.target.value) || 0 })}
                      placeholder="הזן תעריף לשעה"
                      className={!editedData.hourlyRate ? 'border-red-500' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>גודל המשרד *</Label>
                    <Select 
                      value={editedData.officeSize} 
                      onValueChange={(value) => setEditedData({ ...editedData, officeSize: value })}
                    >
                      <SelectTrigger className={!editedData.officeSize ? 'border-red-500' : ''} dir="rtl">
                        <SelectValue placeholder="בחר גודל משרד" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {OFFICE_SIZES.map((size) => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateProfile('company')}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? 'שומר...' : 'שמור'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleEditToggle('company')}
                      disabled={saving}
                      className="flex-1"
                    >
                      ביטול
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={!advisorProfile?.company_name && (authProfile?.role === 'advisor' || profile?.role === 'advisor') ? 'p-2 border-2 border-red-300 rounded' : ''}>
                    <label className="text-sm font-medium text-muted-foreground">
                      שם המשרד
                      {!advisorProfile?.company_name && (authProfile?.role === 'advisor' || profile?.role === 'advisor') && (
                        <span className="text-red-500 mr-1">*</span>
                      )}
                    </label>
                    <p className="text-foreground">{profile?.company_name || advisorProfile?.company_name || 'לא מוגדר'}</p>
                  </div>
                  <div className={!advisorProfile?.location && (authProfile?.role === 'advisor' || profile?.role === 'advisor') ? 'p-2 border-2 border-red-300 rounded' : ''}>
                    <label className="text-sm font-medium text-muted-foreground">
                      מיקום
                      {!advisorProfile?.location && (authProfile?.role === 'advisor' || profile?.role === 'advisor') && (
                        <span className="text-red-500 mr-1">*</span>
                      )}
                    </label>
                    <p className="text-foreground">{advisorProfile?.location || 'לא מוגדר'}</p>
                  </div>
                  {(authProfile?.role === 'advisor' || profile?.role === 'advisor') && (
                    <>
                      <div className={!advisorProfile?.years_experience ? 'p-2 border-2 border-red-300 rounded' : ''}>
                        <label className="text-sm font-medium text-muted-foreground">
                          שנות ניסיון
                          {!advisorProfile?.years_experience && <span className="text-red-500 mr-1">*</span>}
                        </label>
                        <p className="text-foreground">{advisorProfile?.years_experience || 'לא מוגדר'}</p>
                      </div>
                      <div className={!advisorProfile?.hourly_rate ? 'p-2 border-2 border-red-300 rounded' : ''}>
                        <label className="text-sm font-medium text-muted-foreground">
                          תעריף לשעה
                          {!advisorProfile?.hourly_rate && <span className="text-red-500 mr-1">*</span>}
                        </label>
                        <p className="text-foreground">{advisorProfile?.hourly_rate ? `₪${advisorProfile.hourly_rate}` : 'לא מוגדר'}</p>
                      </div>
                      <div className={!advisorProfile?.office_size ? 'p-2 border-2 border-red-300 rounded' : ''}>
                        <label className="text-sm font-medium text-muted-foreground">
                          גודל משרד
                          {!advisorProfile?.office_size && <span className="text-red-500 mr-1">*</span>}
                        </label>
                        <p className="text-foreground">{advisorProfile?.office_size || 'לא מוגדר'}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">תפקיד</label>
                    <p className="text-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      {getRoleDisplay(profile?.role)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">חבילה</label>
                    <p className="text-foreground">חבילה בסיסית</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
            </TabsContent>
          )}

          {/* Professional Tab - Only for advisors */}
          {isAdvisor && (
            <TabsContent value="professional" className="space-y-4 mt-6 animate-fade-in">
              {/* Professional Specialties - Only for advisors */}
              <Card dir="rtl" className={`hover-scale ${(!selectedExpertise || selectedExpertise.length === 0) ? 'border-2 border-red-500 animate-pulse' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        התמחויות מקצועיות
                        {(!selectedExpertise || selectedExpertise.length === 0) && (
                          <Badge variant="destructive" className="mr-2">שדה חובה</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>בחר את תחומי ההתמחות המקצועיים שלך</CardDescription>
                    </div>
                {!editMode.specialties && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleEditToggle('specialties')}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ExpertiseSelector
                selectedExpertise={selectedExpertise}
                onExpertiseChange={setSelectedExpertise}
                isEditing={editMode.specialties}
                onSave={updateSpecialties}
                onCancel={() => handleEditToggle('specialties')}
              />
            </CardContent>
          </Card>

              {/* Activity Regions */}
              <Card dir="rtl" className={`hover-scale ${(!advisorProfile?.activity_regions || advisorProfile.activity_regions.length === 0) ? 'border-2 border-red-500 animate-pulse' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        אזורי פעילות
                        {(!advisorProfile?.activity_regions || advisorProfile.activity_regions.length === 0) && (
                          <Badge variant="destructive" className="mr-2">שדה חובה</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>האזורים הגיאוגרפיים בהם אתה פועל</CardDescription>
                    </div>
                {!editMode.activityRegions && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleEditToggle('activityRegions')}
                  >
                    <Edit className="h-4 w-4 ml-2" />
                    ערוך
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editMode.activityRegions ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <Label className="text-base font-semibold">בחר אזורי פעילות *</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={toggleAllRegions}
                    >
                      {editedData.activityRegions.length === ACTIVITY_REGIONS.length ? 'נקה הכל' : 'בחר הכל'}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ACTIVITY_REGIONS.map((region) => (
                      <div key={region} className="flex items-center space-x-2 space-x-reverse">
                        <Checkbox
                          id={region}
                          checked={editedData.activityRegions.includes(region)}
                          onCheckedChange={() => toggleRegion(region)}
                        />
                        <label
                          htmlFor={region}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {region}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => updateProfile('activityRegions')}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? 'שומר...' : 'שמור'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleEditToggle('activityRegions')}
                      disabled={saving}
                      className="flex-1"
                    >
                      ביטול
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {advisorProfile?.activity_regions && advisorProfile.activity_regions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {advisorProfile.activity_regions.map((region) => (
                        <Badge key={region} variant="secondary" className="text-sm">
                          {region}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">לא נבחרו אזורי פעילות</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

              {/* Social URLs */}
              <Card dir="rtl" className="hover-scale">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-primary" />
                        קישורים חברתיים ואתר
                      </CardTitle>
                      <CardDescription>הוסף קישורים לנוכחות הדיגיטלית שלך (אופציונלי)</CardDescription>
                    </div>
                {!editMode.socialUrls && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleEditToggle('socialUrls')}
                  >
                    <Edit className="h-4 w-4 ml-2" />
                    ערוך
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editMode.socialUrls ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      אתר אינטרנט
                    </Label>
                    <Input
                      type="url"
                      value={editedData.website}
                      onChange={(e) => setEditedData({ ...editedData, website: e.target.value })}
                      placeholder="https://www.example.com"
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4" />
                      לינקדאין
                    </Label>
                    <Input
                      type="url"
                      value={editedData.linkedinUrl}
                      onChange={(e) => setEditedData({ ...editedData, linkedinUrl: e.target.value })}
                      placeholder="https://www.linkedin.com/in/username"
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Instagram className="h-4 w-4" />
                      אינסטגרם
                    </Label>
                    <Input
                      type="url"
                      value={editedData.instagramUrl}
                      onChange={(e) => setEditedData({ ...editedData, instagramUrl: e.target.value })}
                      placeholder="https://www.instagram.com/username"
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => updateProfile('socialUrls')}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? 'שומר...' : 'שמור'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleEditToggle('socialUrls')}
                      disabled={saving}
                      className="flex-1"
                    >
                      ביטול
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {advisorProfile?.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={advisorProfile.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline"
                        dir="ltr"
                      >
                        {advisorProfile.website}
                      </a>
                    </div>
                  )}
                  {advisorProfile?.linkedin_url && (
                    <div className="flex items-center gap-2">
                      <Linkedin className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={advisorProfile.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline"
                        dir="ltr"
                      >
                        {advisorProfile.linkedin_url}
                      </a>
                    </div>
                  )}
                  {advisorProfile?.instagram_url && (
                    <div className="flex items-center gap-2">
                      <Instagram className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={advisorProfile.instagram_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline"
                        dir="ltr"
                      >
                        {advisorProfile.instagram_url}
                      </a>
                    </div>
                  )}
                  {!advisorProfile?.website && !advisorProfile?.linkedin_url && !advisorProfile?.instagram_url && (
                    <p className="text-muted-foreground">לא הוגדרו קישורים</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
            </TabsContent>
          )}

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 mt-6 animate-fade-in">
            {/* Account Actions */}
            <Card className="hover-scale">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  פעולות חשבון
                </CardTitle>
                <CardDescription>ניהול אבטחה והגדרות חשבון</CardDescription>
              </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  איפוס סיסמה
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>איפוס סיסמה</AlertDialogTitle>
                  <AlertDialogDescription>
                    האם אתה בטוח שברצונך לאפס את הסיסמה? קישור לאיפוס יישלח לכתובת המייל שלך.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ביטול</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handlePasswordReset}
                    disabled={resetLoading}
                  >
                    {resetLoading ? 'שולח...' : 'שלח איפוס'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;