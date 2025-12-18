import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GamePanelProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

const GamePanel = ({ title, children, className }: GamePanelProps) => {
  return (
    <div className={cn('game-panel p-4', className)}>
      {title && (
        <h2 className="text-sm font-pixel text-accent pixel-text-shadow mb-4 uppercase tracking-wider">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
};

export default GamePanel;
