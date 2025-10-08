import { useState, useMemo } from 'react';
import { PROJECT_TYPES, PROJECT_CATEGORIES, getProjectTypesByCategory } from '@/constants/project';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, X, Star } from 'lucide-react';

interface SpecialtyData {
  main: string | null;
  secondary: string[];
}

interface SpecialtySelectorProps {
  selectedSpecialties: SpecialtyData;
  onSpecialtiesChange: (specialties: SpecialtyData) => void;
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
}

export const SpecialtySelector = ({
  selectedSpecialties,
  onSpecialtiesChange,
  isEditing,
  onSave,
  onCancel,
  saving = false
}: SpecialtySelectorProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  const filteredSpecialties = useMemo(() => {
    let specialties = [...PROJECT_TYPES];
    
    if (activeTab !== 'all') {
      const categoryIndex = parseInt(activeTab);
      if (categoryIndex >= 0 && categoryIndex < PROJECT_CATEGORIES.length) {
        specialties = [...getProjectTypesByCategory(PROJECT_CATEGORIES[categoryIndex])];
      }
    }
    
    if (searchTerm) {
      specialties = specialties.filter(specialty =>
        specialty.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return specialties;
  }, [searchTerm, activeTab]);

  const isSelected = (specialty: string) => {
    return selectedSpecialties.main === specialty || 
           selectedSpecialties.secondary.includes(specialty);
  };

  const isMain = (specialty: string) => selectedSpecialties.main === specialty;

  const getSelectionCount = () => {
    return (selectedSpecialties.main ? 1 : 0) + selectedSpecialties.secondary.length;
  };

  const handleSpecialtyClick = (specialty: string) => {
    if (!isEditing) return;

    if (isSelected(specialty)) {
      // Remove specialty
      if (isMain(specialty)) {
        onSpecialtiesChange({
          main: null,
          secondary: selectedSpecialties.secondary
        });
      } else {
        onSpecialtiesChange({
          ...selectedSpecialties,
          secondary: selectedSpecialties.secondary.filter(s => s !== specialty)
        });
      }
    } else {
      // Add specialty - no limit
      if (!selectedSpecialties.main) {
        // Set as main if no main exists
        onSpecialtiesChange({
          ...selectedSpecialties,
          main: specialty
        });
      } else {
        // Add as secondary
        onSpecialtiesChange({
          ...selectedSpecialties,
          secondary: [...selectedSpecialties.secondary, specialty]
        });
      }
    }
  };

  const promoteToMain = (specialty: string) => {
    if (!isEditing) return;
    
    const oldMain = selectedSpecialties.main;
    const newSecondary = selectedSpecialties.secondary.filter(s => s !== specialty);
    
    if (oldMain) {
      newSecondary.push(oldMain);
    }
    
    onSpecialtiesChange({
      main: specialty,
      secondary: newSecondary
    });
  };

  const highlightSearchTerm = (text: string) => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (!isEditing) {
    // Display mode
    return (
      <div className="space-y-4">
        {selectedSpecialties.main && (
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              התמחות עיקרית
            </label>
            <Badge variant="destructive" className="text-sm">
              <Star className="h-3 w-3 ml-1" />
              {selectedSpecialties.main}
            </Badge>
          </div>
        )}
        
        {selectedSpecialties.secondary.length > 0 && (
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              התמחויות משניות
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedSpecialties.secondary.map((specialty) => (
                <Badge key={specialty} variant="secondary" className="text-sm">
                  {specialty}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {!selectedSpecialties.main && selectedSpecialties.secondary.length === 0 && (
          <p className="text-muted-foreground text-sm">לא הוגדרו התמחויות</p>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            בחר התמחויות: התמחות עיקרית אחת (אדום) והתמחויות משניות ללא הגבלה (כחול)
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            נבחרו: {getSelectionCount()} התמחויות
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onSave} disabled={saving} size="sm">
            {saving ? 'שומר...' : 'שמור'}
          </Button>
          <Button onClick={onCancel} variant="outline" size="sm">
            ביטול
          </Button>
        </div>
      </div>

      {/* Selected specialties */}
      {(selectedSpecialties.main || selectedSpecialties.secondary.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">התמחויות שנבחרו</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedSpecialties.main && (
              <div>
                <label className="text-xs text-muted-foreground">עיקרית</label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="destructive" className="text-sm">
                    <Star className="h-3 w-3 ml-1" />
                    {selectedSpecialties.main}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSpecialtyClick(selectedSpecialties.main!)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            
            {selectedSpecialties.secondary.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground">משניות</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedSpecialties.secondary.map((specialty) => (
                    <div key={specialty} className="flex items-center gap-1">
                      <Badge 
                        variant="secondary" 
                        className="text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => promoteToMain(specialty)}
                        title="לחץ להפוך לעיקרית"
                      >
                        {specialty}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSpecialtyClick(specialty)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="חפש התמחות..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Category tabs and specialties */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="all">הכל</TabsTrigger>
          {PROJECT_CATEGORIES.slice(0, 4).map((category, index) => (
            <TabsTrigger key={category} value={index.toString()}>
              {category.replace(/^[^א-ת]*/, '').substring(0, 12)}...
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-4">
          <div className="grid gap-2 max-h-64 overflow-y-auto">
            {filteredSpecialties.map((specialty) => (
              <Button
                key={specialty}
                variant={isSelected(specialty) ? (isMain(specialty) ? "destructive" : "secondary") : "outline"}
                onClick={() => handleSpecialtyClick(specialty)}
                className="justify-start h-auto p-3 text-right whitespace-normal"
              >
                <div className="flex items-center gap-2 w-full">
                  {isMain(specialty) && <Star className="h-3 w-3 shrink-0" />}
                  <span className="text-sm leading-tight">
                    {highlightSearchTerm(specialty)}
                  </span>
                </div>
              </Button>
            ))}
          </div>
          
          {filteredSpecialties.length === 0 && searchTerm && (
            <p className="text-center text-muted-foreground py-8">
              לא נמצאו התמחויות התואמות לחיפוש
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};