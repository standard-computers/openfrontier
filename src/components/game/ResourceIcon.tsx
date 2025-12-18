import { cn } from '@/lib/utils';

interface ResourceIconProps {
  icon: string;
  iconType?: 'emoji' | 'image';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 text-sm',
  md: 'w-6 h-6 text-lg',
  lg: 'w-8 h-8 text-xl',
};

const ResourceIcon = ({ icon, iconType = 'emoji', size = 'md', className }: ResourceIconProps) => {
  if (iconType === 'image' && icon.startsWith('http')) {
    return (
      <img 
        src={icon} 
        alt="Resource icon" 
        className={cn(sizeClasses[size], 'object-cover rounded', className)}
      />
    );
  }
  
  return (
    <span className={cn(sizeClasses[size], 'flex items-center justify-center', className)}>
      {icon}
    </span>
  );
};

export default ResourceIcon;
