import { cn } from '@/lib/utils';
import { Resource, RARITY_COLORS } from '@/types/game';

interface ResourceSlotProps {
  resource?: Resource | null;
  quantity?: number;
  onClick?: () => void;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ResourceSlot = ({ 
  resource, 
  quantity = 0, 
  onClick, 
  selected = false,
  size = 'md' 
}: ResourceSlotProps) => {
  const sizes = {
    sm: 'w-12 h-12 text-lg',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-20 h-20 text-3xl',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'resource-slot relative',
        sizes[size],
        selected && 'ring-2 ring-accent bg-muted',
        resource && 'animate-fade-in'
      )}
    >
      {resource && (
        <>
          <span className={cn('animate-pulse-glow', RARITY_COLORS[resource.rarity])}>
            {resource.icon}
          </span>
          {quantity > 0 && (
            <span className="absolute bottom-0.5 right-1 text-[8px] font-pixel text-foreground pixel-text-shadow">
              {quantity}
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default ResourceSlot;
