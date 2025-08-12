import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, Users, FileText } from 'lucide-react';
import { RecommendationsCard } from './RecommendationsCard';
import { useRFP } from '@/hooks/useRFP';

interface RFPManagerProps {
  projectId: string;
  projectName: string;
}

export const RFPManager = ({ projectId, projectName }: RFPManagerProps) => {
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [rfpSent, setRfpSent] = useState(false);
  const { sendRFPInvitations, loading } = useRFP();

  const handleSendRFP = async () => {
    const result = await sendRFPInvitations(projectId, selectedSuppliers);
    if (result) {
      setRfpSent(true);
    }
  };

  if (rfpSent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <FileText className="h-5 w-5" />
            RFP Sent Successfully
          </CardTitle>
          <CardDescription>
            Your RFP for "{projectName}" has been sent to {selectedSuppliers.length || 'recommended'} suppliers.
            You'll receive proposals as they come in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setRfpSent(false)} 
            variant="outline"
          >
            Send to More Suppliers
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send RFP for "{projectName}"
          </CardTitle>
          <CardDescription>
            Select suppliers to invite or use AI recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {selectedSuppliers.length} suppliers selected
            </div>
            <Button 
              onClick={handleSendRFP}
              disabled={loading}
              className="ml-auto"
            >
              {loading ? 'Sending...' : 'Send RFP Invitations'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <RecommendationsCard
        projectId={projectId}
        onSelectSuppliers={setSelectedSuppliers}
        selectedSuppliers={selectedSuppliers}
      />
    </div>
  );
};