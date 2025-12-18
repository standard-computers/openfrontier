import { useState } from 'react';
import { X, Hammer, Plus, ChevronRight, Trash2 } from 'lucide-react';
import { Resource, Recipe, RecipeIngredient, RARITY_COLORS } from '@/types/game';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RecipeEditorProps {
  resource: Resource;
  allResources: Resource[];
  onSave: (resource: Resource) => void;
  onClose: () => void;
}

const RecipeEditor = ({ resource, allResources, onSave, onClose }: RecipeEditorProps) => {
  const [recipes, setRecipes] = useState<Recipe[]>(resource.recipes || []);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isNewRecipe, setIsNewRecipe] = useState(false);

  const getResource = (id: string) => allResources.find(r => r.id === id);

  const handleNewRecipe = () => {
    setEditingRecipe({
      id: `recipe-${Date.now()}`,
      name: `${resource.name} Recipe`,
      ingredients: [],
      outputQuantity: 1,
    });
    setIsNewRecipe(true);
  };

  const handleAddIngredient = () => {
    if (!editingRecipe) return;
    // Find a resource that's not this one and not already in ingredients
    const available = allResources.find(r => 
      r.id !== resource.id && 
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

  const handleSaveRecipe = () => {
    if (!editingRecipe) return;
    if (editingRecipe.ingredients.length === 0) {
      toast.error('Add at least one ingredient');
      return;
    }

    if (isNewRecipe) {
      setRecipes([...recipes, editingRecipe]);
    } else {
      setRecipes(recipes.map(r => r.id === editingRecipe.id ? editingRecipe : r));
    }
    setEditingRecipe(null);
    setIsNewRecipe(false);
  };

  const handleDeleteRecipe = (recipeId: string) => {
    setRecipes(recipes.filter(r => r.id !== recipeId));
  };

  const handleSaveAll = () => {
    onSave({ ...resource, recipes: recipes.length > 0 ? recipes : undefined });
    toast.success('Recipes saved');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="game-panel w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-xl">{resource.icon}</span>
            <h2 className="font-semibold">{resource.name} Recipes</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {editingRecipe ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Recipe Name</label>
                <input
                  value={editingRecipe.name}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, name: e.target.value })}
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Output Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={editingRecipe.outputQuantity}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, outputQuantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="input-field w-24"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-muted-foreground">Ingredients</label>
                  <button onClick={handleAddIngredient} className="btn btn-accent text-xs">
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </button>
                </div>

                {editingRecipe.ingredients.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4 bg-secondary/30 rounded">
                    No ingredients yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editingRecipe.ingredients.map((ingredient, index) => {
                      const ingredientResource = getResource(ingredient.resourceId);
                      return (
                        <div key={index} className="flex items-center gap-2 bg-secondary/30 p-2 rounded">
                          <select
                            value={ingredient.resourceId}
                            onChange={(e) => handleUpdateIngredient(index, { resourceId: e.target.value })}
                            className="input-field flex-1"
                          >
                            {allResources
                              .filter(r => r.id !== resource.id)
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
                      );
                    })}
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
                    <span>{resource.icon}</span>
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
            <div className="space-y-4">
              {recipes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Hammer className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No recipes yet</p>
                  <p className="text-xs">Add a recipe to craft this resource</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recipes.map((recipe) => (
                    <div 
                      key={recipe.id} 
                      className="bg-secondary/30 rounded p-3 flex items-center gap-3"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">{recipe.name}</div>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
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
                          <span>{resource.icon}</span>
                          <span className="text-xs text-muted-foreground">×{recipe.outputQuantity}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEditingRecipe(recipe)}
                        className="btn btn-ghost text-xs"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteRecipe(recipe.id)}
                        className="btn btn-ghost p-1 text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button onClick={handleNewRecipe} className="btn w-full">
                <Plus className="w-4 h-4 mr-2" /> Add Recipe
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!editingRecipe && (
          <div className="p-4 border-t border-border">
            <button onClick={handleSaveAll} className="btn btn-primary w-full">
              Save All Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeEditor;
