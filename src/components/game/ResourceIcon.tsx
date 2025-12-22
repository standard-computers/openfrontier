import { cn } from '@/lib/utils';
import { CSSProperties } from 'react';

export interface ResourceIconProps {
  icon: string;
  iconType?: 'emoji' | 'image';
  size?: 'sm' | 'md' | 'lg' | 'custom';
  className?: string;
  style?: CSSProperties;
}

const sizeClasses = {
  sm: 'w-4 h-4 text-sm',
  md: 'w-6 h-6 text-lg',
  lg: 'w-8 h-8 text-xl',
  custom: '', // No predefined size, use style prop
};

const ResourceIcon = ({ icon, iconType = 'emoji', size = 'md', className, style }: ResourceIconProps) => {
  if (iconType === 'image' && icon.startsWith('http')) {
    return (
      <img 
        src={icon} 
        alt="Resource icon" 
        className={cn(sizeClasses[size], 'object-cover rounded', className)}
        style={style}
      />
    );
  }
  
  return (
    <span className={cn(sizeClasses[size], 'flex items-center justify-center', className)} style={style}>
      {icon}
    </span>
  );
};

export default ResourceIcon;
