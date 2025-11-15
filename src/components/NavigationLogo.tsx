import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import { useAuth } from '@/hooks/useAuth';
import { getDashboardRouteForRole } from '@/lib/roleNavigation';
import { cn } from '@/lib/utils';

interface NavigationLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  to?: string;
}

export default function NavigationLogo({ size = 'md', className = '', to }: NavigationLogoProps) {
  const navigate = useNavigate();
  const { primaryRole } = useAuth();
  const destination = to ?? getDashboardRouteForRole(primaryRole);

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
      <Logo size={size} />
    </div>
  );
}
