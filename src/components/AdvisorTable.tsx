import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Star, MapPin, Building2, Calendar } from 'lucide-react';
import { AdvisorData } from '@/hooks/useAdvisorsByExpertise';

interface AdvisorTableProps {
  advisors: AdvisorData[];
  selectedAdvisors: string[];
  onToggleAdvisor: (advisorId: string) => void;
}

export const AdvisorTable = ({ advisors, selectedAdvisors, onToggleAdvisor }: AdvisorTableProps) => {
  if (advisors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>לא נמצאו יועצים בקטגוריה זו</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
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
                onClick={() => onToggleAdvisor(advisor.id)}
              >
                <TableCell>
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={() => onToggleAdvisor(advisor.id)}
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
                  {advisor.years_experience ? (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span className="text-sm">{advisor.years_experience} שנים</span>
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
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{advisor.rating.toFixed(1)}</span>
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
  );
};
