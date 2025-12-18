import { useNavigate } from 'react-router-dom';
import { USER_COLORS } from '@/types/game';
import { X, User, Palette, Coins, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userColor: string;
  coins: number;
  claimedTiles: number;
  username: string | null;
  onColorChange: (color: string) => void;
}

const AccountPanel = ({
  isOpen,
  onClose,
  userColor,
  coins,
  claimedTiles,
  username,
  onColorChange,
}: AccountPanelProps) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLeaveWorld = () => {
    onClose();
    navigate('/worlds');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="game-panel w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5" />
            <h2 className="font-semibold">{username || 'Player'}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-400 text-xl font-bold">
                <Coins className="w-5 h-5" />
                {coins}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Coins</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <div className="text-xl font-bold" style={{ color: userColor }}>
                {claimedTiles}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tiles Claimed</p>
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Your Color</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {USER_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  className={cn(
                    'w-10 h-10 rounded-lg transition-all hover:scale-110',
                    userColor === color && 'ring-2 ring-white ring-offset-2 ring-offset-card'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              This color marks your claimed tiles
            </p>
          </div>

          {/* Current color preview */}
          <div className="flex items-center justify-center gap-3 p-3 bg-secondary/30 rounded-lg">
            <div 
              className="w-6 h-6 rounded-full border-2"
              style={{ backgroundColor: userColor, borderColor: userColor }}
            />
            <span className="text-sm">Your claimed tiles look like this</span>
          </div>

          {/* Leave World */}
          <button
            onClick={handleLeaveWorld}
            className="w-full btn flex items-center justify-center gap-2 border border-border hover:bg-muted"
          >
            <LogOut className="w-4 h-4" />
            Leave World
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountPanel;
