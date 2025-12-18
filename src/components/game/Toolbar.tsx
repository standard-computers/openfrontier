import { TileType, Resource } from '@/types/game';
import { cn } from '@/lib/utils';
import { Brush, Eraser, Trees, Droplets, Mountain, CircleDot } from 'lucide-react';

interface ToolbarProps {
  selectedTool: TileType | string | null;
  onSelectTool: (tool: TileType | string | null) => void;
  resources: Resource[];
  mode: 'tiles' | 'resources';
  onModeChange: (mode: 'tiles' | 'resources') => void;
}

const TILE_TOOLS: { type: TileType; icon: typeof Trees; label: string; color: string }[] = [
  { type: 'grass', icon: Trees, label: 'Grass', color: 'bg-green-600' },
  { type: 'water', icon: Droplets, label: 'Water', color: 'bg-blue-500' },
  { type: 'sand', icon: CircleDot, label: 'Sand', color: 'bg-yellow-500' },
  { type: 'stone', icon: Mountain, label: 'Stone', color: 'bg-gray-500' },
  { type: 'dirt', icon: Brush, label: 'Dirt', color: 'bg-amber-800' },
];

const Toolbar = ({ selectedTool, onSelectTool, resources, mode, onModeChange }: ToolbarProps) => {
  return (
    <div className="pixel-panel p-3 space-y-3">
      <div className="flex gap-1">
        <button
          onClick={() => onModeChange('tiles')}
          className={cn('pixel-btn text-[8px] flex-1', mode === 'tiles' && 'pixel-btn-primary')}
        >
          Tiles
        </button>
        <button
          onClick={() => onModeChange('resources')}
          className={cn('pixel-btn text-[8px] flex-1', mode === 'resources' && 'pixel-btn-primary')}
        >
          Resources
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {mode === 'tiles' ? (
          <>
            {TILE_TOOLS.map(({ type, icon: Icon, label, color }) => (
              <button
                key={type}
                onClick={() => onSelectTool(type)}
                className={cn(
                  'toolbar-btn',
                  selectedTool === type && 'active'
                )}
                title={label}
              >
                <div className={cn('w-5 h-5 rounded-sm', color)} />
              </button>
            ))}
            <button
              onClick={() => onSelectTool(null)}
              className={cn('toolbar-btn', selectedTool === null && 'active')}
              title="Eraser"
            >
              <Eraser className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            {resources.slice(0, 12).map((resource) => (
              <button
                key={resource.id}
                onClick={() => onSelectTool(resource.id)}
                className={cn(
                  'toolbar-btn',
                  selectedTool === resource.id && 'active'
                )}
                title={resource.name}
              >
                {resource.icon}
              </button>
            ))}
            <button
              onClick={() => onSelectTool('remove-resource')}
              className={cn('toolbar-btn', selectedTool === 'remove-resource' && 'active')}
              title="Remove Resource"
            >
              <Eraser className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
