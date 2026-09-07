import { useState } from 'react';
import { X, User, Flag, Heart, Package, ArrowRightLeft, Pencil, Check } from 'lucide-react';
import { Stranger } from '@/types/game';
import PixelCharacter from './PixelCharacter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StrangerInfoPanelProps {
  stranger: Stranger;
  onClose: () => void;
  onRequestMove?: (strangerId: string) => void;
  canRename?: boolean;
  onRename?: (strangerId: string, newName: string) => void;
}

const StrangerInfoPanel = ({ stranger, onClose, onRequestMove, canRename, onRename }: StrangerInfoPanelProps) => {
  const totalItems = stranger.inventory.reduce((sum, slot) => sum + (slot.quantity || 0), 0);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(stranger.name);

  const handleRequestMove = () => {
    if (onRequestMove) {
      onRequestMove(stranger.id);
      onClose();
    }
  };

  const handleSaveName = () => {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== stranger.name && onRename) {
      onRename(stranger.id, trimmed);
    }
    setIsEditingName(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="game-panel w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <PixelCharacter 
                direction="south" 
                isMoving={false} 
                size={32} 
                userColor={stranger.color}
              />
            </div>
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                    className="h-7 w-36 text-sm"
                    maxLength={24}
                    autoFocus
                  />
                  <button onClick={handleSaveName} className="btn btn-ghost p-1" title="Save name">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <h2 className="font-semibold text-foreground">{stranger.name}</h2>
                  {canRename && onRename && (
                    <button
                      onClick={() => { setNameValue(stranger.name); setIsEditingName(true); }}
                      className="btn btn-ghost p-1"
                      title="Rename stranger"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Wandering Stranger</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Allegiance */}
          <div className="bg-secondary/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Flag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Allegiance</span>
            </div>
            {stranger.allegiance ? (
              <div className="flex items-center gap-2 text-foreground">
                <span className="text-xl">{stranger.allegiance.sovereigntyFlag}</span>
                <div>
                  <div className="font-medium">{stranger.allegiance.sovereigntyName}</div>
                  <div className="text-xs text-muted-foreground">
                    Pledged to {stranger.allegiance.username}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Since {new Date(stranger.allegiance.pledgedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground italic">No Allegiance</div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-red-400">
                <Heart className="w-4 h-4" />
                <span className="font-bold">{stranger.health}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Health</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-400">
                <Package className="w-4 h-4" />
                <span className="font-bold">{totalItems}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Items</p>
            </div>
          </div>

          {/* Location */}
          <div className="text-sm text-muted-foreground text-center">
            Position: ({stranger.position.x}, {stranger.position.y})
          </div>

          {/* Actions */}
          {onRequestMove && (
            <Button 
              onClick={handleRequestMove}
              variant="outline" 
              className="w-full"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Ask to Move
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StrangerInfoPanel;
