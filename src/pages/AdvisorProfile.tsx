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
import { X, Plus } from 'lucide-react';
import { PROJECT_TYPES } from '@/constants/project';

interface AdvisorProfile {
  id?: string;
  company_name: string;
  expertise: string[];
  certifications: string[];
  location: string;
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
    location: ''
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
        location: profile.location
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

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>פרופיל יועץ</CardTitle>
            <CardDescription>
              השלימו את פרטי הפרופיל שלכם כדי לקבל הזמנות להצעות מחיר
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="company_name">שם החברה/היועץ *</Label>
                <Input
                  id="company_name"
                  value={profile.company_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, company_name: e.target.value }))}
                  required
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

              <div className="space-y-4">
                <Label>תחומי התמחות</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {PROJECT_TYPES.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={profile.expertise.includes(type) ? "default" : "outline"}
                      onClick={() => 
                        profile.expertise.includes(type) 
                          ? removeExpertise(type)
                          : addExpertise(type)
                      }
                      className="justify-start text-sm h-auto py-2 px-3"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
                
                {profile.expertise.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">תחומי התמחות נבחרים:</Label>
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
  );
};

export default AdvisorProfile;