import { useState, useRef, useEffect } from "react";
import { Resource, Recipe, RecipeIngredient, TileType, TILE_TYPES, RARITY_COLORS } from "@/types/game";
import {
  X,
  Save,
  Trash2,
  Plus,
  ChevronRight,
  Upload,
  Image,
  ChevronDown,
  Tag,
  Copy,
  ClipboardPaste,
  Search,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ResourceIcon from "./ResourceIcon";
import { normalizeRecipes } from "@/utils/resourceConverter";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { normalizePeopleCapacity } from "@/lib/citizenBuildings";

interface ResourceEditorModalProps {
  resource: Resource;
  allResources: Resource[];
  isNew: boolean;
  onSave: (resource: Resource) => void;
  onDelete?: () => void;
  onClose: () => void;
  categories?: string[];
}

const ICONS = [
  "🪵",
  "🪨",
  "⛏️",
  "✨",
  "💎",
  "🔶",
  "🌿",
  "💧",
  "🔥",
  "❄️",
  "⚡",
  "🍎",
  "🌾",
  "🐟",
  "🥚",
  "🧵",
  "⚙️",
  "💀",
  "🍄",
  "🌸",
  "🦴",
  "🪶",
  "🌵",
  "🐚",
  "🍯",
  "🧲",
  "🔩",
  "🥇",
  "🪢",
  "🧊",
  "🖤",
  "💛",
  "🌱",
  "🐸",
  "🪴",
  "🥭",
  "⚫",
  "🌺",
  "🍇",
  "🥕",
  "🧀",
  "🍖",
  "🪙",
  "💰",
  "📦",
  "🎁",
  "⭐",
  "🌟",
  "💫",
  "🔮",
  "🧪",
  "⚗️",
  "🏺",
  "🗡️",
  "🛡️",
  "🏹",
  "🪓",
  "⚒️",
  "🔧",
  "🗝️",
  "🔑",
];

const ResourceEditorModal = ({
  resource,
  allResources,
  isNew,
  onSave,
  onDelete,
  onClose,
  categories = [],
}: ResourceEditorModalProps) => {
  const [activeTab, setActiveTab] = useState<"general" | "controls" | "properties" | "recipes">("general");
  const [form, setForm] = useState<Resource>({ ...resource, iconType: "image" });
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isNewRecipe, setIsNewRecipe] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showCopyFromIdDialog, setShowCopyFromIdDialog] = useState(false);
  const [copyFromIdInput, setCopyFromIdInput] = useState("");
  const [loadingCopyFrom, setLoadingCopyFrom] = useState(false);
  const [producesResourceSearch, setProducesResourceSearch] = useState("");
  const [ingredientSearches, setIngredientSearches] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getResource = (id: string) => allResources.find((r) => r.id === id);

  const handleCopyFromId = async () => {
    const resourceId = copyFromIdInput.trim();
    if (!resourceId) {
      toast.error("Please enter a resource ID");
      return;
    }

    setLoadingCopyFrom(true);
    try {
      const { data, error } = await supabase
        .from("resource_marketplace")
        .select("*")
        .eq("id", resourceId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error("Resource not found with that ID");
        return;
      }

      // Prefill form with copied resource data (keep the new resource's ID)
      setForm({
        ...form,
        name: data.name + " (Copy)",
        icon: data.icon,
        iconType: data.icon?.startsWith("http") ? "image" : "emoji",
        rarity: data.rarity as Resource["rarity"],
        description: data.description || "",
        gatherTime: data.gather_time || 1000,
        spawnTiles: data.spawn_tiles as Resource["spawnTiles"],
        spawnChance: Number(data.spawn_chance),
        coinValue: data.base_value,
        consumable: data.consumable || false,
        healthGain: data.health_gain || 0,
        canInflictDamage: data.can_inflict_damage || false,
        damage: data.damage || 0,
        projectile: data.projectile ?? false,
        projectileDistance: data.projectile_distance ?? 5,
        recipes: normalizeRecipes(data.recipe),
        isContainer: data.is_container || false,
        containerSpawnsResources: data.container_spawns_resources || false,
        containerSpawnRandom: data.container_spawn_random ?? true,
        containerSpawnResourceIds: data.container_spawn_resource_ids || undefined,
        isFloating: data.is_floating || false,
        canFloatOnWater: data.can_float_on_water || false,
        holdsPlayer: data.holds_player || false,
        holdsPeople: data.holds_people || false,
        rotatable: data.rotatable || false,
        peopleCapacity: normalizePeopleCapacity(data.people_capacity),
        display: data.display || false,
        placeable: data.placeable || false,
        passable: data.passable || false,
        category: data.category || undefined,
        hasLimitedLifetime: data.has_limited_lifetime || false,
        lifetimeHours: data.lifetime_hours ?? undefined,
        tileWidth: data.tile_width ?? 1,
        tileHeight: data.tile_height ?? 1,
        useLife: data.use_life || false,
        lifeDecreasePerUse: data.life_decrease_per_use ?? 100,
        destructible: data.destructible || false,
        maxLife: data.max_life ?? 100,
        destroyedBy: data.destroyed_by || undefined,
        produceTile: data.produce_tile || false,
        produceTileType: (data.produce_tile_type as Resource["produceTileType"]) || undefined,
        producesResource: data.produces_resource || undefined,
        producesAmount: data.produces_amount ?? 1,
        producesIntervalHours: data.produces_interval_hours ?? 24,
        emitsLight: data.emits_light || false,
        givesXp: data.gives_xp || false,
        xpAmount: data.xp_amount ?? 0,
      });

      toast.success(`Copied values from "${data.name}"`);
      setShowCopyFromIdDialog(false);
      setCopyFromIdInput("");
    } catch (err: any) {
      toast.error("Failed to fetch resource: " + err.message);
    } finally {
      setLoadingCopyFrom(false);
    }
  };

  const toggleSpawnTile = (tileType: TileType) => {
    const tiles = form.spawnTiles.includes(tileType)
      ? form.spawnTiles.filter((t) => t !== tileType)
      : [...form.spawnTiles, tileType];
    setForm({ ...form, spawnTiles: tiles });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${form.id}-${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage.from("resource-icons").upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from("resource-icons").getPublicUrl(data.path);

      setForm({ ...form, icon: urlData.publicUrl, iconType: "image" });
      toast.success("Icon uploaded!");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const selectEmoji = (emoji: string) => {
    setForm({ ...form, icon: emoji, iconType: "emoji" });
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Resource name is required");
      return;
    }
    onSave(form);
  };

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const saveShortcutHint = typeof navigator !== "undefined" && /mac/i.test(navigator.platform) ? "⌘S" : "Ctrl+S";

  const handleDelete = () => {
    if (onDelete && confirm("Delete this resource? This cannot be undone.")) {
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
    if ((editingRecipe.ingredients || []).length === 0) {
      toast.error("Add at least one ingredient");
      return;
    }

    const recipes = form.recipes || [];
    if (isNewRecipe) {
      setForm({ ...form, recipes: [...recipes, editingRecipe] });
    } else {
      setForm({ ...form, recipes: recipes.map((r) => (r.id === editingRecipe.id ? editingRecipe : r)) });
    }
    setEditingRecipe(null);
    setIsNewRecipe(false);
  };

  const handleDeleteRecipe = (recipeId: string) => {
    const recipes = form.recipes || [];
    setForm({ ...form, recipes: recipes.filter((r) => r.id !== recipeId) });
  };

  const handleAdoptPrice = (recipe: Recipe) => {
    // Calculate total cost of all ingredients
    let totalCost = 0;
    for (const ingredient of recipe.ingredients || []) {
      const ingredientResource = getResource(ingredient.resourceId);
      if (ingredientResource) {
        totalCost += ingredientResource.coinValue * ingredient.quantity;
      }
    }

    // Add 10% markup and round up
    const newPrice = Math.ceil(totalCost * 1.1);
    setForm({ ...form, coinValue: newPrice });
    toast.success(
      `Price set to ${newPrice.toLocaleString()} coins (ingredients: ${totalCost.toLocaleString()} + 10% markup)`,
    );
  };

  const handleDuplicateRecipe = (recipe: Recipe) => {
    const recipes = form.recipes || [];
    const duplicatedRecipe: Recipe = {
      ...recipe,
      id: `recipe-${Date.now()}`,
      name: `${recipe.name} (Copy)`,
    };
    setForm({ ...form, recipes: [...recipes, duplicatedRecipe] });
    toast.success("Recipe duplicated");
  };

  const handleAddIngredient = () => {
    if (!editingRecipe) return;
    const ingredients = editingRecipe.ingredients || [];
    const available = allResources.find((r) => r.id !== form.id && !ingredients.some((i) => i.resourceId === r.id));
    if (available) {
      setEditingRecipe({
        ...editingRecipe,
        ingredients: [...ingredients, { resourceId: available.id, quantity: 1 }],
      });
    }
  };

  const handleUpdateIngredient = (index: number, updates: Partial<RecipeIngredient>) => {
    if (!editingRecipe) return;
    const newIngredients = [...(editingRecipe.ingredients || [])];
    newIngredients[index] = { ...newIngredients[index], ...updates };
    setEditingRecipe({ ...editingRecipe, ingredients: newIngredients });
  };

  const handleRemoveIngredient = (index: number) => {
    if (!editingRecipe) return;
    setEditingRecipe({
      ...editingRecipe,
      ingredients: (editingRecipe.ingredients || []).filter((_, i) => i !== index),
    });
  };

  const propertyToggle = (
    id: string,
    label: string,
    enabled: boolean | undefined,
    update: (enabled: boolean) => void,
    disabled = false,
  ) => (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(100px,160px)] items-center gap-3 border-b border-border py-3">
      <label htmlFor={id} className={cn("text-sm", disabled && "text-muted-foreground")}>
        {label}
      </label>
      <div className="flex justify-end">
        <Switch id={id} checked={Boolean(enabled)} disabled={disabled} onCheckedChange={update} />
      </div>
    </div>
  );
  const propertyNumber = (id: string, label: string, value: number, update: (value: number) => void, whole = false) => (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(100px,160px)] items-center gap-3 border-b border-border py-1">
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={whole ? "numeric" : "decimal"}
        className="input-field w-full"
        value={value}
        onChange={(event) => {
          const parsed = whole ? parseInt(event.target.value, 10) : parseFloat(event.target.value);
          if (event.target.value === "") update(0);
          else if (Number.isFinite(parsed)) update(parsed);
        }}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="game-panel w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <ResourceIcon icon={form.icon} iconType={form.iconType} size="lg" />
            <h2 className="font-semibold">{isNew ? "New Resource" : form.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            {isNew && (
              <button
                onClick={() => setShowCopyFromIdDialog(true)}
                className="btn btn-ghost p-1.5 text-muted-foreground hover:text-foreground"
                title="Copy from Resource ID"
              >
                <ClipboardPaste className="w-5 h-5" />
              </button>
            )}
            <button onClick={onClose} className="btn btn-ghost p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border" role="tablist" aria-label="Resource settings">
          {(["general", "controls", "properties", "recipes"] as const).map((tab) => (
            <Button
              key={tab}
              variant="ghost"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 min-w-0 rounded-none px-2 py-2 text-sm font-medium capitalize",
                activeTab === tab ? "border-b-2 border-primary text-foreground" : "text-muted-foreground",
              )}
            >
              {tab}
              {tab === "recipes" && form.recipes?.length ? ` (${form.recipes.length})` : ""}
            </Button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === "general" && (
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

                {/* Image Upload */}
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
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors bg-primary text-primary-foreground hover:bg-primary/90 mb-2"
                >
                  <Image className="w-3 h-3" /> {uploading ? "Uploading..." : "Upload Image"}
                </button>

                <div className="space-y-2">
                  {form.icon.startsWith("http") && (
                    <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded">
                      <img src={form.icon} alt="Preview" className="w-10 h-10 object-cover rounded" />
                      <span className="text-xs text-muted-foreground flex-1 truncate">{form.icon}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">Max 2MB. PNG, JPG, or GIF.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Rarity</label>
                  <select
                    value={form.rarity}
                    onChange={(e) => setForm({ ...form, rarity: e.target.value as Resource["rarity"] })}
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
                            setNewCategoryInput("");
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
                        .filter((c) => c.toLowerCase().includes(newCategoryInput.toLowerCase()))
                        .map((category) => (
                          <button
                            key={category}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, category });
                              setNewCategoryInput("");
                              setShowCategoryDropdown(false);
                            }}
                            className={cn(
                              "w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2",
                              form.category === category && "bg-muted",
                            )}
                          >
                            <Tag className="w-3 h-3" />
                            {category}
                          </button>
                        ))}

                      {categories.length === 0 && !newCategoryInput.trim() && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Type to create a new category</div>
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
                      toast.success("Resource ID copied to clipboard");
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

          {activeTab === "properties" && (
            <div>
              {propertyNumber(
                "tile-width",
                "Tile Width",
                form.tileWidth ?? 1,
                (value) => setForm({ ...form, tileWidth: Math.max(0, Math.min(form.isFloating ? 1 : 99, value)) }),
                true,
              )}
              {propertyNumber(
                "tile-height",
                "Tile Height",
                form.tileHeight ?? 1,
                (value) => setForm({ ...form, tileHeight: Math.max(0, Math.min(form.isFloating ? 1 : 99, value)) }),
                true,
              )}
              {propertyNumber(
                "gather-time",
                "Gather Time (seconds)",
                form.gatherTime,
                (value) => setForm({ ...form, gatherTime: Math.max(0, Math.round(value)) }),
                true,
              )}
              {propertyNumber("spawn-chance", "Spawn Chance (%)", Math.round(form.spawnChance * 10000) / 100, (value) =>
                setForm({ ...form, spawnChance: Math.round(Math.min(100, Math.max(0, value)) * 100) / 10000 }),
              )}
              {propertyToggle("rotatable", "Rotatable", form.rotatable, (rotatable) => setForm({ ...form, rotatable }))}
              {propertyToggle("holds-people", "Holds People", form.holdsPeople, (holdsPeople) =>
                setForm({ ...form, holdsPeople, peopleCapacity: normalizePeopleCapacity(form.peopleCapacity) }),
              )}
              {form.holdsPeople &&
                propertyNumber(
                  "people-capacity",
                  "People Capacity",
                  form.peopleCapacity ?? 1,
                  (value) => setForm({ ...form, peopleCapacity: normalizePeopleCapacity(value) }),
                  true,
                )}
              {propertyToggle("isFloating", "Hovers Above Tile", form.isFloating, (isFloating) =>
                setForm({
                  ...form,
                  isFloating,
                  tileWidth: isFloating ? Math.min(form.tileWidth ?? 1, 1) : form.tileWidth,
                  tileHeight: isFloating ? Math.min(form.tileHeight ?? 1, 1) : form.tileHeight,
                }),
              )}
              {propertyToggle("canFloatOnWater", "Can Float on Water", form.canFloatOnWater, (canFloatOnWater) =>
                setForm({ ...form, canFloatOnWater }),
              )}
              {propertyToggle("holdsPlayer", "Holds Player (Vehicle/Boat)", form.holdsPlayer, (holdsPlayer) =>
                setForm({ ...form, holdsPlayer }),
              )}
              {propertyToggle("display", "Display on Tile", form.display, (display) => setForm({ ...form, display }))}
              {propertyToggle("emitsLight", "Emits Light (at night)", form.emitsLight, (emitsLight) =>
                setForm({ ...form, emitsLight }),
              )}
              {propertyToggle("placeable", "Placeable", form.placeable, (placeable) =>
                setForm({ ...form, placeable, passable: placeable ? form.passable : false }),
              )}
              {propertyToggle(
                "passable",
                "Passable",
                form.passable,
                (passable) => setForm({ ...form, passable }),
                !form.placeable,
              )}
              {propertyToggle("hasLimitedLifetime", "Limited Lifetime", form.hasLimitedLifetime, (hasLimitedLifetime) =>
                setForm({
                  ...form,
                  hasLimitedLifetime,
                  lifetimeHours: hasLimitedLifetime ? form.lifetimeHours || 24 : undefined,
                }),
              )}
              {form.hasLimitedLifetime &&
                propertyNumber("lifetime-hours", "Lifetime (game hours)", form.lifetimeHours || 24, (value) =>
                  setForm({ ...form, lifetimeHours: Math.max(0.01, Math.round(value * 100) / 100) }),
                )}
              {propertyToggle("useLife", "Use Life", form.useLife, (useLife) =>
                setForm({ ...form, useLife, lifeDecreasePerUse: useLife ? form.lifeDecreasePerUse || 100 : undefined }),
              )}
              {form.useLife &&
                propertyNumber("life-per-use", "Life Decrease Per Use", form.lifeDecreasePerUse || 100, (value) =>
                  setForm({ ...form, lifeDecreasePerUse: Math.max(0.01, Math.round(value * 100) / 100) }),
                )}
              {propertyToggle("consumable", "Consumable", form.consumable, (consumable) =>
                setForm({ ...form, consumable, healthGain: consumable ? form.healthGain || 0 : 0 }),
              )}
              {form.consumable &&
                propertyNumber(
                  "health-gain",
                  "Health Gain",
                  form.healthGain || 0,
                  (value) => setForm({ ...form, healthGain: Math.max(0, Math.round(value)) }),
                  true,
                )}
              {propertyToggle("canInflictDamage", "Inflict Damage", form.canInflictDamage, (canInflictDamage) =>
                setForm({ ...form, canInflictDamage, damage: canInflictDamage ? form.damage || 1 : 0 }),
              )}
              {form.canInflictDamage && (
                <>
                  {propertyNumber(
                    "damage-amount",
                    "Damage Amount",
                    form.damage || 0,
                    (value) => setForm({ ...form, damage: Math.max(0, Math.round(value)) }),
                    true,
                  )}
                  {propertyToggle("projectile", "Projectile", form.projectile, (projectile) =>
                    setForm({ ...form, projectile }),
                  )}
                  {form.projectile &&
                    propertyNumber(
                      "projectile-distance",
                      "Projectile Distance (tiles)",
                      form.projectileDistance ?? 5,
                      (value) => setForm({ ...form, projectileDistance: Math.max(1, value) }),
                      true,
                    )}
                </>
              )}
              {propertyToggle("givesXp", "Gives XP", form.givesXp, (givesXp) =>
                setForm({ ...form, givesXp, xpAmount: givesXp ? form.xpAmount || 1 : 0 }),
              )}
              {form.givesXp &&
                propertyNumber(
                  "xp-amount",
                  "XP Amount",
                  form.xpAmount || 0,
                  (value) => setForm({ ...form, xpAmount: Math.max(0, value) }),
                  true,
                )}
            </div>
          )}

          {activeTab === "controls" && (
            <div className="space-y-4">
              {/* Spawn Settings */}
              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-medium mb-3">Spawn Settings</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Spawns On Tiles</label>
                    <div className="flex flex-wrap gap-1">
                      {TILE_TYPES.map((tile) => (
                        <button
                          key={tile.type}
                          onClick={() => toggleSpawnTile(tile.type)}
                          className={cn(
                            "px-2 py-1 text-xs rounded flex items-center gap-1",
                            form.spawnTiles.includes(tile.type) ? "bg-primary text-primary-foreground" : "bg-muted",
                          )}
                        >
                          <span className={cn("w-3 h-3 rounded-sm", tile.color)} />
                          {tile.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Destructible Section */}
              <div className="bg-secondary/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="destructible"
                    checked={form.destructible || false}
                    onChange={(e) => setForm({ ...form, destructible: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="destructible" className="text-sm font-medium">
                    💥 Destructible
                  </label>
                </div>

                {form.destructible && (
                  <div className="space-y-3 mt-3">
                    <p className="text-[10px] text-muted-foreground">
                      This item can be destroyed by damage-inflicting items (press E)
                    </p>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Max Life/Durability</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="10000"
                        value={form.maxLife || 100}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 100;
                          setForm({ ...form, maxLife: Math.max(1, Math.min(10000, val)) });
                        }}
                        className="input-field w-full"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">Total HP before destruction (1-10000)</p>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Destroyed By (optional)</label>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Select which items can destroy this. Leave empty for any damage item.
                      </p>
                      <div className="max-h-32 overflow-y-auto bg-background/50 rounded-md p-2 space-y-1">
                        {allResources.filter((r) => r.canInflictDamage && r.id !== form.id).length === 0 ? (
                          <p className="text-[10px] text-muted-foreground italic">
                            No damage-inflicting items available
                          </p>
                        ) : (
                          allResources
                            .filter((r) => r.canInflictDamage && r.id !== form.id)
                            .map((r) => (
                              <label
                                key={r.id}
                                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-secondary/30 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={form.destroyedBy?.includes(r.id) || false}
                                  onChange={(e) => {
                                    const current = form.destroyedBy || [];
                                    if (e.target.checked) {
                                      setForm({ ...form, destroyedBy: [...current, r.id] });
                                    } else {
                                      setForm({ ...form, destroyedBy: current.filter((id) => id !== r.id) });
                                    }
                                  }}
                                  className="w-3 h-3"
                                />
                                <ResourceIcon icon={r.icon} iconType={r.iconType} size="sm" />
                                <span>{r.name}</span>
                                <span className="text-muted-foreground">({r.damage} dmg)</span>
                              </label>
                            ))
                        )}
                      </div>
                      {form.destroyedBy && form.destroyedBy.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, destroyedBy: [] })}
                          className="text-[10px] text-primary hover:underline mt-1"
                        >
                          Clear selection (allow any)
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Container Section */}
              <div className="bg-secondary/30 rounded-lg p-3">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">📦 Container</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isContainer"
                      checked={form.isContainer || false}
                      onChange={(e) => setForm({ ...form, isContainer: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="isContainer" className="text-sm">
                      Is Container
                    </label>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    When enabled, this item can hold an inventory of resources
                  </p>

                  {form.isContainer && (
                    <>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          id="containerSpawnsResources"
                          checked={form.containerSpawnsResources || false}
                          onChange={(e) => setForm({ ...form, containerSpawnsResources: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <label htmlFor="containerSpawnsResources" className="text-sm">
                          Spawn Resources Inside
                        </label>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        When enabled, this container will spawn with resources inside it
                      </p>

                      {form.containerSpawnsResources && (
                        <div className="space-y-3 mt-2 pl-4 border-l-2 border-border">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id="containerSpawnRandom"
                              name="containerSpawnMode"
                              checked={form.containerSpawnRandom !== false}
                              onChange={() =>
                                setForm({ ...form, containerSpawnRandom: true, containerSpawnResourceIds: [] })
                              }
                              className="w-4 h-4"
                            />
                            <label htmlFor="containerSpawnRandom" className="text-sm">
                              Random Resources
                            </label>
                          </div>
                          <p className="text-[10px] text-muted-foreground -mt-2">
                            Spawn random resources from the world's resource pool
                          </p>

                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id="containerSpawnSelected"
                              name="containerSpawnMode"
                              checked={form.containerSpawnRandom === false}
                              onChange={() => setForm({ ...form, containerSpawnRandom: false })}
                              className="w-4 h-4"
                            />
                            <label htmlFor="containerSpawnSelected" className="text-sm">
                              Specific Resources
                            </label>
                          </div>
                          <p className="text-[10px] text-muted-foreground -mt-2">
                            Select which resources can spawn in this container
                          </p>

                          {form.containerSpawnRandom === false && (
                            <div className="mt-2">
                              <label className="text-xs text-muted-foreground mb-1 block">
                                Select Resources to Spawn
                              </label>
                              <div className="max-h-32 overflow-y-auto bg-background/50 rounded-md p-2 space-y-1">
                                {allResources.filter((r) => r.id !== form.id).length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No other resources available</p>
                                ) : (
                                  allResources
                                    .filter((r) => r.id !== form.id)
                                    .map((r) => (
                                      <label
                                        key={r.id}
                                        className="flex items-center gap-2 cursor-pointer p-1 hover:bg-secondary/50 rounded"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={(form.containerSpawnResourceIds || []).includes(r.id)}
                                          onChange={(e) => {
                                            const currentIds = form.containerSpawnResourceIds || [];
                                            if (e.target.checked) {
                                              setForm({ ...form, containerSpawnResourceIds: [...currentIds, r.id] });
                                            } else {
                                              setForm({
                                                ...form,
                                                containerSpawnResourceIds: currentIds.filter((id) => id !== r.id),
                                              });
                                            }
                                          }}
                                          className="w-3 h-3"
                                        />
                                        <ResourceIcon icon={r.icon} iconType={r.iconType} size="sm" />
                                        <span className="text-xs">{r.name}</span>
                                      </label>
                                    ))
                                )}
                              </div>
                              {(form.containerSpawnResourceIds?.length || 0) > 0 && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {form.containerSpawnResourceIds?.length} resource(s) selected
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Produce Tile Section */}
              <div className="bg-secondary/30 rounded-lg p-3">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">🌱 Produce Tile</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="produceTile"
                      checked={form.produceTile || false}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          produceTile: e.target.checked,
                          produceTileType: e.target.checked ? form.produceTileType || "grass" : undefined,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <label htmlFor="produceTile" className="text-sm">
                      Transform Tile
                    </label>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    When enabled, using this item on an empty tile (press E) transforms it into the selected tile type
                  </p>

                  {form.produceTile && (
                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block">Target Tile Type</label>
                      <div className="flex flex-wrap gap-1.5">
                        {TILE_TYPES.map((tile) => (
                          <button
                            key={tile.type}
                            type="button"
                            onClick={() => setForm({ ...form, produceTileType: tile.type })}
                            className={cn(
                              "px-2 py-1 text-xs rounded-md capitalize transition-colors",
                              form.produceTileType === tile.type
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary hover:bg-secondary/70",
                            )}
                          >
                            {tile.type}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Resource Production Section */}
              <div className="bg-secondary/30 rounded-lg p-3">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">⚙️ Resource Production</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="producesResource"
                      checked={!!form.producesResource}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // Find first available resource
                          const firstResource = allResources.find((r) => r.id !== form.id);
                          setForm({
                            ...form,
                            producesResource: firstResource?.id || undefined,
                            producesAmount: form.producesAmount ?? 1,
                            producesIntervalHours: form.producesIntervalHours ?? 24,
                          });
                        } else {
                          setForm({ ...form, producesResource: undefined });
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="producesResource" className="text-sm">
                      Produces Resources
                    </label>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    When enabled, this item will periodically produce resources that can be collected
                  </p>

                  {form.producesResource && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-2 block">Resource to Produce</label>
                        <Popover onOpenChange={(open) => !open && setProducesResourceSearch("")}>
                          <PopoverTrigger asChild>
                            <button className="input-field w-full flex items-center gap-2 text-left">
                              {(() => {
                                const selectedResource = allResources.find((r) => r.id === form.producesResource);
                                return selectedResource ? (
                                  <>
                                    <ResourceIcon
                                      icon={selectedResource.icon}
                                      iconType={selectedResource.iconType}
                                      size="sm"
                                    />
                                    <span className="flex-1 truncate">{selectedResource.name}</span>
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">Select resource...</span>
                                );
                              })()}
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2 z-50 bg-card border border-border" align="start">
                            <div className="relative mb-2">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                              <input
                                type="text"
                                placeholder="Search resources..."
                                value={producesResourceSearch}
                                onChange={(e) => setProducesResourceSearch(e.target.value)}
                                className="input-field w-full pl-7 py-1.5 text-sm"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-48 overflow-auto space-y-0.5">
                              {allResources
                                .filter(
                                  (r) =>
                                    r.id !== form.id &&
                                    r.name.toLowerCase().includes(producesResourceSearch.toLowerCase()),
                                )
                                .map((r) => (
                                  <button
                                    key={r.id}
                                    onClick={() => {
                                      setForm({ ...form, producesResource: r.id });
                                      setProducesResourceSearch("");
                                    }}
                                    className={cn(
                                      "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors",
                                      form.producesResource === r.id && "bg-primary/20",
                                    )}
                                  >
                                    <ResourceIcon icon={r.icon} iconType={r.iconType} size="sm" />
                                    <span className="truncate">{r.name}</span>
                                  </button>
                                ))}
                              {allResources.filter(
                                (r) =>
                                  r.id !== form.id &&
                                  r.name.toLowerCase().includes(producesResourceSearch.toLowerCase()),
                              ).length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-2">No resources found</p>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Amount per Cycle</label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={form.producesAmount || 1}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setForm({ ...form, producesAmount: Math.max(1, Math.min(100, val)) });
                            }}
                            className="input-field w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Interval (game hours)</label>
                          <input
                            type="number"
                            min={1}
                            max={1000}
                            value={form.producesIntervalHours || 24}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 24;
                              setForm({ ...form, producesIntervalHours: Math.max(1, Math.min(1000, val)) });
                            }}
                            className="input-field w-full"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Every {form.producesIntervalHours || 24} game hours, this produces {form.producesAmount || 1}x{" "}
                        {allResources.find((r) => r.id === form.producesResource)?.name || "resource"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "recipes" && (
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
                        const val = e.target.value.replace(/[^0-9]/g, "");
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

                    {(editingRecipe.ingredients || []).length === 0 ? (
                      <div className="text-sm text-muted-foreground text-center py-4 bg-secondary/30 rounded">
                        No ingredients added
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(editingRecipe.ingredients || []).map((ingredient, index) => (
                          <div key={index} className="flex items-center gap-2 bg-secondary/30 p-2 rounded">
                            <Popover
                              onOpenChange={(open) => {
                                if (!open) {
                                  setIngredientSearches((prev) => ({ ...prev, [index]: "" }));
                                }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <button className="input-field flex-1 flex items-center gap-2 text-left">
                                  {(() => {
                                    const selectedResource = allResources.find((r) => r.id === ingredient.resourceId);
                                    return selectedResource ? (
                                      <>
                                        <ResourceIcon
                                          icon={selectedResource.icon}
                                          iconType={selectedResource.iconType}
                                          size="sm"
                                        />
                                        <span className="flex-1 truncate">{selectedResource.name}</span>
                                      </>
                                    ) : (
                                      <span className="text-muted-foreground">Select resource...</span>
                                    );
                                  })()}
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-2 z-50 bg-card border border-border" align="start">
                                <div className="relative mb-2">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                  <input
                                    type="text"
                                    placeholder="Search resources..."
                                    value={ingredientSearches[index] || ""}
                                    onChange={(e) =>
                                      setIngredientSearches((prev) => ({ ...prev, [index]: e.target.value }))
                                    }
                                    className="input-field w-full pl-7 py-1.5 text-sm"
                                    autoFocus
                                  />
                                </div>
                                <div className="max-h-48 overflow-auto space-y-0.5">
                                  {allResources
                                    .filter(
                                      (r) =>
                                        r.id !== form.id &&
                                        r.name.toLowerCase().includes((ingredientSearches[index] || "").toLowerCase()),
                                    )
                                    .map((r) => (
                                      <button
                                        key={r.id}
                                        onClick={() => {
                                          handleUpdateIngredient(index, { resourceId: r.id });
                                          setIngredientSearches((prev) => ({ ...prev, [index]: "" }));
                                        }}
                                        className={cn(
                                          "w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-muted transition-colors",
                                          ingredient.resourceId === r.id && "bg-primary/20",
                                        )}
                                      >
                                        <ResourceIcon icon={r.icon} iconType={r.iconType} size="sm" />
                                        <span className="truncate">{r.name}</span>
                                      </button>
                                    ))}
                                  {allResources.filter(
                                    (r) =>
                                      r.id !== form.id &&
                                      r.name.toLowerCase().includes((ingredientSearches[index] || "").toLowerCase()),
                                  ).length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-2">No resources found</p>
                                  )}
                                </div>
                              </PopoverContent>
                            </Popover>
                            <span className="text-muted-foreground">×</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={ingredient.quantity}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9]/g, "");
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
                  {(editingRecipe.ingredients || []).length > 0 && (
                    <div className="bg-secondary/50 rounded p-3">
                      <div className="text-xs text-muted-foreground mb-2">Preview</div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {(editingRecipe.ingredients || []).map((ing, i) => {
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
                    <button
                      onClick={() => {
                        setEditingRecipe(null);
                        setIsNewRecipe(false);
                      }}
                      className="btn"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {!form.recipes || form.recipes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No recipes for this resource</p>
                      <p className="text-xs mt-1">Add a recipe to make this craftable</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {form.recipes.map((recipe) => (
                        <div key={recipe.id} className="bg-secondary/30 rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{recipe.name}</span>
                            <div className="flex gap-1">
                              <button onClick={() => handleEditRecipe(recipe)} className="btn btn-ghost text-xs px-2">
                                Edit
                              </button>
                              <button
                                onClick={() => handleAdoptPrice(recipe)}
                                className="btn btn-ghost text-xs px-2"
                                title="Set resource price based on ingredient costs + 10% markup"
                              >
                                Adopt Price
                              </button>
                              <button
                                onClick={() => handleDuplicateRecipe(recipe)}
                                className="btn btn-ghost text-xs px-2"
                              >
                                Duplicate
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
                            {(recipe.ingredients || []).map((ing, i) => {
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
        <div className="border-t border-border flex gap-2">
          <button
            onClick={handleSave}
            className="btn btn-primary flex-1"
            title={`${isNew ? "Create" : "Save"} (${saveShortcutHint})`}
          >
            <Save className="w-4 h-4 mr-2" /> {isNew ? "Create Resource" : "Save Changes"}
            <kbd className="ml-2 px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-mono">{saveShortcutHint}</kbd>
          </button>
          {!isNew && onDelete && (
            <button onClick={handleDelete} className="btn bg-destructive text-destructive-foreground">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Copy from ID Dialog */}
      <Dialog open={showCopyFromIdDialog} onOpenChange={setShowCopyFromIdDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy from Resource ID</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Paste a resource ID to copy all its values into this new resource.
            </p>
            <input
              value={copyFromIdInput}
              onChange={(e) => setCopyFromIdInput(e.target.value)}
              placeholder="Paste resource ID here..."
              className="input-field w-full font-mono text-sm"
              autoFocus
            />
          </div>
          <DialogFooter>
            <button
              onClick={() => {
                setShowCopyFromIdDialog(false);
                setCopyFromIdInput("");
              }}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={handleCopyFromId}
              disabled={loadingCopyFrom || !copyFromIdInput.trim()}
              className="btn btn-primary"
            >
              {loadingCopyFrom ? "Loading..." : "Copy Values"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResourceEditorModal;
