import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { PROJECT_PHASES } from '@/constants/project';
import { 
  Search, 
  Filter, 
  X,
  SortAsc,
  SortDesc
} from 'lucide-react';

interface ProjectFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
  activeFiltersCount: number;
  onClearFilters: () => void;
}

// Phase options derived from PROJECT_PHASES constant
const phaseOptions = [
  { value: 'all', label: 'כל השלבים' },
  ...PROJECT_PHASES.map(phase => ({ value: phase, label: phase }))
];

const sortOptions = [
  { value: 'created_at', label: 'תאריך יצירה' },
  { value: 'name', label: 'שם הפרויקט' },
  { value: 'budget', label: 'תקציב' },
  { value: 'timeline_start', label: 'תאריך התחלה' },
  { value: 'phase', label: 'שלב הפרויקט' }
];

export const ProjectFilters = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  activeFiltersCount,
  onClearFilters
}: ProjectFiltersProps) => {
  return (
    <Card className="mb-6">
      <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
        <div className="space-y-3 md:space-y-4">
          {/* Search and Clear Filters */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש פרויקטים..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pr-10"
              />
            </div>
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                נקה מסננים
                <Badge variant="secondary" className="text-xs">
                  {activeFiltersCount}
                </Badge>
              </Button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            {/* Phase Filter */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="סנן לפי שלב" />
                </SelectTrigger>
                <SelectContent>
                  {phaseOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <Select value={sortBy} onValueChange={onSortByChange}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="מיין לפי" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="w-4 h-4" />
              ) : (
                <SortDesc className="w-4 h-4" />
              )}
              {sortOrder === 'asc' ? 'עולה' : 'יורד'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};