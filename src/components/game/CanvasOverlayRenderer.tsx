import { useRef, useEffect, useMemo } from 'react';
import { WorldMap, Position, NPC, Area } from '@/types/game';

interface CanvasOverlayRendererProps {
  map: WorldMap;
  viewportOffset: { x: number; y: number };
  viewportSize: { tilesX: number; tilesY: number };
  tileSize: number;
  userId: string;
  userColor: string;
  npcs: NPC[];
  areas: Area[];
  selectedTile: Position | null;
  selectedTilesSet: Set<string>;
  dragRect: { minX: number; maxX: number; minY: number; maxY: number } | null;
}

/**
 * Draws claim borders, claim dots, area tints and selection highlights on a single
 * canvas instead of one DOM node per tile. Keeps the DOM tiny when zoomed out.
 */
const CanvasOverlayRenderer = ({
  map,
  viewportOffset,
  viewportSize,
  tileSize,
  userId,
  userColor,
  npcs,
  areas,
  selectedTile,
  selectedTilesSet,
  dragRect,
}: CanvasOverlayRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const canvasWidth = viewportSize.tilesX * tileSize;
  const canvasHeight = viewportSize.tilesY * tileSize;

  const npcColorById = useMemo(() => {
    const m = new Map<string, string>();
    for (const npc of npcs) m.set(npc.id, npc.color);
    return m;
  }, [npcs]);

  const areaColorByTile = useMemo(() => {
    const m = new Map<string, string>();
    for (const area of areas) {
      for (const t of area.tiles) m.set(`${t.x}-${t.y}`, area.color);
    }
    return m;
  }, [areas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const endX = Math.min(viewportOffset.x + viewportSize.tilesX, map.width);
    const endY = Math.min(viewportOffset.y + viewportSize.tilesY, map.height);
    const borderWidth = Math.min(2, Math.max(1, Math.floor(tileSize / 8)));
    const dotSize = Math.max(3, tileSize * 0.15);
    const hasAreas = areaColorByTile.size > 0;

    for (let y = viewportOffset.y; y < endY; y++) {
      const row = map.tiles[y];
      if (!row) continue;
      for (let x = viewportOffset.x; x < endX; x++) {
        const tile = row[x];
        if (!tile) continue;

        const px = (x - viewportOffset.x) * tileSize;
        const py = (y - viewportOffset.y) * tileSize;
        const posKey = `${x}-${y}`;

        // Area tint
        if (hasAreas) {
          const areaColor = areaColorByTile.get(posKey);
          if (areaColor) {
            ctx.globalAlpha = 0.25;
            ctx.fillStyle = areaColor;
            ctx.fillRect(px, py, tileSize, tileSize);
            ctx.globalAlpha = 1;
          }
        }

        const owner = tile.claimedBy;
        const isSelected = selectedTile?.x === x && selectedTile?.y === y;
        const isMultiSelected = selectedTilesSet.has(posKey);
        const isInDrag = !!dragRect && x >= dragRect.minX && x <= dragRect.maxX && y >= dragRect.minY && y <= dragRect.maxY;

        if (owner && !isSelected && !isMultiSelected) {
          const color = owner === userId ? userColor : npcColorById.get(owner) ?? '#888';
          ctx.fillStyle = color;
          if (map.tiles[y - 1]?.[x]?.claimedBy !== owner) ctx.fillRect(px, py, tileSize, borderWidth);
          if (map.tiles[y + 1]?.[x]?.claimedBy !== owner) ctx.fillRect(px, py + tileSize - borderWidth, tileSize, borderWidth);
          if (row[x - 1]?.claimedBy !== owner) ctx.fillRect(px, py, borderWidth, tileSize);
          if (row[x + 1]?.claimedBy !== owner) ctx.fillRect(px + tileSize - borderWidth, py, borderWidth, tileSize);
          // Claim dot
          ctx.beginPath();
          ctx.arc(px + tileSize - dotSize / 2 - 1, py + dotSize / 2 + 1, dotSize / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        if (isMultiSelected || isInDrag) {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
          ctx.fillRect(px, py, tileSize, tileSize);
        }

        if (isSelected) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.strokeRect(px + 1.5, py + 1.5, tileSize - 3, tileSize - 3);
        } else if (isMultiSelected) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
        } else if (isInDrag) {
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
        }
      }
    }
  }, [
    map.tiles, map.width, map.height, viewportOffset, viewportSize, tileSize,
    canvasWidth, canvasHeight, userId, userColor, npcColorById, areaColorByTile,
    selectedTile, selectedTilesSet, dragRect,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 3 }}
    />
  );
};

export default CanvasOverlayRenderer;
