import { useState } from 'react';
import { GameWorld } from '@/types/game';
import { Input } from '@/components/ui/input';
import { Save, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface GameSettingsProps {
  world: GameWorld;
  onUpdateName: (name: string) => void;
  onReset: () => void;
}

const GameSettings = ({ world, onUpdateName, onReset }: GameSettingsProps) => {
  const [name, setName] = useState(world.name);

  const handleSave = () => {
    onUpdateName(name);
    toast.success('World name updated!');
  };

  const handleExport = () => {
    const data = JSON.stringify(world, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${world.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('World exported!');
  };

  const handleReset = () => {
    if (confirm('Reset everything to defaults? This cannot be undone.')) {
      onReset();
      toast.success('World reset!');
    }
  };

  return (
    <div className="max-w-md space-y-4">
      <div className="pixel-panel p-4 space-y-4">
        <h2 className="text-[10px] font-pixel text-primary">World Settings</h2>
        
        <div>
          <label className="text-[8px] font-pixel text-muted-foreground mb-1 block">World Name</label>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-pixel text-[10px] bg-input border-border h-8 flex-1"
            />
            <button onClick={handleSave} className="pixel-btn pixel-btn-primary text-[8px]">
              <Save className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="pt-2 space-y-2">
          <p className="text-[8px] font-pixel text-muted-foreground">
            Maps: {world.maps.length} • Resources: {world.resources.length}
          </p>
        </div>
      </div>

      <div className="pixel-panel p-4 space-y-3">
        <h2 className="text-[10px] font-pixel text-primary">Data</h2>
        
        <button onClick={handleExport} className="pixel-btn w-full text-[8px] justify-center">
          <Download className="w-3 h-3 mr-2" /> Export World
        </button>

        <button onClick={handleReset} className="pixel-btn w-full text-[8px] justify-center bg-destructive text-destructive-foreground">
          <RefreshCw className="w-3 h-3 mr-2" /> Reset to Default
        </button>
      </div>

      <div className="pixel-panel p-4">
        <h2 className="text-[10px] font-pixel text-primary mb-2">Controls</h2>
        <div className="text-[8px] font-pixel text-muted-foreground space-y-1">
          <p><span className="text-foreground">WASD</span> - Move character</p>
          <p><span className="text-foreground">E / Space</span> - Gather resource</p>
        </div>
      </div>
    </div>
  );
};

export default GameSettings;
