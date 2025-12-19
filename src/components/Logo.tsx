interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'default' | 'white';
}

const sizeClasses = {
  xs: 'text-lg',
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl'
};

const Logo = ({ size = 'md', className = '', variant = 'default' }: LogoProps) => {
  return (
    <span 
      className={`font-bold tracking-tight ${sizeClasses[size]} ${
        variant === 'white' 
          ? 'text-white' 
          : 'bg-gradient-to-l from-blue-600 to-purple-600 bg-clip-text text-transparent'
      } ${className}`}
    >
      Billding
    </span>
  );
};

export default Logo;
