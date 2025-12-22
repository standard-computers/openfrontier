import { useState, useRef } from 'react';
import { Resource, Recipe, RecipeIngredient, TileType, TILE_TYPES, RARITY_COLORS } from '@/types/game';
import { X, Save, Trash2, Plus, ChevronRight, Upload, Smile, Image, ChevronDown, Tag, Copy } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ResourceIcon from './ResourceIcon';

interface ResourceEditorModalProps {
  resource: Resource;
  allResources: Resource[];
  isNew: boolean;
  onSave: (resource: Resource) => void;
  onDelete?: () => void;
  onClose: () => void;
  categories?: string[];
}

const ICONS = ['🪵', '🪨', '⛏️', '✨', '💎', '🔶', '🌿', '💧', '🔥', '❄️', '⚡', '🍎', '🌾', '🐟', '🥚', '🧵', '⚙️', '💀', '🍄', '🌸', '🦴', '🪶', '🌵', '🐚', '🍯', '🧲', '🔩', '🥇', '🪢', '🧊', '🖤', '💛', '🌱', '🐸', '🪴', '🥭', '⚫', '🌺', '🍇', '🥕', '🧀', '🍖', '🪙', '💰', '📦', '🎁', '⭐', '🌟', '💫', '🔮', '🧪', '⚗️', '🏺', '🗡️', '🛡️', '🏹', '🪓', '⚒️', '🔧', '🗝️', '🔑'];

const ResourceEditorModal = ({
  resource,
  allResources,
  isNew,
  onSave,
  onDelete,
  onClose,
  categories = [],
}: ResourceEditorModalProps) => {
  const [activeTab, setActiveTab] = useState<'general' | 'controls' | 'recipes'>('general');
  const [iconMode, setIconMode] = useState<'emoji' | 'image'>(resource.iconType === 'image' ? 'image' : 'emoji');
  const [form, setForm] = useState<Resource>({ ...resource, iconType: resource.iconType || 'emoji' });
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isNewRecipe, setIsNewRecipe] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getResource = (id: string) => allResources.find(r => r.id === id);

  const toggleSpawnTile = (tileType: TileType) => {
    const tiles = form.spawnTiles.includes(tileType)
      ? form.spawnTiles.filter(t => t !== tileType)
      : [...form.spawnTiles, tileType];
    setForm({ ...form, spawnTiles: tiles });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${form.id}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('resource-icons')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('resource-icons')
        .getPublicUrl(data.path);

      setForm({ ...form, icon: urlData.publicUrl, iconType: 'image' });
      toast.success('Icon uploaded!');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const selectEmoji = (emoji: string) => {
    setForm({ ...form, icon: emoji, iconType: 'emoji' });
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Resource name is required');
      return;
    }
    onSave(form);
  };

  const handleDelete = () => {
    if (onDelete && confirm('Delete this resource? This cannot be undone.')) {
      onDelete();
    }
  };

  // Recipe handlers
  const handleNewRecipe = () => {
    setEditingRecipe({
      id: `recipe-${Date.now()}`,
      name: `${form.name} Recipe`,
      ingredients: [],
      outputQuantity: 1,
    });
    setIsNewRecipe(true);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe({ ...recipe });
    setIsNewRecipe(false);
  };

  const handleSaveRecipe = () => {
    if (!editingRecipe) return;
    if (editingRecipe.ingredients.length === 0) {
      toast.error('Add at least one ingredient');
      return;
    }

    const recipes = form.recipes || [];
    if (isNewRecipe) {
      setForm({ ...form, recipes: [...recipes, editingRecipe] });
    } else {
      setForm({ ...form, recipes: recipes.map(r => r.id === editingRecipe.id ? editingRecipe : r) });
    }
    setEditingRecipe(null);
    setIsNewRecipe(false);
  };

  const handleDeleteRecipe = (recipeId: string) => {
    const recipes = form.recipes || [];
    setForm({ ...form, recipes: recipes.filter(r => r.id !== recipeId) });
  };

  const handleAddIngredient = () => {
    if (!editingRecipe) return;
    const available = allResources.find(r => 
      r.id !== form.id && 
      !editingRecipe.ingredients.some(i => i.resourceId === r.id)
    );
    if (available) {
      setEditingRecipe({
        ...editingRecipe,
        ingredients: [...editingRecipe.ingredients, { resourceId: available.id, quantity: 1 }],
      });
    }
  };

  const handleUpdateIngredient = (index: number, updates: Partial<RecipeIngredient>) => {
    if (!editingRecipe) return;
    const newIngredients = [...editingRecipe.ingredients];
    newIngredients[index] = { ...newIngredients[index], ...updates };
    setEditingRecipe({ ...editingRecipe, ingredients: newIngredients });
  };

  const handleRemoveIngredient = (index: number) => {
    if (!editingRecipe) return;
    setEditingRecipe({
      ...editingRecipe,
      ingredients: editingRecipe.ingredients.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="game-panel w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ResourceIcon icon={form.icon} iconType={form.iconType} size="lg" />
            <h2 className="font-semibold">{isNew ? 'New Resource' : form.name}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('general')}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'general' 
                ? 'border-b-2 border-primary text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('controls')}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'controls' 
                ? 'border-b-2 border-primary text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Controls
          </button>
          <button
            onClick={() => setActiveTab('recipes')}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'recipes' 
                ? 'border-b-2 border-primary text-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Recipes {form.recipes?.length ? `(${form.recipes.length})` : ''}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field w-full"
                  placeholder="Resource name"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Icon</label>
                
                {/* Icon Type Tabs */}
                <div className="flex gap-1 mb-2">
                  <button
                    onClick={() => setIconMode('emoji')}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors',
                      iconMode === 'emoji' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    <Smile className="w-3 h-3" /> Emoji
                  </button>
                  <button
                    onClick={() => setIconMode('image')}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors',
                      iconMode === 'image' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    <Image className="w-3 h-3" /> Upload Image
                  </button>
                </div>

                {iconMode === 'emoji' ? (
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-1 bg-secondary/30 rounded">
                    {ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => selectEmoji(icon)}
                        className={cn(
                          'w-8 h-8 flex items-center justify-center rounded hover:bg-muted transition-colors',
                          form.icon === icon && form.iconType !== 'image' && 'bg-primary'
                        )}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="btn w-full flex items-center justify-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {uploading ? 'Uploading...' : 'Choose Image'}
                    </button>
                    {form.iconType === 'image' && form.icon.startsWith('http') && (
                      <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded">
                        <img src={form.icon} alt="Preview" className="w-10 h-10 object-cover rounded" />
                        <span className="text-xs text-muted-foreground flex-1 truncate">{form.icon}</span>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">Max 2MB. PNG, JPG, or GIF.</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Rarity</label>
                  <select
                    value={form.rarity}
                    onChange={(e) => setForm({ ...form, rarity: e.target.value as Resource['rarity'] })}
                    className="input-field w-full"
                  >
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                    <option value="epic">Epic</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Coin Value</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={form.coinValue}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setForm({ ...form, coinValue: Math.max(0, Math.round(val * 100) / 100) });
                    }}
                    className="input-field w-full"
                  />
                </div>
              </div>



              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field w-full"
                  placeholder="Brief description"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <div className="relative">
                  <div className="flex gap-2">
                    <input
                      value={newCategoryInput}
                      onChange={(e) => {
                        setNewCategoryInput(e.target.value);
                        setShowCategoryDropdown(true);
                      }}
                      onFocus={() => setShowCategoryDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 150)}
                      placeholder={form.category || "Select or create category..."}
                      className="input-field w-full"
                    />
                    {form.category && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, category: undefined })}
                        className="btn btn-ghost px-2 text-muted-foreground hover:text-foreground"
                        title="Clear category"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {showCategoryDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-auto">
                      {/* Show create option if typing something new */}
                      {newCategoryInput.trim() && !categories.includes(newCategoryInput.trim()) && (
                        <button
                          type="button"
                          onClick={() => {
                            setForm({ ...form, category: newCategoryInput.trim() });
                            setNewCategoryInput('');
                            setShowCategoryDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                        >
                          <Plus className="w-3 h-3" />
                          Create "{newCategoryInput.trim()}"
                        </button>
                      )}
                      
                      {/* Show existing categories filtered by input */}
                      {categories
                        .filter(c => c.toLowerCase().includes(newCategoryInput.toLowerCase()))
                        .map(category => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, category });
                              setNewCategoryInput('');
                              setShowCategoryDropdown(false);
                            }}
                            className={cn(
                              "w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2",
                              form.category === category && "bg-muted"
                            )}
                          >
                            <Tag className="w-3 h-3" />
                            {category}
                          </button>
                        ))}
                      
                      {categories.length === 0 && !newCategoryInput.trim() && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Type to create a new category
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {form.category && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Tag className="w-3 h-3" />
                    <span>{form.category}</span>
                  </div>
                )}
              </div>

              {/* Resource ID */}
              <div className="border-t border-border pt-4">
                <label className="text-xs text-muted-foreground mb-1 block">Resource ID</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded text-xs font-mono text-muted-foreground overflow-x-auto">
                    {resource.id}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resource.id);
                      toast.success('Resource ID copied to clipboard');
                    }}
                    className="btn btn-ghost p-2 shrink-0"
                    title="Copy Resource ID"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="space-y-4">
              {/* Gather Time */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Gather Time (seconds)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={form.gatherTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setForm({ ...form, gatherTime: Math.max(0, Math.round(val * 100) / 100) });
                  }}
                  className="input-field w-full"
                />
              </div>

              {/* Spawn Settings */}
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium mb-3">Spawn Settings</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Spawn Chance (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={Math.round(form.spawnChance * 10000) / 100}
                      onChange={(e) => {
                        const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                        setForm({ ...form, spawnChance: Math.round(val * 100) / 10000 });
                      }}
                      className="input-field w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Spawns On Tiles</label>
                    <div className="flex flex-wrap gap-1">
                      {TILE_TYPES.filter(t => t.walkable).map((tile) => (
                        <button
                          key={tile.type}
                          onClick={() => toggleSpawnTile(tile.type)}
                          className={cn(
                            'px-2 py-1 text-xs rounded flex items-center gap-1',
                            form.spawnTiles.includes(tile.type) ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          )}
                        >
                          <span className={cn('w-3 h-3 rounded-sm', tile.color)} />
                          {tile.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Properties */}
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium mb-3">Optional Properties</h4>
                
                {/* Checkboxes Grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="consumable"
                      checked={form.consumable || false}
                      onChange={(e) => setForm({ ...form, consumable: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="consumable" className="text-sm">Consumable</label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="canInflictDamage"
                      checked={form.canInflictDamage || false}
                      onChange={(e) => setForm({ ...form, canInflictDamage: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="canInflictDamage" className="text-sm">Inflict Damage</label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isContainer"
                      checked={form.isContainer || false}
                      onChange={(e) => setForm({ ...form, isContainer: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="isContainer" className="text-sm">Is Container</label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isFloating"
                      checked={form.isFloating || false}
                      onChange={(e) => {
                        const isFloating = e.target.checked;
                        // Floating items must be 1x1 or less
                        const newForm = { ...form, isFloating };
                        if (isFloating) {
                          newForm.tileWidth = Math.min(form.tileWidth ?? 1, 1);
                          newForm.tileHeight = Math.min(form.tileHeight ?? 1, 1);
                        }
                        setForm(newForm);
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="isFloating" className="text-sm">Is Floating</label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="display"
                      checked={form.display || false}
                      onChange={(e) => setForm({ ...form, display: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="display" className="text-sm">Display on Tile</label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="placeable"
                      checked={form.placeable || false}
                      onChange={(e) => setForm({ ...form, placeable: e.target.checked, passable: e.target.checked ? form.passable : false })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="placeable" className="text-sm">Placeable</label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="passable"
                      checked={form.passable || false}
                      onChange={(e) => setForm({ ...form, passable: e.target.checked })}
                      className="w-4 h-4"
                      disabled={!form.placeable}
                    />
                    <label htmlFor="passable" className={cn("text-sm", !form.placeable && "text-muted-foreground")}>Passable</label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasLimitedLifetime"
                      checked={form.hasLimitedLifetime || false}
                      onChange={(e) => setForm({ ...form, hasLimitedLifetime: e.target.checked, lifetimeHours: e.target.checked ? (form.lifetimeHours || 24) : undefined })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="hasLimitedLifetime" className="text-sm">Limited Lifetime</label>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useLife"
                      checked={form.useLife || false}
                      onChange={(e) => setForm({ ...form, useLife: e.target.checked, lifeDecreasePerUse: e.target.checked ? (form.lifeDecreasePerUse || 100) : undefined })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="useLife" className="text-sm">Use Life</label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  {form.hasLimitedLifetime && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Lifetime (game hours)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0.01"
                        value={form.lifetimeHours || 24}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 1;
                          setForm({ ...form, lifetimeHours: Math.max(0.01, Math.round(val * 100) / 100) });
                        }}
                        className="input-field w-full"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Hours before resource expires
                      </p>
                    </div>
                  )}
                  {form.useLife && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Life Decrease Per Use
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0.01"
                        value={form.lifeDecreasePerUse || 100}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 100;
                          setForm({ ...form, lifeDecreasePerUse: Math.max(0.01, Math.round(val * 100) / 100) });
                        }}
                        className="input-field w-full"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Default 100 = full consumption. Press 'E' to use.
                      </p>
                    </div>
                  )}
                </div>

                {/* Tile Dimensions */}
                <div className="border-t border-border pt-4 mt-4">
                  <h4 className="text-sm font-medium mb-3">Tile Dimensions</h4>
                  <p className="text-[10px] text-muted-foreground mb-3">
                    Size in tiles. 0 = smaller than tile, 1 = full tile (default), 2+ = multi-tile. Placement anchor is bottom-left.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Width (tiles)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        step="1"
                        min="0"
                        max={form.isFloating ? 1 : 99}
                        value={form.tileWidth ?? 1}
                        onChange={(e) => {
                          const rawVal = e.target.value;
                          if (rawVal === '') {
                            setForm({ ...form, tileWidth: 0 });
                            return;
                          }
                          const val = parseInt(rawVal, 10);
                          if (!isNaN(val)) {
                            const maxVal = form.isFloating ? 1 : 99;
                            setForm({ ...form, tileWidth: Math.max(0, Math.min(maxVal, val)) });
                          }
                        }}
                        className="input-field w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Height (tiles)</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        step="1"
                        min="0"
                        max={form.isFloating ? 1 : 99}
                        value={form.tileHeight ?? 1}
                        onChange={(e) => {
                          const rawVal = e.target.value;
                          if (rawVal === '') {
                            setForm({ ...form, tileHeight: 0 });
                            return;
                          }
                          const val = parseInt(rawVal, 10);
                          if (!isNaN(val)) {
                            const maxVal = form.isFloating ? 1 : 99;
                            setForm({ ...form, tileHeight: Math.max(0, Math.min(maxVal, val)) });
                          }
                        }}
                        className="input-field w-full"
                      />
                    </div>
                  </div>
                  {form.isFloating && (
                    <p className="text-[10px] text-amber-500 mt-2">
                      Floating items are limited to 1x1 or smaller
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Health Gain (on consumption)
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={form.healthGain || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setForm({ ...form, healthGain: Math.max(0, Math.round(val * 100) / 100) });
                      }}
                      className="input-field w-full"
                      disabled={!form.consumable}
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Health gained when item is consumed
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Damage Amount</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={form.damage || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setForm({ ...form, damage: Math.max(0, Math.round(val * 100) / 100) });
                      }}
                      className="input-field w-full"
                      disabled={!form.canInflictDamage}
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Damage dealt when triggered
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recipes' && (
            <div className="space-y-4">
              {editingRecipe ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Recipe Name</label>
                    <input
                      value={editingRecipe.name}
                      onChange={(e) => setEditingRecipe({ ...editingRecipe, name: e.target.value })}
                      className="input-field w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Output Quantity</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={editingRecipe.outputQuantity}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setEditingRecipe({ ...editingRecipe, outputQuantity: Math.max(1, parseInt(val) || 1) });
                      }}
                      className="input-field w-20"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-muted-foreground">Ingredients</label>
                      <button onClick={handleAddIngredient} className="btn btn-accent text-xs">
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </button>
                    </div>

                    {editingRecipe.ingredients.length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-4 bg-secondary/30 rounded">
                        No ingredients added
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {editingRecipe.ingredients.map((ingredient, index) => (
                          <div key={index} className="flex items-center gap-2 bg-secondary/30 p-2 rounded">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="input-field flex-1 flex items-center gap-2 text-left">
                                  {(() => {
                                    const selectedResource = allResources.find(r => r.id === ingredient.resourceId);
                                    return selectedResource ? (
                                      <>
                                        <ResourceIcon icon={selectedResource.icon} iconType={selectedResource.iconType} size="sm" />
                                        <span className="flex-1 truncate">{selectedResource.name}</span>
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">Select resource...</span>
                                    );
                                  })()}
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-1 max-h-60 overflow-auto z-50 bg-card border border-border" align="start">
                                {allResources
                                  .filter(r => r.id !== form.id)
                                  .map(r => (
                                    <button
                                      key={r.id}
                                      onClick={() => handleUpdateIngredient(index, { resourceId: r.id })}
                                      className={cn(
                                        "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors",
                                        ingredient.resourceId === r.id && "bg-primary/20"
                                      )}
                                    >
                                      <ResourceIcon icon={r.icon} iconType={r.iconType} size="sm" />
                                      <span className="truncate">{r.name}</span>
                                    </button>
                                  ))}
                              </PopoverContent>
                            </Popover>
                            <span className="text-muted-foreground">×</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={ingredient.quantity}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, '');
                                handleUpdateIngredient(index, { quantity: Math.max(1, parseInt(val) || 1) });
                              }}
                              className="input-field w-16 text-center"
                            />
                            <button 
                              onClick={() => handleRemoveIngredient(index)}
                              className="btn btn-ghost p-1 text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  {editingRecipe.ingredients.length > 0 && (
                    <div className="bg-secondary/50 rounded p-3">
                      <div className="text-xs text-muted-foreground mb-2">Preview</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {editingRecipe.ingredients.map((ing, i) => {
                          const r = getResource(ing.resourceId);
                          return (
                            <span key={i} className="flex items-center gap-1">
                              {i > 0 && <span className="text-muted-foreground">+</span>}
                              {r && <ResourceIcon icon={r.icon} iconType={r.iconType} size="sm" />}
                              <span className="text-sm">×{ing.quantity}</span>
                            </span>
                          );
                        })}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <ResourceIcon icon={form.icon} iconType={form.iconType} size="sm" />
                        <span className="text-sm">×{editingRecipe.outputQuantity}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={handleSaveRecipe} className="btn btn-primary flex-1">
                      Save Recipe
                    </button>
                    <button onClick={() => { setEditingRecipe(null); setIsNewRecipe(false); }} className="btn">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {(!form.recipes || form.recipes.length === 0) ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No recipes for this resource</p>
                      <p className="text-xs mt-1">Add a recipe to make this craftable</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {form.recipes.map((recipe) => (
                        <div 
                          key={recipe.id} 
                          className="bg-secondary/30 rounded p-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{recipe.name}</span>
                            <div className="flex gap-1">
                              <button 
                                onClick={() => handleEditRecipe(recipe)}
                                className="btn btn-ghost text-xs px-2"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteRecipe(recipe.id)}
                                className="btn btn-ghost text-xs px-2 text-destructive"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {recipe.ingredients.map((ing, i) => {
                              const r = getResource(ing.resourceId);
                              return (
                                <span key={i} className="flex items-center gap-0.5 text-xs">
                                  {i > 0 && <span className="text-muted-foreground mx-1">+</span>}
                                  {r && <ResourceIcon icon={r.icon} iconType={r.iconType} size="sm" />}
                                  <span className="text-muted-foreground">×{ing.quantity}</span>
                                </span>
                              );
                            })}
                            <ChevronRight className="w-3 h-3 text-muted-foreground mx-1" />
                            <ResourceIcon icon={form.icon} iconType={form.iconType} size="sm" />
                            <span className="text-xs text-muted-foreground">×{recipe.outputQuantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={handleNewRecipe} className="btn w-full">
                    <Plus className="w-4 h-4 mr-2" /> Add Recipe
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex gap-2">
          <button onClick={handleSave} className="btn btn-primary flex-1">
            <Save className="w-4 h-4 mr-2" /> {isNew ? 'Create Resource' : 'Save Changes'}
          </button>
          {!isNew && onDelete && (
            <button onClick={handleDelete} className="btn bg-destructive text-destructive-foreground">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceEditorModal;
