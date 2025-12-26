import { useState } from 'react';
import { X, Hammer, ChevronRight } from 'lucide-react';
import { Resource, Recipe, InventorySlot, RARITY_COLORS } from '@/types/game';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ResourceIcon from './ResourceIcon';

interface CraftingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  resources: Resource[];
  inventory: InventorySlot[];
  onCraft: (resourceId: string, recipeId: string) => { success: boolean; message: string };
}

const CraftingPanel = ({ isOpen, onClose, resources, inventory, onCraft }: CraftingPanelProps) => {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  if (!isOpen) return null;

  const getResource = (id: string) => resources.find(r => r.id === id);
  
  const getInventoryCount = (resourceId: string) => {
    return inventory
      .filter(s => s.resourceId === resourceId)
      .reduce((sum, s) => sum + s.quantity, 0);
  };

  const canCraft = (recipe: Recipe) => {
    return recipe.ingredients.every(ing => getInventoryCount(ing.resourceId) >= ing.quantity);
  };

  const craftableResources = resources.filter(r => r.recipes && r.recipes.length > 0);

  const handleCraft = (resource: Resource, recipe: Recipe) => {
    const result = onCraft(resource.id, recipe.id);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="game-panel w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Hammer className="w-5 h-5" />
            <h2 className="font-semibold">Crafting</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {craftableResources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Hammer className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No recipes available</p>
              <p className="text-sm">Add recipes to resources in World Config</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {craftableResources.map(resource => (
                <div key={resource.id} className="bg-secondary/30 rounded-lg overflow-hidden">
                  {/* Resource header */}
                  <div className="flex items-center gap-3 p-3 border-b border-border/50">
                    <ResourceIcon icon={resource.icon} iconType={resource.iconType} size="lg" />
                    <div className="flex-1">
                      <div className="font-medium">{resource.name}</div>
                      <div className={cn('text-xs', RARITY_COLORS[resource.rarity])}>{resource.rarity}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Owned: {getInventoryCount(resource.id)}
                    </div>
                  </div>

                  {/* Recipes */}
                  <div className="p-2 space-y-2">
                    {resource.recipes?.map(recipe => {
                      const craftable = canCraft(recipe);
                      return (
                        <div 
                          key={recipe.id}
                          className={cn(
                            'flex items-center gap-3 p-2 rounded',
                            craftable ? 'bg-primary/10' : 'bg-secondary/50 opacity-60'
                          )}
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium mb-1">{recipe.name}</div>
                            <div className="flex items-center gap-1 flex-wrap">
                              {recipe.ingredients.map((ing, i) => {
                                const r = getResource(ing.resourceId);
                                const owned = getInventoryCount(ing.resourceId);
                                const hasEnough = owned >= ing.quantity;
                                return (
                                  <span 
                                    key={i} 
                                    className={cn(
                                      'flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded',
                                      hasEnough ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                    )}
                                  >
                                    {i > 0 && <span className="text-muted-foreground mr-1">+</span>}
                                    {r && <ResourceIcon icon={r.icon} iconType={r.iconType} size="sm" />}
                                    <span>{owned}/{ing.quantity}</span>
                                  </span>
                                );
                              })}
                              <ChevronRight className="w-3 h-3 text-muted-foreground mx-1" />
                              <span className="flex items-center gap-0.5 text-xs bg-primary/20 px-1.5 py-0.5 rounded">
                                <ResourceIcon icon={resource.icon} iconType={resource.iconType} size="sm" />
                                <span>×{recipe.outputQuantity}</span>
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCraft(resource, recipe)}
                            disabled={!craftable}
                            className={cn(
                              'btn text-sm px-4',
                              craftable ? 'btn-primary' : 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            Craft
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CraftingPanel;
