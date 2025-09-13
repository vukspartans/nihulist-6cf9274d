import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PROJECT_CATEGORIES, getProjectTypesByCategory, type ProjectCategory, type ProjectType } from '@/constants/project';

interface ProjectTypeSelectorProps {
  selectedType: string;
  onTypeChange: (type: string) => void;
  label?: string;
  placeholder?: string;
}

export const ProjectTypeSelector: React.FC<ProjectTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  label = "סוג פרויקט",
  placeholder = "בחר סוג פרויקט..."
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCategories = PROJECT_CATEGORIES.filter(category =>
    category.includes(searchTerm) || 
    getProjectTypesByCategory(category).some(type => type.includes(searchTerm))
  );

  const availableTypes = selectedCategory 
    ? getProjectTypesByCategory(selectedCategory).filter(type => type.includes(searchTerm))
    : PROJECT_CATEGORIES.flatMap(cat => getProjectTypesByCategory(cat)).filter(type => type.includes(searchTerm));

  const selectedProjectCategory = PROJECT_CATEGORIES.find(cat => 
    getProjectTypesByCategory(cat).includes(selectedType as ProjectType)
  );

  const resetSelection = () => {
    setSelectedCategory('');
    setSearchTerm('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="חיפוש סוג פרויקט..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Current Selection Display */}
        {selectedType && (
          <div className="p-3 bg-primary/5 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{selectedType}</p>
                {selectedProjectCategory && (
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {selectedProjectCategory}
                  </Badge>
                )}
              </div>
              <button
                onClick={() => {
                  onTypeChange('');
                  resetSelection();
                }}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                נקה בחירה
              </button>
            </div>
          </div>
        )}

        {/* Category Selection */}
        {!searchTerm && (
          <div>
            <label className="text-sm font-medium mb-2 block">קטגוריה:</label>
            <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as ProjectCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="בחר קטגוריה..." />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="">כל הקטגוריות</SelectItem>
                {filteredCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Project Type Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">סוג פרויקט:</label>
          <Select value={selectedType} onValueChange={onTypeChange}>
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="bg-background z-50 max-h-80 overflow-y-auto">
              {availableTypes.length === 0 ? (
                <SelectItem value="" disabled>
                  לא נמצאו תוצאות
                </SelectItem>
              ) : (
                availableTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex flex-col items-start">
                      <span>{type}</span>
                      {!selectedCategory && (
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
        <div className="text-xs text-muted-foreground">
          {selectedCategory 
            ? `${getProjectTypesByCategory(selectedCategory).length} סוגי פרויקטים בקטגוריה זו`
            : `${availableTypes.length} סוגי פרויקטים זמינים`
          }
        </div>
      </CardContent>
    </Card>
  );
};