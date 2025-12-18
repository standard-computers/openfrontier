import { useState } from 'react';
import { Resource, RARITY_COLORS } from '@/types/game';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ResourceManagerProps {
  resources: Resource[];
  onAddResource: (resource: Resource) => void;
  onUpdateResource: (resource: Resource) => void;
  onDeleteResource: (id: string) => void;
}

const ICONS = ['🪵', '🪨', '⛏️', '✨', '💎', '🔶', '🌿', '💧', '🔥', '❄️', '⚡', '🍎', '🌾', '🐟', '🥚', '🧵', '⚙️', '💀', '🍄', '🌸', '🦴', '🪶'];

const ResourceManager = ({ resources, onAddResource, onUpdateResource, onDeleteResource }: ResourceManagerProps) => {
  const [selected, setSelected] = useState<Resource | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<Resource>({
    id: '',
    name: '',
    icon: '🪵',
    rarity: 'common',
    description: '',
    gatherTime: 2,
  });

  const handleNew = () => {
    setSelected(null);
    setIsNew(true);
    setForm({
      id: `res-${Date.now()}`,
      name: '',
      icon: '🪵',
      rarity: 'common',
      description: '',
      gatherTime: 2,
    });
  };

  const handleSelect = (resource: Resource) => {
    setSelected(resource);
    setIsNew(false);
    setForm(resource);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Name required');
      return;
    }
    if (isNew) {
      onAddResource(form);
      toast.success('Resource created!');
    } else {
      onUpdateResource(form);
      toast.success('Resource updated!');
    }
    setSelected(null);
    setIsNew(false);
  };

  const handleDelete = () => {
    if (selected && confirm('Delete this resource?')) {
      onDeleteResource(selected.id);
      setSelected(null);
      toast.success('Resource deleted');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Resource List */}
      <div className="pixel-panel p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-pixel text-primary">Resources ({resources.length})</h2>
          <button onClick={handleNew} className="pixel-btn pixel-btn-accent text-[8px]">
            <Plus className="w-3 h-3 mr-1" /> New
          </button>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[400px] overflow-y-auto">
          {resources.map((resource) => (
            <button
              key={resource.id}
              onClick={() => handleSelect(resource)}
              className={cn(
                'inventory-slot flex-col gap-0.5 h-14',
                selected?.id === resource.id && 'ring-2 ring-primary'
              )}
            >
              <span className="text-lg">{resource.icon}</span>
              <span className={cn('text-[6px] font-pixel truncate w-full text-center', RARITY_COLORS[resource.rarity])}>
                {resource.name.slice(0, 6)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      {(selected || isNew) && (
        <div className="pixel-panel p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-pixel text-primary">
              {isNew ? 'New Resource' : 'Edit Resource'}
            </h2>
            <button onClick={() => { setSelected(null); setIsNew(false); }} className="toolbar-btn !w-6 !h-6">
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[8px] font-pixel text-muted-foreground mb-1 block">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="font-pixel text-[10px] bg-input border-border h-8"
              />
            </div>

            <div>
              <label className="text-[8px] font-pixel text-muted-foreground mb-1 block">Icon</label>
              <div className="flex flex-wrap gap-1">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setForm({ ...form, icon })}
                    className={cn(
                      'w-8 h-8 flex items-center justify-center bg-input hover:bg-muted',
                      form.icon === icon && 'ring-2 ring-primary'
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[8px] font-pixel text-muted-foreground mb-1 block">Rarity</label>
                <Select value={form.rarity} onValueChange={(v: Resource['rarity']) => setForm({ ...form, rarity: v })}>
                  <SelectTrigger className="font-pixel text-[10px] bg-input border-border h-8">
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
                <label className="text-[8px] font-pixel text-muted-foreground mb-1 block">Gather Time</label>
                <Input
                  type="number"
                  min={1}
                  value={form.gatherTime}
                  onChange={(e) => setForm({ ...form, gatherTime: Number(e.target.value) })}
                  className="font-pixel text-[10px] bg-input border-border h-8"
                />
              </div>
            </div>

            <div>
              <label className="text-[8px] font-pixel text-muted-foreground mb-1 block">Description</label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="font-pixel text-[10px] bg-input border-border h-8"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} className="pixel-btn pixel-btn-primary flex-1 text-[8px]">
                <Save className="w-3 h-3 mr-1" /> Save
              </button>
              {!isNew && (
                <button onClick={handleDelete} className="pixel-btn bg-destructive text-destructive-foreground text-[8px]">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceManager;
