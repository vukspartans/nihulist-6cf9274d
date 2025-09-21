import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, User, Building, Shield, KeyRound, Edit, Save, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface UserProfile {
  name: string | null;
  phone: string | null;
  company_name: string | null;
  role: string | null;
}

const Profile = () => {
  const { user, profile: authProfile } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [editMode, setEditMode] = useState({ name: false, phone: false });
  const [editedData, setEditedData] = useState({ name: '', phone: '' });
  const [saving, setSaving] = useState(false);

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
        setEditedData({ name: data.name || '', phone: data.phone || '' });
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

  const updateProfile = async (field: 'name' | 'phone') => {
    setSaving(true);
    try {
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

  const handleEditToggle = (field: 'name' | 'phone') => {
    if (editMode[field]) {
      // Reset to original value if canceling
      setEditedData(prev => ({ 
        ...prev, 
        [field]: field === 'name' ? (profile?.name || '') : (profile?.phone || '') 
      }));
    }
    setEditMode(prev => ({ ...prev, [field]: !prev[field] }));
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

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to={getDashboardRoute()} className="hover:text-foreground transition-colors">
            דשבורד
          </Link>
          <ArrowRight className="h-4 w-4" />
          <span>הפרופיל שלי</span>
        </div>

        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">הפרופיל שלי</h1>
          <p className="text-muted-foreground">ניהול פרטי החשבון והגדרות אישיות</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                פרטים אישיים
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-sm font-medium text-muted-foreground">שם מלא</label>
                  {editMode.name ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={editedData.name}
                        onChange={(e) => setEditedData(prev => ({ ...prev, name: e.target.value }))}
                        className="flex-1"
                        placeholder="הזן שם מלא"
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

          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                פרטי חברה
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">שם החברה</label>
                <p className="text-foreground">{profile?.company_name || 'לא מוגדר'}</p>
              </div>
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
            </CardContent>
          </Card>
        </div>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              פעולות חשבון
            </CardTitle>
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
      </div>
    </div>
  );
};

export default Profile;