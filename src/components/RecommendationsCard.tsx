import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Star, MapPin } from 'lucide-react';
import { useRecommendations } from '@/hooks/useRecommendations';

interface RecommendationsCardProps {
  projectId: string;
  onSelectSuppliers?: (supplierIds: string[]) => void;
  selectedSuppliers?: string[];
}

export const RecommendationsCard = ({ 
  projectId, 
  onSelectSuppliers, 
  selectedSuppliers = [] 
}: RecommendationsCardProps) => {
  const { recommendations, loading, error, regenerate } = useRecommendations(projectId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Generating AI Recommendations
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Recommendations</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={regenerate} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleSupplierToggle = (supplierId: string) => {
    if (!onSelectSuppliers) return;
    
    const newSelected = selectedSuppliers.includes(supplierId)
      ? selectedSuppliers.filter(id => id !== supplierId)
      : [...selectedSuppliers, supplierId];
    
    onSelectSuppliers(newSelected);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Supplier Recommendations</CardTitle>
            <CardDescription>
              Found {recommendations.length} matching suppliers for your project
            </CardDescription>
          </div>
          <Button onClick={regenerate} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No matching suppliers found. Try adjusting your project details.
          </div>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.supplier_id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedSuppliers.includes(rec.supplier_id)
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => handleSupplierToggle(rec.supplier_id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{rec.supplier_name}</h4>
                    <Badge variant="secondary">
                      <Star className="h-3 w-3 mr-1" />
                      {rec.match_score}% match
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{rec.reason}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Confidence: {rec.confidence}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedSuppliers.includes(rec.supplier_id) && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};