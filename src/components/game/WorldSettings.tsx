import { useState } from 'react';
import GamePanel from './GamePanel';
import PixelButton from './PixelButton';
import { Input } from '@/components/ui/input';
import { Save, Download, Upload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface WorldSettingsProps {
  worldName: string;
  onWorldNameChange: (name: string) => void;
  onExportWorld: () => void;
  onResetWorld: () => void;
}

const WorldSettings = ({ worldName, onWorldNameChange, onExportWorld, onResetWorld }: WorldSettingsProps) => {
  const [name, setName] = useState(worldName);

  const handleSave = () => {
    onWorldNameChange(name);
    toast.success('World name updated!');
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset your world? This will restore default resources and recipes.')) {
      onResetWorld();
      toast.success('World reset to defaults!');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <GamePanel title="World Settings">
        <div className="space-y-4">
          <div>
            <label className="text-[8px] font-pixel text-muted-foreground block mb-1">World Name</label>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="font-pixel text-xs bg-input border-border flex-1"
                placeholder="Enter world name..."
              />
              <PixelButton onClick={handleSave} variant="primary">
                <Save className="w-4 h-4" />
              </PixelButton>
            </div>
          </div>
        </div>
      </GamePanel>

      <GamePanel title="Data Management">
        <div className="space-y-4">
          <PixelButton onClick={onExportWorld} variant="secondary" className="w-full justify-center">
            <Download className="w-4 h-4 mr-2" />
            Export World Data
          </PixelButton>
          
          <PixelButton onClick={handleReset} variant="destructive" className="w-full justify-center">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Defaults
          </PixelButton>
        </div>
      </GamePanel>

      <GamePanel title="About">
        <div className="space-y-2 text-[10px] font-pixel text-muted-foreground leading-relaxed">
          <p>This is your world editor. Create and manage resources, define crafting recipes, and build your game world!</p>
          <p className="text-accent">Version 1.0.0</p>
        </div>
      </GamePanel>
    </div>
  );
};

export default WorldSettings;
