import { useState } from 'react';
import { Resource, RARITY_COLORS } from '@/types/game';
import GamePanel from './GamePanel';
import PixelButton from './PixelButton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Save } from 'lucide-react';

interface ResourceEditorProps {
  resources: Resource[];
  onAddResource: (resource: Resource) => void;
  onUpdateResource: (resource: Resource) => void;
  onDeleteResource: (id: string) => void;
}

const EMOJI_OPTIONS = ['🪵', '🪨', '⛏️', '✨', '💎', '🔶', '🌿', '💧', '🔥', '❄️', '⚡', '🍎', '🌾', '🐟', '🥚', '🧵', '⚙️', '💀'];

const ResourceEditor = ({ resources, onAddResource, onUpdateResource, onDeleteResource }: ResourceEditorProps) => {
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const emptyResource: Resource = {
    id: '',
    name: '',
    icon: '🪵',
    color: 'bg-game-wood',
    rarity: 'common',
    description: '',
    baseValue: 10,
    stackSize: 99,
  };

  const [formData, setFormData] = useState<Resource>(emptyResource);

  const handleSelectResource = (resource: Resource) => {
    setSelectedResource(resource);
    setFormData(resource);
    setIsCreating(false);
  };

  const handleNewResource = () => {
    setSelectedResource(null);
    setFormData({ ...emptyResource, id: `resource-${Date.now()}` });
    setIsCreating(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.id) return;
    
    if (isCreating) {
      onAddResource(formData);
    } else {
      onUpdateResource(formData);
    }
    setSelectedResource(null);
    setIsCreating(false);
    setFormData(emptyResource);
  };

  const handleDelete = () => {
    if (selectedResource) {
      onDeleteResource(selectedResource.id);
      setSelectedResource(null);
      setFormData(emptyResource);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <GamePanel title="Resources" className="h-fit">
        <div className="flex flex-wrap gap-2 mb-4">
          {resources.map((resource) => (
            <button
              key={resource.id}
              onClick={() => handleSelectResource(resource)}
              className={`resource-slot flex-col gap-1 ${
                selectedResource?.id === resource.id ? 'ring-2 ring-accent' : ''
              }`}
            >
              <span className="text-xl">{resource.icon}</span>
              <span className={`text-[6px] font-pixel ${RARITY_COLORS[resource.rarity]}`}>
                {resource.name.slice(0, 6)}
              </span>
            </button>
          ))}
        </div>
        <PixelButton onClick={handleNewResource} variant="accent" size="sm" className="w-full">
          <Plus className="w-3 h-3 mr-2 inline" />
          New Resource
        </PixelButton>
      </GamePanel>

      {(selectedResource || isCreating) && (
        <GamePanel title={isCreating ? 'Create Resource' : 'Edit Resource'}>
          <div className="space-y-4">
            <div>
              <label className="text-[8px] font-pixel text-muted-foreground block mb-1">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="font-pixel text-xs bg-input border-border"
                placeholder="Resource name..."
              />
            </div>

            <div>
              <label className="text-[8px] font-pixel text-muted-foreground block mb-1">Icon</label>
              <div className="flex flex-wrap gap-1">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setFormData({ ...formData, icon: emoji })}
                    className={`w-8 h-8 flex items-center justify-center bg-input hover:bg-muted transition-colors ${
                      formData.icon === emoji ? 'ring-2 ring-accent' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[8px] font-pixel text-muted-foreground block mb-1">Rarity</label>
                <Select
                  value={formData.rarity}
                  onValueChange={(value: Resource['rarity']) => setFormData({ ...formData, rarity: value })}
                >
                  <SelectTrigger className="font-pixel text-[10px] bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="common" className="font-pixel text-[10px]">Common</SelectItem>
                    <SelectItem value="uncommon" className="font-pixel text-[10px]">Uncommon</SelectItem>
                    <SelectItem value="rare" className="font-pixel text-[10px]">Rare</SelectItem>
                    <SelectItem value="epic" className="font-pixel text-[10px]">Epic</SelectItem>
                    <SelectItem value="legendary" className="font-pixel text-[10px]">Legendary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-[8px] font-pixel text-muted-foreground block mb-1">Base Value</label>
                <Input
                  type="number"
                  value={formData.baseValue}
                  onChange={(e) => setFormData({ ...formData, baseValue: Number(e.target.value) })}
                  className="font-pixel text-xs bg-input border-border"
                />
              </div>
            </div>

            <div>
              <label className="text-[8px] font-pixel text-muted-foreground block mb-1">Stack Size</label>
              <Input
                type="number"
                value={formData.stackSize}
                onChange={(e) => setFormData({ ...formData, stackSize: Number(e.target.value) })}
                className="font-pixel text-xs bg-input border-border"
              />
            </div>

            <div>
              <label className="text-[8px] font-pixel text-muted-foreground block mb-1">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="font-pixel text-xs bg-input border-border resize-none"
                rows={2}
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

export default ResourceEditor;
