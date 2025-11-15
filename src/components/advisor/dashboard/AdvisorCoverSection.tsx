import coverOption1 from '@/assets/cover-option-1.jpg';
import coverOption2 from '@/assets/cover-option-2.jpg';
import coverOption3 from '@/assets/cover-option-3.jpg';

const COVER_OPTIONS = [
  { id: '0', image: '' },
  { id: '1', image: coverOption1 },
  { id: '2', image: coverOption2 },
  { id: '3', image: coverOption3 },
];

interface AdvisorCoverSectionProps {
  coverImageUrl: string | null | undefined;
}

export const AdvisorCoverSection = ({ coverImageUrl }: AdvisorCoverSectionProps) => {
  const getCoverImage = () => {
    if (!coverImageUrl) return null;
    const option = COVER_OPTIONS.find(opt => opt.id === coverImageUrl);
    return option?.image || null;
  };

  const coverImage = getCoverImage();

  if (!coverImage) return null;

  return (
    <div className="w-full h-48 md:h-64 overflow-hidden bg-muted">
      <img
        src={coverImage}
        alt="כיסוי פרופיל"
        className="w-full h-full object-cover"
      />
    </div>
  );
};
