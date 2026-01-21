import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, List, Plus, X, Loader2 } from 'lucide-react';
import { ServiceDetailsMode, ServiceScopeItem, UploadedFileMetadata, RFPFeeItem } from '@/types/rfpRequest';
import { DEFAULT_FEE_CATEGORIES } from '@/constants/rfpUnits';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sanitizeFileName, isValidFileType, isValidFileSize, formatFileSize } from '@/utils/fileUtils';

interface ServiceDetailsTabProps {
  mode: ServiceDetailsMode;
  onModeChange: (mode: ServiceDetailsMode) => void;
  freeText?: string;
  onFreeTextChange: (text: string) => void;
  file?: UploadedFileMetadata;
  onFileChange: (file: UploadedFileMetadata | undefined) => void;
  scopeItems: ServiceScopeItem[];
  onScopeItemsChange: (items: ServiceScopeItem[]) => void;
  feeItems: RFPFeeItem[];
  advisorType: string;
  projectId: string;
}

export const ServiceDetailsTab = ({
  mode,
  onModeChange,
  freeText,
  onFreeTextChange,
  file,
  onFileChange,
  scopeItems,
  onScopeItemsChange,
  feeItems,
  advisorType,
  projectId
}: ServiceDetailsTabProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');

  // Get fee categories from fee items for linking
  const feeCategories = [
    'כללי',
    ...feeItems
      .filter(item => item.description)
      .map(item => item.description)
  ];

  // Load default templates when switching to checklist mode
  useEffect(() => {
    if (mode === 'checklist' && scopeItems.length === 0) {
      loadDefaultTemplates();
    }
  }, [mode]);

  const loadDefaultTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('default_service_scope_templates')
        .select('*')
        .eq('advisor_specialty', advisorType)
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
    } finally {
      setLoadingTemplates(false);
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

  return (
    <div className="space-y-6" dir="rtl">
      <div className="space-y-2">
        <Label className="text-base font-semibold text-right block">בחר אופן פירוט השירותים</Label>
        <Tabs value={mode} onValueChange={(v) => onModeChange(v as ServiceDetailsMode)} className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-3 flex-row-reverse">
            <TabsTrigger value="free_text" className="flex items-center gap-2 flex-row-reverse">
              <FileText className="h-4 w-4" />
              מלל חופשי
            </TabsTrigger>
            <TabsTrigger value="file" className="flex items-center gap-2 flex-row-reverse">
              <Upload className="h-4 w-4" />
              העלאת קובץ
            </TabsTrigger>
            <TabsTrigger value="checklist" className="flex items-center gap-2 flex-row-reverse">
              <List className="h-4 w-4" />
              רשימת שירותים
            </TabsTrigger>
          </TabsList>

          <TabsContent value="free_text" className="mt-4" dir="rtl">
            <div className="space-y-2">
              <Label className="text-right block">פירוט השירותים הנדרשים</Label>
              <Textarea
                value={freeText || ''}
                onChange={(e) => onFreeTextChange(e.target.value)}
                rows={8}
                className="text-right"
                dir="rtl"
                placeholder="פרט את השירותים הנדרשים מהיועץ..."
              />
              <p className="text-xs text-muted-foreground text-right">
                מתאים לתחומים שבהם הפירוט פשוט יחסית
              </p>
            </div>
          </TabsContent>

          <TabsContent value="file" className="mt-4" dir="rtl">
            <div className="space-y-4">
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
          </TabsContent>

          <TabsContent value="checklist" className="mt-4" dir="rtl">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-right block">רשימת שירותים</Label>
                <p className="text-sm text-muted-foreground text-right">
                  סמן את השירותים הנדרשים ושייך אותם לסעיפי שכ"ט
                </p>
              </div>

              {loadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {scopeItems.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border hover:bg-muted transition-colors"
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
                    <div className="text-center py-8 text-muted-foreground">
                      אין שירותים ברשימה. הוסף שירותים או טען תבנית ברירת מחדל
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
