import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-primary-foreground hover:brightness-110',
      secondary: 'bg-secondary text-secondary-foreground hover:brightness-110',
      accent: 'bg-accent text-accent-foreground hover:brightness-110',
      destructive: 'bg-destructive text-destructive-foreground hover:brightness-110',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-[8px]',
      md: 'px-4 py-2 text-[10px]',
      lg: 'px-6 py-3 text-xs',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'pixel-button font-pixel uppercase tracking-wider transition-all disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

PixelButton.displayName = 'PixelButton';

export default PixelButton;
