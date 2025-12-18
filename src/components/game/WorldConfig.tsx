import { useState } from 'react';
import { Resource, TileType, TILE_TYPES, RARITY_COLORS } from '@/types/game';
import { X, Plus, Save, Trash2, RefreshCw, Map, Package, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WorldConfigProps {
  isOpen: boolean;
  onClose: () => void;
  worldName: string;
  resources: Resource[];
  onUpdateWorldName: (name: string) => void;
  onAddResource: (resource: Resource) => void;
  onUpdateResource: (resource: Resource) => void;
  onDeleteResource: (id: string) => void;
  onRegenerateWorld: () => void;
  onRespawnResources: () => void;
}

const ICONS = ['🪵', '🪨', '⛏️', '✨', '💎', '🔶', '🌿', '💧', '🔥', '❄️', '⚡', '🍎', '🌾', '🐟', '🥚', '🧵', '⚙️', '💀', '🍄', '🌸', '🦴', '🪶', '🌵', '🐚', '🍯', '🧲'];

const WorldConfig = ({
  isOpen,
  onClose,
  worldName,
  resources,
  onUpdateWorldName,
  onAddResource,
  onUpdateResource,
  onDeleteResource,
  onRegenerateWorld,
  onRespawnResources,
}: WorldConfigProps) => {
  const [activeSection, setActiveSection] = useState<'world' | 'resources'>('world');
  const [name, setName] = useState(worldName);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isNewResource, setIsNewResource] = useState(false);
  const [resourceForm, setResourceForm] = useState<Resource>({
    id: '',
    name: '',
    icon: '🪵',
    rarity: 'common',
    description: '',
    gatherTime: 2,
    spawnTiles: ['grass'],
    spawnChance: 0.1,
  });

  if (!isOpen) return null;

  const handleSaveName = () => {
    onUpdateWorldName(name);
    toast.success('World name updated');
  };

  const handleSelectResource = (resource: Resource) => {
    setSelectedResource(resource);
    setResourceForm(resource);
    setIsNewResource(false);
  };

  const handleNewResource = () => {
    setSelectedResource(null);
    setIsNewResource(true);
    setResourceForm({
      id: `res-${Date.now()}`,
      name: '',
      icon: '🪵',
      rarity: 'common',
      description: '',
      gatherTime: 2,
      spawnTiles: ['grass'],
      spawnChance: 0.1,
    });
  };

  const handleSaveResource = () => {
    if (!resourceForm.name.trim()) {
      toast.error('Resource name required');
      return;
    }
    if (isNewResource) {
      onAddResource(resourceForm);
      toast.success('Resource created');
    } else {
      onUpdateResource(resourceForm);
      toast.success('Resource updated');
    }
    setSelectedResource(null);
    setIsNewResource(false);
  };

  const handleDeleteResource = () => {
    if (selectedResource && confirm('Delete this resource?')) {
      onDeleteResource(selectedResource.id);
      setSelectedResource(null);
      toast.success('Resource deleted');
    }
  };

  const toggleSpawnTile = (tileType: TileType) => {
    const tiles = resourceForm.spawnTiles.includes(tileType)
      ? resourceForm.spawnTiles.filter(t => t !== tileType)
      : [...resourceForm.spawnTiles, tileType];
    setResourceForm({ ...resourceForm, spawnTiles: tiles });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="game-panel w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">World Configuration</h2>
          <button onClick={onClose} className="btn btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-border p-2 space-y-1">
            <button
              onClick={() => setActiveSection('world')}
              className={cn('w-full flex items-center gap-2 px-3 py-2 rounded text-sm', activeSection === 'world' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            >
              <Map className="w-4 h-4" /> World Settings
            </button>
            <button
              onClick={() => setActiveSection('resources')}
              className={cn('w-full flex items-center gap-2 px-3 py-2 rounded text-sm', activeSection === 'resources' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            >
              <Package className="w-4 h-4" /> Resources
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 overflow-auto">
            {activeSection === 'world' && (
              <div className="space-y-6">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">World Name</label>
                  <div className="flex gap-2">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field flex-1"
                    />
                    <button onClick={handleSaveName} className="btn btn-primary">
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium">World Actions</h3>
                  <button
                    onClick={() => { onRespawnResources(); toast.success('Resources respawned!'); }}
                    className="btn w-full justify-start gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Respawn All Resources
                  </button>
                  <button
                    onClick={() => { if (confirm('Regenerate entire world? This will reset everything.')) { onRegenerateWorld(); toast.success('World regenerated!'); }}}
                    className="btn w-full justify-start gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    <Map className="w-4 h-4" /> Regenerate World
                  </button>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Resources: {resources.length}</p>
                  <p>Map Size: 80 × 50 tiles</p>
                </div>
              </div>
            )}

            {activeSection === 'resources' && (
              <div className="flex gap-4">
                {/* Resource List */}
                <div className="w-1/2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Resources ({resources.length})</h3>
                    <button onClick={handleNewResource} className="btn btn-accent text-xs">
                      <Plus className="w-3 h-3 mr-1" /> New
                    </button>
                  </div>
                  <div className="space-y-1 max-h-96 overflow-auto">
                    {resources.map((resource) => (
                      <button
                        key={resource.id}
                        onClick={() => handleSelectResource(resource)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-left',
                          selectedResource?.id === resource.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        )}
                      >
                        <span>{resource.icon}</span>
                        <span className="flex-1 truncate">{resource.name}</span>
                        <span className={cn('text-xs', RARITY_COLORS[resource.rarity])}>{resource.rarity}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resource Editor */}
                <div className="w-1/2 space-y-3">
                  {(selectedResource || isNewResource) ? (
                    <>
                      <h3 className="text-sm font-medium">{isNewResource ? 'New Resource' : 'Edit Resource'}</h3>
                      
                      <div>
                        <label className="text-xs text-muted-foreground">Name</label>
                        <input
                          value={resourceForm.name}
                          onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
                          className="input-field w-full"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground">Icon</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {ICONS.map((icon) => (
                            <button
                              key={icon}
                              onClick={() => setResourceForm({ ...resourceForm, icon })}
                              className={cn('w-8 h-8 flex items-center justify-center rounded hover:bg-muted', resourceForm.icon === icon && 'bg-primary')}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Rarity</label>
                          <select
                            value={resourceForm.rarity}
                            onChange={(e) => setResourceForm({ ...resourceForm, rarity: e.target.value as Resource['rarity'] })}
                            className="input-field w-full"
                          >
                            <option value="common">Common</option>
                            <option value="uncommon">Uncommon</option>
                            <option value="rare">Rare</option>
                            <option value="epic">Epic</option>
                            <option value="legendary">Legendary</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Gather Time (s)</label>
                          <input
                            type="number"
                            min={1}
                            value={resourceForm.gatherTime}
                            onChange={(e) => setResourceForm({ ...resourceForm, gatherTime: Number(e.target.value) })}
                            className="input-field w-full"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground">Spawn Chance ({Math.round(resourceForm.spawnChance * 100)}%)</label>
                        <input
                          type="range"
                          min={0}
                          max={0.5}
                          step={0.01}
                          value={resourceForm.spawnChance}
                          onChange={(e) => setResourceForm({ ...resourceForm, spawnChance: Number(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground">Spawns On Tiles</label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {TILE_TYPES.filter(t => t.walkable).map((tile) => (
                            <button
                              key={tile.type}
                              onClick={() => toggleSpawnTile(tile.type)}
                              className={cn(
                                'px-2 py-1 text-xs rounded flex items-center gap-1',
                                resourceForm.spawnTiles.includes(tile.type) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                              )}
                            >
                              <span className={cn('w-3 h-3 rounded-sm', tile.color)}></span>
                              {tile.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground">Description</label>
                        <input
                          value={resourceForm.description}
                          onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                          className="input-field w-full"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button onClick={handleSaveResource} className="btn btn-primary flex-1">
                          <Save className="w-4 h-4 mr-1" /> Save
                        </button>
                        {!isNewResource && (
                          <button onClick={handleDeleteResource} className="btn bg-destructive text-destructive-foreground">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-8">
                      Select a resource to edit or create a new one
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorldConfig;
