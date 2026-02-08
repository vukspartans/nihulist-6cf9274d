import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileText, Upload, List, Plus, X, Loader2, FileStack, ChevronDown } from 'lucide-react';
import { LoadTemplateButton } from './LoadTemplateButton';
import { ServiceScopeItem, UploadedFileMetadata, RFPFeeItem } from '@/types/rfpRequest';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sanitizeFileName, isValidFileType, isValidFileSize, formatFileSize } from '@/utils/fileUtils';
import { useFeeTemplateCategories, useFeeSubmissionMethods } from '@/hooks/useFeeTemplateHierarchy';

interface ServiceDetailsTabProps {
  freeText?: string;
  onFreeTextChange: (text: string) => void;
  file?: UploadedFileMetadata;
  onFileChange: (file: UploadedFileMetadata | undefined) => void;
  scopeItems: ServiceScopeItem[];
  onScopeItemsChange: (items: ServiceScopeItem[]) => void;
  feeItems: RFPFeeItem[];
  advisorType: string;
  projectId: string;
  projectType?: string;
  // Category selection callbacks
  selectedCategoryId?: string;
  selectedCategoryName?: string;
  selectedMethodId?: string;
  selectedMethodLabel?: string;
  onCategoryChange?: (categoryId: string | null, categoryName: string | null, defaultIndexType: string | null) => void;
  onMethodChange?: (methodId: string | null, methodLabel: string | null) => void;
}

export const ServiceDetailsTab = ({
  freeText,
  onFreeTextChange,
  file,
  onFileChange,
  scopeItems,
  onScopeItemsChange,
  feeItems,
  advisorType,
  projectId,
  projectType,
  selectedCategoryId: propCategoryId,
  selectedCategoryName: propCategoryName,
  selectedMethodId: propMethodId,
  selectedMethodLabel: propMethodLabel,
  onCategoryChange,
  onMethodChange
}: ServiceDetailsTabProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  
  // Collapsible section states
  const [checklistOpen, setChecklistOpen] = useState(true);
  const [freeTextOpen, setFreeTextOpen] = useState(false);
  const [fileUploadOpen, setFileUploadOpen] = useState(false);
  
  // Template hierarchy selection - use props if provided
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(propCategoryId || null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(propMethodId || null);

  // Fetch categories for this advisor type and project type
  const { data: categories, isLoading: loadingCategories } = useFeeTemplateCategories(
    advisorType,
    projectType || undefined
  );

  // Fetch submission methods for selected category
  const { data: submissionMethods, isLoading: loadingMethods } = useFeeSubmissionMethods(
    selectedCategoryId || undefined
  );

  // Get fee categories from fee items for linking
  const feeCategories = [
    'כללי',
    ...feeItems
      .filter(item => item.description)
      .map(item => item.description)
  ];

  // Handle category change and notify parent (includes default index type)
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const category = categories?.find(c => c.id === categoryId);
    onCategoryChange?.(categoryId, category?.name || null, category?.default_index_type || null);
  };

  // Handle method change and notify parent
  const handleMethodChange = (methodId: string) => {
    setSelectedMethodId(methodId);
    const method = submissionMethods?.find(m => m.id === methodId);
    onMethodChange?.(methodId, method?.method_label || null);
  };

  // Auto-select default category when categories load
  useEffect(() => {
    if (categories && categories.length > 0 && !selectedCategoryId) {
      const defaultCat = categories.find(c => c.is_default) || categories[0];
      handleCategoryChange(defaultCat.id);
    }
  }, [categories, selectedCategoryId]);

  // Auto-select default submission method when methods load
  useEffect(() => {
    if (submissionMethods && submissionMethods.length > 0 && !selectedMethodId) {
      const defaultMethod = submissionMethods.find(m => m.is_default) || submissionMethods[0];
      handleMethodChange(defaultMethod.id);
    }
  }, [submissionMethods, selectedMethodId]);

  // Reset submission method when category changes
  useEffect(() => {
    setSelectedMethodId(null);
    onMethodChange?.(null, null);
  }, [selectedCategoryId]);

  // Load templates when category is selected
  useEffect(() => {
    if (selectedCategoryId) {
      loadTemplatesForCategory(selectedCategoryId);
    }
  }, [selectedCategoryId]);

  const loadTemplatesForCategory = async (categoryId: string) => {
    setLoadingTemplates(true);
    try {
      // First try to load templates linked to this category
      const { data: categoryTemplates, error: catError } = await supabase
        .from('default_service_scope_templates')
        .select('*')
        .eq('category_id', categoryId)
        .order('display_order', { ascending: true });

      if (catError) throw catError;

      if (categoryTemplates && categoryTemplates.length > 0) {
        const items: ServiceScopeItem[] = categoryTemplates.map((template, index) => ({
          task_name: template.task_name,
          is_included: true,
          fee_category: template.default_fee_category || 'כללי',
          is_optional: template.is_optional,
          display_order: index
        }));
        onScopeItemsChange(items);
      } else {
        // Fallback: load by advisor specialty only
        await loadDefaultTemplates();
      }
    } catch (error) {
      console.error('[ServiceDetails] Error loading category templates:', error);
      await loadDefaultTemplates();
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadDefaultTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('default_service_scope_templates')
        .select('*')
        .eq('advisor_specialty', advisorType)
        .is('category_id', null)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const items: ServiceScopeItem[] = data.map((template, index) => ({
          task_name: template.task_name,
          is_included: true,
          fee_category: template.default_fee_category || 'כללי',
          is_optional: template.is_optional,
          display_order: index
        }));
        onScopeItemsChange(items);
      }
    } catch (error) {
      console.error('[ServiceDetails] Error loading templates:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!isValidFileType(selectedFile.name)) {
      toast({
        title: "סוג קובץ לא נתמך",
        description: "אנא העלה קובץ PDF, Word או תמונה",
        variant: "destructive",
      });
      return;
    }

    if (!isValidFileSize(selectedFile.size, 10)) {
      toast({
        title: "קובץ גדול מדי",
        description: "גודל הקובץ המקסימלי הוא 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("לא מחובר למערכת");

      const sanitizedName = sanitizeFileName(selectedFile.name);
      const timestamp = Date.now();
      const fileExt = sanitizedName.split('.').pop();
      const filePath = `${projectId}/${timestamp}/service_details.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('rfp-request-files')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: signedUrlData } = await supabase.storage
        .from('rfp-request-files')
        .createSignedUrl(filePath, 3600 * 24 * 7);

      if (signedUrlData) {
        onFileChange({
          name: selectedFile.name,
          url: signedUrlData.signedUrl,
          size: selectedFile.size,
          path: filePath
        });
        
        toast({
          title: "קובץ הועלה בהצלחה",
          description: selectedFile.name,
        });
      }
    } catch (error) {
      console.error('[ServiceDetails] Upload error:', error);
      toast({
        title: "שגיאה בהעלאת קובץ",
        description: error instanceof Error ? error.message : "אירעה שגיאה",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeFile = async () => {
    if (file?.path) {
      try {
        await supabase.storage.from('rfp-request-files').remove([file.path]);
      } catch (error) {
        console.error('[ServiceDetails] Error removing file:', error);
      }
    }
    onFileChange(undefined);
  };

  const toggleScopeItem = (index: number) => {
    const newItems = [...scopeItems];
    newItems[index] = { ...newItems[index], is_included: !newItems[index].is_included };
    onScopeItemsChange(newItems);
  };

  const updateScopeItemCategory = (index: number, category: string) => {
    const newItems = [...scopeItems];
    newItems[index] = { ...newItems[index], fee_category: category };
    onScopeItemsChange(newItems);
  };

  const addScopeItem = () => {
    if (!newTaskName.trim()) return;
    
    const newItem: ServiceScopeItem = {
      task_name: newTaskName.trim(),
      is_included: true,
      fee_category: 'כללי',
      is_optional: false,
      display_order: scopeItems.length
    };
    
    onScopeItemsChange([...scopeItems, newItem]);
    setNewTaskName('');
  };

  const removeScopeItem = (index: number) => {
    onScopeItemsChange(scopeItems.filter((_, i) => i !== index));
  };

  const selectedCategory = categories?.find(c => c.id === selectedCategoryId);
  const selectedMethod = submissionMethods?.find(m => m.id === selectedMethodId);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Section 1: Service Checklist (רשימת שירותים) */}
      <Collapsible 
        open={checklistOpen} 
        onOpenChange={setChecklistOpen}
        className="border rounded-lg bg-card"
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-2">
              <List className="h-4 w-4 text-primary" />
              <span className="font-medium">רשימת שירותים</span>
              {scopeItems.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {scopeItems.filter(i => i.is_included).length}/{scopeItems.length}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div onClick={(e) => e.stopPropagation()}>
                <LoadTemplateButton
                  onClick={() => selectedCategoryId && loadTemplatesForCategory(selectedCategoryId)}
                  loading={loadingTemplates}
                  disabled={!advisorType || !selectedCategoryId}
                />
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${checklistOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t">
          <div className="p-3 space-y-2">
            {/* Template Selection Dropdowns */}
            {categories && categories.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* Category Selection */}
                <Select
                  dir="rtl"
                  value={selectedCategoryId || ''}
                  onValueChange={handleCategoryChange}
                  disabled={loadingCategories}
                >
                  <SelectTrigger className="text-right w-[180px]">
                    <SelectValue placeholder="סוג תבנית..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-right">
                        <div className="flex items-center gap-2">
                          {cat.name}
                          {cat.is_default && (
                            <Badge variant="secondary" className="text-xs">ברירת מחדל</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Submission Method Selection */}
                <Select
                  dir="rtl"
                  value={selectedMethodId || ''}
                  onValueChange={handleMethodChange}
                  disabled={!selectedCategoryId || loadingMethods}
                >
                  <SelectTrigger className="text-right w-[160px]">
                    <SelectValue placeholder={loadingMethods ? "טוען..." : "שיטת הגשה..."} />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {submissionMethods?.map((method) => (
                      <SelectItem key={method.id} value={method.id} className="text-right">
                        <div className="flex items-center gap-2">
                          <FileStack className="h-3.5 w-3.5" />
                          {method.method_label}
                          {method.is_default && (
                            <Badge variant="secondary" className="text-xs">ברירת מחדל</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {loadingTemplates ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {scopeItems.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <Checkbox
                      checked={item.is_included}
                      onCheckedChange={() => toggleScopeItem(index)}
                    />
                    <span className={`flex-1 ${!item.is_included ? 'text-muted-foreground line-through' : ''}`}>
                      {item.task_name}
                    </span>
                    {item.is_optional && (
                      <Badge variant="outline" className="text-xs">אופציונלי</Badge>
                    )}
                    <Select
                      dir="rtl"
                      value={item.fee_category}
                      onValueChange={(value) => updateScopeItemCategory(index, value)}
                    >
                      <SelectTrigger dir="rtl" className="w-40 text-right">
                        <SelectValue placeholder="סעיף שכ&quot;ט" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {feeCategories.map((cat) => (
                          <SelectItem key={cat} value={cat} className="text-right">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeScopeItem(index)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {scopeItems.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    אין שירותים ברשימה. בחר תבנית או הוסף שירותים ידנית
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Input
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="הוסף שירות חדש..."
                    className="text-right"
                    dir="rtl"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addScopeItem())}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addScopeItem}
                    disabled={!newTaskName.trim()}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    הוסף
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 2: Free Text Notes (מלל חופשי) */}
      <Collapsible 
        open={freeTextOpen} 
        onOpenChange={setFreeTextOpen}
        className="border rounded-lg bg-card"
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-medium">הערות נוספות (מלל חופשי)</span>
            {freeText && freeText.trim() && (
              <Badge variant="secondary" className="text-xs">מולא</Badge>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${freeTextOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t">
          <div className="p-3 space-y-2">
            <Label className="text-right block">פירוט נוסף או הערות</Label>
            <Textarea
              value={freeText || ''}
              onChange={(e) => onFreeTextChange(e.target.value)}
              rows={6}
              className="text-right"
              dir="rtl"
              placeholder="הוסף הערות, הנחיות מיוחדות או פירוט נוסף ליועץ..."
            />
            <p className="text-xs text-muted-foreground text-right">
              מתאים להוספת הנחיות מיוחדות, דרישות ספציפיות או הערות נוספות
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 3: File Upload (העלאת קובץ) */}
      <Collapsible 
        open={fileUploadOpen} 
        onOpenChange={setFileUploadOpen}
        className="border rounded-lg bg-card"
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            <span className="font-medium">קובץ פירוט שירותים (אופציונלי)</span>
            {file && (
              <Badge variant="secondary" className="text-xs">קובץ מצורף</Badge>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 transition-transform ${fileUploadOpen ? 'rotate-180' : ''}`} />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t">
          <div className="p-3 space-y-3">
            <div className="space-y-2">
              <Label className="text-right block">העלאת קובץ פירוט שירותים</Label>
              <p className="text-sm text-muted-foreground text-right">
                מתאים כאשר פירוט השירותים ארוך ומפורט - ניתן להעלות מסמך קיים
              </p>
            </div>
            
            {file ? (
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg border">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  id="service-details-file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('service-details-file')?.click()}
                  className="w-full h-24 border-dashed"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                      מעלה...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 ml-2" />
                      לחץ להעלאת קובץ פירוט שירותים
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
