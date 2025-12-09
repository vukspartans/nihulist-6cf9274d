import logoImage from "@/assets/billding-logo.png";

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'default' | 'white';
}

const sizeClasses = {
  xs: 'h-6',
  sm: 'h-8',
  md: 'h-10',
  lg: 'h-12',
  xl: 'h-16'
};

const Logo = ({ size = 'md', className = '', variant = 'default' }: LogoProps) => {
  return (
    <img
      src={logoImage}
      alt="Billding"
      className={`${sizeClasses[size]} w-auto ${variant === 'white' ? 'brightness-0 invert' : ''} ${className}`}
      loading="eager"
    />
  );
};

export default Logo;
