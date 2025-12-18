import { useState, useEffect } from 'react';
import { WorldData, Resource, Recipe, InventorySlot, DEFAULT_RESOURCES, DEFAULT_RECIPES } from '@/types/game';

const STORAGE_KEY = 'pixel-world-data';

const createEmptyInventory = (size: number = 40): InventorySlot[] => 
  Array.from({ length: size }, () => ({ resourceId: null, quantity: 0 }));

const getDefaultWorld = (): WorldData => ({
  id: 'default-world',
  name: 'My World',
  resources: DEFAULT_RESOURCES,
  recipes: DEFAULT_RECIPES,
  inventory: createEmptyInventory(),
});

export const useWorldData = () => {
  const [worldData, setWorldData] = useState<WorldData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return getDefaultWorld();
      }
    }
    return getDefaultWorld();
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(worldData));
  }, [worldData]);

  const updateWorldName = (name: string) => {
    setWorldData(prev => ({ ...prev, name }));
  };

  const addResource = (resource: Resource) => {
    setWorldData(prev => ({
      ...prev,
      resources: [...prev.resources, resource],
    }));
  };

  const updateResource = (resource: Resource) => {
    setWorldData(prev => ({
      ...prev,
      resources: prev.resources.map(r => r.id === resource.id ? resource : r),
    }));
  };

  const deleteResource = (id: string) => {
    setWorldData(prev => ({
      ...prev,
      resources: prev.resources.filter(r => r.id !== id),
      recipes: prev.recipes.filter(recipe => 
        recipe.outputResourceId !== id && 
        !recipe.ingredients.some(ing => ing.resourceId === id)
      ),
    }));
  };

  const addRecipe = (recipe: Recipe) => {
    setWorldData(prev => ({
      ...prev,
      recipes: [...prev.recipes, recipe],
    }));
  };

  const updateRecipe = (recipe: Recipe) => {
    setWorldData(prev => ({
      ...prev,
      recipes: prev.recipes.map(r => r.id === recipe.id ? recipe : r),
    }));
  };

  const deleteRecipe = (id: string) => {
    setWorldData(prev => ({
      ...prev,
      recipes: prev.recipes.filter(r => r.id !== id),
    }));
  };

  const exportWorld = () => {
    const dataStr = JSON.stringify(worldData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${worldData.name.toLowerCase().replace(/\s+/g, '-')}-world.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetWorld = () => {
    setWorldData(getDefaultWorld());
  };

  return {
    worldData,
    updateWorldName,
    addResource,
    updateResource,
    deleteResource,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    exportWorld,
    resetWorld,
  };
};
