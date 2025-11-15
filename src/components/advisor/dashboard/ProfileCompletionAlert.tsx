import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfileCompletionAlertProps {
  percentage: number;
  firstMissingField: string;
}

export const ProfileCompletionAlert = ({
  percentage,
  firstMissingField,
}: ProfileCompletionAlertProps) => {
  const navigate = useNavigate();

  if (percentage === 100) return null;

  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-foreground">
          השלמת הפרופיל: {percentage}% - חסר: {firstMissingField}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/profile')}
          className="mr-4"
        >
          השלם פרופיל
        </Button>
      </AlertDescription>
    </Alert>
  );
};
