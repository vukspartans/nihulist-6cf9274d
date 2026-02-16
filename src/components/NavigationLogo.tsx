import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRouteForRole } from '@/lib/roleNavigation';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavigationLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  mobileSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  height?: number;
  mobileHeight?: number;
  className?: string;
  to?: string;
}

export default function NavigationLogo({ size = 'lg', mobileSize = 'md', height = 48, mobileHeight = 36, className = '', to }: NavigationLogoProps) {
  const navigate = useNavigate();
  const { primaryRole } = useAuth();
  const isMobile = useIsMobile();
  const destination = to ?? getDashboardRouteForRole(primaryRole);
  const effectiveHeight = isMobile ? mobileHeight : height;

  const handleClick = () => {
    console.info('[NavigationLogo] Navigating to:', destination, 'role:', primaryRole);
    navigate(destination);
  };

  return (
    <div
      role="button"
      aria-label="Navigate to dashboard"
      onClick={handleClick}
      className={cn('cursor-pointer', className)}
    >
      <Logo height={effectiveHeight} />
    </div>
  );
}
