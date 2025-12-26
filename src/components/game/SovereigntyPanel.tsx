import { useState } from 'react';
import { Sovereignty, USER_COLORS, Area, AREA_COLORS } from '@/types/game';
import { X, Flag, Crown, Palette, Coins, Info, Settings, Plus, MapPin, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const FLAG_OPTIONS = ['🏴', '🏳️', '🚩', '⚔️', '🛡️', '👑', '🦁', '🦅', '🐉', '🌟', '⭐', '🔱', '🏰', '⚜️', '🗡️', '🎭'];

interface SovereigntyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userColor: string;
  coins: number;
  claimedTiles: number;
  username: string | null;
  sovereignty?: Sovereignty;
  areas?: Area[];
  onColorChange: (color: string) => void;
  onCreateSovereignty: (name: string, flag: string, motto: string) => void;
  onUpdateSovereignty: (updates: Partial<Sovereignty>) => void;
  onDeleteArea?: (areaId: string) => void;
  onUpdateArea?: (areaId: string, updates: Partial<Omit<Area, 'id' | 'createdAt'>>) => void;
}

const SovereigntyPanel = ({
  isOpen,
  onClose,
  userColor,
  coins,
  claimedTiles,
  username,
  sovereignty,
  areas = [],
  onColorChange,
  onCreateSovereignty,
  onUpdateSovereignty,
  onDeleteArea,
  onUpdateArea,
}: SovereigntyPanelProps) => {
  const [activeTab, setActiveTab] = useState<'general' | 'areas' | 'controls'>('general');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFlag, setNewFlag] = useState('🏴');
  const [newMotto, setNewMotto] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateSovereignty(newName.trim(), newFlag, newMotto.trim());
      setIsCreating(false);
      setNewName('');
      setNewMotto('');
    }
  };

  // Creation form
  if (!sovereignty && isCreating) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="game-panel w-full max-w-sm overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold">Found Your Sovereignty</h2>
            </div>
            <button onClick={() => setIsCreating(false)} className="btn btn-ghost p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Sovereignty Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Kingdom of..."
                className="input-field w-full"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Choose Your Flag</label>
              <div className="flex flex-wrap gap-2">
                {FLAG_OPTIONS.map((flag) => (
                  <button
                    key={flag}
                    onClick={() => setNewFlag(flag)}
                    className={cn(
                      'w-10 h-10 rounded-lg text-xl flex items-center justify-center bg-secondary/50 hover:bg-secondary transition-colors',
                      newFlag === flag && 'ring-2 ring-primary'
                    )}
                  >
                    {flag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Motto (optional)</label>
              <input
                value={newMotto}
                onChange={(e) => setNewMotto(e.target.value)}
                placeholder="For glory and honor..."
                className="input-field w-full"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="btn btn-primary w-full"
            >
              <Crown className="w-4 h-4" /> Found Sovereignty
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No sovereignty yet - prompt to create
  if (!sovereignty) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="game-panel w-full max-w-sm overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Flag className="w-5 h-5" />
              <h2 className="font-semibold">{username || 'Player'}</h2>
            </div>
            <button onClick={onClose} className="btn btn-ghost p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="text-center py-6">
              <Crown className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium mb-1">No Sovereignty Founded</h3>
              <p className="text-sm text-muted-foreground">
                Establish your own sovereignty to mark your territory and build your legacy.
              </p>
            </div>

            <button
              onClick={() => setIsCreating(true)}
              className="btn btn-primary w-full"
            >
              <Plus className="w-4 h-4" /> Found a Sovereignty
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Has sovereignty - show tabs
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="game-panel w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{sovereignty.flag}</span>
            <div>
              <h2 className="font-semibold">{sovereignty.name}</h2>
              {sovereignty.motto && (
                <p className="text-xs text-muted-foreground italic">"{sovereignty.motto}"</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('general')}
            className={cn(
              'flex-1 px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap',
              activeTab === 'general' 
                ? 'bg-secondary text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Info className="w-4 h-4" /> General
          </button>
          <button
            onClick={() => setActiveTab('areas')}
            className={cn(
              'flex-1 px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap',
              activeTab === 'areas' 
                ? 'bg-secondary text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MapPin className="w-4 h-4" /> Areas
            {areas.length > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 rounded-full">{areas.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('controls')}
            className={cn(
              'flex-1 px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap',
              activeTab === 'controls' 
                ? 'bg-secondary text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Settings className="w-4 h-4" /> Controls
          </button>
        </div>

        <div className="p-4 max-h-[350px] overflow-y-auto">
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-amber-400 text-xl font-bold">
                    <Coins className="w-5 h-5" />
                    {coins}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Treasury</p>
                </div>
                <div className="bg-secondary/50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold" style={{ color: userColor }}>
                    {claimedTiles}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Territory</p>
                </div>
              </div>

              {/* Sovereignty Info */}
              <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Founded</span>
                  <span>{new Date(sovereignty.foundedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ruler</span>
                  <span>{username || 'Unknown'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Areas</span>
                  <span>{areas.length}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'areas' && (
            <div className="space-y-3">
              {areas.length === 0 ? (
                <div className="text-center py-6">
                  <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No areas created yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select multiple owned tiles to create an area
                  </p>
                </div>
              ) : (
                areas.map((area) => (
                  <div 
                    key={area.id}
                    className="bg-secondary/30 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: area.color }}
                      />
                      <span className="font-medium flex-1">{area.name}</span>
                      {onDeleteArea && (
                        <button
                          onClick={() => onDeleteArea(area.id)}
                          className="btn btn-ghost p-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex justify-between">
                      <span>{area.tiles.length} tiles</span>
                      <span>{new Date(area.createdAt).toLocaleDateString()}</span>
                    </div>
                    {onUpdateArea && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {AREA_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => onUpdateArea(area.id, { color })}
                            className={cn(
                              'w-5 h-5 rounded transition-all',
                              area.color === color && 'ring-2 ring-white ring-offset-1 ring-offset-card'
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="space-y-4">
              {/* Color Selection */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Territory Color</span>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {USER_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => onColorChange(color)}
                      className={cn(
                        'w-9 h-9 rounded-lg transition-all hover:scale-110',
                        userColor === color && 'ring-2 ring-white ring-offset-2 ring-offset-card'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Flag Selection */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Flag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Change Flag</span>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {FLAG_OPTIONS.map((flag) => (
                    <button
                      key={flag}
                      onClick={() => onUpdateSovereignty({ flag })}
                      className={cn(
                        'w-9 h-9 rounded-lg text-lg flex items-center justify-center bg-secondary/50 hover:bg-secondary transition-colors',
                        sovereignty.flag === flag && 'ring-2 ring-primary'
                      )}
                    >
                      {flag}
                    </button>
                  ))}
                </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SovereigntyPanel;