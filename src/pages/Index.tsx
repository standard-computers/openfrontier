import { useState } from 'react';
import { useWorldData } from '@/hooks/useWorldData';
import GameHeader from '@/components/game/GameHeader';
import WorldDashboard from '@/components/game/WorldDashboard';
import ResourceEditor from '@/components/game/ResourceEditor';
import RecipeEditor from '@/components/game/RecipeEditor';
import WorldSettings from '@/components/game/WorldSettings';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const {
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
  } = useWorldData();

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <GameHeader
          worldName={worldData.name}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <main className="animate-fade-in">
          {activeTab === 'dashboard' && (
            <WorldDashboard
              resources={worldData.resources}
              recipes={worldData.recipes}
              inventory={worldData.inventory}
            />
          )}

          {activeTab === 'resources' && (
            <ResourceEditor
              resources={worldData.resources}
              onAddResource={addResource}
              onUpdateResource={updateResource}
              onDeleteResource={deleteResource}
            />
          )}

          {activeTab === 'recipes' && (
            <RecipeEditor
              recipes={worldData.recipes}
              resources={worldData.resources}
              onAddRecipe={addRecipe}
              onUpdateRecipe={updateRecipe}
              onDeleteRecipe={deleteRecipe}
            />
          )}

          {activeTab === 'settings' && (
            <WorldSettings
              worldName={worldData.name}
              onWorldNameChange={updateWorldName}
              onExportWorld={exportWorld}
              onResetWorld={resetWorld}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;
