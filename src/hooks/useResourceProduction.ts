import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { GameWorld, WorldMap } from '@/types/game';
import { getWorldGameHour, producePlacedResources } from '@/lib/resourceProduction';

export function useResourceProduction(
  world: GameWorld,
  setWorld: Dispatch<SetStateAction<GameWorld>>,
  saveMapData: (map?: WorldMap) => Promise<void>,
  enabled: boolean,
) {
  const saveRef = useRef(saveMapData);
  const createdAtRef = useRef(world.createdAt);
  saveRef.current = saveMapData;
  createdAtRef.current = world.createdAt;
  useEffect(() => {
    if (!enabled) return;
    let lastCheckedHour: number | undefined;
    const tick = () => {
      if (document.visibilityState === 'hidden') return;
      const hour = getWorldGameHour(createdAtRef.current);
      if (lastCheckedHour === hour) return;
      lastCheckedHour = hour;
      setWorld(prev => {
        const map = producePlacedResources(prev.map, prev.resources, hour);
        if (map === prev.map) return prev;
        // Uses the existing coalesced map writer, including its exit flush.
        void saveRef.current(map);
        return { ...prev, map };
      });
    };
    tick();
    const timer = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [enabled, setWorld]);
}