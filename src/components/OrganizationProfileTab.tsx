import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useOrganization, type Organization } from '@/hooks/useOrganization';
import { 
  ORGANIZATION_ACTIVITY_CATEGORIES, 
  CATEGORY_KEYS,
  ACTIVITY_REGIONS,
  EMPLOYEE_COUNT_OPTIONS,
  type ActivityCategory
} from '@/constants/organizationCategories';
import { 
  Building2, 
  Edit, 
  Save, 
  X, 
  CheckCircle, 
  MapPin, 
  Phone, 
  Globe, 
  Linkedin, 
  Users,
  Layers,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Hebrew labels for categories
const CATEGORY_LABELS: Record<string, string> = {
  urban_renewal: 'התחדשות עירונית',
  residential_development: 'פיתוח למגורים',
  commercial_development: 'פיתוח מסחרי',
  public_buildings: 'מבני ציבור',
  industrial: 'תעשייה ולוגיסטיקה',
  infrastructure: 'תשתיות',
};

// Hebrew labels for activity scope tiers
const TIER_LABELS: Record<string, string> = {
  small: 'קטן',
  medium: 'בינוני',
  large: 'גדול',
  enterprise: 'ארגוני',
};

const OrganizationProfileTab = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { organization, loading, updateOrganization } = useOrganization();
  
  const [editMode, setEditMode] = useState({
    basic: false,
    categories: false,
    scope: false,
    contact: false,
  });
  
  const [editedData, setEditedData] = useState({
    name: '',
    registration_number: '',
    location: '',
    founding_year: new Date().getFullYear(),
    activity_categories: {} as Record<string, string[]>,
    primary_activity_category: '',
    activity_scope: '',
    activity_scope_tier: '',
    activity_regions: [] as string[],
    phone: '',
    website: '',
    linkedin_url: '',
    employee_count: '',
  });
  
  const [saving, setSaving] = useState(false);

  // Initialize edited data from organization
  useEffect(() => {
    if (organization) {
      setEditedData({
        name: organization.name || '',
        registration_number: organization.registration_number || '',
        location: organization.location || '',
        founding_year: organization.founding_year || new Date().getFullYear(),
        activity_categories: (organization.activity_categories as Record<string, string[]>) || {},
        primary_activity_category: organization.primary_activity_category || '',
        activity_scope: organization.activity_scope || '',
        activity_scope_tier: organization.activity_scope_tier || '',
        activity_regions: organization.activity_regions || [],
        phone: organization.phone || '',
        website: organization.website || '',
        linkedin_url: organization.linkedin_url || '',
        employee_count: organization.employee_count || '',
      });
    }
  }, [organization]);

  const handleEditToggle = (field: keyof typeof editMode) => {
    if (editMode[field]) {
      // Reset to original data
      if (organization) {
        setEditedData({
          name: organization.name || '',
          registration_number: organization.registration_number || '',
          location: organization.location || '',
          founding_year: organization.founding_year || new Date().getFullYear(),
          activity_categories: (organization.activity_categories as Record<string, string[]>) || {},
          primary_activity_category: organization.primary_activity_category || '',
          activity_scope: organization.activity_scope || '',
          activity_scope_tier: organization.activity_scope_tier || '',
          activity_regions: organization.activity_regions || [],
          phone: organization.phone || '',
          website: organization.website || '',
          linkedin_url: organization.linkedin_url || '',
          employee_count: organization.employee_count || '',
        });
      }
    }
    setEditMode(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const saveBasicInfo = async () => {
    setSaving(true);
    try {
      const success = await updateOrganization({
        name: editedData.name,
        registration_number: editedData.registration_number || null,
        location: editedData.location || null,
        founding_year: editedData.founding_year || null,
      });
      
      if (success) {
        setEditMode(prev => ({ ...prev, basic: false }));
        toast({ title: 'נשמר בהצלחה', description: 'פרטי הארגון עודכנו' });
      }
    } catch (error) {
      console.error('Error saving basic info:', error);
      toast({ title: 'שגיאה', description: 'לא ניתן לשמור את הפרטים', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveCategories = async () => {
    setSaving(true);
    try {
      const success = await updateOrganization({
        activity_categories: editedData.activity_categories,
      });
      
      if (success) {
        setEditMode(prev => ({ ...prev, categories: false }));
        toast({ title: 'נשמר בהצלחה', description: 'תחומי הפעילות עודכנו' });
      }
    } catch (error) {
      console.error('Error saving categories:', error);
      toast({ title: 'שגיאה', description: 'לא ניתן לשמור את הפרטים', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveScope = async () => {
    setSaving(true);
    try {
      const success = await updateOrganization({
        primary_activity_category: editedData.primary_activity_category || null,
        activity_scope: editedData.activity_scope || null,
        activity_scope_tier: editedData.activity_scope_tier || null,
        activity_regions: editedData.activity_regions,
      });
      
      if (success) {
        setEditMode(prev => ({ ...prev, scope: false }));
        toast({ title: 'נשמר בהצלחה', description: 'היקף הפעילות עודכן' });
      }
    } catch (error) {
      console.error('Error saving scope:', error);
      toast({ title: 'שגיאה', description: 'לא ניתן לשמור את הפרטים', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const saveContact = async () => {
    setSaving(true);
    try {
      const success = await updateOrganization({
        phone: editedData.phone || null,
        website: editedData.website || null,
        linkedin_url: editedData.linkedin_url || null,
        employee_count: editedData.employee_count || null,
      });
      
      if (success) {
        setEditMode(prev => ({ ...prev, contact: false }));
        toast({ title: 'נשמר בהצלחה', description: 'פרטי ההתקשרות עודכנו' });
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      toast({ title: 'שגיאה', description: 'לא ניתן לשמור את הפרטים', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleSubcategory = (categoryKey: string, subcategory: string) => {
    setEditedData(prev => {
      const currentSubs = prev.activity_categories[categoryKey] || [];
      const newSubs = currentSubs.includes(subcategory)
        ? currentSubs.filter(s => s !== subcategory)
        : [...currentSubs, subcategory];
      
      const newCategories = { ...prev.activity_categories };
      if (newSubs.length > 0) {
        newCategories[categoryKey] = newSubs;
      } else {
        delete newCategories[categoryKey];
      }
      
      return { ...prev, activity_categories: newCategories };
    });
  };

  const toggleRegion = (region: string) => {
    setEditedData(prev => ({
      ...prev,
      activity_regions: prev.activity_regions.includes(region)
        ? prev.activity_regions.filter(r => r !== region)
        : [...prev.activity_regions, region]
    }));
  };

  const toggleAllRegions = () => {
    if (editedData.activity_regions.length === ACTIVITY_REGIONS.length) {
      setEditedData(prev => ({ ...prev, activity_regions: [] }));
    } else {
      setEditedData(prev => ({ ...prev, activity_regions: [...ACTIVITY_REGIONS] }));
    }
  };

  const getSelectedCategoriesCount = () => {
    return Object.values(editedData.activity_categories).flat().length;
  };

  const getCompletionStatus = () => {
    const checks = {
      basic: Boolean(organization?.name && organization?.location),
      categories: Object.keys(organization?.activity_categories || {}).length > 0,
      scope: Boolean(organization?.activity_regions && organization.activity_regions.length > 0),
      contact: Boolean(organization?.phone || organization?.website),
    };
    
    const completed = Object.values(checks).filter(Boolean).length;
    return { checks, completed, total: 4, percentage: Math.round((completed / 4) * 100) };
  };

  // If no organization exists, show CTA to complete onboarding
  if (!loading && !organization) {
    return (
      <div className="space-y-4">
        <Card className="border-2 border-dashed border-primary/50">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">השלם את פרטי הארגון</h3>
            <p className="text-muted-foreground mb-6">
              כדי לקבל המלצות מדויקות יותר ליועצים, מומלץ להשלים את פרטי הארגון שלך
            </p>
            <Button onClick={() => navigate('/organization/onboarding')} size="lg">
              <Building2 className="h-5 w-5 ml-2" />
              התחל עכשיו
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completion = getCompletionStatus();

  return (
    <div className="space-y-4">
      {/* Completion indicator */}
      {completion.percentage < 100 && (
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${completion.percentage >= 75 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">השלמת פרופיל הארגון</p>
                  <p className="text-sm text-muted-foreground">{completion.completed} מתוך {completion.total} סעיפים הושלמו</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-primary">{completion.percentage}%</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card 1: Basic Organization Info */}
      <Card className={`hover-scale ${!completion.checks.basic ? 'border-2 border-amber-400' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                פרטי הארגון
                {completion.checks.basic && <CheckCircle className="h-4 w-4 text-green-500" />}
              </CardTitle>
              <CardDescription>מידע בסיסי על החברה שלך</CardDescription>
            </div>
            {!editMode.basic && (
              <Button size="sm" variant="ghost" onClick={() => handleEditToggle('basic')}>
                <Edit className="h-4 w-4 ml-2" />
                ערוך
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editMode.basic ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>שם הארגון *</Label>
                  <Input
                    value={editedData.name}
                    onChange={(e) => setEditedData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="הזן שם חברה"
                  />
                </div>
                <div className="space-y-2">
                  <Label>מספר ח.פ.</Label>
                  <Input
                    value={editedData.registration_number}
                    onChange={(e) => setEditedData(prev => ({ ...prev, registration_number: e.target.value }))}
                    placeholder="123456789"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>עיר *</Label>
                  <Input
                    value={editedData.location}
                    onChange={(e) => setEditedData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="תל אביב"
                  />
                </div>
                <div className="space-y-2">
                  <Label>שנת הקמה</Label>
                  <Input
                    type="number"
                    min={1900}
                    max={new Date().getFullYear()}
                    value={editedData.founding_year}
                    onChange={(e) => setEditedData(prev => ({ ...prev, founding_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={saveBasicInfo} disabled={saving} className="flex-1">
                  {saving ? 'שומר...' : 'שמור'}
                </Button>
                <Button variant="outline" onClick={() => handleEditToggle('basic')} disabled={saving} className="flex-1">
                  ביטול
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">שם הארגון</label>
                <p className="text-foreground">{organization?.name || 'לא מוגדר'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">מספר ח.פ.</label>
                <p className="text-foreground" dir="ltr" style={{ textAlign: 'right' }}>{organization?.registration_number || 'לא מוגדר'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">עיר</label>
                <p className="text-foreground">{organization?.location || 'לא מוגדר'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">שנת הקמה</label>
                <p className="text-foreground">
                  {organization?.founding_year ? (
                    <>
                      {organization.founding_year}
                      <span className="text-xs text-muted-foreground mr-2">
                        ({new Date().getFullYear() - organization.founding_year} שנות פעילות)
                      </span>
                    </>
                  ) : 'לא מוגדר'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Activity Categories */}
      <Card className={`hover-scale ${!completion.checks.categories ? 'border-2 border-amber-400' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                תחומי פעילות
                {completion.checks.categories && <CheckCircle className="h-4 w-4 text-green-500" />}
              </CardTitle>
              <CardDescription>סוגי הפרויקטים והתחומים בהם אתם עוסקים</CardDescription>
            </div>
            {!editMode.categories && (
              <Button size="sm" variant="ghost" onClick={() => handleEditToggle('categories')}>
                <Edit className="h-4 w-4 ml-2" />
                ערוך
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editMode.categories ? (
            <div className="space-y-4">
              <Tabs defaultValue={CATEGORY_KEYS[0]} className="w-full">
                <TabsList className="grid grid-cols-3 md:grid-cols-6 h-auto p-1 mb-4">
                  {CATEGORY_KEYS.map(key => (
                    <TabsTrigger key={key} value={key} className="text-xs py-2 px-1">
                      {CATEGORY_LABELS[key]}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {CATEGORY_KEYS.map(categoryKey => {
                  const category = ORGANIZATION_ACTIVITY_CATEGORIES[categoryKey];
                  return (
                    <TabsContent key={categoryKey} value={categoryKey} className="mt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 border rounded-lg max-h-[300px] overflow-y-auto">
                        {category.subcategories.map(sub => (
                          <div key={sub} className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox
                              id={`${categoryKey}-${sub}`}
                              checked={editedData.activity_categories[categoryKey]?.includes(sub) || false}
                              onCheckedChange={() => toggleSubcategory(categoryKey, sub)}
                            />
                            <label htmlFor={`${categoryKey}-${sub}`} className="text-sm cursor-pointer">
                              {sub}
                            </label>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
              
              {getSelectedCategoriesCount() > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    תחומים נבחרים ({getSelectedCategoriesCount()}):
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(editedData.activity_categories).map(([category, subs]) =>
                      subs.map(sub => (
                        <Badge key={`${category}-${sub}`} variant="secondary" className="gap-1">
                          {sub}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => toggleSubcategory(category, sub)}
                          />
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <Button onClick={saveCategories} disabled={saving} className="flex-1">
                  {saving ? 'שומר...' : 'שמור'}
                </Button>
                <Button variant="outline" onClick={() => handleEditToggle('categories')} disabled={saving} className="flex-1">
                  ביטול
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(organization?.activity_categories || {}).length > 0 ? (
                Object.entries(organization?.activity_categories as Record<string, string[]> || {}).map(([category, subs]) => (
                  <div key={category}>
                    <p className="text-sm font-medium text-muted-foreground mb-2">{CATEGORY_LABELS[category] || category}</p>
                    <div className="flex flex-wrap gap-2">
                      {subs.map(sub => (
                        <Badge key={sub} variant="secondary">{sub}</Badge>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">לא נבחרו תחומי פעילות</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 3: Activity Scope */}
      <Card className={`hover-scale ${!completion.checks.scope ? 'border-2 border-amber-400' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                היקף פעילות
                {completion.checks.scope && <CheckCircle className="h-4 w-4 text-green-500" />}
              </CardTitle>
              <CardDescription>היקף ואזורי הפעילות של הארגון</CardDescription>
            </div>
            {!editMode.scope && (
              <Button size="sm" variant="ghost" onClick={() => handleEditToggle('scope')}>
                <Edit className="h-4 w-4 ml-2" />
                ערוך
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editMode.scope ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>תחום עיקרי</Label>
                  <Select 
                    value={editedData.primary_activity_category} 
                    onValueChange={(value) => setEditedData(prev => ({ ...prev, primary_activity_category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר תחום עיקרי" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_KEYS.map(key => (
                        <SelectItem key={key} value={key}>{CATEGORY_LABELS[key]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>היקף פרויקטים</Label>
                  <Input
                    value={editedData.activity_scope}
                    onChange={(e) => setEditedData(prev => ({ ...prev, activity_scope: e.target.value }))}
                    placeholder="לדוגמה: 10-50 יחידות דיור בשנה"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>אזורי פעילות</Label>
                  <Button type="button" variant="outline" size="sm" onClick={toggleAllRegions}>
                    {editedData.activity_regions.length === ACTIVITY_REGIONS.length ? 'נקה הכל' : 'בחר הכל'}
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border rounded-lg">
                  {ACTIVITY_REGIONS.map((region) => (
                    <div key={region} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={region}
                        checked={editedData.activity_regions.includes(region)}
                        onCheckedChange={() => toggleRegion(region)}
                      />
                      <label htmlFor={region} className="text-sm cursor-pointer">
                        {region}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button onClick={saveScope} disabled={saving} className="flex-1">
                  {saving ? 'שומר...' : 'שמור'}
                </Button>
                <Button variant="outline" onClick={() => handleEditToggle('scope')} disabled={saving} className="flex-1">
                  ביטול
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">תחום עיקרי</label>
                  <p className="text-foreground">
                    {organization?.primary_activity_category 
                      ? CATEGORY_LABELS[organization.primary_activity_category] || organization.primary_activity_category
                      : 'לא מוגדר'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">היקף פעילות</label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-foreground">{organization?.activity_scope || 'לא מוגדר'}</p>
                    {organization?.activity_scope_tier && (
                      <Badge variant="secondary" className="text-xs">
                        {TIER_LABELS[organization.activity_scope_tier] || organization.activity_scope_tier}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">אזורי פעילות</label>
                {organization?.activity_regions && organization.activity_regions.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {organization.activity_regions.map(region => (
                      <Badge key={region} variant="outline">{region}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">לא נבחרו אזורי פעילות</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 4: Contact Details */}
      <Card className={`hover-scale ${!completion.checks.contact ? 'border-2 border-amber-400' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                פרטי התקשרות
                {completion.checks.contact && <CheckCircle className="h-4 w-4 text-green-500" />}
              </CardTitle>
              <CardDescription>דרכי יצירת קשר עם הארגון</CardDescription>
            </div>
            {!editMode.contact && (
              <Button size="sm" variant="ghost" onClick={() => handleEditToggle('contact')}>
                <Edit className="h-4 w-4 ml-2" />
                ערוך
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editMode.contact ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    טלפון
                  </Label>
                  <Input
                    value={editedData.phone}
                    onChange={(e) => setEditedData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="03-1234567"
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    מספר עובדים
                  </Label>
                  <Select 
                    value={editedData.employee_count} 
                    onValueChange={(value) => setEditedData(prev => ({ ...prev, employee_count: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר טווח" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_COUNT_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    אתר אינטרנט
                  </Label>
                  <Input
                    value={editedData.website}
                    onChange={(e) => setEditedData(prev => ({ ...prev, website: e.target.value }))}
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
                    value={editedData.linkedin_url}
                    onChange={(e) => setEditedData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                    placeholder="https://www.linkedin.com/company/..."
                    dir="ltr"
                    className="text-left"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={saveContact} disabled={saving} className="flex-1">
                  {saving ? 'שומר...' : 'שמור'}
                </Button>
                <Button variant="outline" onClick={() => handleEditToggle('contact')} disabled={saving} className="flex-1">
                  ביטול
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  טלפון
                </label>
                <p className="text-foreground" dir="ltr" style={{ textAlign: 'right' }}>{organization?.phone || 'לא מוגדר'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  מספר עובדים
                </label>
                <p className="text-foreground">
                  {organization?.employee_count 
                    ? EMPLOYEE_COUNT_OPTIONS.find(o => o.value === organization.employee_count)?.label || organization.employee_count
                    : 'לא מוגדר'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  אתר אינטרנט
                </label>
                {organization?.website ? (
                  <a href={organization.website.startsWith('http') ? organization.website : `https://${organization.website}`} 
                     target="_blank" rel="noopener noreferrer" 
                     className="text-primary hover:underline" dir="ltr">
                    {organization.website}
                  </a>
                ) : (
                  <p className="text-muted-foreground">לא מוגדר</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Linkedin className="h-4 w-4" />
                  לינקדאין
                </label>
                {organization?.linkedin_url ? (
                  <a href={organization.linkedin_url.startsWith('http') ? organization.linkedin_url : `https://${organization.linkedin_url}`} 
                     target="_blank" rel="noopener noreferrer" 
                     className="text-primary hover:underline" dir="ltr">
                    {organization.linkedin_url}
                  </a>
                ) : (
                  <p className="text-muted-foreground">לא מוגדר</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizationProfileTab;
