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
import { X, Plus, Globe, Linkedin, Instagram } from 'lucide-react';
import { ADVISOR_EXPERTISE } from '@/constants/advisor';
import { UserHeader } from '@/components/UserHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

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
  certifications: string[];
  location: string;
  years_experience?: number;
  hourly_rate?: number;
  availability_status?: string;
  activity_regions?: string[];
  office_size?: string;
  website?: string;
  linkedin_url?: string;
  instagram_url?: string;
}

const AdvisorProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<AdvisorProfile>({
    company_name: '',
    expertise: [],
    certifications: [],
    location: '',
    years_experience: undefined,
    hourly_rate: undefined,
    availability_status: 'available',
    activity_regions: [],
    office_size: '',
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
        expertise: profile.expertise,
        certifications: profile.certifications,
        location: profile.location,
        years_experience: profile.years_experience,
        hourly_rate: profile.hourly_rate,
        availability_status: profile.availability_status,
        activity_regions: profile.activity_regions,
        office_size: profile.office_size,
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

  const completionPercentage = Math.round(
    (Object.values({
      company_name: profile.company_name,
      location: profile.location,
      years_experience: profile.years_experience,
      hourly_rate: profile.hourly_rate,
      expertise: profile.expertise,
      activity_regions: profile.activity_regions,
      office_size: profile.office_size
    }).filter(val => 
      val !== '' && val !== undefined && val !== null && 
      !(Array.isArray(val) && val.length === 0)
    ).length / 7) * 100
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="flex justify-between items-center p-6 border-b">
        <UserHeader />
      </div>
      
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
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
                <Label htmlFor="location">מיקום *</Label>
                <Input
                  id="location"
                  value={profile.location}
                  onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="למשל: תל אביב, ירושלים, חיפה"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="years_experience">שנות ניסיון *</Label>
                  <Input
                    id="years_experience"
                    type="number"
                    value={profile.years_experience || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, years_experience: e.target.value ? parseInt(e.target.value) : undefined }))}
                    placeholder="מספר שנות הניסיון"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">תעריף לשעה (₪) *</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    value={profile.hourly_rate || ''}
                    onChange={(e) => setProfile(prev => ({ ...prev, hourly_rate: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    placeholder="תעריף בשקלים"
                    required
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
                <p className="text-sm text-muted-foreground">בחר את תפקידך המקצועי (עד 5 תפקידים)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                  {ADVISOR_EXPERTISE.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={profile.expertise.includes(type) ? "default" : "outline"}
                      onClick={() => {
                        if (profile.expertise.includes(type)) {
                          removeExpertise(type);
                        } else if (profile.expertise.length < 5) {
                          addExpertise(type);
                        }
                      }}
                      disabled={!profile.expertise.includes(type) && profile.expertise.length >= 5}
                      className="justify-start text-sm h-auto py-2 px-3"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
                
                {profile.expertise.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">התמחויות נבחרות ({profile.expertise.length}/5):</Label>
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