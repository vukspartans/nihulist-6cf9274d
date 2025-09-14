import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, RefreshCw, Search, FileText, Building, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AdvisorRecommendation {
  id: string;
  name: string;
  type: string;
  match_score: number;
  confidence: number;
  reason: string;
  specialties: string[];
  location?: string;
  experience_years?: number;
  rating?: number;
}

interface AdvisorRecommendationsCardProps {
  projectId: string;
  selectedAdvisorTypes: string[];
  selectedAdvisors: string[];
  onSelectAdvisors: (advisors: string[]) => void;
  autoSelectTop3?: boolean;
}

export const AdvisorRecommendationsCard = ({
  projectId,
  selectedAdvisorTypes,
  selectedAdvisors,
  onSelectAdvisors,
  autoSelectTop3 = true
}: AdvisorRecommendationsCardProps) => {
  const [recommendations, setRecommendations] = useState<AdvisorRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock function to generate recommendations based on project analysis
  const generateRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call - in reality this would analyze:
      // - Project files
      // - Project details (location, budget, complexity)
      // - User company information
      // - Match with advisor database
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock recommendations for each advisor type
      const mockRecommendations: AdvisorRecommendation[] = [];
      
      selectedAdvisorTypes.forEach((advisorType, typeIndex) => {
        // Generate 3-5 advisors per type (currently returning empty for zero state)
        for (let i = 0; i < Math.min(3, 0); i++) { // Set to 0 to show zero state
          mockRecommendations.push({
            id: `${advisorType}-${i}`,
            name: `${advisorType} מומחה ${i + 1}`,
            type: advisorType,
            match_score: 85 + Math.random() * 15,
            confidence: 80 + Math.random() * 20,
            reason: `התמחה ב${advisorType} עם ניסיון רלוונטי לפרויקט`,
            specialties: [`${advisorType}`, 'ניהול פרויקטים', 'ייעוץ טכני'],
            location: 'תל אביב',
            experience_years: 5 + Math.floor(Math.random() * 15),
            rating: 4.2 + Math.random() * 0.8
          });
        }
      });

      setRecommendations(mockRecommendations);

      // Auto-select top 3 if enabled and no advisors selected
      if (autoSelectTop3 && selectedAdvisors.length === 0 && mockRecommendations.length > 0) {
        const topAdvisors = mockRecommendations
          .sort((a, b) => b.match_score - a.match_score)
          .slice(0, 3)
          .map(advisor => advisor.id);
        onSelectAdvisors(topAdvisors);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate advisor recommendations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedAdvisorTypes.length > 0) {
      generateRecommendations();
    }
  }, [selectedAdvisorTypes, projectId]);

  const handleAdvisorToggle = (advisorId: string) => {
    const isSelected = selectedAdvisors.includes(advisorId);
    if (isSelected) {
      onSelectAdvisors(selectedAdvisors.filter(id => id !== advisorId));
    } else {
      onSelectAdvisors([...selectedAdvisors, advisorId]);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            מחפש יועצים מומלצים...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-sm">מנתח קבצי פרויקט...</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-4 w-4" />
              <span className="text-sm">בודק פרטי חברה...</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">מחפש יועצים באזור...</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Search className="h-4 w-4" />
              <span className="text-sm">ממיין לפי התאמה...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">שגיאה ביצירת המלצות</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            onClick={generateRecommendations} 
            variant="outline" 
            className="mt-4"
          >
            נסה שוב
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Zero state - no advisor pool available
  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            המלצות יועצים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">מסד הנתונים של היועצים בבנייה</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                אנחנו עובדים על איסוף מאגר יועצים מקצועיים לסוגי פרויקטים שונים. 
                בינתיים תוכל להמשיך ליצור את ה-RFP ולשלוח אותו ידנית ליועצים שתבחר.
              </p>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium">הנתונים שננתח לצורך ההמלצות:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                {selectedAdvisorTypes.map((type, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>{type}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button 
              onClick={generateRecommendations} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              בדוק שוב
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group recommendations by advisor type
  const recommendationsByType = selectedAdvisorTypes.reduce((acc, type) => {
    acc[type] = recommendations.filter(rec => rec.type === type);
    return acc;
  }, {} as Record<string, AdvisorRecommendation[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            המלצות יועצים
          </div>
          <Button 
            onClick={generateRecommendations} 
            variant="ghost" 
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            רענן
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-muted-foreground text-sm">
          מצאנו {recommendations.length} יועצים מומלצים עבור הפרויקט שלך, מחולקים לפי סוגי היועצים שבחרת.
        </p>

        {Object.entries(recommendationsByType).map(([advisorType, advisors]) => (
          <div key={advisorType} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{advisorType}</h3>
              <Badge variant="secondary">{advisors.length} מומלצים</Badge>
            </div>
            
            <div className="grid gap-3">
              {advisors.map((advisor) => {
                const isSelected = selectedAdvisors.includes(advisor.id);
                
                return (
                  <div
                    key={advisor.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleAdvisorToggle(advisor.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={isSelected} 
                        onChange={() => handleAdvisorToggle(advisor.id)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{advisor.name}</h4>
                          {isSelected && (
                            <Badge variant="default" className="text-xs">
                              נבחר
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground">{advisor.reason}</p>
                        
                        <div className="flex flex-wrap gap-2">
                          {advisor.specialties.map((specialty, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>התאמה: {Math.round(advisor.match_score)}%</span>
                          <span>ביטחון: {Math.round(advisor.confidence)}%</span>
                          {advisor.experience_years && (
                            <span>ניסיון: {advisor.experience_years} שנים</span>
                          )}
                          {advisor.location && (
                            <span>מיקום: {advisor.location}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {selectedAdvisors.length > 0 && (
          <div className="text-center">
            <Badge variant="secondary" className="text-sm">
              {selectedAdvisors.length} יועצים נבחרו
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};