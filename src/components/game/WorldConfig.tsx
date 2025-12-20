import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Resource, RARITY_COLORS } from '@/types/game';
import { X, Plus, Save, RefreshCw, Map, Package, Hammer, Copy, Lock, Database, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ResourceEditorModal from './ResourceEditorModal';
import ResourceIcon from './ResourceIcon';
import ResourceRepository from './ResourceRepository';

interface WorldConfigProps {
  isOpen: boolean;
  onClose: () => void;
  worldName: string;
  joinCode?: string;
  isOwner: boolean;
  resources: Resource[];
  userId?: string;
  enableMarkets?: boolean;
  onUpdateWorldName: (name: string) => void;
  onAddResource: (resource: Resource) => void;
  onUpdateResource: (resource: Resource) => void;
  onDeleteResource: (id: string) => void;
  onRespawnResources: () => void;
  onToggleMarkets?: (enabled: boolean) => void;
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
  onUpdateWorldName,
  onAddResource,
  onUpdateResource,
  onDeleteResource,
  onRespawnResources,
  onToggleMarkets,
}: WorldConfigProps) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'world' | 'resources'>('world');
  const [name, setName] = useState(worldName);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [isNewResource, setIsNewResource] = useState(false);
  const [repositoryOpen, setRepositoryOpen] = useState(false);

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
      gatherTime: 2,
      spawnTiles: ['grass'],
      spawnChance: 0.1,
      coinValue: 10,
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

  return (
    <>
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
                        <button onClick={() => setRepositoryOpen(true)} className="btn text-xs">
                          <Database className="w-3 h-3 mr-1" /> Repository
                        </button>
                        <button onClick={handleNewResource} className="btn btn-accent text-xs">
                          <Plus className="w-3 h-3 mr-1" /> New Resource
                        </button>
                      </div>
                    )}
                  </div>

                  {!isOwner && (
                    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                      <Lock className="w-4 h-4" />
                      <span>Only the world owner can modify resources</span>
                    </div>
                  )}

                  <div className="grid gap-2">
                    {resources.map((resource) => (
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
      />
    </>
  );
};

export default WorldConfig;
