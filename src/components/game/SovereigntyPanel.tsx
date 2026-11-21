import { useEffect, useState } from 'react';
import { Sovereignty, USER_COLORS, Area, AREA_COLORS, NPC } from '@/types/game';
import { X, Flag, Crown, Palette, Coins, Info, Settings, Plus, MapPin, Trash2, RefreshCw, Check, ScrollText } from 'lucide-react';
import { generateRandomSovereigntyName } from '@/utils/nameGenerator';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import TaxRateControl from './TaxRateControl';

const FLAG_OPTIONS = ['🏴', '🏳️', '🚩', '⚔️', '🛡️', '👑', '🦁', '🦅', '🐉', '🌟', '⭐', '🔱', '🏰', '⚜️', '🗡️', '🎭'];

interface SovereigntyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userColor: string;
  coins: number;
  claimedTiles: number;
  population?: number;
  username: string | null;
  sovereignty?: Sovereignty;
  areas?: Area[];
  onColorChange: (color: string) => void;
  onCreateSovereignty: (name: string, flag: string, motto: string) => void;
  onUpdateSovereignty: (updates: Partial<Sovereignty>) => void;
  onDeleteArea?: (areaId: string) => void;
  onSetCapitalArea?: (areaId: string) => void;
  onUpdateArea?: (areaId: string, updates: Partial<Omit<Area, 'id' | 'createdAt'>>) => void;
  npcs?: NPC[];
  onUpdateNpcTaxRate?: (npcId: string, rate: number) => void;
}

const SovereigntyPanel = ({
  isOpen,
  onClose,
  userColor,
  coins,
  claimedTiles,
  population = 0,
  username,
  sovereignty,
  areas = [],
  onColorChange,
  onCreateSovereignty,
  onUpdateSovereignty,
  onDeleteArea,
  onUpdateArea,
  onSetCapitalArea,
  npcs,
  onUpdateNpcTaxRate,
}: SovereigntyPanelProps) => {
  const [activeTab, setActiveTab] = useState<'general' | 'areas' | 'policies' | 'controls'>('general');
  const [newPolicy, setNewPolicy] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFlag, setNewFlag] = useState('🏴');
  const [newMotto, setNewMotto] = useState('');
  const [nameDraft, setNameDraft] = useState('');

  useEffect(() => {
    setNameDraft(sovereignty?.name ?? '');
  }, [sovereignty?.name]);

  if (!isOpen) return null;

  const trimmedName = nameDraft.trim();
  const canSaveName = trimmedName.length > 0 && trimmedName !== sovereignty?.name;

  const handleSaveName = () => {
    if (!canSaveName) return;
    onUpdateSovereignty({ name: trimmedName });
    setNameDraft(trimmedName);
  };

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
              <div className="flex gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Kingdom of..."
                  className="input-field flex-1"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setNewName(generateRandomSovereigntyName())}
                  className="btn btn-ghost p-2"
                  title="Generate random name"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
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

          <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
            {/* Player stats */}
            <div className="grid grid-cols-2 gap-3">
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

            {/* Player color */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Your Color</span>
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
              <p className="text-xs text-muted-foreground text-center mt-2">
                This color marks your claimed tiles
              </p>
            </div>

            <div className="text-center py-4 border-t border-border">
              <Crown className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
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
            onClick={() => setActiveTab('policies')}
            className={cn(
              'flex-1 px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap',
              activeTab === 'policies'
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ScrollText className="w-4 h-4" /> Policies
            {(sovereignty.policies?.length ?? 0) > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 rounded-full">{sovereignty.policies!.length}</span>
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
                  <span className="text-muted-foreground">Population</span>
                  <span>{population.toLocaleString()}</span>
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
                    {onSetCapitalArea && (
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Button
                          variant={sovereignty.capitalAreaId === area.id ? 'secondary' : 'outline'}
                          size="sm"
                          disabled={sovereignty.capitalAreaId === area.id || area.tiles.length === 0}
                          onClick={() => onSetCapitalArea(area.id)}
                          aria-label={`Make ${area.name} capital`}
                        >
                          <Crown />
                          {sovereignty.capitalAreaId === area.id ? 'Capital' : 'Make Capital'}
                        </Button>
                        {sovereignty.capitalAreaId === area.id && sovereignty.home && (
                          <span className="text-xs text-muted-foreground">Home: {sovereignty.home.x}, {sovereignty.home.y}</span>
                        )}
                      </div>
                    )}
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

          {activeTab === 'policies' && (
            <div className="space-y-3">
              <div className="border-b border-border pb-3 space-y-2">
                <TaxRateControl label="Citizen tax rate" rate={sovereignty.taxRate} onSave={taxRate => onUpdateSovereignty({ taxRate })} />
                <p className="text-xs text-muted-foreground">Savings tax · collected every 28 game days</p>
              </div>
              {onUpdateNpcTaxRate && !!npcs?.length && (
                <div className="border-b border-border pb-3 space-y-3">
                  <h3 className="text-sm font-semibold">NPC taxes</h3>
                  {npcs.map(npc => <TaxRateControl key={npc.id} label={`${npc.sovereignty.name} tax rate`} rate={npc.sovereignty.taxRate ?? 10} onSave={rate => onUpdateNpcTaxRate(npc.id, rate)} />)}
                </div>
              )}
              {/* Gameplay policy toggles */}
              <div className="bg-secondary/30 rounded-lg p-3 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sovereignty.openBorders ?? false}
                    onChange={(e) => onUpdateSovereignty({ openBorders: e.target.checked })}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="text-sm font-medium block">Open Borders</span>
                    <span className="text-xs text-muted-foreground">
                      Unpledged strangers may wander into your territory
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sovereignty.allowOutsiderGathering ?? false}
                    onChange={(e) => onUpdateSovereignty({ allowOutsiderGathering: e.target.checked })}
                    className="mt-0.5 accent-primary"
                  />
                  <span>
                    <span className="text-sm font-medium block">Outsider Gathering</span>
                    <span className="text-xs text-muted-foreground">
                      Other players may gather natural resources from your tiles
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex gap-2">
                <input
                  value={newPolicy}
                  onChange={(e) => setNewPolicy(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const text = newPolicy.trim();
                      if (!text) return;
                      onUpdateSovereignty({ policies: [...(sovereignty.policies ?? []), text] });
                      setNewPolicy('');
                    }
                  }}
                  placeholder="Decree a new policy..."
                  className="input-field flex-1"
                />
                <button
                  type="button"
                  disabled={!newPolicy.trim()}
                  onClick={() => {
                    const text = newPolicy.trim();
                    if (!text) return;
                    onUpdateSovereignty({ policies: [...(sovereignty.policies ?? []), text] });
                    setNewPolicy('');
                  }}
                  className="btn btn-primary p-2"
                  title="Add policy"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {(sovereignty.policies?.length ?? 0) === 0 ? (
                <div className="text-center py-6">
                  <ScrollText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No policies decreed yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set the laws and edicts of your sovereignty
                  </p>
                </div>
              ) : (
                <ol className="space-y-2">
                  {sovereignty.policies!.map((policy, index) => (
                    <li
                      key={index}
                      className="bg-secondary/30 rounded-lg p-3 flex items-start gap-2"
                    >
                      <span className="text-xs text-muted-foreground mt-0.5 font-mono">{index + 1}.</span>
                      <span className="text-sm flex-1">{policy}</span>
                      <button
                        onClick={() =>
                          onUpdateSovereignty({
                            policies: sovereignty.policies!.filter((_, i) => i !== index),
                          })
                        }
                        className="btn btn-ghost p-1 text-destructive hover:text-destructive"
                        title="Repeal policy"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="space-y-4">
              {/* Name Editing */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Sovereignty Name</span>
                </div>
                <div className="flex gap-2">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveName();
                      }
                    }}
                    placeholder="Kingdom of..."
                    className="input-field flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setNameDraft(generateRandomSovereigntyName())}
                    className="btn btn-ghost p-2"
                    title="Generate random name"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={!canSaveName}
                    className="btn btn-primary p-2"
                    title="Save name"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your new name appears on the map and in the leaderboard.
                </p>
              </div>

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