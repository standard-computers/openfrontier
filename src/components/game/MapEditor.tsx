import { useState } from 'react';
import { WorldMap, Resource, TileType } from '@/types/game';
import GameMap from './GameMap';
import Toolbar from './Toolbar';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Map } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MapEditorProps {
  maps: WorldMap[];
  currentMapId: string;
  resources: Resource[];
  playerPosition: { x: number; y: number };
  onTileUpdate: (x: number, y: number, updates: Partial<WorldMap['tiles'][0][0]>) => void;
  onAddMap: (name: string, width: number, height: number) => string;
  onSwitchMap: (mapId: string) => void;
  onUpdateMapName: (mapId: string, name: string) => void;
  onDeleteMap: (mapId: string) => void;
}

const MapEditor = ({
  maps,
  currentMapId,
  resources,
  playerPosition,
  onTileUpdate,
  onAddMap,
  onSwitchMap,
  onUpdateMapName,
  onDeleteMap,
}: MapEditorProps) => {
  const [selectedTool, setSelectedTool] = useState<TileType | string | null>('grass');
  const [toolMode, setToolMode] = useState<'tiles' | 'resources'>('tiles');
  const [newMapName, setNewMapName] = useState('');
  const [showNewMap, setShowNewMap] = useState(false);

  const currentMap = maps.find(m => m.id === currentMapId) || maps[0];

  const handleTileClick = (x: number, y: number) => {
    if (toolMode === 'tiles') {
      if (selectedTool === null) {
        onTileUpdate(x, y, { type: 'grass', walkable: true, resource: undefined });
      } else {
        const isWalkable = selectedTool !== 'water';
        onTileUpdate(x, y, { type: selectedTool as TileType, walkable: isWalkable });
      }
    } else {
      if (selectedTool === 'remove-resource') {
        onTileUpdate(x, y, { resource: undefined });
      } else if (selectedTool && currentMap.tiles[y][x].walkable) {
        onTileUpdate(x, y, { resource: selectedTool });
      }
    }
  };

  const handleAddMap = () => {
    if (!newMapName.trim()) return;
    onAddMap(newMapName, 30, 20);
    setNewMapName('');
    setShowNewMap(false);
    toast.success('Map created!');
  };

  return (
    <div className="flex gap-4">
      <div className="flex-1 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {maps.map((map) => (
            <button
              key={map.id}
              onClick={() => onSwitchMap(map.id)}
              className={cn(
                'pixel-btn text-[8px] flex items-center gap-2',
                map.id === currentMapId && 'pixel-btn-primary'
              )}
            >
              <Map className="w-3 h-3" />
              {map.name}
            </button>
          ))}
          <button
            onClick={() => setShowNewMap(true)}
            className="pixel-btn text-[8px]"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {showNewMap && (
          <div className="pixel-panel p-3 flex gap-2 items-center">
            <Input
              value={newMapName}
              onChange={(e) => setNewMapName(e.target.value)}
              placeholder="Map name..."
              className="font-pixel text-[10px] bg-input border-border h-8"
            />
            <button onClick={handleAddMap} className="pixel-btn pixel-btn-primary text-[8px]">
              Create
            </button>
            <button onClick={() => setShowNewMap(false)} className="pixel-btn text-[8px]">
              Cancel
            </button>
          </div>
        )}

        <GameMap
          map={currentMap}
          playerPosition={playerPosition}
          resources={resources}
          onMove={() => {}}
          onGather={() => {}}
          editMode
          selectedTool={selectedTool}
          onTileClick={handleTileClick}
        />

        <div className="pixel-panel p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              value={currentMap.name}
              onChange={(e) => onUpdateMapName(currentMap.id, e.target.value)}
              className="font-pixel text-[10px] bg-input border-border h-8 w-40"
            />
            <span className="text-[8px] font-pixel text-muted-foreground">
              {currentMap.width}x{currentMap.height}
            </span>
          </div>
          {maps.length > 1 && (
            <button
              onClick={() => {
                if (confirm('Delete this map?')) {
                  onDeleteMap(currentMap.id);
                  toast.success('Map deleted');
                }
              }}
              className="pixel-btn text-[8px] bg-destructive text-destructive-foreground"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <Toolbar
        selectedTool={selectedTool}
        onSelectTool={setSelectedTool}
        resources={resources}
        mode={toolMode}
        onModeChange={setToolMode}
      />
    </div>
  );
};

export default MapEditor;
