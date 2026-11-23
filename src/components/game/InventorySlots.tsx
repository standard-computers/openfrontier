import { useRef, useState } from 'react';
import type { InventorySlot, Resource } from '@/types/game';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { INVENTORY_DRAG_TYPE, setActiveDragResourceId } from '@/lib/inventoryDrag';
import ResourceIcon from './ResourceIcon';

interface InventorySlotsProps {
  inventory: InventorySlot[];
  resources: Resource[];
  selectedSlot: number;
  expanded?: boolean;
  onSelect: (index: number) => void;
  onInspect: (slot: InventorySlot) => void;
  onMove: (source: number, destination: number) => void;
  tileSize?: number;
  onDisperse?: (index: number) => void;
}

export default function InventorySlots({ inventory, resources, selectedSlot, expanded = false, onSelect, onInspect, onMove, tileSize = 39, onDisperse }: InventorySlotsProps) {
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
              setActiveDragResourceId(slot.resourceId ?? null);
              if (resource) setRealSizeDragImage(event.dataTransfer, resource, tileSize);
              // The map draws the exact footprint preview; hide the browser ghost once over the map.
              suppressClickUntil.current = Date.now() + 500;
              onSelect(index);
            }}
            onDragEnd={() => { setActiveDragResourceId(null); suppressClickUntil.current = Date.now() + 300; setDropTarget(null); }}
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
            onClick={event => {
              if (Date.now() < suppressClickUntil.current) return;
              if ((event.ctrlKey || event.metaKey) && occupied && onDisperse) { onSelect(index); onDisperse(index); return; }
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
/** Use a drag preview matching the item's on-map footprint at the current zoom. */
function setRealSizeDragImage(dataTransfer: DataTransfer, resource: Resource, tileSize: number) {
  const w = Math.max(1, resource.tileWidth ?? 1);
  const h = Math.max(1, resource.tileHeight ?? 1);
  const scale = (resource.tileWidth ?? 1) === 0 || (resource.tileHeight ?? 1) === 0 ? 0.6 : 1;
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'fixed', top: '-10000px', left: '-10000px',
    width: `${w * tileSize}px`, height: `${h * tileSize}px`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: '0.85', pointerEvents: 'none',
  });
  const box = Math.min(w, h) * tileSize * scale;
  if (resource.iconType === 'image' && resource.icon.startsWith('http')) {
    const img = document.createElement('img');
    img.src = resource.icon;
    Object.assign(img.style, { width: `${w * tileSize * scale}px`, height: `${h * tileSize * scale}px`, objectFit: 'contain', imageRendering: 'pixelated' });
    el.appendChild(img);
  } else {
    el.textContent = resource.icon;
    el.style.fontSize = `${box * 0.8}px`;
    el.style.lineHeight = '1';
  }
  document.body.appendChild(el);
  // Hotspot at the anchor (bottom-left) tile centre, since footprints extend up and right.
  dataTransfer.setDragImage(el, tileSize / 2, (h - 0.5) * tileSize);
  setTimeout(() => el.remove(), 0);
}
