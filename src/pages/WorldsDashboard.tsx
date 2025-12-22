import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Globe, Trash2, Play, LogOut, Users, Crown, Copy, UserPlus, Database, Download, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useWorlds } from '@/hooks/useWorlds';
import ResourceRepository from '@/components/game/ResourceRepository';
import ResourceIcon from '@/components/game/ResourceIcon';
import { Resource } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';

const WorldsDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, username, signOut } = useAuth();
  const { worlds, loading: worldsLoading, createWorld, joinWorld, deleteWorld, leaveWorld } = useWorlds(user?.id);
  
  const [newWorldName, setNewWorldName] = useState('');
  const [newWorldWidth, setNewWorldWidth] = useState('500');
  const [newWorldHeight, setNewWorldHeight] = useState('500');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createTab, setCreateTab] = useState<'settings' | 'resources'>('settings');
  const [selectedResources, setSelectedResources] = useState<Resource[]>([]);
  const [repositoryOpen, setRepositoryOpen] = useState(false);
  const [addingAllResources, setAddingAllResources] = useState(false);
  
  // World feature settings
  const [enableMarkets, setEnableMarkets] = useState(false);
  const [enableNpcs, setEnableNpcs] = useState(false);
  const [npcCount, setNpcCount] = useState(4);
  const [enableStrangers, setEnableStrangers] = useState(false);
  const [strangerDensity, setStrangerDensity] = useState(0.02);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleCreateWorld = async () => {
    if (!newWorldName.trim()) {
      toast.error('Please enter a world name');
      return;
    }

    const width = Math.max(1, parseInt(newWorldWidth) || 500);
    const height = Math.max(1, parseInt(newWorldHeight) || 500);
    
    setIsSubmitting(true);
    try {
      const worldId = await createWorld(newWorldName.trim(), width, height, selectedResources, {
        enableMarkets,
        enableNpcs,
        npcCount: enableNpcs ? npcCount : 0,
        enableStrangers,
        strangerDensity: enableStrangers ? strangerDensity : 0.02,
      });
      localStorage.setItem('currentWorldId', worldId);
      toast.success(`World created! (${width}×${height} tiles)`);
      setSelectedResources([]);
      navigate('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create world');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinWorld = async () => {
    if (!joinCode.trim()) {
      toast.error('Please enter a join code');
      return;
    }

    setIsSubmitting(true);
    try {
      const worldId = await joinWorld(joinCode.trim());
      localStorage.setItem('currentWorldId', worldId);
      toast.success('Joined world successfully!');
      navigate('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join world');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnterWorld = (worldId: string) => {
    localStorage.setItem('currentWorldId', worldId);
    navigate('/');
  };

  const handleDeleteWorld = async (worldId: string, role: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (role === 'owner') {
      if (!confirm('Delete this world? This will remove it for all players and cannot be undone.')) return;
      try {
        await deleteWorld(worldId);
        toast.success('World deleted');
      } catch (error) {
        toast.error('Failed to delete world');
      }
    } else {
      if (!confirm('Leave this world?')) return;
      try {
        await leaveWorld(worldId);
        toast.success('Left world');
      } catch (error) {
        toast.error('Failed to leave world');
      }
    }
  };

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    toast.success('Join code copied!');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleAddAllResources = async () => {
    setAddingAllResources(true);
    try {
      const { data, error } = await supabase
        .from('resource_marketplace')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      const existingNames = new Set(selectedResources.map(r => r.name.toLowerCase()));
      let addedCount = 0;

      for (const repoResource of data || []) {
        if (!existingNames.has(repoResource.name.toLowerCase())) {
          const newResource: Resource = {
            id: `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: repoResource.name,
            icon: repoResource.icon,
            iconType: repoResource.icon?.startsWith('http') ? 'image' : 'emoji',
            rarity: repoResource.rarity as Resource['rarity'],
            description: repoResource.description || '',
            gatherTime: repoResource.gather_time || 1000,
            spawnTiles: repoResource.spawn_tiles as Resource['spawnTiles'],
            spawnChance: Number(repoResource.spawn_chance),
            coinValue: repoResource.base_value,
            consumable: repoResource.consumable || false,
            healthGain: repoResource.health_gain || 0,
            canInflictDamage: repoResource.can_inflict_damage || false,
            damage: repoResource.damage || 0,
            recipes: repoResource.recipe ? [repoResource.recipe as unknown as import('@/types/game').Recipe] : [],
            isContainer: repoResource.is_container || false,
            isFloating: repoResource.is_floating || false,
            display: repoResource.display || false,
            placeable: repoResource.placeable || false,
            passable: repoResource.passable || false,
            hasLimitedLifetime: repoResource.has_limited_lifetime || false,
            lifetimeHours: repoResource.lifetime_hours ?? undefined,
            tileWidth: repoResource.tile_width ?? 1,
            tileHeight: repoResource.tile_height ?? 1,
            useLife: repoResource.use_life || false,
            lifeDecreasePerUse: repoResource.life_decrease_per_use ?? 100,
          };
          setSelectedResources(prev => [...prev, newResource]);
          existingNames.add(repoResource.name.toLowerCase());
          addedCount++;
        }
      }

      if (addedCount > 0) {
        toast.success(`Added ${addedCount} resources from repository`);
      } else {
        toast.info('All repository resources are already added');
      }
    } catch (error) {
      console.error('Failed to fetch repository resources:', error);
      toast.error('Failed to load repository resources');
    } finally {
      setAddingAllResources(false);
    }
  };

  const loading = authLoading || worldsLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-2">Your Worlds</h1>
            <p className="text-muted-foreground">Welcome, <span className="text-primary font-medium">{username || 'Player'}</span></p>
          </div>
          <button onClick={handleSignOut} className="btn flex items-center gap-2 text-sm">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => { setIsCreating(true); setIsJoining(false); }}
            className={cn(
              "flex-1 game-panel p-4 flex items-center justify-center gap-2 transition-colors",
              isCreating ? "bg-primary/20 border-primary" : "hover:bg-muted/50"
            )}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Create World</span>
          </button>
          <button
            onClick={() => { setIsJoining(true); setIsCreating(false); }}
            className={cn(
              "flex-1 game-panel p-4 flex items-center justify-center gap-2 transition-colors",
              isJoining ? "bg-primary/20 border-primary" : "hover:bg-muted/50"
            )}
          >
            <UserPlus className="w-5 h-5" />
            <span className="font-medium">Join World</span>
          </button>
          <button
            onClick={() => { setRepositoryOpen(true); setIsCreating(false); setIsJoining(false); }}
            className="game-panel p-4 flex items-center justify-center gap-2 transition-colors hover:bg-muted/50"
          >
            <Database className="w-5 h-5" />
            <span className="font-medium">Resources</span>
          </button>
        </div>

        {/* Create world form */}
        {isCreating && (
          <div className="game-panel p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-foreground">Create New World</h2>
            
            {/* Tabs */}
            <div className="flex gap-2 border-b border-border pb-2">
              <button
                onClick={() => setCreateTab('settings')}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-t transition-colors",
                  createTab === 'settings' 
                    ? "bg-primary/20 text-primary border-b-2 border-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Settings
              </button>
              <button
                onClick={() => setCreateTab('resources')}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-t transition-colors flex items-center gap-2",
                  createTab === 'resources' 
                    ? "bg-primary/20 text-primary border-b-2 border-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Database className="w-4 h-4" />
                Resources
                {selectedResources.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                    {selectedResources.length}
                  </span>
                )}
              </button>
            </div>
            
            {createTab === 'settings' && (
              <>
                <input
                  value={newWorldName}
                  onChange={(e) => setNewWorldName(e.target.value)}
                  placeholder="World name..."
                  className="input-field w-full"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handleCreateWorld()}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Width (min 12)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newWorldWidth}
                      onChange={(e) => setNewWorldWidth(e.target.value.replace(/[^0-9]/g, ''))}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (!val || val < 12) setNewWorldWidth('12');
                      }}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Height (min 12)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={newWorldHeight}
                      onChange={(e) => setNewWorldHeight(e.target.value.replace(/[^0-9]/g, ''))}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (!val || val < 12) setNewWorldHeight('12');
                      }}
                      className="input-field w-full"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total tiles: {((parseInt(newWorldWidth) || 500) * (parseInt(newWorldHeight) || 500)).toLocaleString()}
                </p>

                {/* World Features */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <h3 className="text-sm font-medium text-foreground">World Features</h3>
                  
                  {/* Enable Markets */}
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🏪</span>
                      <div>
                        <div className="font-medium text-sm">Enable Markets</div>
                        <div className="text-xs text-muted-foreground">Add marketplace buildings to the world</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setEnableMarkets(!enableMarkets)}
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
                        onClick={() => setEnableNpcs(!enableNpcs)}
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
                          value={npcCount}
                          onChange={(e) => {
                            const value = Math.min(Math.max(parseInt(e.target.value) || 1, 1), 12);
                            setNpcCount(value);
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
                        onClick={() => setEnableStrangers(!enableStrangers)}
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
                          <label className="text-sm text-muted-foreground">Population Density:</label>
                          <input
                            type="number"
                            min={0.001}
                            max={1}
                            step={0.01}
                            value={strangerDensity}
                            onChange={(e) => {
                              const value = Math.min(Math.max(parseFloat(e.target.value) || 0.02, 0.001), 1);
                              setStrangerDensity(value);
                            }}
                            className="input-field w-24 text-center"
                          />
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          Computed strangers: <span className="font-medium text-foreground">
                            {Math.floor((parseInt(newWorldWidth) || 500) * (parseInt(newWorldHeight) || 500) * strangerDensity)}
                          </span>
                        </div>
                        
                        {strangerDensity > 0.5 && (
                          <div className="flex items-center gap-2 p-2 bg-destructive/20 rounded text-sm text-destructive">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>High density may cause performance issues!</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            
            {createTab === 'resources' && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Add custom resources to your world from the community repository.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRepositoryOpen(true)}
                    className="btn btn-primary flex-1"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Open Resource Repository
                  </button>
                  <button
                    onClick={handleAddAllResources}
                    disabled={addingAllResources}
                    className="btn"
                    title="Add all resources from repository"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {addingAllResources ? 'Adding...' : 'Add All'}
                  </button>
                </div>
                {selectedResources.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Selected resources:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedResources.map(res => (
                        <div key={res.id} className="bg-muted/50 px-2 py-1 rounded text-sm flex items-center gap-2">
                          <ResourceIcon icon={res.icon} iconType={res.iconType} size="sm" />
                          <span>{res.name}</span>
                          <button 
                            onClick={() => setSelectedResources(prev => prev.filter(r => r.id !== res.id))}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-2">
              <button 
                onClick={handleCreateWorld} 
                disabled={isSubmitting}
                className="btn btn-primary flex-1"
              >
                {isSubmitting ? 'Creating...' : <><Plus className="w-4 h-4" /> Create World</>}
              </button>
              <button 
                onClick={() => { 
                  setIsCreating(false); 
                  setNewWorldName(''); 
                  setSelectedResources([]); 
                  setCreateTab('settings');
                  setEnableMarkets(false);
                  setEnableNpcs(false);
                  setNpcCount(4);
                  setEnableStrangers(false);
                  setStrangerDensity(0.02);
                }}
                className="btn"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Join world form */}
        {isJoining && (
          <div className="game-panel p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-foreground">Join a World</h2>
            <p className="text-sm text-muted-foreground">
              Enter the join code shared by the world owner to join their world.
            </p>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter join code..."
              className="input-field w-full text-center text-lg tracking-widest"
              autoFocus
              maxLength={8}
              onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handleJoinWorld()}
            />
            <div className="flex gap-2">
              <button 
                onClick={handleJoinWorld}
                disabled={isSubmitting}
                className="btn btn-primary flex-1"
              >
                {isSubmitting ? 'Joining...' : <><UserPlus className="w-4 h-4" /> Join World</>}
              </button>
              <button 
                onClick={() => { setIsJoining(false); setJoinCode(''); }}
                className="btn"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Worlds list */}
        {worlds.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground px-1">Your Worlds</h2>
            {worlds.map((world) => (
              <div
                key={world.id}
                onClick={() => handleEnterWorld(world.id)}
                className="game-panel p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors group"
              >
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center",
                  world.role === 'owner' ? "bg-amber-500/20" : "bg-primary/20"
                )}>
                  {world.role === 'owner' ? (
                    <Crown className="w-6 h-6 text-amber-500" />
                  ) : (
                    <Users className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{world.name}</h3>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded",
                      world.role === 'owner' 
                        ? "bg-amber-500/20 text-amber-400" 
                        : "bg-primary/20 text-primary"
                    )}>
                      {world.role}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(world.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                {world.role === 'owner' && (
                  <button
                    onClick={(e) => handleCopyCode(world.joinCode, e)}
                    className="btn btn-ghost p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    title={`Join code: ${world.joinCode}`}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  onClick={(e) => handleDeleteWorld(world.id, world.role, e)}
                  className={cn(
                    "btn btn-ghost p-2 opacity-0 group-hover:opacity-100 transition-opacity",
                    world.role === 'owner' ? "text-destructive hover:bg-destructive/10" : "hover:bg-muted"
                  )}
                  title={world.role === 'owner' ? 'Delete world' : 'Leave world'}
                >
                  {world.role === 'owner' ? <Trash2 className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                </button>
                
                <div className="btn btn-primary px-4">
                  <Play className="w-4 h-4" /> Enter
                </div>
              </div>
            ))}
          </div>
        )}

        {worlds.length === 0 && !isCreating && !isJoining && (
          <div className="text-center text-muted-foreground py-8">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No worlds yet. Create your first world or join an existing one!</p>
          </div>
        )}
      </div>
      
      <ResourceRepository
        isOpen={repositoryOpen}
        onClose={() => setRepositoryOpen(false)}
        onAddResource={(resource) => {
          setSelectedResources(prev => [...prev, resource]);
          toast.success(`Added "${resource.name}" to world resources`);
        }}
        existingResources={selectedResources}
        userId={user?.id}
        canAddToWorld={true}
      />
    </div>
  );
};

export default WorldsDashboard;