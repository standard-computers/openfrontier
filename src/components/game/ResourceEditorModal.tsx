import { useState } from 'react';
import { Resource, Recipe, RecipeIngredient, TileType, TILE_TYPES, RARITY_COLORS } from '@/types/game';
import { X, Save, Trash2, Plus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ResourceEditorModalProps {
  resource: Resource;
  allResources: Resource[];
  isNew: boolean;
  onSave: (resource: Resource) => void;
  onDelete?: () => void;
  onClose: () => void;
}

const ICONS = ['🪵', '🪨', '⛏️', '✨', '💎', '🔶', '🌿', '💧', '🔥', '❄️', '⚡', '🍎', '🌾', '🐟', '🥚', '🧵', '⚙️', '💀', '🍄', '🌸', '🦴', '🪶', '🌵', '🐚', '🍯', '🧲', '🔩', '🥇', '🪢'];

const ResourceEditorModal = ({
  resource,
  allResources,
  isNew,
  onSave,
  onDelete,
  onClose,
}: ResourceEditorModalProps) => {
  const [activeTab, setActiveTab] = useState<'general' | 'recipes'>('general');
  const [form, setForm] = useState<Resource>({ ...resource });
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isNewRecipe, setIsNewRecipe] = useState(false);

  const getResource = (id: string) => allResources.find(r => r.id === id);

  const toggleSpawnTile = (tileType: TileType) => {
    const tiles = form.spawnTiles.includes(tileType)
      ? form.spawnTiles.filter(t => t !== tileType)
      : [...form.spawnTiles, tileType];
    setForm({ ...form, spawnTiles: tiles });
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Resource name is required');
      return;
    }
    onSave(form);
  };

  const handleDelete = () => {
    if (onDelete && confirm('Delete this resource? This cannot be undone.')) {
      onDelete();
    }
  };

  // Recipe handlers
  const handleNewRecipe = () => {
    setEditingRecipe({
      id: `recipe-${Date.now()}`,
      name: `${form.name} Recipe`,
      ingredients: [],
      outputQuantity: 1,
    });
    setIsNewRecipe(true);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe({ ...recipe });
    setIsNewRecipe(false);
  };

  const handleSaveRecipe = () => {
    if (!editingRecipe) return;
    if (editingRecipe.ingredients.length === 0) {
      toast.error('Add at least one ingredient');
      return;
    }

    const recipes = form.recipes || [];
    if (isNewRecipe) {
      setForm({ ...form, recipes: [...recipes, editingRecipe] });
    } else {
      setForm({ ...form, recipes: recipes.map(r => r.id === editingRecipe.id ? editingRecipe : r) });
    }
    setEditingRecipe(null);
    setIsNewRecipe(false);
  };

  const handleDeleteRecipe = (recipeId: string) => {
    const recipes = form.recipes || [];
    setForm({ ...form, recipes: recipes.filter(r => r.id !== recipeId) });
  };

  const handleAddIngredient = () => {
    if (!editingRecipe) return;
    const available = allResources.find(r => 
      r.id !== form.id && 
      !editingRecipe.ingredients.some(i => i.resourceId === r.id)
    );
    if (available) {
      setEditingRecipe({
        ...editingRecipe,
        ingredients: [...editingRecipe.ingredients, { resourceId: available.id, quantity: 1 }],
      });
    }
  };

  const handleUpdateIngredient = (index: number, updates: Partial<RecipeIngredient>) => {
    if (!editingRecipe) return;
    const newIngredients = [...editingRecipe.ingredients];
    newIngredients[index] = { ...newIngredients[index], ...updates };
    setEditingRecipe({ ...editingRecipe, ingredients: newIngredients });
  };

  const handleRemoveIngredient = (index: number) => {
    if (!editingRecipe) return;
    setEditingRecipe({
      ...editingRecipe,
      ingredients: editingRecipe.ingredients.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="game-panel w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xl">{form.icon}</span>
            <h2 className="font-semibold">{isNew ? 'New Resource' : form.name}</h2>
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
              'flex-1 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'general' 
                ? 'border-b-2 border-primary text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'recipes' 
                ? 'border-b-2 border-primary text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Recipes {form.recipes?.length ? `(${form.recipes.length})` : ''}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field w-full"
                  placeholder="Resource name"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Icon</label>
                <div className="flex flex-wrap gap-1">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setForm({ ...form, icon })}
                      className={cn(
                        'w-8 h-8 flex items-center justify-center rounded hover:bg-muted',
                        form.icon === icon && 'bg-primary'
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Rarity</label>
                  <select
                    value={form.rarity}
                    onChange={(e) => setForm({ ...form, rarity: e.target.value as Resource['rarity'] })}
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
                  <label className="text-xs text-muted-foreground mb-1 block">Coin Value</label>
                  <input
                    type="number"
                    min={1}
                    value={form.coinValue}
                    onChange={(e) => setForm({ ...form, coinValue: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="input-field w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Gather Time (seconds)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.gatherTime}
                    onChange={(e) => setForm({ ...form, gatherTime: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Spawn Chance ({Math.round(form.spawnChance * 100)}%)</label>
                  <input
                    type="range"
                    min={0}
                    max={0.5}
                    step={0.01}
                    value={form.spawnChance}
                    onChange={(e) => setForm({ ...form, spawnChance: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Spawns On Tiles</label>
                <div className="flex flex-wrap gap-1">
                  {TILE_TYPES.filter(t => t.walkable).map((tile) => (
                    <button
                      key={tile.type}
                      onClick={() => toggleSpawnTile(tile.type)}
                      className={cn(
                        'px-2 py-1 text-xs rounded flex items-center gap-1',
                        form.spawnTiles.includes(tile.type) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}
                    >
                      <span className={cn('w-3 h-3 rounded-sm', tile.color)} />
                      {tile.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field w-full"
                  placeholder="Brief description"
                />
              </div>

              {/* Health & Damage Properties */}
              <div className="border-t border-border pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Health & Damage Properties</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="consumable"
                      checked={form.consumable || false}
                      onChange={(e) => setForm({ ...form, consumable: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="consumable" className="text-sm">Consumable</label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="canInflictDamage"
                      checked={form.canInflictDamage || false}
                      onChange={(e) => setForm({ ...form, canInflictDamage: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="canInflictDamage" className="text-sm">Inflict Damage</label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Health Gain {form.consumable ? '(on consume)' : '(per day)'}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.healthGain || 0}
                      onChange={(e) => setForm({ ...form, healthGain: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="input-field w-full"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {form.consumable 
                        ? 'Health gained when consumed' 
                        : 'Health gained every world day while in inventory'}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Damage Amount</label>
                    <input
                      type="number"
                      min={0}
                      value={form.damage || 0}
                      onChange={(e) => setForm({ ...form, damage: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="input-field w-full"
                      disabled={!form.canInflictDamage}
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Damage dealt when triggered
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recipes' && (
            <div className="space-y-4">
              {editingRecipe ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Recipe Name</label>
                    <input
                      value={editingRecipe.name}
                      onChange={(e) => setEditingRecipe({ ...editingRecipe, name: e.target.value })}
                      className="input-field w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Output Quantity</label>
                    <input
                      type="number"
                      min={1}
                      value={editingRecipe.outputQuantity}
                      onChange={(e) => setEditingRecipe({ ...editingRecipe, outputQuantity: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="input-field w-20"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-muted-foreground">Ingredients</label>
                      <button onClick={handleAddIngredient} className="btn btn-accent text-xs">
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </button>
                    </div>

                    {editingRecipe.ingredients.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-4 bg-secondary/30 rounded">
                        No ingredients added
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {editingRecipe.ingredients.map((ingredient, index) => (
                          <div key={index} className="flex items-center gap-2 bg-secondary/30 p-2 rounded">
                            <select
                              value={ingredient.resourceId}
                              onChange={(e) => handleUpdateIngredient(index, { resourceId: e.target.value })}
                              className="input-field flex-1"
                            >
                              {allResources
                                .filter(r => r.id !== form.id)
                                .map(r => (
                                  <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
                                ))}
                            </select>
                            <span className="text-muted-foreground">×</span>
                            <input
                              type="number"
                              min={1}
                              value={ingredient.quantity}
                              onChange={(e) => handleUpdateIngredient(index, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="input-field w-16 text-center"
                            />
                            <button 
                              onClick={() => handleRemoveIngredient(index)}
                              className="btn btn-ghost p-1 text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  {editingRecipe.ingredients.length > 0 && (
                    <div className="bg-secondary/50 rounded p-3">
                      <div className="text-xs text-muted-foreground mb-2">Preview</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {editingRecipe.ingredients.map((ing, i) => {
                          const r = getResource(ing.resourceId);
                          return (
                            <span key={i} className="flex items-center gap-1">
                              {i > 0 && <span className="text-muted-foreground">+</span>}
                              <span>{r?.icon}</span>
                              <span className="text-sm">×{ing.quantity}</span>
                            </span>
                          );
                        })}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <span>{form.icon}</span>
                        <span className="text-sm">×{editingRecipe.outputQuantity}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={handleSaveRecipe} className="btn btn-primary flex-1">
                      Save Recipe
                    </button>
                    <button onClick={() => { setEditingRecipe(null); setIsNewRecipe(false); }} className="btn">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {(!form.recipes || form.recipes.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No recipes for this resource</p>
                      <p className="text-xs mt-1">Add a recipe to make this craftable</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {form.recipes.map((recipe) => (
                        <div 
                          key={recipe.id} 
                          className="bg-secondary/30 rounded p-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{recipe.name}</span>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleEditRecipe(recipe)}
                                className="btn btn-ghost text-xs px-2"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteRecipe(recipe.id)}
                                className="btn btn-ghost text-xs px-2 text-destructive"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {recipe.ingredients.map((ing, i) => {
                              const r = getResource(ing.resourceId);
                              return (
                                <span key={i} className="flex items-center gap-0.5 text-xs">
                                  {i > 0 && <span className="text-muted-foreground mx-1">+</span>}
                                  <span>{r?.icon}</span>
                                  <span className="text-muted-foreground">×{ing.quantity}</span>
                                </span>
                              );
                            })}
                            <ChevronRight className="w-3 h-3 text-muted-foreground mx-1" />
                            <span>{form.icon}</span>
                            <span className="text-xs text-muted-foreground">×{recipe.outputQuantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={handleNewRecipe} className="btn w-full">
                    <Plus className="w-4 h-4 mr-2" /> Add Recipe
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-2">
          <button onClick={handleSave} className="btn btn-primary flex-1">
            <Save className="w-4 h-4 mr-2" /> {isNew ? 'Create Resource' : 'Save Changes'}
          </button>
          {!isNew && onDelete && (
            <button onClick={handleDelete} className="btn bg-destructive text-destructive-foreground">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceEditorModal;
