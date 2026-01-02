import { useState, useEffect } from 'react';
import { X, Plus, Download, Search, Database, Upload, Edit2, Filter, Tag, Check } from 'lucide-react';
import { Resource, RARITY_COLORS, TileType } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ResourceIcon from './ResourceIcon';
import ResourceEditorModal from './ResourceEditorModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { RepositoryResource, repositoryToGameResource, gameResourceToRepository } from '@/utils/resourceConverter';

// RepositoryResource is now imported from resourceConverter

interface ResourceRepositoryProps {
  isOpen: boolean;
  onClose: () => void;
  onAddResource: (resource: Resource) => void;
  existingResources: Resource[];
  userId?: string;
  canAddToWorld?: boolean;
}

const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const ResourceRepository = ({
  isOpen,
  onClose,
  onAddResource,
  existingResources,
  userId,
  canAddToWorld = false,
}: ResourceRepositoryProps) => {
  const [resources, setResources] = useState<RepositoryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRarities, setFilterRarities] = useState<string[]>([]);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newResource, setNewResource] = useState<Resource | null>(null);
  const [editingRepoResource, setEditingRepoResource] = useState<RepositoryResource | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchRepositoryResources();
    }
  }, [isOpen]);

  const fetchRepositoryResources = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resource_marketplace')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      const repoResources = (data as RepositoryResource[]) || [];
      setResources(repoResources);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(repoResources.map(r => r.category).filter(Boolean))] as string[];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Failed to fetch repository resources:', error);
      toast.error('Failed to load repository');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWorld = async (repoResource: RepositoryResource) => {
    // Check if resource already exists in world by ID (same resource from repo)
    if (existingResources.some(r => r.id === repoResource.id)) {
      toast.error('This resource is already in your world');
      return;
    }

    // Convert using the shared utility - preserves the repository ID
    const newResource = repositoryToGameResource(repoResource);

    onAddResource(newResource);

    // Increment download count
    await supabase
      .from('resource_marketplace')
      .update({ download_count: (repoResource.download_count || 0) + 1 })
      .eq('id', repoResource.id);

    toast.success(`Added "${repoResource.name}" to your world`);
  };

  const handleShareResource = async (resource: Resource) => {
    if (!userId) {
      toast.error('You must be logged in to share resources');
      return;
    }

    try {
      const repoData = gameResourceToRepository(resource, userId);
      const { error } = await supabase.from('resource_marketplace').insert([repoData]);

      if (error) throw error;
      toast.success(`Added "${resource.name}" to the repository!`);
      fetchRepositoryResources();
    } catch (error) {
      console.error('Failed to share resource:', error);
      toast.error('Failed to add resource to repository');
    }
  };

  const handleCreateNew = () => {
    setNewResource({
      id: `new-${Date.now()}`,
      name: 'New Resource',
      icon: '🔮',
      iconType: 'emoji',
      rarity: 'common',
      description: '',
      gatherTime: 1000,
      spawnTiles: [],
      spawnChance: 0,
      coinValue: 10,
      consumable: false,
      healthGain: 0,
      canInflictDamage: false,
      damage: 0,
      recipes: [],
      isContainer: false,
      isFloating: false,
      tileWidth: 0,
      tileHeight: 0,
      placeable: true,
      passable: true,
      destructible: true,
      maxLife: 10,
    });
    setShowCreateModal(true);
  };

  const handleSaveNewResource = async (resource: Resource) => {
    if (!userId) {
      toast.error('You must be logged in to create resources');
      return;
    }

    try {
      const repoData = gameResourceToRepository(resource, userId);
      const { error } = await supabase.from('resource_marketplace').insert([repoData]);

      if (error) throw error;
      toast.success(`Created "${resource.name}" in the repository!`);
      setShowCreateModal(false);
      setNewResource(null);
      fetchRepositoryResources();
    } catch (error) {
      console.error('Failed to create resource:', error);
      toast.error('Failed to create resource');
    }
  };

  const handleEditResource = (repoResource: RepositoryResource) => {
    if (repoResource.created_by !== userId) {
      toast.error('You can only edit resources you created');
      return;
    }
    setEditingRepoResource(repoResource);
  };

  const handleUpdateResource = async (resource: Resource) => {
    if (!editingRepoResource || !userId) return;

    try {
      const repoData = gameResourceToRepository(resource, userId);
      const { error } = await supabase
        .from('resource_marketplace')
        .update(repoData)
        .eq('id', editingRepoResource.id);

      if (error) throw error;
      toast.success(`Updated "${resource.name}"`);
      setEditingRepoResource(null);
      fetchRepositoryResources();
    } catch (error) {
      console.error('Failed to update resource:', error);
      toast.error('Failed to update resource');
    }
  };

  const handleDeleteRepoResource = async (resourceId: string) => {
    if (!userId) {
      toast.error('You must be logged in to delete resources');
      return;
    }

    try {
      const { error } = await supabase
        .from('resource_marketplace')
        .delete()
        .eq('id', resourceId);

      if (error) throw error;
      toast.success('Resource deleted');
      setEditingRepoResource(null);
      fetchRepositoryResources();
    } catch (error) {
      console.error('Failed to delete resource:', error);
      toast.error('Failed to delete resource');
    }
  };

  const toggleRarityFilter = (rarity: string) => {
    setFilterRarities(prev => 
      prev.includes(rarity) ? prev.filter(r => r !== rarity) : [...prev, rarity]
    );
  };

  const toggleCategoryFilter = (category: string) => {
    setFilterCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const activeFilterCount = filterRarities.length + filterCategories.length;

  const filteredResources = resources.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRarity = filterRarities.length === 0 || filterRarities.includes(r.rarity);
    const matchesCategory = filterCategories.length === 0 || (r.category && filterCategories.includes(r.category));
    return matchesSearch && matchesRarity && matchesCategory;
  });

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="game-panel w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Resource Repository</h2>
              </div>
              <span className="text-sm text-muted-foreground">{resources.length} resources</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleCreateNew} className="btn btn-primary text-sm">
                <Plus className="w-4 h-4 mr-1" /> Create New
              </button>
              <button onClick={onClose} className="btn btn-ghost p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search resources..."
                  className="input-field w-full pl-10"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="btn btn-ghost p-2 relative">
                    <Filter className="w-5 h-5" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end">
                  <div className="space-y-4">
                    {/* Rarity Filters */}
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Rarity</h4>
                      <div className="flex flex-wrap gap-1">
                        {RARITIES.map(rarity => (
                          <button
                            key={rarity}
                            onClick={() => toggleRarityFilter(rarity)}
                            className={cn(
                              'px-2 py-1 text-xs rounded capitalize flex items-center gap-1',
                              filterRarities.includes(rarity) 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted hover:bg-muted/80'
                            )}
                          >
                            {filterRarities.includes(rarity) && <Check className="w-3 h-3" />}
                            {rarity}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Category Filters */}
                    {categories.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">Category</h4>
                        <div className="flex flex-wrap gap-1">
                          {categories.map(category => (
                            <button
                              key={category}
                              onClick={() => toggleCategoryFilter(category)}
                              className={cn(
                                'px-2 py-1 text-xs rounded flex items-center gap-1',
                                filterCategories.includes(category)
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted hover:bg-muted/80'
                              )}
                            >
                              {filterCategories.includes(category) && <Check className="w-3 h-3" />}
                              <Tag className="w-3 h-3" />
                              {category}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Clear Filters */}
                    {activeFilterCount > 0 && (
                      <button
                        onClick={() => {
                          setFilterRarities([]);
                          setFilterCategories([]);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Share your resources section */}
            {canAddToWorld && existingResources.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Share your resources:</span>
                {existingResources.slice(0, 5).map(res => (
                  <button
                    key={res.id}
                    onClick={() => handleShareResource(res)}
                    className="btn btn-ghost text-xs flex items-center gap-1 py-1 px-2"
                    title={`Share "${res.name}" to repository`}
                  >
                    <ResourceIcon icon={res.icon} iconType={res.iconType} size="sm" />
                    <Upload className="w-3 h-3" />
                  </button>
                ))}
                {existingResources.length > 5 && (
                  <span className="text-xs text-muted-foreground">+{existingResources.length - 5} more</span>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 overflow-auto">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading repository...</div>
            ) : filteredResources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No resources found</p>
                <p className="text-sm">Be the first to create a resource!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredResources.map((resource) => {
                  const isImageIcon = resource.icon?.startsWith('http');
                  const isCreator = resource.created_by === userId;
                  return (
                  <div
                    key={resource.id}
                    onClick={() => isCreator && handleEditResource(resource)}
                    className={`game-panel p-4 space-y-3 transition-colors ${isCreator ? 'hover:bg-muted/50 cursor-pointer' : 'hover:bg-muted/30'}`}
                    title={isCreator ? 'Click to edit' : undefined}
                  >
                    <div className="flex items-start gap-3">
                      <ResourceIcon icon={resource.icon} iconType={isImageIcon ? 'image' : 'emoji'} size="lg" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{resource.name}</h3>
                          {isCreator && <Edit2 className="w-3 h-3 text-muted-foreground" />}
                        </div>
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span className={RARITY_COLORS[resource.rarity as keyof typeof RARITY_COLORS]}>
                            {resource.rarity}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{resource.base_value} coins</span>
                          {resource.category && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground flex items-center gap-0.5">
                                <Tag className="w-2.5 h-2.5" />
                                {resource.category}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {resource.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{resource.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Download className="w-3 h-3" /> {resource.download_count || 0}
                      </span>
                      {canAddToWorld && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToWorld(resource);
                          }}
                          className="btn btn-primary text-xs py-1 px-3"
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add to World
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && newResource && (
        <ResourceEditorModal
          resource={newResource}
          allResources={resources.map(r => ({
            id: r.id,
            name: r.name,
            icon: r.icon,
            iconType: r.icon?.startsWith('http') ? 'image' as const : 'emoji' as const,
            rarity: r.rarity as Resource['rarity'],
            description: r.description || '',
            gatherTime: r.gather_time || 1000,
            spawnTiles: r.spawn_tiles as Resource['spawnTiles'],
            spawnChance: Number(r.spawn_chance),
            coinValue: r.base_value,
            consumable: r.consumable || false,
            healthGain: r.health_gain || 0,
            canInflictDamage: r.can_inflict_damage || false,
            damage: r.damage || 0,
            recipes: r.recipe ? [r.recipe] : [],
            isContainer: r.is_container || false,
            isFloating: r.is_floating || false,
            canFloatOnWater: r.can_float_on_water || false,
            holdsPlayer: r.holds_player || false,
            display: r.display || false,
            placeable: r.placeable || false,
            passable: r.passable || false,
            category: r.category || undefined,
            hasLimitedLifetime: r.has_limited_lifetime || false,
            lifetimeHours: r.lifetime_hours ?? undefined,
            tileWidth: r.tile_width ?? 1,
            tileHeight: r.tile_height ?? 1,
            useLife: r.use_life || false,
            lifeDecreasePerUse: r.life_decrease_per_use ?? 100,
            destructible: r.destructible || false,
            maxLife: r.max_life ?? 100,
            destroyedBy: r.destroyed_by || undefined,
            produceTile: r.produce_tile || false,
            produceTileType: r.produce_tile_type as TileType | undefined,
            producesResource: r.produces_resource || undefined,
            producesAmount: r.produces_amount ?? 1,
            producesIntervalHours: r.produces_interval_hours ?? 24,
            emitsLight: r.emits_light || false,
            givesXp: r.gives_xp || false,
            xpAmount: r.xp_amount ?? 0,
          }))}
          categories={categories}
          isNew={true}
          onSave={handleSaveNewResource}
          onDelete={() => {}}
          onClose={() => {
            setShowCreateModal(false);
            setNewResource(null);
          }}
        />
      )}

      {editingRepoResource && (
        <ResourceEditorModal
          resource={{
            id: editingRepoResource.id,
            name: editingRepoResource.name,
            icon: editingRepoResource.icon,
            iconType: editingRepoResource.icon?.startsWith('http') ? 'image' : 'emoji',
            rarity: editingRepoResource.rarity as Resource['rarity'],
            description: editingRepoResource.description || '',
            gatherTime: editingRepoResource.gather_time || 1000,
            spawnTiles: editingRepoResource.spawn_tiles as Resource['spawnTiles'],
            spawnChance: Number(editingRepoResource.spawn_chance),
            coinValue: editingRepoResource.base_value,
            consumable: editingRepoResource.consumable || false,
            healthGain: editingRepoResource.health_gain || 0,
            canInflictDamage: editingRepoResource.can_inflict_damage || false,
            damage: editingRepoResource.damage || 0,
            recipes: editingRepoResource.recipe ? [editingRepoResource.recipe] : [],
            isContainer: editingRepoResource.is_container || false,
            isFloating: editingRepoResource.is_floating || false,
            canFloatOnWater: editingRepoResource.can_float_on_water || false,
            holdsPlayer: editingRepoResource.holds_player || false,
            display: editingRepoResource.display || false,
            placeable: editingRepoResource.placeable || false,
            passable: editingRepoResource.passable || false,
            category: editingRepoResource.category || undefined,
            hasLimitedLifetime: editingRepoResource.has_limited_lifetime || false,
            lifetimeHours: editingRepoResource.lifetime_hours ?? undefined,
            tileWidth: editingRepoResource.tile_width ?? 1,
            tileHeight: editingRepoResource.tile_height ?? 1,
            useLife: editingRepoResource.use_life || false,
            lifeDecreasePerUse: editingRepoResource.life_decrease_per_use ?? 100,
            destructible: editingRepoResource.destructible || false,
            maxLife: editingRepoResource.max_life ?? 100,
            destroyedBy: editingRepoResource.destroyed_by || undefined,
            produceTile: editingRepoResource.produce_tile || false,
            produceTileType: editingRepoResource.produce_tile_type as Resource['spawnTiles'][number] | undefined,
            producesResource: editingRepoResource.produces_resource || undefined,
            producesAmount: editingRepoResource.produces_amount ?? 1,
            producesIntervalHours: editingRepoResource.produces_interval_hours ?? 24,
            emitsLight: editingRepoResource.emits_light || false,
            givesXp: editingRepoResource.gives_xp || false,
            xpAmount: editingRepoResource.xp_amount ?? 0,
          }}
          allResources={resources.map(r => ({
            id: r.id,
            name: r.name,
            icon: r.icon,
            iconType: r.icon?.startsWith('http') ? 'image' as const : 'emoji' as const,
            rarity: r.rarity as Resource['rarity'],
            description: r.description || '',
            gatherTime: r.gather_time || 1000,
            spawnTiles: r.spawn_tiles as Resource['spawnTiles'],
            spawnChance: Number(r.spawn_chance),
            coinValue: r.base_value,
            consumable: r.consumable || false,
            healthGain: r.health_gain || 0,
            canInflictDamage: r.can_inflict_damage || false,
            damage: r.damage || 0,
            recipes: r.recipe ? [r.recipe] : [],
            isContainer: r.is_container || false,
            isFloating: r.is_floating || false,
            canFloatOnWater: r.can_float_on_water || false,
            holdsPlayer: r.holds_player || false,
            display: r.display || false,
            placeable: r.placeable || false,
            passable: r.passable || false,
            category: r.category || undefined,
            hasLimitedLifetime: r.has_limited_lifetime || false,
            lifetimeHours: r.lifetime_hours ?? undefined,
            tileWidth: r.tile_width ?? 1,
            tileHeight: r.tile_height ?? 1,
            useLife: r.use_life || false,
            lifeDecreasePerUse: r.life_decrease_per_use ?? 100,
            destructible: r.destructible || false,
            maxLife: r.max_life ?? 100,
            destroyedBy: r.destroyed_by || undefined,
            produceTile: r.produce_tile || false,
            produceTileType: r.produce_tile_type as Resource['spawnTiles'][number] | undefined,
            producesResource: r.produces_resource || undefined,
            producesAmount: r.produces_amount ?? 1,
            producesIntervalHours: r.produces_interval_hours ?? 24,
            emitsLight: r.emits_light || false,
            givesXp: r.gives_xp || false,
            xpAmount: r.xp_amount ?? 0,
          }))}
          categories={categories}
          isNew={false}
          onSave={handleUpdateResource}
          onDelete={() => handleDeleteRepoResource(editingRepoResource.id)}
          onClose={() => setEditingRepoResource(null)}
        />
      )}
    </>
  );
};

export default ResourceRepository;
