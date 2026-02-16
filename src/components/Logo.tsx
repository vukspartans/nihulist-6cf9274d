import billdingLogo from '@/assets/billding-logo.svg';
import billdingLogoWhite from '@/assets/billding-logo-white.svg';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  height?: number;
  className?: string;
  variant?: 'default' | 'white';
}

const sizeHeights: Record<string, number> = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 68,
};

const Logo = ({ size = 'md', height: heightOverride, className = '', variant = 'default' }: LogoProps) => {
  const height = heightOverride ?? sizeHeights[size];
  const src = variant === 'white' ? billdingLogoWhite : billdingLogo;

  return (
    <img
      src={src}
      alt="Billding"
      style={{ height: `${height}px`, width: 'auto' }}
      className={className}
    />
  );
};

export default Logo;
