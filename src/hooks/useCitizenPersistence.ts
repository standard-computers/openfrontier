import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { GameWorld, Stranger } from '@/types/game';
import { readCitizenSnapshot } from '@/lib/citizenPersistence';
import { toast } from 'sonner';

// Fixed cadence (not a debounce): citizen simulation changes every three seconds.
export function useCitizenPersistence(
  worldId: string | null,
  citizens: Stranger[] | undefined,
  initialRevision: number | null,
  setWorld: React.Dispatch<React.SetStateAction<GameWorld>>,
) {
  const latest = useRef(citizens);
  latest.current = citizens;

  useEffect(() => {
    if (!worldId || initialRevision === null) return;
    let revision = initialRevision;
    let lastSaved = latest.current;
    let inFlight = false;
    let stopped = false;
    let warned = false;

    const flush = async () => {
      const snapshot = latest.current;
      if (!snapshot || snapshot === lastSaved || inFlight) return;
      inFlight = true;
      try {
        const { data, error } = await supabase.rpc('save_world_citizens', {
          _world_id: worldId,
          _revision: revision,
          _strangers: JSON.parse(JSON.stringify(snapshot)) as Json,
        });
        if (error) throw error;
        const result = readCitizenSnapshot(data);
        revision = result.revision;
        if (result.saved) {
          lastSaved = snapshot;
        } else if (result.strangers) {
          // A newer session won: read back its canonical population instead of overwriting it.
          lastSaved = result.strangers;
          latest.current = result.strangers;
          if (!stopped) setWorld(prev => prev.id === worldId ? { ...prev, strangers: result.strangers ?? [] } : prev);
        }
        warned = false;
      } catch (error) {
        console.error('Citizen save failed:', error);
        if (!warned && !stopped) toast.error('Citizens could not be saved. Retrying automatically.');
        warned = true;
      } finally {
        inFlight = false;
      }
      // Finish any changes made during an in-flight save when leaving the world.
      if (stopped && !warned && latest.current !== lastSaved) await flush();
    };

    const interval = setInterval(() => void flush(), 3000);
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      void flush();
    };
  }, [worldId, initialRevision, setWorld]);
}