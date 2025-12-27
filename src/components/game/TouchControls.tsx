import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Hand, Zap } from 'lucide-react';

interface TouchControlsProps {
  onMove: (dx: number, dy: number) => void;
  onPlace: () => void;
  onUse: () => void;
  canPlace: boolean;
  canUse: boolean;
}

const TouchControls = ({ onMove, onPlace, onUse, canPlace, canUse }: TouchControlsProps) => {
  return (
    <div className="absolute bottom-24 right-4 z-30 pointer-events-auto">
      <div className="grid grid-cols-3 gap-1">
        <div />
        <button
          onClick={() => onMove(0, -1)}
          className="w-14 h-14 bg-card/80 backdrop-blur border border-border rounded-lg flex items-center justify-center active:bg-primary/50 transition-colors touch-manipulation"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
        {/* Use item button in upper right of d-pad */}
        <button
          onClick={onUse}
          disabled={!canUse}
          className={`w-14 h-14 backdrop-blur border border-border rounded-lg flex items-center justify-center transition-colors touch-manipulation ${
            canUse 
              ? 'bg-amber-500/80 active:bg-amber-600 text-white' 
              : 'bg-card/40 text-muted-foreground'
          }`}
          title="Use item (U)"
        >
          <Zap className="w-6 h-6" />
        </button>
        
        <button
          onClick={() => onMove(-1, 0)}
          className="w-14 h-14 bg-card/80 backdrop-blur border border-border rounded-lg flex items-center justify-center active:bg-primary/50 transition-colors touch-manipulation"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        {/* Center button for placing items */}
        <button
          onClick={onPlace}
          disabled={!canPlace}
          className={`w-14 h-14 backdrop-blur border border-border rounded-lg flex items-center justify-center transition-colors touch-manipulation ${
            canPlace 
              ? 'bg-primary/80 active:bg-primary text-primary-foreground' 
              : 'bg-card/40 text-muted-foreground'
          }`}
          title="Place item (Q)"
        >
          <Hand className="w-6 h-6" />
        </button>
        
        <button
          onClick={() => onMove(1, 0)}
          className="w-14 h-14 bg-card/80 backdrop-blur border border-border rounded-lg flex items-center justify-center active:bg-primary/50 transition-colors touch-manipulation"
        >
          <ArrowRight className="w-6 h-6" />
        </button>
        
        <div />
        <button
          onClick={() => onMove(0, 1)}
          className="w-14 h-14 bg-card/80 backdrop-blur border border-border rounded-lg flex items-center justify-center active:bg-primary/50 transition-colors touch-manipulation"
        >
          <ArrowDown className="w-6 h-6" />
        </button>
        <div />
      </div>
    </div>
  );
};

export default TouchControls;
