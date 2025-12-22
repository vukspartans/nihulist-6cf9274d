import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Settings } from 'lucide-react';
import { PROJECT_CATEGORIES, PROJECT_TYPES, getProjectTypesByCategory, type ProjectCategory, type ProjectType } from '@/constants/project';
import { Button } from '@/components/ui/button';

interface ProjectTypeSelectorProps {
  selectedType: string;
  onTypeChange: (type: string) => void;
  label?: string;
  placeholder?: string;
  showLegacyWarning?: boolean;
}

export const ProjectTypeSelector: React.FC<ProjectTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  label = "סוג פרויקט",
  placeholder = "בחר סוג פרויקט...",
  showLegacyWarning = false
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | 'all'>('התחדשות עירונית');
  const [isEditing, setIsEditing] = useState(!selectedType);

  const availableTypes = selectedCategory && selectedCategory !== 'all'
    ? getProjectTypesByCategory(selectedCategory)
    : PROJECT_CATEGORIES.flatMap(cat => getProjectTypesByCategory(cat));

  const selectedProjectCategory = PROJECT_CATEGORIES.find(cat => 
    getProjectTypesByCategory(cat).includes(selectedType as ProjectType)
  );
  
  // Check if the selected type is a legacy type (not in our new system)
  const isLegacyType = selectedType && !PROJECT_TYPES.includes(selectedType as any);
  const shouldShowWarning = showLegacyWarning && isLegacyType;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Current Selection Display */}
      {selectedType && (
        <div className={`p-3 sm:p-4 rounded-lg border ${
          shouldShowWarning 
            ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800' 
            : 'bg-primary/5 border-primary/20'
        }`}>
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mt-0.5 sm:mt-0 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm sm:text-base">{selectedType}</p>
                {selectedProjectCategory && (
                  <Badge variant="secondary" className="mt-1 text-[10px] sm:text-xs">
                    {selectedProjectCategory}
                  </Badge>
                )}
                {shouldShowWarning && (
                  <div className="mt-2">
                    <Badge variant="outline" className="text-yellow-600 border-yellow-300 dark:text-yellow-400 text-[10px] sm:text-xs">
                      סוג פרויקט ישן
                    </Badge>
                    <p className="text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      מומלץ לעדכן לסוג פרויקט חדש
                    </p>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(true);
              }}
              className="text-xs sm:text-sm flex-shrink-0 h-8 px-2 sm:px-3"
            >
              שנה
            </Button>
          </div>
        </div>
      )}

      {/* Category and Type Selection - Only show when editing or no selection */}
      {(isEditing || !selectedType) && (
        <>
          {/* Category Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">בחר קטגוריה:</label>
            <Select dir="rtl" value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as ProjectCategory | 'all')}>
              <SelectTrigger className="bg-background text-right justify-end">
                <SelectValue placeholder="בחר קטגוריה..." className="text-right" />
              </SelectTrigger>
              <SelectContent dir="rtl" align="end" className="bg-background border z-50">
                {PROJECT_CATEGORIES.map((category) => {
                  const isEnabled = category === 'התחדשות עירונית';
                  return (
                    <SelectItem 
                      key={category} 
                      value={category} 
                      disabled={!isEnabled}
                      className={`text-right ${!isEnabled ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-2 w-full justify-end">
                        {!isEnabled && (
                          <Badge variant="outline" className="text-xs">בקרוב</Badge>
                        )}
                        <span>{category}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Project Type Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">בחר סוג פרויקט:</label>
            <Select dir="rtl" value={selectedType} onValueChange={(value) => {
              onTypeChange(value);
              setIsEditing(false);
            }}>
              <SelectTrigger className="bg-background text-right justify-end">
                <SelectValue placeholder={placeholder} className="text-right" />
              </SelectTrigger>
              <SelectContent dir="rtl" align="end" className="bg-background border z-50 max-h-80 overflow-y-auto">
                {availableTypes.length === 0 ? (
                  <SelectItem value="no-results" disabled className="text-right">
                    לא נמצאו תוצאות
                  </SelectItem>
                ) : (
                  availableTypes.map((type) => (
                    <SelectItem key={type} value={type} className="text-right">
                      <div className="flex flex-col items-end w-full">
                        <span className="text-right">{type}</span>
                        {(!selectedCategory || selectedCategory === 'all') && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {PROJECT_CATEGORIES.find(cat => getProjectTypesByCategory(cat).includes(type))}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Statistics */}
          <div className="text-center text-xs text-muted-foreground">
            {selectedCategory && selectedCategory !== 'all'
              ? `${getProjectTypesByCategory(selectedCategory).length} סוגי פרויקטים זמינים בקטגוריה זו`
              : `${availableTypes.length} סוגי פרויקטים זמינים`
            }
          </div>
        </>
      )}
    </div>
  );
};