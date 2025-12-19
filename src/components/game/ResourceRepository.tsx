import { useState, useEffect } from 'react';
import { X, Plus, Download, Search, Database, Upload } from 'lucide-react';
import { Resource, RARITY_COLORS } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ResourceIcon from './ResourceIcon';
import ResourceEditorModal from './ResourceEditorModal';

interface RepositoryResource {
  id: string;
  name: string;
  icon: string;
  icon_type: string;
  rarity: string;
  description: string;
  gather_time: number;
  spawn_tiles: string[];
  spawn_chance: number;
  coin_value: number;
  consumable: boolean;
  health_gain: number;
  can_inflict_damage: boolean;
  damage: number;
  recipes: any[];
  downloads: number;
  created_by: string;
}

interface ResourceRepositoryProps {
  isOpen: boolean;
  onClose: () => void;
  onAddResource: (resource: Resource) => void;
  existingResources: Resource[];
  userId?: string;
}

const ResourceRepository = ({
  isOpen,
  onClose,
  onAddResource,
  existingResources,
  userId,
}: ResourceRepositoryProps) => {
  const [resources, setResources] = useState<RepositoryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newResource, setNewResource] = useState<Resource | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRepositoryResources();
    }
  }, [isOpen]);

  const fetchRepositoryResources = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resource_marketplace' as any)
        .select('*')
        .order('downloads', { ascending: false });

      if (error) throw error;
      setResources((data as unknown as RepositoryResource[]) || []);
    } catch (error) {
      console.error('Failed to fetch repository resources:', error);
      toast.error('Failed to load repository');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWorld = async (repoResource: RepositoryResource) => {
    // Check if resource with same name already exists
    if (existingResources.some(r => r.name.toLowerCase() === repoResource.name.toLowerCase())) {
      toast.error('A resource with this name already exists in your world');
      return;
    }

    const newResource: Resource = {
      id: `res-${Date.now()}`,
      name: repoResource.name,
      icon: repoResource.icon,
      iconType: repoResource.icon_type as 'emoji' | 'image',
      rarity: repoResource.rarity as Resource['rarity'],
      description: repoResource.description || '',
      gatherTime: repoResource.gather_time,
      spawnTiles: repoResource.spawn_tiles as Resource['spawnTiles'],
      spawnChance: Number(repoResource.spawn_chance),
      coinValue: repoResource.coin_value,
      consumable: repoResource.consumable,
      healthGain: repoResource.health_gain,
      canInflictDamage: repoResource.can_inflict_damage,
      damage: repoResource.damage,
      recipes: repoResource.recipes || [],
    };

    onAddResource(newResource);

    // Increment download count
    await supabase
      .from('resource_marketplace' as any)
      .update({ downloads: (repoResource.downloads || 0) + 1 })
      .eq('id', repoResource.id);

    toast.success(`Added "${repoResource.name}" to your world`);
  };

  const handleShareResource = async (resource: Resource) => {
    if (!userId) {
      toast.error('You must be logged in to share resources');
      return;
    }

    try {
      const { error } = await supabase.from('resource_marketplace' as any).insert({
        name: resource.name,
        icon: resource.icon,
        icon_type: resource.iconType || 'emoji',
        rarity: resource.rarity,
        description: resource.description,
        gather_time: resource.gatherTime,
        spawn_tiles: resource.spawnTiles,
        spawn_chance: resource.spawnChance,
        coin_value: resource.coinValue,
        consumable: resource.consumable || false,
        health_gain: resource.healthGain || 0,
        can_inflict_damage: resource.canInflictDamage || false,
        damage: resource.damage || 0,
        recipes: resource.recipes || [],
        created_by: userId,
      });

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
      spawnTiles: ['grass'],
      spawnChance: 0.1,
      coinValue: 10,
      consumable: false,
      healthGain: 0,
      canInflictDamage: false,
      damage: 0,
      recipes: [],
    });
    setShowCreateModal(true);
  };

  const handleSaveNewResource = async (resource: Resource) => {
    if (!userId) {
      toast.error('You must be logged in to create resources');
      return;
    }

    try {
      const { error } = await supabase.from('resource_marketplace' as any).insert({
        name: resource.name,
        icon: resource.icon,
        icon_type: resource.iconType || 'emoji',
        rarity: resource.rarity,
        description: resource.description,
        gather_time: resource.gatherTime,
        spawn_tiles: resource.spawnTiles,
        spawn_chance: resource.spawnChance,
        coin_value: resource.coinValue,
        consumable: resource.consumable || false,
        health_gain: resource.healthGain || 0,
        can_inflict_damage: resource.canInflictDamage || false,
        damage: resource.damage || 0,
        recipes: resource.recipes || [],
        created_by: userId,
      });

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

  const filteredResources = resources.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRarity = filterRarity === 'all' || r.rarity === filterRarity;
    return matchesSearch && matchesRarity;
  });

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="game-panel w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Resource Repository</h2>
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
              <select
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value)}
                className="input-field"
              >
                <option value="all">All Rarities</option>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>

            {/* Share your resources section */}
            {existingResources.length > 0 && (
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
                {filteredResources.map((resource) => (
                  <div
                    key={resource.id}
                    className="game-panel p-4 space-y-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <ResourceIcon icon={resource.icon} iconType={resource.icon_type as 'emoji' | 'image'} size="lg" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{resource.name}</h3>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={RARITY_COLORS[resource.rarity as keyof typeof RARITY_COLORS]}>
                            {resource.rarity}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{resource.coin_value} coins</span>
                        </div>
                      </div>
                    </div>

                    {resource.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{resource.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Download className="w-3 h-3" /> {resource.downloads || 0}
                      </span>
                      <button
                        onClick={() => handleAddToWorld(resource)}
                        className="btn btn-primary text-xs py-1 px-3"
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add to World
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && newResource && (
        <ResourceEditorModal
          resource={newResource}
          allResources={[]}
          isNew={true}
          onSave={handleSaveNewResource}
          onDelete={() => {}}
          onClose={() => {
            setShowCreateModal(false);
            setNewResource(null);
          }}
        />
      )}
    </>
  );
};

export default ResourceRepository;
