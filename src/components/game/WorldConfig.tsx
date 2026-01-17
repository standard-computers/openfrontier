import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Resource, RARITY_COLORS } from '@/types/game';
import { X, Plus, Save, RefreshCw, Map, Package, Hammer, Copy, Lock, Database, LogOut, AlertTriangle, Search, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ResourceEditorModal from './ResourceEditorModal';
import ResourceIcon from './ResourceIcon';
import ResourceRepository from './ResourceRepository';
import { supabase } from '@/integrations/supabase/client';
import { repositoryToGameResource, RepositoryResource } from '@/utils/resourceConverter';

interface WorldConfigProps {
  isOpen: boolean;
  onClose: () => void;
  worldName: string;
  joinCode?: string;
  isOwner: boolean;
  resources: Resource[];
  userId?: string;
  enableMarkets?: boolean;
  enableNpcs?: boolean;
  npcCount?: number;
  enableStrangers?: boolean;
  strangerDensity?: number;
  mapWidth?: number;
  mapHeight?: number;
  onUpdateWorldName: (name: string) => void;
  onAddResource: (resource: Resource) => void;
  onAddExistingResource: (resource: Resource) => void;
  onUpdateResource: (resource: Resource) => void;
  onDeleteResource: (id: string) => void;
  onRespawnResources: () => void;
  onToggleMarkets?: (enabled: boolean) => void;
  onToggleNpcs?: (enabled: boolean, count: number) => void;
  onUpdateNpcCount?: (count: number) => void;
  onToggleStrangers?: (enabled: boolean, density: number) => void;
  onUpdateStrangerDensity?: (density: number) => void;
}

const WorldConfig = ({
  isOpen,
  onClose,
  worldName,
  joinCode,
  isOwner,
  resources,
  userId,
  enableMarkets,
  enableNpcs,
  npcCount,
  enableStrangers,
  strangerDensity = 100,
  mapWidth = 100,
  mapHeight = 100,
  onUpdateWorldName,
  onAddResource,
  onAddExistingResource,
  onUpdateResource,
  onDeleteResource,
  onRespawnResources,
  onToggleMarkets,
  onToggleNpcs,
  onUpdateNpcCount,
  onToggleStrangers,
  onUpdateStrangerDensity,
}: WorldConfigProps) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'world' | 'resources'>('world');
  const [name, setName] = useState(worldName);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [isNewResource, setIsNewResource] = useState(false);
  const [repositoryOpen, setRepositoryOpen] = useState(false);
  const [resourceSearch, setResourceSearch] = useState('');
  const [addingMissing, setAddingMissing] = useState(false);

  if (!isOpen) return null;

  const handleLeaveWorld = () => {
    onClose();
    navigate('/worlds');
  };

  const handleSaveName = () => {
    onUpdateWorldName(name);
    toast.success('World name updated');
  };

  const handleNewResource = () => {
    setEditingResource({
      id: `res-${Date.now()}`,
      name: '',
      icon: '🪵',
      rarity: 'common',
      description: '',
      gatherTime: 1,
      spawnTiles: [],
      spawnChance: 0,
      coinValue: 10,
      tileWidth: 0,
      tileHeight: 0,
      placeable: true,
      passable: true,
      destructible: true,
      maxLife: 10,
    });
    setIsNewResource(true);
  };

  const handleEditResource = (resource: Resource) => {
    setEditingResource(resource);
    setIsNewResource(false);
  };

  const handleSaveResource = (resource: Resource) => {
    if (isNewResource) {
      onAddResource(resource);
      toast.success('Resource created');
    } else {
      onUpdateResource(resource);
      toast.success('Resource updated');
    }
    setEditingResource(null);
    setIsNewResource(false);
  };

  const handleDeleteResource = () => {
    if (editingResource) {
      onDeleteResource(editingResource.id);
      setEditingResource(null);
      toast.success('Resource deleted');
    }
  };

  const handleAddMissingResources = async () => {
    setAddingMissing(true);
    try {
      const { data, error } = await supabase
        .from('resource_marketplace')
        .select('*');

      if (error) throw error;

      const existingIds = new Set(resources.map(r => r.id));
      const missingResources = (data as RepositoryResource[]).filter(r => !existingIds.has(r.id));

      if (missingResources.length === 0) {
        toast.info('All repository resources are already in your world');
        return;
      }

      for (const repoResource of missingResources) {
        const newResource = repositoryToGameResource(repoResource);
        onAddExistingResource(newResource);
      }

      toast.success(`Added ${missingResources.length} missing resource(s) to your world`);
    } catch (err: any) {
      toast.error('Failed to add missing resources: ' + err.message);
    } finally {
      setAddingMissing(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="game-panel w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">World Configuration</h2>
            <button onClick={onClose} className="btn btn-ghost p-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-48 border-r border-border p-2 flex flex-col gap-1">
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
              
              {/* Leave World button at bottom of sidebar */}
              <div className="!mt-auto pt-4 border-t border-border">
                <button
                  onClick={handleLeaveWorld}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Leave World
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-auto">
              {activeSection === 'world' && (
                <div className="space-y-6">
                  {/* Join Code (owners only) */}
                  {isOwner && joinCode && (
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Join Code</label>
                      <div className="flex gap-2">
                        <div className="input-field flex-1 font-mono text-lg tracking-widest text-center">
                          {joinCode.toUpperCase()}
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(joinCode.toUpperCase());
                            toast.success('Join code copied!');
                          }} 
                          className="btn"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Share this code with others to let them join your world</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">World Name</label>
                    <div className="flex gap-2">
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input-field flex-1"
                        disabled={!isOwner}
                      />
                      {isOwner && (
                        <button onClick={handleSaveName} className="btn btn-primary">
                          <Save className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isOwner && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">World Actions</h3>
                      <button
                        onClick={() => { onRespawnResources(); toast.success('Resources respawned!'); }}
                        className="btn w-full justify-start gap-2"
                      >
                        <RefreshCw className="w-4 h-4" /> Respawn All Resources
                      </button>
                      
                      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🏪</span>
                          <div>
                            <div className="font-medium text-sm">Enable Markets</div>
                            <div className="text-xs text-muted-foreground">Add marketplace buildings to the world</div>
                          </div>
                        </div>
                        <button
                          onClick={() => onToggleMarkets?.(!enableMarkets)}
                          className={cn(
                            'w-12 h-6 rounded-full transition-colors relative',
                            enableMarkets ? 'bg-primary' : 'bg-muted'
                          )}
                        >
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform',
                              enableMarkets ? 'translate-x-6' : 'translate-x-0.5'
                            )}
                          />
                        </button>
                      </div>

                      {/* NPC Settings */}
                      <div className="p-3 bg-secondary/30 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">🤖</span>
                            <div>
                              <div className="font-medium text-sm">Enable NPCs</div>
                              <div className="text-xs text-muted-foreground">Add AI characters to the world</div>
                            </div>
                          </div>
                          <button
                            onClick={() => onToggleNpcs?.(!enableNpcs, npcCount || 4)}
                            className={cn(
                              'w-12 h-6 rounded-full transition-colors relative',
                              enableNpcs ? 'bg-primary' : 'bg-muted'
                            )}
                          >
                            <div
                              className={cn(
                                'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform',
                                enableNpcs ? 'translate-x-6' : 'translate-x-0.5'
                              )}
                            />
                          </button>
                        </div>
                        
                        {enableNpcs && (
                          <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                            <label className="text-sm text-muted-foreground">Number of NPCs:</label>
                            <input
                              type="number"
                              min={1}
                              max={12}
                              value={npcCount || 4}
                              onChange={(e) => {
                                const value = Math.min(Math.max(parseInt(e.target.value) || 1, 1), 12);
                                onUpdateNpcCount?.(value);
                              }}
                              className="input-field w-20 text-center"
                            />
                            <span className="text-xs text-muted-foreground">(max 12)</span>
                          </div>
                        )}
                      </div>

                      {/* Strangers Settings */}
                      <div className="p-3 bg-secondary/30 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">👤</span>
                            <div>
                              <div className="font-medium text-sm">Enable Strangers</div>
                              <div className="text-xs text-muted-foreground">Add wandering NPCs that don't claim territory</div>
                            </div>
                          </div>
                          <button
                            onClick={() => onToggleStrangers?.(!enableStrangers, strangerDensity)}
                            className={cn(
                              'w-12 h-6 rounded-full transition-colors relative',
                              enableStrangers ? 'bg-primary' : 'bg-muted'
                            )}
                          >
                            <div
                              className={cn(
                                'w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform',
                                enableStrangers ? 'translate-x-6' : 'translate-x-0.5'
                              )}
                            />
                          </button>
                        </div>
                        
                        {enableStrangers && (
                          <div className="space-y-3 pt-2 border-t border-border/50">
                            <div className="flex items-center gap-3">
                              <label className="text-sm text-muted-foreground">Population Count:</label>
                              <input
                                type="number"
                                min={1}
                                max={10000}
                                step={1}
                                value={Math.round(strangerDensity)}
                                onChange={(e) => {
                                  const value = Math.min(Math.max(parseInt(e.target.value) || 100, 1), 10000);
                                  onUpdateStrangerDensity?.(value);
                                }}
                                className="input-field w-28 text-center"
                              />
                            </div>
                            
                            {strangerDensity > 5000 && (
                              <div className="flex items-center gap-2 p-2 bg-destructive/20 rounded text-sm text-destructive">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>High population may cause performance issues!</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!isOwner && (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                      <Lock className="w-4 h-4" />
                      <span>Only the world owner can modify settings</span>
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Resources: {resources.length}</p>
                  </div>
                </div>
              )}

              {activeSection === 'resources' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-medium">Resources ({resources.length})</h3>
                    {isOwner && (
                      <div className="flex gap-2">
                        <button 
                          onClick={handleAddMissingResources} 
                          disabled={addingMissing}
                          className="btn text-xs"
                        >
                          <Download className="w-3 h-3 mr-1" /> {addingMissing ? 'Adding...' : '+ Missing'}
                        </button>
                        <button onClick={() => setRepositoryOpen(true)} className="btn text-xs">
                          <Database className="w-3 h-3 mr-1" /> Repository
                        </button>
                        <button onClick={handleNewResource} className="btn btn-accent text-xs">
                          <Plus className="w-3 h-3 mr-1" /> New Resource
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search resources..."
                      value={resourceSearch}
                      onChange={(e) => setResourceSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>

                  {!isOwner && (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                      <Lock className="w-4 h-4" />
                      <span>Only the world owner can modify resources</span>
                    </div>
                  )}

                  <div className="grid gap-2">
                    {resources
                      .filter(r => r.name.toLowerCase().includes(resourceSearch.toLowerCase()))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((resource) => (
                      <div
                        key={resource.id}
                        onClick={() => isOwner && handleEditResource(resource)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg bg-secondary/30 transition-colors text-left",
                          isOwner && "cursor-pointer hover:bg-secondary/50"
                        )}
                      >
                        <ResourceIcon icon={resource.icon} iconType={resource.iconType} size="lg" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{resource.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={RARITY_COLORS[resource.rarity]}>{resource.rarity}</span>
                            <span>•</span>
                            <span>{resource.coinValue} coins</span>
                            {resource.recipes && resource.recipes.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Hammer className="w-3 h-3" /> {resource.recipes.length} recipe{resource.recipes.length !== 1 && 's'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {resources.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No resources yet</p>
                      <p className="text-sm">Create your first resource above</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editingResource && (
        <ResourceEditorModal
          resource={editingResource}
          allResources={resources}
          isNew={isNewResource}
          onSave={handleSaveResource}
          onDelete={isNewResource ? undefined : handleDeleteResource}
          onClose={() => { setEditingResource(null); setIsNewResource(false); }}
        />
      )}

      <ResourceRepository
        isOpen={repositoryOpen}
        onClose={() => setRepositoryOpen(false)}
        onAddResource={onAddResource}
        existingResources={resources}
        userId={userId}
        canAddToWorld={true}
      />
    </>
  );
};

export default WorldConfig;
