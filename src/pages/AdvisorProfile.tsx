import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Globe, Linkedin, Instagram, AlertCircle, ArrowRight } from 'lucide-react';
import { ADVISOR_EXPERTISE } from '@/constants/advisor';
import { PROJECT_TYPES } from '@/constants/project';
import { UserHeader } from '@/components/UserHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import PhoneInput from 'react-phone-number-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { canonicalizeAdvisor } from '@/lib/canonicalizeAdvisor';

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

interface AdvisorProfile {
  id?: string;
  company_name: string;
  expertise: string[];
  specialties: string[];
  certifications: string[];
  location: string;
  founding_year?: number;
  availability_status?: string;
  activity_regions?: string[];
  office_size?: string;
  office_phone?: string;
  position_in_office?: string;
  website?: string;
  linkedin_url?: string;
  instagram_url?: string;
  is_active?: boolean;
  admin_approved?: boolean;
}

const AdvisorProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<AdvisorProfile>({
    company_name: '',
    expertise: [],
    specialties: [],
    certifications: [],
    location: '',
    founding_year: undefined,
    availability_status: 'available',
    activity_regions: [],
    office_size: '',
    office_phone: '',
    position_in_office: '',
    website: '',
    linkedin_url: '',
    instagram_url: ''
  });
  const [newExpertise, setNewExpertise] = useState('');
  const [newCertification, setNewCertification] = useState('');

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('advisors')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      // Profile doesn't exist yet, that's okay
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const advisorData = {
        user_id: user?.id,
        company_name: profile.company_name,
        expertise: profile.expertise.map(canonicalizeAdvisor),
        specialties: profile.specialties.map(canonicalizeAdvisor),
        certifications: profile.certifications,
        location: profile.location,
        founding_year: profile.founding_year,
        availability_status: profile.availability_status,
        activity_regions: profile.activity_regions,
        office_size: profile.office_size,
        office_phone: profile.office_phone || null,
        position_in_office: profile.position_in_office || null,
        website: profile.website || null,
        linkedin_url: profile.linkedin_url || null,
        instagram_url: profile.instagram_url || null
      };

      if (profile.id) {
        // Update existing profile
        const { error } = await supabase
          .from('advisors')
          .update(advisorData)
          .eq('id', profile.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('advisors')
          .insert([advisorData]);

        if (error) throw error;
      }

      toast({
        title: "הפרופיל נשמר בהצלחה",
        description: "הפרטים שלך עודכנו במערכת",
      });

      navigate('/advisor-dashboard');
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בשמירת הפרופיל",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addExpertise = (expertiseType: string) => {
    if (expertiseType && !profile.expertise.includes(expertiseType)) {
      setProfile(prev => ({
        ...prev,
        expertise: [...prev.expertise, expertiseType]
      }));
    }
  };

  const removeExpertise = (expertiseToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      expertise: prev.expertise.filter(exp => exp !== expertiseToRemove)
    }));
  };

  const addCertification = () => {
    if (newCertification && !profile.certifications.includes(newCertification)) {
      setProfile(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCertification]
      }));
      setNewCertification('');
    }
  };

  const removeCertification = (certToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      certifications: prev.certifications.filter(cert => cert !== certToRemove)
    }));
  };

  const addSpecialty = (specialty: string) => {
    if (specialty && !profile.specialties.includes(specialty)) {
      setProfile(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty]
      }));
    }
  };

  const removeSpecialty = (specialtyToRemove: string) => {
    setProfile(prev => ({
      ...prev,
      specialties: prev.specialties.filter(spec => spec !== specialtyToRemove)
    }));
  };

  const completionPercentage = Math.round(
    (Object.values({
      company_name: profile.company_name,
      location: profile.location,
      founding_year: profile.founding_year,
      position_in_office: profile.position_in_office,
      expertise: profile.expertise,
      specialties: profile.specialties,
      activity_regions: profile.activity_regions,
      office_size: profile.office_size
    }).filter(val => 
      val !== '' && val !== undefined && val !== null && 
      !(Array.isArray(val) && val.length === 0)
    ).length / 8) * 100
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="flex justify-between items-center p-6 border-b">
        <Button 
          variant="outline" 
          onClick={() => navigate('/advisor-dashboard')}
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לדשבורד
        </Button>
        <UserHeader />
      </div>
      
      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {profile && !profile.admin_approved && (
            <Alert className="bg-yellow-50 border-yellow-300">
              <AlertCircle className="h-4 w-4 text-yellow-700" />
              <AlertDescription className="text-yellow-800">
                <strong>חשבונך ממתין לאישור</strong> - פרופילך לא יופיע בהמלצות ליזמים עד לאישור מנהלי המערכת. תוכל לערוך את הפרטים שלך בינתיים, והם ישמרו לאחר האישור.
              </AlertDescription>
            </Alert>
          )}
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>פרופיל יועץ</CardTitle>
                <CardDescription>
                  השלימו את פרטי הפרופיל שלכם כדי לקבל הזמנות להצעות מחיר
                </CardDescription>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{completionPercentage}%</div>
                <div className="text-xs text-muted-foreground">הושלם</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company_name">שם המשרד *</Label>
                <Input
                  id="company_name"
                  value={profile.company_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, company_name: e.target.value }))}
                  required
                  placeholder="הזן את שם המשרד"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">כתובת משרד *</Label>
                <Input
                  id="location"
                  value={profile.location}
                  onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="רחוב, מספר, עיר"
                  required
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">פרטים אישיים</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="founding_year">שנת הקמת המשרד *</Label>
                    <Input
                      id="founding_year"
                      type="number"
                      min="1900"
                      max={new Date().getFullYear()}
                      value={profile.founding_year || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, founding_year: e.target.value ? parseInt(e.target.value) : undefined }))}
                      placeholder={`למשל: ${new Date().getFullYear() - 10}`}
                      required
                    />
                    {profile.founding_year && (
                      <p className="text-xs text-muted-foreground">
                        שנות פעילות: {new Date().getFullYear() - profile.founding_year}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position_in_office">תפקיד הנרשם במשרד *</Label>
                    <Input
                      id="position_in_office"
                      value={profile.position_in_office || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, position_in_office: e.target.value }))}
                      placeholder="למשל: מנכ״ל, מייסד, בעלים, מנהלת משרד"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="office_phone">מספר טלפון במשרד</Label>
                  <PhoneInput
                    id="office_phone"
                    international
                    defaultCountry="IL"
                    value={profile.office_phone || ''}
                    onChange={(value) => setProfile(prev => ({ ...prev, office_phone: value || '' }))}
                    className="phone-input"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>גודל המשרד *</Label>
                <Select 
                  value={profile.office_size} 
                  onValueChange={(value) => setProfile(prev => ({ ...prev, office_size: value }))}
                >
                  <SelectTrigger dir="rtl">
                    <SelectValue placeholder="בחר גודל משרד" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {OFFICE_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">אזורי פעילות *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (profile.activity_regions?.length === ACTIVITY_REGIONS.length) {
                        setProfile(prev => ({ ...prev, activity_regions: [] }));
                      } else {
                        setProfile(prev => ({ ...prev, activity_regions: [...ACTIVITY_REGIONS] }));
                      }
                    }}
                  >
                    {profile.activity_regions?.length === ACTIVITY_REGIONS.length ? 'נקה הכל' : 'בחר הכל'}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ACTIVITY_REGIONS.map((region) => (
                    <div key={region} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={`region-${region}`}
                        checked={profile.activity_regions?.includes(region)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setProfile(prev => ({ 
                              ...prev, 
                              activity_regions: [...(prev.activity_regions || []), region] 
                            }));
                          } else {
                            setProfile(prev => ({ 
                              ...prev, 
                              activity_regions: (prev.activity_regions || []).filter(r => r !== region) 
                            }));
                          }
                        }}
                      />
                      <label
                        htmlFor={`region-${region}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {region}
                      </label>
                    </div>
                  ))}
                </div>
                {profile.activity_regions && profile.activity_regions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {profile.activity_regions.map((region) => (
                      <Badge key={region} variant="secondary">
                        {region}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label>התמחות מקצועית *</Label>
                <p className="text-sm text-muted-foreground">בחר את תפקידך המקצועי</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                  {ADVISOR_EXPERTISE.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={profile.expertise.includes(type) ? "default" : "outline"}
                      onClick={() => {
                        if (profile.expertise.includes(type)) {
                          removeExpertise(type);
                        } else {
                          addExpertise(type);
                        }
                      }}
                      className="justify-start text-sm h-auto py-2 px-3"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
                
                {profile.expertise.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">התמחויות נבחרות ({profile.expertise.length}):</Label>
                    <div className="flex flex-wrap gap-2">
                      {profile.expertise.map((exp) => (
                        <Badge key={exp} variant="secondary" className="gap-1">
                          {exp}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => removeExpertise(exp)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label>התמחויות המשרד *</Label>
                <p className="text-sm text-muted-foreground">בחר את סוגי הפרויקטים שהמשרד שלך מתמחה בהם</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                  {PROJECT_TYPES.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={profile.specialties.includes(type) ? "default" : "outline"}
                      onClick={() => {
                        if (profile.specialties.includes(type)) {
                          removeSpecialty(type);
                        } else {
                          addSpecialty(type);
                        }
                      }}
                      className="justify-start text-sm h-auto py-2 px-3"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
                
                {profile.specialties.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">התמחויות נבחרות ({profile.specialties.length}):</Label>
                    <div className="flex flex-wrap gap-2">
                      {profile.specialties.map((spec) => (
                        <Badge key={spec} variant="secondary" className="gap-1">
                          {spec}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => removeSpecialty(spec)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label>הסמכות ותעודות</Label>
                <div className="flex gap-2">
                  <Input
                    value={newCertification}
                    onChange={(e) => setNewCertification(e.target.value)}
                    placeholder="הוסיפו הסמכה או תעודה"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                  />
                  <Button type="button" onClick={addCertification} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {profile.certifications.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.certifications.map((cert) => (
                      <Badge key={cert} variant="outline" className="gap-1">
                        {cert}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeCertification(cert)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">קישורים חברתיים ואתר (אופציונלי)</Label>
                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    אתר אינטרנט
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    value={profile.website || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://www.example.com"
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4" />
                    לינקדאין
                  </Label>
                  <Input
                    id="linkedin"
                    type="url"
                    value={profile.linkedin_url || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, linkedin_url: e.target.value }))}
                    placeholder="https://www.linkedin.com/in/username"
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram" className="flex items-center gap-2">
                    <Instagram className="h-4 w-4" />
                    אינסטגרם
                  </Label>
                  <Input
                    id="instagram"
                    type="url"
                    value={profile.instagram_url || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, instagram_url: e.target.value }))}
                    placeholder="https://www.instagram.com/username"
                    dir="ltr"
                    className="text-left"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'שומר...' : 'שמירת פרופיל'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/advisor-dashboard')}
                >
                  ביטול
                </Button>
              </div>
            </form>
          </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdvisorProfile;