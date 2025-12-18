import { useState } from 'react';
import { Recipe, Resource, RecipeIngredient } from '@/types/game';
import GamePanel from './GamePanel';
import PixelButton from './PixelButton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Save, ArrowRight } from 'lucide-react';

interface RecipeEditorProps {
  recipes: Recipe[];
  resources: Resource[];
  onAddRecipe: (recipe: Recipe) => void;
  onUpdateRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (id: string) => void;
}

const RecipeEditor = ({ recipes, resources, onAddRecipe, onUpdateRecipe, onDeleteRecipe }: RecipeEditorProps) => {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const emptyRecipe: Recipe = {
    id: '',
    name: '',
    outputResourceId: '',
    outputQuantity: 1,
    ingredients: [],
    craftTime: 5,
  };

  const [formData, setFormData] = useState<Recipe>(emptyRecipe);

  const getResource = (id: string) => resources.find(r => r.id === id);

  const handleSelectRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setFormData(recipe);
    setIsCreating(false);
  };

  const handleNewRecipe = () => {
    setSelectedRecipe(null);
    setFormData({ ...emptyRecipe, id: `recipe-${Date.now()}` });
    setIsCreating(true);
  };

  const handleAddIngredient = () => {
    if (resources.length === 0) return;
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { resourceId: resources[0].id, quantity: 1 }],
    });
  };

  const handleUpdateIngredient = (index: number, field: keyof RecipeIngredient, value: string | number) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const handleRemoveIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index),
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.outputResourceId || formData.ingredients.length === 0) return;
    
    if (isCreating) {
      onAddRecipe(formData);
    } else {
      onUpdateRecipe(formData);
    }
    setSelectedRecipe(null);
    setIsCreating(false);
    setFormData(emptyRecipe);
  };

  const handleDelete = () => {
    if (selectedRecipe) {
      onDeleteRecipe(selectedRecipe.id);
      setSelectedRecipe(null);
      setFormData(emptyRecipe);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <GamePanel title="Recipes" className="h-fit">
        <div className="space-y-2 mb-4">
          {recipes.map((recipe) => {
            const outputResource = getResource(recipe.outputResourceId);
            return (
              <button
                key={recipe.id}
                onClick={() => handleSelectRecipe(recipe)}
                className={`w-full p-3 bg-input hover:bg-muted transition-colors pixel-border text-left ${
                  selectedRecipe?.id === recipe.id ? 'ring-2 ring-accent' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {recipe.ingredients.slice(0, 3).map((ing, i) => (
                      <span key={i} className="text-lg">{getResource(ing.resourceId)?.icon || '?'}</span>
                    ))}
                    {recipe.ingredients.length > 3 && (
                      <span className="text-[8px] font-pixel text-muted-foreground">+{recipe.ingredients.length - 3}</span>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-accent" />
                  <span className="text-xl">{outputResource?.icon || '?'}</span>
                  <span className="text-[8px] font-pixel text-foreground">{recipe.name}</span>
                </div>
              </button>
            );
          })}
        </div>
        <PixelButton onClick={handleNewRecipe} variant="accent" size="sm" className="w-full">
          <Plus className="w-3 h-3 mr-2 inline" />
          New Recipe
        </PixelButton>
      </GamePanel>

      {(selectedRecipe || isCreating) && (
        <GamePanel title={isCreating ? 'Create Recipe' : 'Edit Recipe'}>
          <div className="space-y-4">
            <div>
              <label className="text-[8px] font-pixel text-muted-foreground block mb-1">Recipe Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="font-pixel text-xs bg-input border-border"
                placeholder="Recipe name..."
              />
            </div>

            <div>
              <label className="text-[8px] font-pixel text-muted-foreground block mb-1">Ingredients</label>
              <div className="space-y-2">
                {formData.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Select
                      value={ingredient.resourceId}
                      onValueChange={(value) => handleUpdateIngredient(index, 'resourceId', value)}
                    >
                      <SelectTrigger className="font-pixel text-[10px] bg-input border-border flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {resources.map((resource) => (
                          <SelectItem key={resource.id} value={resource.id} className="font-pixel text-[10px]">
                            {resource.icon} {resource.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={ingredient.quantity}
                      onChange={(e) => handleUpdateIngredient(index, 'quantity', Number(e.target.value))}
                      className="font-pixel text-xs bg-input border-border w-16"
                    />
                    <button
                      onClick={() => handleRemoveIngredient(index)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <PixelButton onClick={handleAddIngredient} variant="secondary" size="sm" className="w-full">
                  <Plus className="w-3 h-3 mr-1 inline" />
                  Add Ingredient
                </PixelButton>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[8px] font-pixel text-muted-foreground block mb-1">Output Resource</label>
                <Select
                  value={formData.outputResourceId}
                  onValueChange={(value) => setFormData({ ...formData, outputResourceId: value })}
                >
                  <SelectTrigger className="font-pixel text-[10px] bg-input border-border">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {resources.map((resource) => (
                      <SelectItem key={resource.id} value={resource.id} className="font-pixel text-[10px]">
                        {resource.icon} {resource.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[8px] font-pixel text-muted-foreground block mb-1">Output Qty</label>
                <Input
                  type="number"
                  min={1}
                  value={formData.outputQuantity}
                  onChange={(e) => setFormData({ ...formData, outputQuantity: Number(e.target.value) })}
                  className="font-pixel text-xs bg-input border-border"
                />
              </div>
            </div>

            <div>
              <label className="text-[8px] font-pixel text-muted-foreground block mb-1">Craft Time (seconds)</label>
              <Input
                type="number"
                min={1}
                value={formData.craftTime}
                onChange={(e) => setFormData({ ...formData, craftTime: Number(e.target.value) })}
                className="font-pixel text-xs bg-input border-border"
              />
            </div>

            <div className="flex gap-2">
              <PixelButton onClick={handleSave} variant="primary" className="flex-1">
                <Save className="w-3 h-3 mr-2 inline" />
                Save
              </PixelButton>
              {!isCreating && (
                <PixelButton onClick={handleDelete} variant="destructive">
                  <Trash2 className="w-3 h-3" />
                </PixelButton>
              )}
            </div>
          </div>
        </GamePanel>
      )}
    </div>
  );
};

export default RecipeEditor;
