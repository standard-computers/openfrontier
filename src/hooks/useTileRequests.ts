import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { type GameWorld } from '@/types/game';
import { type TileRequest, canRespondToTileRequest } from '@/lib/tileNegotiations';

export const useTileRequests = (world: GameWorld, enabled: boolean, refresh: () => Promise<void>) => {
  const [requests, setRequests] = useState<TileRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!enabled) return;
    const { error: resolveError } = await supabase.rpc('resolve_tile_contests', { _world: world.id });
    if (resolveError) { console.error('Could not resolve land contests', resolveError.message); return; }
    const { data, error } = await supabase.from('tile_requests').select('*').eq('world_id', world.id).order('created_at', { ascending: false });
    if (!error) setRequests((data ?? []) as TileRequest[]);
    await refresh();
  }, [enabled, world.id, refresh]);
  useEffect(() => {
    if (!enabled) { setRequests([]); return; }
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [enabled, load]);

  const create = async (x: number, y: number, kind: 'offer' | 'contest', amount?: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('create_tile_request', { _world: world.id, _x: x, _y: y, _kind: kind, _amount: amount });
      if (error) throw error;
      toast.success(kind === 'offer' ? 'Offer sent' : 'Contest started — response due in one game day');
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : (error as { message?: string }).message ?? 'Could not send request'); }
    finally { setBusy(false); }
  };
  const respond = async (id: string, action: string, amount?: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('respond_tile_request', { _id: id, _action: action, _amount: amount });
      if (error) throw error;
      await load();
      toast.success(action === 'conflict' ? 'Conflict recorded — ownership remains unchanged' : 'Response saved');
    } catch (error) { toast.error(error instanceof Error ? error.message : (error as { message?: string }).message ?? 'Could not save response'); }
    finally { setBusy(false); }
  };
  return { requests, busy, create, respond, actionableCount: requests.filter(r => canRespondToTileRequest(r, world.userId)).length };
};