import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Star, MapPin, Building2, Calendar } from 'lucide-react';
import { AdvisorData } from '@/hooks/useAdvisorsByExpertise';

interface AdvisorTableProps {
  advisors: AdvisorData[];
  selectedAdvisors: string[];
  advisorType: string;
  onToggleAdvisor: (advisorId: string, advisorType: string) => void;
}

export const AdvisorTable = ({ advisors, selectedAdvisors, advisorType, onToggleAdvisor }: AdvisorTableProps) => {
  if (advisors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>לא נמצאו יועצים בקטגוריה זו</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-2">
        {advisors.map((advisor) => {
          const isSelected = selectedAdvisors.includes(advisor.id);
          return (
            <div
              key={advisor.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                isSelected ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/50'
              }`}
              onClick={() => onToggleAdvisor(advisor.id, advisorType)}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleAdvisor(advisor.id, advisorType)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {advisor.company_name || 'לא צוין'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {advisor.location || 'לא צוין'}
                    </span>
                    {advisor.office_size && (
                      <Badge variant="outline" className="text-xs py-0 h-5">
                        {advisor.office_size}
                      </Badge>
                    )}
                    {advisor.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {advisor.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table - Hidden on mobile */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12 text-right"></TableHead>
              <TableHead className="text-right">שם המשרד</TableHead>
              <TableHead className="text-right">כתובת</TableHead>
              <TableHead className="text-right">ותק המשרד</TableHead>
              <TableHead className="text-right">גודל המשרד</TableHead>
              <TableHead className="text-right">אתר</TableHead>
              <TableHead className="text-right">דירוג</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {advisors.map((advisor) => {
              const isSelected = selectedAdvisors.includes(advisor.id);
              
              return (
                <TableRow 
                  key={advisor.id}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => onToggleAdvisor(advisor.id, advisorType)}
                >
                  <TableCell>
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => onToggleAdvisor(advisor.id, advisorType)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  
                  <TableCell className="font-medium">
                    {advisor.company_name || 'לא צוין'}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="text-sm">{advisor.location || 'לא צוין'}</span>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {advisor.founding_year ? (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="text-sm">{new Date().getFullYear() - advisor.founding_year} שנים</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">לא צוין</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {advisor.office_size ? (
                      <Badge variant="outline" className="text-xs">
                        {advisor.office_size}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">לא צוין</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {advisor.website ? (
                      <a
                        href={advisor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <span className="text-sm">קישור</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">אין</span>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {advisor.rating ? (
                      <div className="flex items-center gap-1" dir="rtl">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">5 / {advisor.rating.toFixed(1)}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">אין דירוג</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
};
