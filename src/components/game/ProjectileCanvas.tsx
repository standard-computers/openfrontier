import { useEffect, useRef } from 'react';
import type { Position } from '@/types/game';
import type { ProjectileShot } from '@/lib/projectiles';

export default function ProjectileCanvas({ shot, offset, width, height, tileSize }: {
  shot: ProjectileShot | null; offset: Position; width: number; height: number; tileSize: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !shot) return;
    let frame = 0;
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 550;
    const start = performance.now();
    const color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      const t = Math.min(1, (now - start) / duration);
      const x = (shot.from.x + (shot.to.x - shot.from.x) * t - offset.x + 0.5) * tileSize;
      const y = (shot.from.y + (shot.to.y - shot.from.y) * t - offset.y + 0.5) * tileSize;
      ctx.fillStyle = `hsl(${color})`;
      ctx.beginPath(); ctx.arc(x, y, t < 1 ? 4 : 9, 0, Math.PI * 2); ctx.fill();
      if (now - start < duration + 150) frame = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, width, height);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); ctx.clearRect(0, 0, width, height); };
  }, [shot, offset, width, height, tileSize]);
  return <canvas ref={ref} width={width} height={height} className="absolute top-0 left-0 pointer-events-none z-20" aria-hidden="true" />;
}