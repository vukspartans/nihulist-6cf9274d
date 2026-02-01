import { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FileDown, CheckSquare, Square, ChevronDown, FileText, AlertCircle, Eye, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceScopeItem, UploadedFileMetadata } from '@/types/rfpRequest';
import FilePreviewModal from '@/components/FilePreviewModal';
import { safeOpenFile, canPreviewFile } from '@/utils/safeFileOpen';

interface ConsultantServicesSelectionProps {
  mode: 'free_text' | 'file' | 'checklist';
  serviceItems: ServiceScopeItem[];
  serviceText: string | null;
  serviceFile: UploadedFileMetadata | null;
  selectedServices: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  consultantNotes: string;
  onNotesChange: (notes: string) => void;
}

export function ConsultantServicesSelection({
  mode,
  serviceItems,
  serviceText,
  serviceFile,
  selectedServices,
  onSelectionChange,
  consultantNotes,
  onNotesChange,
}: ConsultantServicesSelectionProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['כללי']));
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  const handleOpenFile = (url: string, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    safeOpenFile(url);
  };

  const handlePreviewFile = (url: string, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPreviewFile({ url, name });
  };

  // Render file item with preview/download options
  const renderFileItem = (file: { url: string; name: string; description?: string }, key: string) => {
    const canPreview = canPreviewFile(file.name);
    return (
      <div
        key={key}
        className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileDown className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{file.name}</p>
            {file.description && (
              <p className="text-sm text-muted-foreground truncate">{file.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canPreview && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => handlePreviewFile(file.url, file.name, e)}
              className="gap-1"
            >
              <Eye className="h-4 w-4" />
              תצוגה
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => handleOpenFile(file.url, file.name, e)}
            className="gap-1"
          >
            <ExternalLink className="h-4 w-4" />
            פתח
          </Button>
        </div>
      </div>
    );
  };

  // Only show service-related files (not project/request files - those are in Request Details tab)
  const allFiles = useMemo(() => {
    const files: Array<{ url: string; name: string; description?: string; source: string }> = [];
    
    if (serviceFile) {
      files.push({ url: serviceFile.url, name: serviceFile.name, source: 'service' });
    }
    
    return files;
  }, [serviceFile]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, ServiceScopeItem[]> = {};
    serviceItems.forEach(item => {
      const category = item.fee_category || 'כללי';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    return groups;
  }, [serviceItems]);

  const categories = Object.keys(groupedItems);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleToggleItem = (itemId: string) => {
    if (selectedServices.includes(itemId)) {
      onSelectionChange(selectedServices.filter(id => id !== itemId));
    } else {
      onSelectionChange([...selectedServices, itemId]);
    }
  };

  const handleSelectAll = () => {
    const allIds = serviceItems.map(item => item.id!).filter(Boolean);
    onSelectionChange(allIds);
  };

  const handleDeselectAll = () => {
    // Keep required (non-optional) items selected
    const requiredIds = serviceItems
      .filter(item => !item.is_optional && item.id)
      .map(item => item.id!);
    onSelectionChange(requiredIds);
  };

  const selectedCount = selectedServices.length;
  const totalCount = serviceItems.length;
  const requiredCount = serviceItems.filter(item => !item.is_optional).length;

  // For checklist mode with items
  if (mode === 'checklist' && serviceItems.length > 0) {
    return (
      <div className="space-y-4">
        {/* Header with select all controls */}
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="px-3 py-1">
              {selectedCount} / {totalCount} נבחרו
            </Badge>
            {requiredCount > 0 && (
              <span className="text-sm text-muted-foreground">
                ({requiredCount} חובה)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="flex items-center gap-1"
            >
              <CheckSquare className="h-4 w-4" />
              בחר הכל
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
              className="flex items-center gap-1"
            >
              <Square className="h-4 w-4" />
              נקה בחירה
            </Button>
          </div>
        </div>

        {/* Grouped items */}
        <div className="space-y-3">
          {categories.map(category => {
            const items = groupedItems[category];
            const isExpanded = expandedCategories.has(category);
            const categorySelectedCount = items.filter(item => 
              item.id && selectedServices.includes(item.id)
            ).length;

            return (
              <Collapsible
                key={category}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category)}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-180"
                          )} />
                          <CardTitle className="text-base font-medium">
                            {category}
                          </CardTitle>
                        </div>
                        <Badge variant="outline">
                          {categorySelectedCount} / {items.length}
                        </Badge>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4">
                      <div className="space-y-2">
                        {items.map((item, index) => {
                          const isSelected = item.id && selectedServices.includes(item.id);
                          const isRequired = !item.is_optional;

                          return (
                            <div
                              key={item.id || index}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                                isSelected 
                                  ? "bg-primary/5 border-primary/30" 
                                  : "bg-background hover:bg-muted/30",
                                isRequired && !isSelected && "border-orange-300"
                              )}
                            >
                              <Checkbox
                                id={item.id}
                                checked={isSelected}
                                onCheckedChange={() => item.id && handleToggleItem(item.id)}
                                disabled={isRequired && isSelected}
                                className="mt-0.5"
                              />
                              <div className="flex-1 space-y-1">
                                <Label 
                                  htmlFor={item.id} 
                                  className={cn(
                                    "cursor-pointer font-medium",
                                    isSelected && "text-primary"
                                  )}
                                >
                                  {item.task_name}
                                </Label>
                                <div className="flex items-center gap-2">
                                  {isRequired ? (
                                    <Badge variant="default" className="text-xs bg-primary/80">
                                      חובה
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      אופציונלי
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>

        {/* Consultant notes */}
        <div className="space-y-2 pt-4 border-t">
          <Label htmlFor="service-notes">הערות נוספות (אופציונלי)</Label>
          <Textarea
            id="service-notes"
            value={consultantNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="הוסף הערות או הבהרות לגבי השירותים שתספק..."
            rows={3}
          />
        </div>

        {/* All Related Files Section */}
        {allFiles.length > 0 && (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileDown className="h-4 w-4" />
                קבצים מצורפים ({allFiles.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {allFiles.map((file, idx) => renderFileItem(file, `checklist-file-${idx}`))}
            </CardContent>
          </Card>
        )}

        <FilePreviewModal
          open={!!previewFile}
          onOpenChange={(open) => !open && setPreviewFile(null)}
          fileUrl={previewFile?.url || null}
          fileName={previewFile?.name || ''}
        />
      </div>
    );
  }

  // For free_text mode
  if (mode === 'free_text' && serviceText) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              פירוט השירותים מהיזם
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
              {serviceText}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label htmlFor="service-notes">הערות ותגובה (אופציונלי)</Label>
          <Textarea
            id="service-notes"
            value={consultantNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="הוסף הערות, שאלות או הבהרות..."
            rows={4}
          />
        </div>
      </div>
    );
  }

  // For file mode
  if (mode === 'file' && serviceFile) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              מסמכי השירותים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {allFiles.map((file, idx) => renderFileItem(file, `file-${idx}`))}
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label htmlFor="service-notes">הערות ותגובה (אופציונלי)</Label>
          <Textarea
            id="service-notes"
            value={consultantNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="הוסף הערות לאחר עיון במסמך..."
            rows={4}
          />
        </div>

        <FilePreviewModal
          open={!!previewFile}
          onOpenChange={(open) => !open && setPreviewFile(null)}
          fileUrl={previewFile?.url || null}
          fileName={previewFile?.name || ''}
        />
      </div>
    );
  }

  // Fallback - no service details provided, but still show files if available
  if (allFiles.length > 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              קבצים מצורפים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {allFiles.map((file, idx) => renderFileItem(file, `file-${idx}`))}
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label htmlFor="service-notes">תאר את השירותים שתספק</Label>
          <Textarea
            id="service-notes"
            value={consultantNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="פרט את השירותים שתספק..."
            rows={4}
          />
        </div>

        <FilePreviewModal
          open={!!previewFile}
          onOpenChange={(open) => !open && setPreviewFile(null)}
          fileUrl={previewFile?.url || null}
          fileName={previewFile?.name || ''}
        />
      </div>
    );
  }

  // No files, no service details
  return (
    <div className="text-center py-8 text-muted-foreground">
      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p>לא הוזנו פרטי שירותים ע"י היזם</p>
      <div className="mt-4 space-y-2">
        <Label htmlFor="service-notes">תאר את השירותים שתספק</Label>
        <Textarea
          id="service-notes"
          value={consultantNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="פרט את השירותים שתספק..."
          rows={4}
        />
      </div>
    </div>
  );
}

export default ConsultantServicesSelection;
