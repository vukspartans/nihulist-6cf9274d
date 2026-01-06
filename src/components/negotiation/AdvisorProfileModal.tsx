import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Users, 
  Globe, 
  Linkedin, 
  Phone, 
  Mail,
  Star,
  ExternalLink,
  Award
} from 'lucide-react';

interface AdvisorData {
  id: string;
  company_name?: string;
  logo_url?: string;
  founding_year?: number;
  office_size?: string;
  location?: string;
  website?: string;
  linkedin_url?: string;
  office_phone?: string;
  rating?: number;
  expertise?: string[];
  specialties?: string[];
  certifications?: string[];
  activity_regions?: string[];
}

interface ProfileData {
  name?: string;
  email?: string;
  phone?: string;
}

interface AdvisorProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advisor: AdvisorData | null;
  profile?: ProfileData | null;
}

const formatOfficeSizeLabel = (size: string) => {
  const sizes: Record<string, string> = {
    'solo': 'עצמאי',
    'small': 'קטן (2-10)',
    'medium': 'בינוני (11-50)',
    'large': 'גדול (51+)'
  };
  return sizes[size] || size;
};

export const AdvisorProfileModal: React.FC<AdvisorProfileModalProps> = ({
  open,
  onOpenChange,
  advisor,
  profile
}) => {
  if (!advisor) return null;

  const initials = advisor.company_name
    ? advisor.company_name.split(' ').map(w => w[0]).join('').slice(0, 2)
    : '??';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">פרופיל יועץ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header with logo and company name */}
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={advisor.logo_url || undefined} alt={advisor.company_name || ''} />
              <AvatarFallback className="text-lg bg-primary/10">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{advisor.company_name || 'לא צוין'}</h3>
              {advisor.rating && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{advisor.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Company details */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                פרטי החברה
              </h4>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                {advisor.founding_year && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>שנת ייסוד: {advisor.founding_year}</span>
                  </div>
                )}
                
                {advisor.office_size && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>גודל: {formatOfficeSizeLabel(advisor.office_size)}</span>
                  </div>
                )}
                
                {advisor.location && (
                  <div className="flex items-center gap-2 col-span-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{advisor.location}</span>
                  </div>
                )}
              </div>

              {/* Activity regions */}
              {advisor.activity_regions && advisor.activity_regions.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">אזורי פעילות:</p>
                  <div className="flex flex-wrap gap-1">
                    {advisor.activity_regions.map((region, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {region}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact info */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Phone className="w-4 h-4" />
                פרטי קשר
              </h4>
              
              <div className="space-y-2 text-sm">
                {profile?.name && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{profile.name}</span>
                  </div>
                )}
                
                {(advisor.office_phone || profile?.phone) && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a 
                      href={`tel:${advisor.office_phone || profile?.phone}`}
                      className="text-primary hover:underline"
                    >
                      {advisor.office_phone || profile?.phone}
                    </a>
                  </div>
                )}
                
                {profile?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a 
                      href={`mailto:${profile.email}`}
                      className="text-primary hover:underline"
                    >
                      {profile.email}
                    </a>
                  </div>
                )}
              </div>

              {/* External links */}
              <div className="flex gap-2 pt-2">
                {advisor.website && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={advisor.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="w-4 h-4 me-1" />
                      אתר
                      <ExternalLink className="w-3 h-3 ms-1" />
                    </a>
                  </Button>
                )}
                
                {advisor.linkedin_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={advisor.linkedin_url} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="w-4 h-4 me-1" />
                      LinkedIn
                      <ExternalLink className="w-3 h-3 ms-1" />
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expertise & Specialties */}
          {((advisor.expertise && advisor.expertise.length > 0) || 
            (advisor.specialties && advisor.specialties.length > 0)) && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  תחומי מומחיות
                </h4>
                
                {advisor.expertise && advisor.expertise.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">התמחויות:</p>
                    <div className="flex flex-wrap gap-1">
                      {advisor.expertise.map((exp, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {exp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {advisor.specialties && advisor.specialties.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">ספציאליזציות:</p>
                    <div className="flex flex-wrap gap-1">
                      {advisor.specialties.map((spec, i) => (
                        <Badge key={i} className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {advisor.certifications && advisor.certifications.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">הסמכות:</p>
                    <div className="flex flex-wrap gap-1">
                      {advisor.certifications.map((cert, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdvisorProfileModal;
