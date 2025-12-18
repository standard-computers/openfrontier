import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Globe, Trash2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SavedWorld {
  id: string;
  name: string;
  createdAt: number;
}

const WorldsDashboard = () => {
  const navigate = useNavigate();
  const [worlds, setWorlds] = useState<SavedWorld[]>([]);
  const [newWorldName, setNewWorldName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('savedWorlds');
    if (saved) {
      setWorlds(JSON.parse(saved));
    }
  }, []);

  const saveWorlds = (updated: SavedWorld[]) => {
    setWorlds(updated);
    localStorage.setItem('savedWorlds', JSON.stringify(updated));
  };

  const handleCreateWorld = () => {
    if (!newWorldName.trim()) {
      toast.error('Please enter a world name');
      return;
    }

    const newWorld: SavedWorld = {
      id: `world-${Date.now()}`,
      name: newWorldName.trim(),
      createdAt: Date.now(),
    };

    saveWorlds([...worlds, newWorld]);
    localStorage.setItem('currentWorldId', newWorld.id);
    localStorage.removeItem('gameWorld'); // Clear existing world data to generate new
    toast.success('World created!');
    navigate('/');
  };

  const handleEnterWorld = (world: SavedWorld) => {
    localStorage.setItem('currentWorldId', world.id);
    navigate('/');
  };

  const handleDeleteWorld = (worldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this world? This cannot be undone.')) {
      saveWorlds(worlds.filter(w => w.id !== worldId));
      localStorage.removeItem(`gameWorld-${worldId}`);
      toast.success('World deleted');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Worlds</h1>
          <p className="text-muted-foreground">Create or enter a world to start exploring</p>
        </div>

        {/* Create new world */}
        <div className="game-panel p-6 mb-6">
          {isCreating ? (
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground">Create New World</h2>
              <input
                value={newWorldName}
                onChange={(e) => setNewWorldName(e.target.value)}
                placeholder="World name..."
                className="input-field w-full"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateWorld()}
              />
              <div className="flex gap-2">
                <button onClick={handleCreateWorld} className="btn btn-primary flex-1">
                  <Plus className="w-4 h-4 mr-2" /> Create World
                </button>
                <button onClick={() => { setIsCreating(false); setNewWorldName(''); }} className="btn">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-muted/50 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">Create New World</span>
            </button>
          )}
        </div>

        {/* Existing worlds */}
        {worlds.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground px-1">Your Worlds</h2>
            {worlds.map((world) => (
              <div
                key={world.id}
                onClick={() => handleEnterWorld(world)}
                className="game-panel p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{world.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(world.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteWorld(world.id, e)}
                  className="btn btn-ghost p-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="btn btn-primary px-4">
                  <Play className="w-4 h-4 mr-1" /> Enter
                </div>
              </div>
            ))}
          </div>
        )}

        {worlds.length === 0 && !isCreating && (
          <div className="text-center text-muted-foreground py-8">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No worlds yet. Create your first world above!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorldsDashboard;

