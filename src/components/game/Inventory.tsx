import { Resource, InventorySlot } from '@/types/game';
import ResourceSlotComponent from './ResourceSlot';
import GamePanel from './GamePanel';

interface InventoryProps {
  slots: InventorySlot[];
  resources: Resource[];
  selectedSlot?: number;
  onSlotClick?: (index: number) => void;
}

const Inventory = ({ slots, resources, selectedSlot, onSlotClick }: InventoryProps) => {
  const getResource = (resourceId: string | null) => 
    resources.find(r => r.id === resourceId) || null;

  return (
    <GamePanel title="Inventory" className="w-full">
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
        {slots.map((slot, index) => (
          <ResourceSlotComponent
            key={index}
            resource={getResource(slot.resourceId)}
            quantity={slot.quantity}
            selected={selectedSlot === index}
            onClick={() => onSlotClick?.(index)}
            size="sm"
          />
        ))}
      </div>
    </GamePanel>
  );
};

export default Inventory;
