import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MapTile, Position, TILE_TYPES } from '@/types/game';
import { getClaimedTilePage } from '@/lib/claimedTilePage';

interface Props {
  tiles: MapTile[][];
  userId: string;
  onNavigate?: (position: Position) => void;
}

export default function SovereigntyTilesTab({ tiles, userId, onNavigate }: Props) {
  // Capture only when this tab mounts, not on each simulation tick.
  const [snapshot] = useState(() => tiles);
  const [cursors, setCursors] = useState([0]);
  const cursor = cursors[cursors.length - 1] ?? 0;
  const page = useMemo(() => getClaimedTilePage(snapshot, userId, cursor), [snapshot, userId, cursor]);

  return (
    <section aria-label="Claimed tiles" className="space-y-2">
      <div className="flex items-center justify-between gap-2 border-b pb-1">
        <span className="text-sm text-muted-foreground">Page {cursors.length.toLocaleString()}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Previous tiles page" title="Previous page" disabled={cursors.length === 1} onClick={() => setCursors(previous => previous.slice(0, -1))}><ChevronLeft /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Next tiles page" title="Next page" disabled={page.nextCursor === null} onClick={() => { const next = page.nextCursor; if (next !== null) setCursors(previous => [...previous, next]); }}><ChevronRight /></Button>
        </div>
      </div>
      {page.rows.length === 0 ? <p className="text-sm text-muted-foreground py-4">No tiles claimed yet</p> : (
        <table className="w-full text-sm text-left">
          <thead className="text-muted-foreground"><tr className="border-b"><th className="font-medium py-1">Tile</th><th className="font-medium py-1">Terrain</th><th className="font-medium py-1 text-right">Coordinates</th></tr></thead>
          <tbody>{page.rows.map(tile => (
            <tr key={`${tile.x}-${tile.y}`} className="border-b border-border/50">
              <td className="py-1 max-w-[140px] truncate">{tile.name || 'Unnamed'}</td>
              <td className="py-1">{TILE_TYPES.find(type => type.type === tile.type)?.label || tile.type}</td>
              <td className="py-1 text-right"><Button variant="ghost" size="sm" onClick={() => onNavigate?.(tile)} disabled={!onNavigate} aria-label={`Go to tile ${tile.x}, ${tile.y}`}><MapPin />{tile.x}, {tile.y}</Button></td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </section>
  );
}