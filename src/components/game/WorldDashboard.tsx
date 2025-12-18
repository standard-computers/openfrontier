import { Resource, Recipe, InventorySlot, RARITY_COLORS } from '@/types/game';
import GamePanel from './GamePanel';
import Inventory from './Inventory';
import ResourceSlot from './ResourceSlot';
import { Package, Hammer, Sparkles } from 'lucide-react';

interface WorldDashboardProps {
  resources: Resource[];
  recipes: Recipe[];
  inventory: InventorySlot[];
}

const WorldDashboard = ({ resources, recipes, inventory }: WorldDashboardProps) => {
  const totalResources = resources.length;
  const totalRecipes = recipes.length;
  const inventoryCount = inventory.filter(s => s.resourceId).length;

  const stats = [
    { label: 'Resources', value: totalResources, icon: Package, color: 'text-primary' },
    { label: 'Recipes', value: totalRecipes, icon: Hammer, color: 'text-accent' },
    { label: 'In Inventory', value: inventoryCount, icon: Sparkles, color: 'text-game-gold' },
  ];

  const getResource = (id: string | null) => resources.find(r => r.id === id) || null;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <GamePanel key={stat.label}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 flex items-center justify-center bg-input pixel-border ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-pixel text-foreground pixel-text-shadow">{stat.value}</p>
                  <p className="text-[8px] font-pixel text-muted-foreground uppercase">{stat.label}</p>
                </div>
              </div>
            </GamePanel>
          );
        })}
      </div>

      {/* Inventory */}
      <Inventory slots={inventory} resources={resources} />

      {/* Quick Access - Resources & Recipes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GamePanel title="Available Resources">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {resources.slice(0, 12).map((resource) => (
              <div
                key={resource.id}
                className="resource-slot flex-col gap-1 group"
                title={resource.description}
              >
                <span className="text-xl group-hover:animate-bounce-pixel">{resource.icon}</span>
                <span className={`text-[6px] font-pixel ${RARITY_COLORS[resource.rarity]}`}>
                  {resource.name.slice(0, 6)}
                </span>
              </div>
            ))}
            {resources.length > 12 && (
              <div className="resource-slot">
                <span className="text-[8px] font-pixel text-muted-foreground">
                  +{resources.length - 12}
                </span>
              </div>
            )}
          </div>
        </GamePanel>

        <GamePanel title="Available Recipes">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recipes.slice(0, 5).map((recipe) => {
              const outputResource = getResource(recipe.outputResourceId);
              return (
                <div
                  key={recipe.id}
                  className="flex items-center gap-2 p-2 bg-input pixel-border hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-1 flex-1">
                    {recipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-center">
                        <span className="text-lg">{getResource(ing.resourceId)?.icon || '?'}</span>
                        <span className="text-[8px] font-pixel text-muted-foreground">x{ing.quantity}</span>
                        {i < recipe.ingredients.length - 1 && (
                          <span className="text-muted-foreground mx-1">+</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="text-accent">→</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xl animate-pulse-glow">{outputResource?.icon || '?'}</span>
                    <span className="text-[8px] font-pixel">x{recipe.outputQuantity}</span>
                  </div>
                </div>
              );
            })}
            {recipes.length === 0 && (
              <p className="text-[10px] font-pixel text-muted-foreground text-center py-4">
                No recipes yet. Create one!
              </p>
            )}
          </div>
        </GamePanel>
      </div>
    </div>
  );
};

export default WorldDashboard;
