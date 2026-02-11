import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProjectAdvisorOption } from '@/types/task';

interface TaskAssignmentProps {
  value: string | null | undefined;
  onChange: (advisorId: string | null) => void;
  projectAdvisors: ProjectAdvisorOption[];
  placeholder?: string;
}

export function TaskAssignment({ value, onChange, projectAdvisors, placeholder = "בחר יועץ" }: TaskAssignmentProps) {
  return (
    <Select 
      value={value || 'unassigned'} 
      onValueChange={(val) => onChange(val === 'unassigned' ? null : val)}
      dir="rtl"
    >
      <SelectTrigger className="text-right">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent dir="rtl">
        <SelectItem value="unassigned">לא משויך</SelectItem>
        {projectAdvisors.map((advisor) => (
          <SelectItem key={advisor.advisor_id} value={advisor.advisor_id}>
            {advisor.company_name || 'יועץ ללא שם'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
