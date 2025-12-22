import { Resource, RARITY_COLORS } from '@/types/game';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ResourceIcon from './ResourceIcon';
import { Heart, Coins, Utensils, Swords, Shield } from 'lucide-react';

interface InventoryItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: Resource | null;
  quantity: number;
  life?: number;
  onConsume: (resourceId: string) => { success: boolean; message: string };
}

const InventoryItemModal = ({ 
  open, 
  onOpenChange, 
  resource, 
  quantity,
  life,
  onConsume 
}: InventoryItemModalProps) => {
  if (!resource) return null;
  
  const showLife = (resource.useLife || resource.canInflictDamage) && life !== undefined;

  const handleConsume = () => {
    const result = onConsume(resource.id);
    if (result.success && quantity <= 1) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[320px] game-panel border-2 border-border p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b border-border">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 bg-input rounded-lg flex items-center justify-center text-2xl">
              <ResourceIcon icon={resource.icon} iconType={resource.iconType} size="lg" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-lg font-bold">{resource.name}</span>
              <span className={`text-xs capitalize ${RARITY_COLORS[resource.rarity]}`}>
                {resource.rarity}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Description */}
          <p className="text-sm text-muted-foreground">
            {resource.description || 'No description available.'}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 bg-muted/50 rounded px-2 py-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-muted-foreground">Value:</span>
              <span className="font-medium">{resource.coinValue}</span>
            </div>
            
            <div className="flex items-center gap-2 bg-muted/50 rounded px-2 py-1.5">
              <span className="text-muted-foreground">Qty:</span>
              <span className="font-bold text-lg">{quantity}</span>
            </div>

            {resource.consumable && resource.healthGain && (
              <div className="flex items-center gap-2 bg-red-500/10 rounded px-2 py-1.5">
                <Heart className="w-4 h-4 text-red-500" />
                <span className="text-muted-foreground">Heals:</span>
                <span className="font-medium text-red-500">+{resource.healthGain}</span>
              </div>
            )}

            {resource.canInflictDamage && resource.damage && (
              <div className="flex items-center gap-2 bg-orange-500/10 rounded px-2 py-1.5">
                <Swords className="w-4 h-4 text-orange-500" />
                <span className="text-muted-foreground">Damage:</span>
                <span className="font-medium text-orange-500">{resource.damage}</span>
              </div>
            )}

            {showLife && (
              <div className="col-span-2 flex flex-col gap-1 bg-blue-500/10 rounded px-2 py-1.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-400" />
                  <span className="text-muted-foreground">Durability:</span>
                  <span className="font-medium text-blue-400">{life}%</span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-400 transition-all duration-300"
                    style={{ width: `${life}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {resource.consumable && (
              <Button 
                onClick={handleConsume}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={quantity < 1}
              >
                <Utensils className="w-4 h-4 mr-2" />
                Consume
                {resource.healthGain && (
                  <span className="ml-1 text-green-200">(+{resource.healthGain} HP)</span>
                )}
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className={resource.consumable ? '' : 'flex-1'}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryItemModal;
