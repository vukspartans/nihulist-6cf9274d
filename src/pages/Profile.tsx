import { useState, useEffect } from 'react';
import coverOption1 from '@/assets/cover-option-1.jpg';
import coverOption2 from '@/assets/cover-option-2.jpg';
import coverOption3 from '@/assets/cover-option-3.jpg';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, User, Building, Shield, KeyRound, Edit, Save, X, Target, MapPin, Users, Globe, Linkedin, Instagram, Facebook, CheckCircle, Briefcase, Link2, Upload, Image as ImageIcon } from 'lucide-react';
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

const COVER_OPTIONS = [
  { id: '0', image: '', name: 'ללא תמונת רקע' },
  { id: '1', image: coverOption1, name: 'כחול-תכלת' },
  { id: '2', image: coverOption2, name: 'כתום-סגול' },
  { id: '3', image: coverOption3, name: 'ירוק-כהה' },
];


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
  founding_year?: number | null;
  activity_regions?: string[] | null;
  office_size?: string | null;
  office_phone?: string | null;
  position_in_office?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
}

const Profile = () => {
  const { user, profile: authProfile } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [advisorProfile, setAdvisorProfile] = useState<AdvisorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [editMode, setEditMode] = useState({ 
    name: false, 
    phone: false, 
    specialties: false, 
    company: false, 
    activityRegions: false, 
    officeSize: false, 
    socialUrls: false,
    branding: false
  });
  const [editedData, setEditedData] = useState({ 
    name: '', 
    phone: '', 
    companyName: '', 
    location: '', 
    foundingYear: new Date().getFullYear(),
    activityRegions: [] as string[],
    officeSize: '',
    officePhone: '',
    positionInOffice: '',
    website: '',
    linkedinUrl: '',
    instagramUrl: '',
    facebookUrl: ''
  });
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [uploadingLogo, setUploadingLogo] = useState(false);

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
            .select('specialties, expertise, company_name, location, founding_year, activity_regions, office_size, office_phone, position_in_office, website, linkedin_url, instagram_url, facebook_url, logo_url, cover_image_url')
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
              foundingYear: advisorData.founding_year || new Date().getFullYear(),
              activityRegions: advisorData.activity_regions || [],
              officeSize: advisorData.office_size || '',
              officePhone: advisorData.office_phone || '',
              positionInOffice: advisorData.position_in_office || '',
              website: advisorData.website || '',
              linkedinUrl: advisorData.linkedin_url || '',
              instagramUrl: advisorData.instagram_url || '',
              facebookUrl: advisorData.facebook_url || '',
            });
          }
        } else {
          setEditedData({ 
            name: data.name || '', 
            phone: data.phone || '', 
            companyName: '', 
            location: '', 
            foundingYear: new Date().getFullYear(),
            activityRegions: [],
            officeSize: '',
            officePhone: '',
            positionInOffice: '',
            website: '',
            linkedinUrl: '',
            instagramUrl: '',
            facebookUrl: ''
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
            founding_year: editedData.foundingYear,
            office_size: editedData.officeSize,
            office_phone: editedData.officePhone || null,
            position_in_office: editedData.positionInOffice || null,
          })
          .eq('user_id', user?.id);

        if (error) throw error;

        setAdvisorProfile(prev => prev ? {
          ...prev,
          company_name: editedData.companyName,
          location: editedData.location,
          founding_year: editedData.foundingYear,
          office_size: editedData.officeSize,
          office_phone: editedData.officePhone || null,
          position_in_office: editedData.positionInOffice || null,
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
            facebook_url: editedData.facebookUrl || null,
          })
          .eq('user_id', user?.id);

        if (error) throw error;

        setAdvisorProfile(prev => prev ? {
          ...prev,
          website: editedData.website,
          linkedin_url: editedData.linkedinUrl,
          instagram_url: editedData.instagramUrl,
          facebook_url: editedData.facebookUrl,
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

      // Add timestamp to prevent caching
      const { data: { publicUrl } } = supabase.storage
        .from('advisor-assets')
        .getPublicUrl(fileName);
      
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('advisors')
        .update({ logo_url: cacheBustedUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAdvisorProfile(prev => prev ? { ...prev, logo_url: cacheBustedUrl } : null);
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

  const handleLogoRemove = async () => {
    if (!user) return;

    setUploadingLogo(true);
    try {
      const { error: updateError } = await supabase
        .from('advisors')
        .update({ logo_url: null })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAdvisorProfile(prev => prev ? { ...prev, logo_url: null } : null);
      toast({
        title: "הלוגו הוסר",
        description: "הלוגו שלך הוסר בהצלחה",
      });
    } catch (error) {
      console.error('Error removing logo:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן להסיר את הלוגו",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCoverSelect = async (coverId: string) => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('advisors')
        .update({ cover_image_url: coverId })
        .eq('user_id', user.id);

      if (error) throw error;

      setAdvisorProfile(prev => prev ? { ...prev, cover_image_url: coverId } : null);
      toast({
        title: "תמונת הרקע עודכנה",
        description: "תמונת הרקע שלך שונתה בהצלחה",
      });
    } catch (error) {
      console.error('Error updating cover:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את תמונת הרקע",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getCoverImage = (coverId: string | null | undefined): string => {
    if (!coverId || coverId === '0') return ''; // No cover
    const option = COVER_OPTIONS.find(opt => opt.id === coverId);
    return option ? option.image : ''; // Default to no cover
  };



  const handleEditToggle = (field: 'name' | 'phone' | 'specialties' | 'company' | 'activityRegions' | 'officeSize' | 'socialUrls' | 'branding') => {
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
          foundingYear: advisorProfile?.founding_year || new Date().getFullYear(),
          officeSize: advisorProfile?.office_size || '',
          officePhone: advisorProfile?.office_phone || '',
          positionInOffice: advisorProfile?.position_in_office || '',
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
          facebookUrl: advisorProfile?.facebook_url || '',
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

  const ensureHttpProtocol = (url: string | null | undefined): string => {
    if (!url) return '';
    const trimmedUrl = url.trim();
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return trimmedUrl;
    }
    return `https://${trimmedUrl}`;
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
      advisorProfile?.founding_year,
      advisorProfile?.position_in_office,
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
        !advisorProfile?.founding_year || !advisorProfile?.position_in_office || 
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
                    !advisorProfile?.founding_year || !advisorProfile?.position_in_office || 
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
                          dir="ltr"
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
                      <div className="text-foreground" dir="ltr" style={{ textAlign: 'left' }}>
                        {profile?.phone || 'לא מוגדר'}
                      </div>
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
                (!advisorProfile?.company_name || !advisorProfile?.location || !advisorProfile?.founding_year || !advisorProfile?.position_in_office)
                ? 'border-2 border-red-500 animate-pulse' : ''
              }`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-primary" />
                        פרטי משרד
                        {(authProfile?.role === 'advisor' || profile?.role === 'advisor') && 
                         (!advisorProfile?.company_name || !advisorProfile?.location || !advisorProfile?.founding_year || !advisorProfile?.position_in_office) && (
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
                    <Label>כתובת משרד *</Label>
                    <Input
                      value={editedData.location}
                      onChange={(e) => setEditedData({ ...editedData, location: e.target.value })}
                      placeholder="רחוב, מספר, עיר"
                      className={!editedData.location ? 'border-red-500' : ''}
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>שנת הקמת המשרד *</Label>
                    <Input
                      type="number"
                      min="1900"
                      max={new Date().getFullYear()}
                      value={editedData.foundingYear}
                      onChange={(e) => setEditedData({ ...editedData, foundingYear: parseInt(e.target.value) || new Date().getFullYear() })}
                      placeholder={`למשל: ${new Date().getFullYear() - 10}`}
                      className={!editedData.foundingYear ? 'border-red-500' : ''}
                    />
                    {editedData.foundingYear && (
                      <p className="text-xs text-muted-foreground">
                        שנות פעילות: {new Date().getFullYear() - editedData.foundingYear}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>תפקיד הנרשם במשרד *</Label>
                    <Input
                      value={editedData.positionInOffice}
                      onChange={(e) => setEditedData({ ...editedData, positionInOffice: e.target.value })}
                      placeholder="למשל: מנכ״ל, מייסד, בעלים, מנהלת משרד"
                      className={!editedData.positionInOffice ? 'border-red-500' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>מספר טלפון במשרד</Label>
                    <PhoneInput
                      international
                      defaultCountry="IL"
                      value={editedData.officePhone}
                      onChange={(value) => setEditedData({ ...editedData, officePhone: value || '' })}
                      className="phone-input"
                      dir="ltr"
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
                      <div className={!advisorProfile?.founding_year ? 'p-2 border-2 border-red-300 rounded' : ''}>
                        <label className="text-sm font-medium text-muted-foreground">
                          שנת הקמת המשרד
                          {!advisorProfile?.founding_year && <span className="text-red-500 mr-1">*</span>}
                        </label>
                        <p className="text-foreground">
                          {advisorProfile?.founding_year ? (
                            <>
                              {advisorProfile.founding_year}
                              <span className="text-xs text-muted-foreground mr-2">
                                (שנות פעילות: {new Date().getFullYear() - advisorProfile.founding_year})
                              </span>
                            </>
                          ) : 'לא מוגדר'}
                        </p>
                      </div>
                      <div className={!advisorProfile?.position_in_office ? 'p-2 border-2 border-red-300 rounded' : ''}>
                        <label className="text-sm font-medium text-muted-foreground">
                          תפקיד הנרשם במשרד
                          {!advisorProfile?.position_in_office && <span className="text-red-500 mr-1">*</span>}
                        </label>
                        <p className="text-foreground">{advisorProfile?.position_in_office || 'לא מוגדר'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          מספר טלפון במשרד
                        </label>
                        <p className="text-foreground" dir="ltr" style={{ textAlign: 'right' }}>
                          {advisorProfile?.office_phone || 'לא מוגדר'}
                        </p>
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
                        תחומי עיסוק
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
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Facebook className="h-4 w-4" />
                      פייסבוק
                    </Label>
                    <Input
                      type="url"
                      value={editedData.facebookUrl}
                      onChange={(e) => setEditedData({ ...editedData, facebookUrl: e.target.value })}
                      placeholder="https://www.facebook.com/yourpage"
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
                        href={ensureHttpProtocol(advisorProfile.website)}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline break-all"
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
                        href={ensureHttpProtocol(advisorProfile.linkedin_url)}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline break-all"
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
                        href={ensureHttpProtocol(advisorProfile.instagram_url)}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline break-all"
                        dir="ltr"
                      >
                        {advisorProfile.instagram_url}
                      </a>
                    </div>
                  )}
                  {advisorProfile?.facebook_url && (
                    <div className="flex items-center gap-2">
                      <Facebook className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={ensureHttpProtocol(advisorProfile.facebook_url)}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline break-all"
                        dir="ltr"
                      >
                        {advisorProfile.facebook_url}
                      </a>
                    </div>
                  )}
                  {!advisorProfile?.website && !advisorProfile?.linkedin_url && !advisorProfile?.instagram_url && !advisorProfile?.facebook_url && (
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
            {/* Account Settings */}
            <Card className="hover-scale" dir="rtl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  הגדרות חשבון
                </CardTitle>
                <CardDescription>פרטי החשבון וההגדרות שלך</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">תפקיד</label>
                  <p className="text-foreground flex items-center gap-2 mt-1">
                    <Shield className="h-4 w-4" />
                    {getRoleDisplay(profile?.role)}
                  </p>
                </div>
                {isAdvisor && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">חבילה</label>
                    <p className="text-foreground flex items-center gap-2 mt-1">
                      <Briefcase className="h-4 w-4" />
                      חבילה בסיסית
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Branding - Logo & Cover (Advisors Only) */}
            {isAdvisor && (
              <Card className="hover-scale" dir="rtl">
                <CardHeader>
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-primary" />
                      מיתוג ועיצוב
                    </CardTitle>
                    <CardDescription>לוגו ותמונת רקע למשרד שלך</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Logo Upload */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">לוגו המשרד</Label>
                      <label htmlFor="logo-upload" className="cursor-pointer block">
                        <div className="relative border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors group">
                          {advisorProfile?.logo_url ? (
                            <div className="aspect-square w-full flex items-center justify-center bg-background rounded">
                              <img 
                                src={advisorProfile.logo_url} 
                                alt="Logo" 
                                className="max-w-full max-h-full object-contain p-2"
                              />
                            </div>
                          ) : (
                            <div className="aspect-square w-full flex flex-col items-center justify-center">
                              <Upload className="h-10 w-10 mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                              <p className="text-sm font-medium text-center">
                                {uploadingLogo ? 'מעלה...' : 'העלה לוגו'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">PNG/JPG עד 2MB</p>
                            </div>
                          )}
                        </div>
                      </label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={uploadingLogo}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          disabled={uploadingLogo}
                          variant="outline"
                          className="flex-1"
                        >
                          <Upload className="h-4 w-4 ml-2" />
                          {advisorProfile?.logo_url ? 'החלף לוגו' : 'העלה לוגו'}
                        </Button>
                        {advisorProfile?.logo_url && (
                          <Button
                            onClick={handleLogoRemove}
                            disabled={uploadingLogo}
                            variant="destructive"
                            className="flex-1"
                          >
                            <X className="h-4 w-4 ml-2" />
                            הסר לוגו
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Cover Image Selection */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">תמונת רקע</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {COVER_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            onClick={() => handleCoverSelect(option.id)}
                            disabled={saving}
                            className={`relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                              (advisorProfile?.cover_image_url || '0') === option.id
                                ? 'border-primary ring-2 ring-primary ring-offset-2'
                                : 'border-border hover:border-primary'
                            }`}
                          >
                            <div className="aspect-video w-full">
                              {option.id === '0' ? (
                                <div className="w-full h-full flex items-center justify-center bg-muted">
                                  <div className="text-center">
                                    <ImageIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">ללא תמונה</p>
                                  </div>
                                </div>
                              ) : (
                                <img
                                  src={option.image}
                                  alt={option.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            {(advisorProfile?.cover_image_url || '0') === option.id && (
                              <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                                <CheckCircle className="h-4 w-4" />
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                              <p className="text-xs text-white font-medium text-center">{option.name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
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