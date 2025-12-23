import { X, Store, Search, ShoppingCart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Resource, RARITY_COLORS } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import ResourceIcon from './ResourceIcon';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface MarketplaceItem {
  id: string;
  name: string;
  icon: string;
  iconType?: 'emoji' | 'image';
  rarity: string;
  description: string;
  baseValue: number;
  downloadCount: number;
}

interface MarketplacePanelProps {
  isOpen: boolean;
  onClose: () => void;
  marketName: string;
  playerCoins: number;
  inventory: { resourceId: string | null; quantity: number }[];
  resources: Resource[];
  onBuyResource: (resource: Resource, cost: number) => { success: boolean; message: string };
  onSellResource: (resourceId: string, value: number) => { success: boolean; message: string };
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

  useEffect(() => {
    if (isOpen) {
      loadMarketplaceItems();
    }
  }, [isOpen]);

  const loadMarketplaceItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resource_marketplace')
        .select('*')
        .order('download_count', { ascending: false });

      if (error) throw error;

      setItems(data.map(item => ({
        id: item.id,
        name: item.name,
        icon: item.icon,
        iconType: item.icon.startsWith('http') ? 'image' : 'emoji',
        rarity: item.rarity,
        description: item.description || '',
        baseValue: item.base_value,
        downloadCount: item.download_count,
      })));
    } catch (error) {
      console.error('Error loading marketplace:', error);
      toast.error('Failed to load marketplace');
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (item: MarketplaceItem) => {
    // Market sells at 2x the base value
    const cost = item.baseValue * 2;
    
    if (playerCoins < cost) {
      toast.error(`Not enough coins! Need ${cost} coins`);
      return;
    }

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
      produceTile: data.produce_tile || false,
      produceTileType: data.produce_tile_type as Resource['spawnTiles'][number] | undefined,
    };

    const result = onBuyResource(resource, cost);
    if (result.success) {
      toast.success(`Purchased ${item.name} for ${cost} coins!`);
    } else {
      toast.error(result.message);
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
        <div className="flex items-center justify-between p-4 border-b border-border">
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
                    
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30"
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
                        <button
                          onClick={() => handleBuy(item)}
                          disabled={!canAfford}
                          className={cn(
                            'btn btn-primary text-xs',
                            !canAfford && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          Buy
                        </button>
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
                        <button
                          onClick={() => handleSell(slot.resourceId!, slot.quantity)}
                          className="btn text-xs"
                        >
                          Sell 1
                        </button>
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
