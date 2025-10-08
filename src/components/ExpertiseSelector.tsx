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
  maxSelection?: number;
}

export const ExpertiseSelector = ({
  selectedExpertise,
  onExpertiseChange,
  isEditing,
  onSave,
  onCancel,
  maxSelection = 10
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
      if (selectedExpertise.length < maxSelection) {
        onExpertiseChange([...selectedExpertise, expertise]);
      }
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
            <Badge key={exp} variant="secondary" className="text-sm">
              {exp}
            </Badge>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">לא נבחרו התמחויות</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-scale-in">
      {/* Selected Expertise */}
      {selectedExpertise.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          <div className="w-full text-sm font-medium mb-1">נבחרו ({selectedExpertise.length}/{maxSelection}):</div>
          {selectedExpertise.map((exp) => (
            <Badge key={exp} variant="default" className="gap-1">
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
        <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש התמחות..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-9"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as any)} dir="rtl">
        <TabsList className="w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs">
            הכל
          </TabsTrigger>
          {Object.keys(ADVISOR_EXPERTISE_CATEGORIES).map((category) => (
            <TabsTrigger key={category} value={category} className="text-xs">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                {filteredExpertise.map((exp) => {
                  const isSelected = selectedExpertise.includes(exp);
                  const canSelect = selectedExpertise.length < maxSelection;
                  
                  return (
                    <Button
                      key={exp}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "justify-between h-auto py-3 px-4 text-right",
                        !isSelected && !canSelect && "opacity-50 cursor-not-allowed"
                      )}
                      onClick={() => handleExpertiseToggle(exp)}
                      disabled={!isSelected && !canSelect}
                    >
                      <span className="text-sm">{exp}</span>
                      {isSelected && <Check className="h-4 w-4 mr-2" />}
                    </Button>
                  );
                })}
                {filteredExpertise.length === 0 && (
                  <div className="col-span-2 text-center text-muted-foreground py-8">
                    לא נמצאו התמחויות תואמות
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
            <Button variant="outline" onClick={onCancel}>
              ביטול
            </Button>
          )}
          {onSave && (
            <Button onClick={onSave}>
              שמירה
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
