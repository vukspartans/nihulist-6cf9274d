import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, X, Check } from 'lucide-react';
import { ADVISOR_EXPERTISE, ADVISOR_EXPERTISE_CATEGORIES, AdvisorExpertiseCategory } from '@/constants/advisor';
import { cn } from '@/lib/utils';

interface ExpertiseSelectorProps {
  selectedExpertise: string[];
  onExpertiseChange: (expertise: string[]) => void;
  isEditing: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  maxItems?: number | null;
}

export const ExpertiseSelector = ({
  selectedExpertise,
  onExpertiseChange,
  isEditing,
  onSave,
  onCancel,
  maxItems
}: ExpertiseSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | AdvisorExpertiseCategory>('all');

  const filteredExpertise = useMemo(() => {
    let expertiseList = activeCategory === 'all' 
      ? [...ADVISOR_EXPERTISE]
      : ADVISOR_EXPERTISE_CATEGORIES[activeCategory];

    if (searchTerm.trim()) {
      expertiseList = expertiseList.filter(exp =>
        exp.includes(searchTerm.trim())
      );
    }

    return expertiseList;
  }, [activeCategory, searchTerm]);

  const handleExpertiseToggle = (expertise: string) => {
    if (selectedExpertise.includes(expertise)) {
      onExpertiseChange(selectedExpertise.filter(e => e !== expertise));
    } else {
      if (maxItems && selectedExpertise.length >= maxItems) {
        return;
      }
      onExpertiseChange([...selectedExpertise, expertise]);
    }
  };

  const handleRemoveExpertise = (expertise: string) => {
    onExpertiseChange(selectedExpertise.filter(e => e !== expertise));
  };

  if (!isEditing) {
    return (
      <div className="flex flex-wrap gap-2">
        {selectedExpertise.length > 0 ? (
          selectedExpertise.map((exp) => (
            <Badge key={exp} variant="secondary" className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5">
              {exp}
            </Badge>
          ))
        ) : (
          <p className="text-xs sm:text-sm text-muted-foreground">לא נבחרו תחומי עיסוק</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 animate-scale-in">
      {/* Selected Expertise */}
      {selectedExpertise.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 sm:p-3 bg-muted/50 rounded-lg">
          <div className="w-full text-xs sm:text-sm font-medium mb-1">נבחרו ({selectedExpertise.length}):</div>
          {selectedExpertise.map((exp) => (
            <Badge key={exp} variant="default" className="gap-1 text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5">
              {exp}
              <button
                onClick={() => handleRemoveExpertise(exp)}
                className="ml-1 hover:bg-background/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-2 sm:right-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש תחומי עיסוק..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-8 sm:pr-9 text-sm sm:text-base h-9 sm:h-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as any)} dir="rtl">
        <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="all" className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
            הכל
          </TabsTrigger>
          {Object.keys(ADVISOR_EXPERTISE_CATEGORIES).map((category) => (
            <TabsTrigger key={category} value={category} className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-3 sm:mt-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                {filteredExpertise.map((exp) => {
                  const isSelected = selectedExpertise.includes(exp);
                  const isDisabled = maxItems && !isSelected && selectedExpertise.length >= maxItems;
                  
                  return (
                    <Button
                      key={exp}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "justify-between h-auto py-2 sm:py-3 px-3 sm:px-4 text-right min-h-[40px]",
                        isDisabled && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => handleExpertiseToggle(exp)}
                      disabled={isDisabled}
                    >
                      <span className="text-xs sm:text-sm">{exp}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />}
                    </Button>
                  );
                })}
                {filteredExpertise.length === 0 && (
                  <div className="col-span-2 text-center text-muted-foreground py-6 sm:py-8 text-sm">
                    לא נמצאו תחומי עיסוק תואמים
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      {(onSave || onCancel) && (
        <div className="flex gap-2 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="h-9 sm:h-10 text-sm sm:text-base">
              ביטול
            </Button>
          )}
          {onSave && (
            <Button type="button" onClick={onSave} className="h-9 sm:h-10 text-sm sm:text-base">
              שמירה
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
