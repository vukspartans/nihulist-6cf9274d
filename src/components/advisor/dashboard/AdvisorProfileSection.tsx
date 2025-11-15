import { Upload, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdvisorProfile } from '@/hooks/advisor/useAdvisorProfile';

interface AdvisorProfileSectionProps {
  advisorProfile: AdvisorProfile;
  onLogoUpload: (file: File) => void;
  isUploading: boolean;
}

export const AdvisorProfileSection = ({
  advisorProfile,
  onLogoUpload,
  isUploading,
}: AdvisorProfileSectionProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLogoUpload(file);
    }
  };

  return (
    <div className="container mx-auto px-4 -mt-16 md:-mt-20 relative z-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
        {/* Logo */}
        <div className="relative group">
          <div className="w-32 h-32 rounded-lg bg-card border-4 border-background shadow-elevated overflow-hidden">
            {advisorProfile.logo_url ? (
              <img
                src={advisorProfile.logo_url}
                alt={advisorProfile.company_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Building2 className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>
          
          {/* Upload Button */}
          <label
            htmlFor="logo-upload"
            className="absolute inset-0 flex items-center justify-center bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg"
          >
            <Upload className="w-6 h-6 text-foreground" />
            <input
              id="logo-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
        </div>

        {/* Company Info */}
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {advisorProfile.company_name}
          </h1>
          <p className="text-muted-foreground mt-1">
            {advisorProfile.location}
          </p>
        </div>
      </div>
    </div>
  );
};
