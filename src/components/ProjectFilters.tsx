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
    <Card className="mb-6" dir="rtl">
      <CardContent className="pt-3 md:pt-6 px-3 md:px-6 pb-3 md:pb-6">
        <div className="space-y-3">
          {/* Search and Clear Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש פרויקטים..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pr-10 h-9 text-sm"
              />
            </div>
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="flex items-center gap-1 h-9 px-2 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">נקה</span>
                <Badge variant="secondary" className="text-xs h-5 min-w-[20px]">
                  {activeFiltersCount}
                </Badge>
              </Button>
            )}
          </div>

          {/* Filters Row - Horizontal scroll on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {/* Phase Filter */}
            <Select value={statusFilter} onValueChange={onStatusFilterChange} dir="rtl">
              <SelectTrigger className="min-w-[120px] sm:w-40 h-9 text-sm shrink-0">
                <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1" />
                <SelectValue placeholder="שלב" />
              </SelectTrigger>
              <SelectContent>
                {phaseOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={onSortByChange} dir="rtl">
              <SelectTrigger className="min-w-[110px] sm:w-36 h-9 text-sm shrink-0">
                <SelectValue placeholder="מיין" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1 h-9 px-2 shrink-0"
            >
              {sortOrder === 'asc' ? (
                <SortAsc className="w-4 h-4" />
              ) : (
                <SortDesc className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{sortOrder === 'asc' ? 'עולה' : 'יורד'}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};