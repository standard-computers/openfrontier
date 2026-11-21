import { X, Store, Search, ShoppingCart, ListPlus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Resource, RARITY_COLORS } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import ResourceIcon from './ResourceIcon';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getMarketPurchaseTotal } from '@/lib/marketPurchase';

interface MarketplaceItem {
  id: string;
  name: string;
  icon: string;
  iconType?: 'emoji' | 'image';
  rarity: string;
  description: string;
  baseValue: number;
}

interface MarketplacePanelProps {
  isOpen: boolean;
  onClose: () => void;
  marketName: string;
  playerCoins: number;
  inventory: { resourceId: string | null; quantity: number }[];
  resources: Resource[];
  onBuyResource: (resource: Resource, cost: number, quantity?: number) => { success: boolean; message: string };
  onSellResource: (resourceId: string, value: number, quantity?: number) => { success: boolean; message: string; soldCount?: number };
}

const MarketplacePanel = ({
  isOpen,
  onClose,
  marketName,
  playerCoins,
  inventory,
  resources,
  onBuyResource,
  onSellResource,
}: MarketplacePanelProps) => {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [quantityItemId, setQuantityItemId] = useState<string | null>(null);
  const [quantityText, setQuantityText] = useState('1');
  const [buying, setBuying] = useState(false);
  const purchaseInFlight = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setQuantityItemId(null);
      setQuantityText('1');
      loadMarketplaceItems();
    }
  }, [isOpen]);

  const loadMarketplaceItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resource_marketplace')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      setItems(data.map(item => ({
        id: item.id,
        name: item.name,
        icon: item.icon,
        iconType: item.icon.startsWith('http') ? 'image' : 'emoji',
        rarity: item.rarity,
        description: item.description || '',
        baseValue: item.base_value,
      })));
    } catch (error) {
      console.error('Error loading marketplace:', error);
      toast.error('Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (item: MarketplaceItem, enteredQuantity = '1') => {
    if (purchaseInFlight.current) return;
    // Market sells at 2x the base value
    const purchase = getMarketPurchaseTotal(item.baseValue, enteredQuantity);
    if (!purchase) { toast.error('Enter a positive whole quantity'); return; }
    const { total: cost, quantity } = purchase;
    
    if (playerCoins < cost) {
      toast.error(`Not enough coins! Need ${cost} coins`);
      return;
    }

    purchaseInFlight.current = true;
    setBuying(true);
    try {
    // Fetch full resource data from marketplace
    const { data, error } = await supabase
      .from('resource_marketplace')
      .select('*')
      .eq('id', item.id)
      .maybeSingle();

    if (error || !data) {
      toast.error('Failed to fetch resource data');
      return;
    }

    const resource: Resource = {
      id: `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      icon: data.icon,
      iconType: data.icon?.startsWith('http') ? 'image' : 'emoji',
      rarity: data.rarity as Resource['rarity'],
      description: data.description || '',
      gatherTime: data.gather_time || 1000,
      spawnTiles: data.spawn_tiles as Resource['spawnTiles'],
      spawnChance: Number(data.spawn_chance),
      coinValue: data.base_value,
      consumable: data.consumable || false,
      healthGain: data.health_gain || 0,
      canInflictDamage: data.can_inflict_damage || false,
      damage: data.damage || 0,
      recipes: data.recipe ? [data.recipe as unknown as import('@/types/game').Recipe] : [],
      isContainer: data.is_container || false,
      isFloating: data.is_floating || false,
      display: data.display || false,
      placeable: data.placeable || false,
      passable: data.passable || false,
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
      produceTileType: data.produce_tile_type as Resource['spawnTiles'][number] | undefined,
      producesResource: data.produces_resource || undefined,
      producesAmount: data.produces_amount ?? 1,
      producesIntervalHours: data.produces_interval_hours ?? 24,
    };

    const result = onBuyResource(resource, cost, quantity);
    if (result.success) {
      toast.success(`Purchased ${quantity} × ${item.name} for ${cost} coins!`);
    } else {
      toast.error(result.message);
    }
    } finally {
      purchaseInFlight.current = false;
      setBuying(false);
    }
  };

  const handleSell = (resourceId: string, quantity: number) => {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;

    // Market buys at 0.5x the base value
    const value = Math.floor(resource.coinValue * 0.5);
    
    const result = onSellResource(resourceId, value);
    if (result.success) {
      toast.success(`Sold ${resource.name} for ${value} coins!`);
    } else {
      toast.error(result.message);
    }
  };

  const handleSellAll = (resourceId: string) => {
    const resource = resources.find(r => r.id === resourceId);
    if (!resource) return;

    // Calculate total quantity across all inventory slots
    const totalQuantity = inventory
      .filter(slot => slot.resourceId === resourceId)
      .reduce((sum, slot) => sum + slot.quantity, 0);

    if (totalQuantity === 0) return;

    // Market buys at 0.5x the base value
    const value = Math.floor(resource.coinValue * 0.5);
    
    const result = onSellResource(resourceId, value, totalQuantity);
    if (result.success && result.soldCount) {
      toast.success(`Sold ${result.soldCount}x ${resource.name} for ${value * result.soldCount} coins!`);
    } else if (!result.success) {
      toast.error(result.message);
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const inventoryWithResources = inventory
    .filter(slot => slot.resourceId && slot.quantity > 0)
    .map(slot => ({
      ...slot,
      resource: resources.find(r => r.id === slot.resourceId),
    }))
    .filter(slot => slot.resource);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="game-panel w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-foreground">{marketName}</h2>
              <p className="text-sm text-muted-foreground">Your coins: {playerCoins}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('buy')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors',
              activeTab === 'buy' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ShoppingCart className="w-4 h-4 inline-block mr-2" />
            Buy
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors',
              activeTab === 'sell' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Store className="w-4 h-4 inline-block mr-2" />
            Sell
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'buy' && (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field w-full pl-10"
                />
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No items available</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {filteredItems.map((item) => {
                    const cost = item.baseValue * 2;
                    const canAfford = playerCoins >= cost;
                    const quantityOpen = quantityItemId === item.id;
                    const purchase = getMarketPurchaseTotal(item.baseValue, quantityText);
                    
                    return (
                      <div
                        key={item.id}
                        className="flex items-center flex-wrap gap-3 p-3 rounded-lg bg-secondary/30"
                      >
                        <ResourceIcon 
                          icon={item.icon} 
                          iconType={item.iconType} 
                          size="lg" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{item.name}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={RARITY_COLORS[item.rarity as Resource['rarity']]}>
                              {item.rarity}
                            </span>
                            <span>•</span>
                            <span>{cost} coins</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" onClick={() => handleBuy(item)} disabled={!canAfford || buying}>Buy</Button>
                          <Button variant="outline" size="icon" className="h-8 w-8" aria-label={`Buy ${item.name} with quantity`} title="Buy with quantity" aria-expanded={quantityOpen} onClick={() => { setQuantityItemId(quantityOpen ? null : item.id); setQuantityText('1'); }}>
                            <ListPlus className="h-4 w-4" />
                          </Button>
                        </div>
                        {quantityOpen && (
                          <form className="basis-full flex items-end flex-wrap gap-2 border-t border-border pt-3" onSubmit={event => { event.preventDefault(); void handleBuy(item, quantityText); }}>
                            <label className="text-xs text-muted-foreground" htmlFor={`buy-quantity-${item.id}`}>
                              Quantity
                              <Input id={`buy-quantity-${item.id}`} type="text" inputMode="numeric" autoFocus value={quantityText} onChange={event => setQuantityText(event.target.value)} className="mt-1 w-24 h-9" aria-invalid={!purchase} />
                            </label>
                            <div className="flex-1 min-w-24 text-sm py-2" role="status" aria-live="polite">
                              {purchase ? `${cost.toLocaleString()} × ${purchase.quantity.toLocaleString()} = ${purchase.total.toLocaleString()} coins` : 'Enter a whole quantity'}
                            </div>
                            <Button type="submit" size="sm" disabled={!purchase || purchase.total > playerCoins || buying}>
                              <ShoppingCart className="h-4 w-4 mr-1" />Buy
                            </Button>
                            {purchase && purchase.total > playerCoins && <p className="basis-full text-xs text-destructive">Not enough coins</p>}
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'sell' && (
            <>
              {inventoryWithResources.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No items to sell</p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {inventoryWithResources.map((slot, index) => {
                    const value = Math.floor((slot.resource?.coinValue || 0) * 0.5);
                    
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
                      >
                        <ResourceIcon 
                          icon={slot.resource!.icon} 
                          iconType={slot.resource!.iconType} 
                          size="lg" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            {slot.resource!.name} x{slot.quantity}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className={RARITY_COLORS[slot.resource!.rarity]}>
                              {slot.resource!.rarity}
                            </span>
                            <span>•</span>
                            <span>{value} coins each</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSell(slot.resourceId!, slot.quantity)}
                            className="btn text-xs"
                          >
                            Sell 1
                          </button>
                          {slot.quantity > 1 && (
                            <button
                              onClick={() => handleSellAll(slot.resourceId!)}
                              className="btn btn-primary text-xs"
                            >
                              Sell All
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketplacePanel;
