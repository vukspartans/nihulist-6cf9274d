import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, ChevronLeft, ChevronRight, CheckCircle2, MapPin, Phone, Globe, Linkedin, Users, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization, type OrganizationInput } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { 
  ORGANIZATION_ACTIVITY_CATEGORIES, 
  CATEGORY_KEYS,
  ACTIVITY_REGIONS,
  EMPLOYEE_COUNT_OPTIONS,
  type ActivityTier 
} from '@/constants/organizationCategories';
import NavigationLogo from '@/components/NavigationLogo';

interface SelectedCategories {
  [categoryKey: string]: string[];
}

const TOTAL_STEPS = 4;

const OrganizationOnboarding = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { organization, createOrganization, updateOrganization, loading: orgLoading } = useOrganization();
  const { toast } = useToast();

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Organization Basics
  const [organizationName, setOrganizationName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [country] = useState('Israel');
  const [location, setLocation] = useState('');
  const [foundingYear, setFoundingYear] = useState<number | undefined>();

  // Step 2: Activity Categories
  const [selectedCategories, setSelectedCategories] = useState<SelectedCategories>({});
  const [activeTab, setActiveTab] = useState(CATEGORY_KEYS[0]);

  // Step 3: Activity Scope
  const [primaryCategory, setPrimaryCategory] = useState<string>('');
  const [activityScope, setActivityScope] = useState<string>('');
  const [activityTier, setActivityTier] = useState<ActivityTier | ''>('');
  const [activityRegions, setActivityRegions] = useState<string[]>([]);

  // Step 4: Additional Details
  const [officePhone, setOfficePhone] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [website, setWebsite] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  // Pre-fill from profile
  useEffect(() => {
    if (profile && !organizationName) {
      setOrganizationName((profile as any).company_name || '');
    }
  }, [profile, organizationName]);

  // Redirect if already onboarded or not entrepreneur
  useEffect(() => {
    if (!authLoading && !orgLoading) {
      if (!user) {
        navigate('/auth');
        return;
      }
      if ((profile as any)?.role !== 'entrepreneur') {
        navigate('/dashboard');
        return;
      }
      if (organization?.onboarding_completed_at || organization?.onboarding_skipped_at) {
        navigate('/dashboard');
        return;
      }
    }
  }, [user, profile, organization, authLoading, orgLoading, navigate]);

  const progress = (currentStep / TOTAL_STEPS) * 100;

  const getSelectedCategoriesCount = () => {
    return Object.values(selectedCategories).reduce((acc, subs) => acc + subs.length, 0);
  };

  const getSelectedCategoryNames = () => {
    return Object.keys(selectedCategories).filter(key => selectedCategories[key].length > 0);
  };

  const toggleSubcategory = (categoryKey: string, subcategory: string) => {
    setSelectedCategories(prev => {
      const currentSubs = prev[categoryKey] || [];
      if (currentSubs.includes(subcategory)) {
        return {
          ...prev,
          [categoryKey]: currentSubs.filter(s => s !== subcategory)
        };
      } else {
        return {
          ...prev,
          [categoryKey]: [...currentSubs, subcategory]
        };
      }
    });
  };

  const selectAllInCategory = (categoryKey: string) => {
    const category = ORGANIZATION_ACTIVITY_CATEGORIES[categoryKey];
    setSelectedCategories(prev => ({
      ...prev,
      [categoryKey]: [...category.subcategories]
    }));
  };

  const clearCategory = (categoryKey: string) => {
    setSelectedCategories(prev => ({
      ...prev,
      [categoryKey]: []
    }));
  };

  const toggleRegion = (region: string) => {
    setActivityRegions(prev => 
      prev.includes(region) 
        ? prev.filter(r => r !== region)
        : [...prev, region]
    );
  };

  const handleActivityScopeSelect = (option: { label: string; tier: ActivityTier }) => {
    setActivityScope(option.label);
    setActivityTier(option.tier);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // Only org name is required
        return organizationName.trim().length > 0;
      case 2:
      case 3:
      case 4:
        return true; // Optional steps
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // Create minimal organization and mark as skipped
      const orgData: OrganizationInput = {
        name: organizationName.trim() || (profile as any)?.company_name || 'הארגון שלי',
        type: 'entrepreneur',
        registration_number: registrationNumber || undefined,
        country,
        onboarding_skipped_at: new Date().toISOString()
      };

      let success = false;
      if (organization) {
        success = await updateOrganization({
          ...orgData,
          onboarding_skipped_at: new Date().toISOString()
        });
      } else {
        const newOrg = await createOrganization(orgData);
        success = !!newOrg;
      }

      if (success) {
        toast({
          title: 'נשמר',
          description: 'תוכל להשלים את פרטי הארגון מאוחר יותר מתוך הגדרות הפרופיל'
        });
      } else {
        // Even if save fails, set localStorage flag and allow user to continue
        localStorage.setItem('onboarding_skipped', 'true');
        toast({
          title: 'המשך ללא שמירה',
          description: 'תוכל להשלים את פרטי הארגון מאוחר יותר בהגדרות',
        });
      }
      // Always navigate to dashboard
      localStorage.setItem('onboarding_skipped', 'true');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('[Onboarding] Skip error:', err);
      // Fallback: set localStorage and navigate to dashboard anyway
      localStorage.setItem('onboarding_skipped', 'true');
      toast({
        title: 'המשך ללא שמירה',
        description: 'תוכל להשלים את פרטי הארגון מאוחר יותר בהגדרות',
      });
      navigate('/dashboard', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const orgData: OrganizationInput = {
        name: organizationName.trim(),
        type: 'entrepreneur',
        registration_number: registrationNumber || undefined,
        country,
        location: location || undefined,
        founding_year: foundingYear,
        phone: officePhone || undefined,
        website: website || undefined,
        employee_count: employeeCount || undefined,
        activity_categories: selectedCategories,
        primary_activity_category: primaryCategory || undefined,
        activity_scope: activityScope || undefined,
        activity_scope_tier: activityTier || undefined,
        activity_regions: activityRegions.length > 0 ? activityRegions : undefined,
        linkedin_url: linkedinUrl || undefined,
        onboarding_completed_at: new Date().toISOString()
      };

      let success = false;
      if (organization) {
        success = await updateOrganization(orgData);
      } else {
        const newOrg = await createOrganization(orgData);
        success = !!newOrg;
      }

      if (success) {
        // Clear skip flag on successful completion
        localStorage.removeItem('onboarding_skipped');
        toast({
          title: 'הארגון נוצר בהצלחה!',
          description: 'ברוכים הבאים לניהוליסט'
        });
        navigate('/dashboard', { replace: true });
      } else {
        toast({
          title: 'שגיאה',
          description: 'לא ניתן לשמור את הנתונים. נסה שוב.',
          variant: 'destructive'
        });
      }
    } catch (err) {
      console.error('[Onboarding] Complete error:', err);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה ביצירת הארגון',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <NavigationLogo size="sm" />
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSkip}
            disabled={isSubmitting}
          >
            השלם מאוחר יותר
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-12 max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">שלב {currentStep} מתוך {TOTAL_STEPS}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Value Proposition */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 bg-muted/50 rounded-lg p-3">
          <Sparkles className="w-4 h-4 text-primary flex-shrink-0" />
          <span>המידע הזה יעזור לנו להמליץ על יועצים מתאימים ולחסוך לך זמן</span>
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {currentStep === 1 && 'פרטי הארגון'}
                  {currentStep === 2 && 'תחומי פעילות'}
                  {currentStep === 3 && 'היקף פעילות'}
                  {currentStep === 4 && 'פרטים נוספים'}
                </CardTitle>
                <CardDescription>
                  {currentStep === 1 && 'מידע בסיסי על הארגון שלך'}
                  {currentStep === 2 && 'באילו תחומים הארגון פועל? (אופציונלי)'}
                  {currentStep === 3 && 'מה היקף הפעילות שלכם? (אופציונלי)'}
                  {currentStep === 4 && 'פרטי יצירת קשר ומידע נוסף (אופציונלי)'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Organization Basics */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName" className="text-right block">שם הארגון *</Label>
                  <Input
                    id="orgName"
                    placeholder="שם החברה / הארגון"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="text-right"
                    dir="rtl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regNumber" className="text-right block">מספר ח.פ.</Label>
                  <Input
                    id="regNumber"
                    placeholder="מספר רישום החברה"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="text-right"
                    dir="rtl"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    מספר החברה ברשם החברות (אופציונלי)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-right block">עיר</Label>
                    <Input
                      id="location"
                      placeholder="עיר הרישום"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="text-right"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="foundingYear" className="text-right block">שנת הקמה</Label>
                    <Input
                      id="foundingYear"
                      type="number"
                      placeholder="לדוגמה: 2015"
                      value={foundingYear || ''}
                      onChange={(e) => setFoundingYear(e.target.value ? parseInt(e.target.value) : undefined)}
                      min={1900}
                      max={new Date().getFullYear()}
                      className="text-right"
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Activity Categories */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <TabsList className="flex flex-nowrap sm:flex-wrap h-auto gap-1 bg-muted/50 p-1 min-w-max sm:min-w-0">
                      {CATEGORY_KEYS.map((categoryKey) => {
                        const hasSelections = (selectedCategories[categoryKey]?.length || 0) > 0;
                        return (
                          <TabsTrigger 
                            key={categoryKey} 
                            value={categoryKey}
                            className="text-xs sm:text-sm relative data-[state=active]:bg-background whitespace-nowrap px-2 sm:px-3"
                          >
                            {ORGANIZATION_ACTIVITY_CATEGORIES[categoryKey].label}
                            {hasSelections && (
                              <Badge 
                                variant="default" 
                                className="absolute -top-1 -right-1 h-4 min-w-4 p-0 text-[10px] flex items-center justify-center"
                              >
                                {selectedCategories[categoryKey].length}
                              </Badge>
                            )}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </div>

                  {CATEGORY_KEYS.map((categoryKey) => {
                    const category = ORGANIZATION_ACTIVITY_CATEGORIES[categoryKey];
                    const selected = selectedCategories[categoryKey] || [];
                    const allSelected = selected.length === category.subcategories.length;

                    return (
                      <TabsContent key={categoryKey} value={categoryKey} className="mt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-sm font-medium text-right">{category.label}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => allSelected ? clearCategory(categoryKey) : selectAllInCategory(categoryKey)}
                              className="text-xs sm:text-sm"
                            >
                              {allSelected ? 'נקה הכל' : 'בחר הכל'}
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {category.subcategories.map((sub) => (
                              <div
                                key={sub}
                                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors
                                  ${selected.includes(sub) ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}`}
                                onClick={() => toggleSubcategory(categoryKey, sub)}
                              >
                                <Checkbox checked={selected.includes(sub)} />
                                <span className="text-sm flex-1 text-right">{sub}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>

                {getSelectedCategoriesCount() > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      נבחרו {getSelectedCategoriesCount()} תחומי פעילות
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {getSelectedCategoryNames().map(cat => (
                        <Badge key={cat} variant="secondary" className="text-xs">
                          {ORGANIZATION_ACTIVITY_CATEGORIES[cat].label} ({selectedCategories[cat].length})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Activity Scope */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Primary Category Selection */}
                <div className="space-y-3">
                  <Label className="text-right block">תחום פעילות עיקרי</Label>
                  <Select value={primaryCategory} onValueChange={setPrimaryCategory} dir="rtl">
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="בחר תחום עיקרי" />
                    </SelectTrigger>
                    <SelectContent dir="rtl" className="bg-background">
                      {CATEGORY_KEYS.map((key) => (
                        <SelectItem key={key} value={key} className="text-right">
                          {ORGANIZATION_ACTIVITY_CATEGORIES[key].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dynamic Activity Question */}
                {primaryCategory && (
                  <div className="space-y-3">
                    <Label className="text-right block">{ORGANIZATION_ACTIVITY_CATEGORIES[primaryCategory].activityQuestion}</Label>
                    <RadioGroup value={activityScope} className="space-y-2" dir="rtl">
                      {ORGANIZATION_ACTIVITY_CATEGORIES[primaryCategory].activityOptions.map((option) => (
                        <div
                          key={option.label}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                            ${activityScope === option.label ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}`}
                          onClick={() => handleActivityScopeSelect(option)}
                        >
                          <RadioGroupItem value={option.label} id={option.label} />
                          <Label htmlFor={option.label} className="cursor-pointer flex-1 text-right">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Activity Regions */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2 justify-end">
                    <span>אזורי פעילות</span>
                    <MapPin className="w-4 h-4" />
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ACTIVITY_REGIONS.map((region) => (
                      <div
                        key={region}
                        className={`flex items-center gap-2 p-2 sm:p-3 rounded-lg border cursor-pointer transition-colors text-sm
                          ${activityRegions.includes(region) ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}`}
                        onClick={() => toggleRegion(region)}
                      >
                        <Checkbox checked={activityRegions.includes(region)} />
                        <span className="flex-1 text-right text-xs sm:text-sm">{region}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Additional Details */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2 justify-end">
                    <span>טלפון המשרד</span>
                    <Phone className="w-4 h-4" />
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="03-1234567"
                    value={officePhone}
                    onChange={(e) => setOfficePhone(e.target.value)}
                    className="text-right"
                    dir="rtl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="employees" className="flex items-center gap-2 justify-end">
                    <span>גודל החברה</span>
                    <Users className="w-4 h-4" />
                  </Label>
                  <Select value={employeeCount} onValueChange={setEmployeeCount} dir="rtl">
                    <SelectTrigger className="text-right">
                      <SelectValue placeholder="מספר עובדים" />
                    </SelectTrigger>
                    <SelectContent dir="rtl" className="bg-background">
                      {EMPLOYEE_COUNT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-right">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-2 justify-end">
                    <span>אתר אינטרנט</span>
                    <Globe className="w-4 h-4" />
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://www.example.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin" className="flex items-center gap-2 justify-end">
                    <span>LinkedIn</span>
                    <Linkedin className="w-4 h-4" />
                  </Label>
                  <Input
                    id="linkedin"
                    type="url"
                    placeholder="https://linkedin.com/company/..."
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between mt-6 gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <ChevronRight className="w-4 h-4" />
            הקודם
          </Button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {currentStep < TOTAL_STEPS ? (
              <>
                <Button
                  variant="ghost"
                  onClick={handleNext}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  דלג
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || isSubmitting}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto order-1 sm:order-2"
                >
                  הבא
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? 'שומר...' : 'סיום והמשך'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationOnboarding;
