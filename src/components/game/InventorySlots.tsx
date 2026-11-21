import { useRef, useState } from 'react';
import type { InventorySlot, Resource } from '@/types/game';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { INVENTORY_DRAG_TYPE } from '@/lib/inventoryDrag';
import ResourceIcon from './ResourceIcon';

interface InventorySlotsProps {
  inventory: InventorySlot[];
  resources: Resource[];
  selectedSlot: number;
  expanded?: boolean;
  onSelect: (index: number) => void;
  onInspect: (slot: InventorySlot) => void;
  onMove: (source: number, destination: number) => void;
}

export default function InventorySlots({ inventory, resources, selectedSlot, expanded = false, onSelect, onInspect, onMove }: InventorySlotsProps) {
  const suppressClickUntil = useRef(0);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  return (
    <div className={expanded ? 'grid grid-cols-[repeat(auto-fill,44px)] justify-center gap-1.5' : 'flex gap-1'}>
      {(expanded ? inventory : inventory.slice(0, 10)).map((slot, index) => {
        const resource = resources.find(item => item.id === slot.resourceId);
        const occupied = !!slot.resourceId && slot.quantity > 0;
        const shortcut = index < 9 ? index + 1 : index === 9 ? 0 : undefined;
        return (
          <Button
            key={index}
            variant="ghost"
            draggable={occupied}
            aria-label={`${expanded ? 'Full inventory' : 'Inventory'} slot ${expanded ? index + 1 : shortcut}: ${resource?.name ?? 'empty'}`}
            title={resource ? `${resource.name} × ${slot.quantity}${slot.life !== undefined ? ` · ${slot.life}% life` : ''}` : 'Empty slot'}
            onDragStart={event => {
              if (!occupied) { event.preventDefault(); return; }
              event.dataTransfer.setData(INVENTORY_DRAG_TYPE, String(index));
              event.dataTransfer.effectAllowed = 'move';
              suppressClickUntil.current = Date.now() + 500;
              onSelect(index);
            }}
            onDragEnd={() => { suppressClickUntil.current = Date.now() + 300; setDropTarget(null); }}
            onDragOver={event => {
              if (!event.dataTransfer.types.includes(INVENTORY_DRAG_TYPE)) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setDropTarget(index);
            }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={event => {
              const payload = event.dataTransfer.getData(INVENTORY_DRAG_TYPE);
              if (!payload) return;
              event.preventDefault();
              event.stopPropagation();
              setDropTarget(null);
              suppressClickUntil.current = Date.now() + 300;
              onMove(Number(payload), index);
            }}
            onClick={() => {
              if (Date.now() < suppressClickUntil.current) return;
              onSelect(index);
              if (occupied) onInspect(slot);
            }}
            className={cn('w-11 h-11 p-0 shrink-0 rounded relative bg-input hover:bg-muted',
              occupied && 'cursor-grab active:cursor-grabbing',
              selectedSlot === index && 'bg-primary/30 ring-2 ring-primary',
              dropTarget === index && 'ring-2 ring-primary bg-primary/20')}
          >
            {shortcut !== undefined && <span className="absolute top-0 left-0.5 text-[8px] text-muted-foreground">{shortcut}</span>}
            {resource && <ResourceIcon icon={resource.icon} iconType={resource.iconType} size="md" />}
            {occupied && slot.quantity > 1 && <span className="absolute bottom-0 right-0.5 max-w-full truncate text-[10px] font-medium bg-card px-0.5 rounded">{slot.quantity}</span>}
            {slot.life !== undefined && slot.life < 100 && <progress className="absolute bottom-0 left-0.5 w-10 h-1 accent-primary" max={100} value={slot.life} aria-label="Item durability" />}
          </Button>
        );
      })}
    </div>
  );
}