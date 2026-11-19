import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Coins, Flag, Swords, Check, X, MapPin } from 'lucide-react';
import { canRespondToTileRequest, getGameHours, isValidLandOffer, type TileRequest } from '@/lib/tileNegotiations';
import { type GameWorld, calculateTileValue } from '@/types/game';
import { type WorldMember } from '@/hooks/useGameWorld';

interface Props {
  open: boolean;
  onClose: () => void;
  world: GameWorld;
  members: WorldMember[];
  requests: TileRequest[];
  busy: boolean;
  onRespond: (id: string, action: string, amount?: number) => Promise<void>;
  onViewTile: (x: number, y: number) => void;
}

const RequestRow = ({ request, ...props }: Omit<Props, 'open' | 'onClose' | 'requests'> & { request: TileRequest }) => {
  const [counter, setCounter] = useState('');
  const [counterOpen, setCounterOpen] = useState(false);
  const { world, members, busy, onRespond, onViewTile } = props;
  const incoming = request.owner_id === world.userId;
  const other = members.find(m => m.userId === (incoming ? request.requester_id : request.owner_id));
  const tile = world.map.tiles[request.tile_y]?.[request.tile_x];
  const minimum = tile ? calculateTileValue(tile, world.resources) : 0;
  const canRespond = canRespondToTileRequest(request, world.userId);
  const remaining = Math.max(0, (request.deadline_game_hour ?? 0) - getGameHours(world.createdAt));
  return (
    <div className="border-b border-border py-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium flex items-center gap-2">{request.kind === 'offer' ? <Coins /> : <Flag />}{request.kind === 'offer' ? (request.status === 'countered' ? 'Counteroffer' : 'Land offer') : 'Tile contest'}</div>
          <p className="text-sm text-muted-foreground">{incoming ? 'From' : 'To'} {other?.username ?? 'Player'} · {request.tile_x}, {request.tile_y}</p>
        </div>
        <Button variant="ghost" size="icon" title="View tile" onClick={() => onViewTile(request.tile_x, request.tile_y)}><MapPin /></Button>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        {request.amount !== null && <span>{request.amount.toLocaleString()} coins</span>}
        <span className="capitalize text-muted-foreground">{request.status === 'expired' ? 'Claimed — no response' : request.status}</span>
        {request.kind === 'contest' && request.status === 'pending' && <span className="text-muted-foreground">{remaining.toFixed(1)} game hours remaining</span>}
      </div>
      {request.status === 'conflict' && <p className="text-sm text-muted-foreground">Conflict declared · ownership unchanged</p>}
      {canRespond && <div className="flex flex-wrap gap-2">
        {request.kind === 'offer' ? <>
          <Button size="sm" disabled={busy} onClick={() => void onRespond(request.id, 'approve')}><Check />Approve</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void onRespond(request.id, 'reject')}><X />Reject</Button>
          {request.status === 'pending' && <Button size="sm" variant="secondary" disabled={busy} onClick={() => { setCounter(String(Math.max(minimum, request.amount ?? 0))); setCounterOpen(v => !v); }}>Counter</Button>}
        </> : <>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void onRespond(request.id, 'give_up')}><Flag />Give it up</Button>
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => void onRespond(request.id, 'conflict')}><Swords />Start conflict</Button>
        </>}
      </div>}
      {counterOpen && canRespond && <div className="space-y-2">
        <label className="text-xs text-muted-foreground" htmlFor={`counter-${request.id}`}>Minimum {minimum} coins</label>
        <div className="flex gap-2"><Input id={`counter-${request.id}`} aria-label="Counteroffer amount" type="text" inputMode="numeric" value={counter} onChange={e => setCounter(e.target.value)} /><Button disabled={busy || !isValidLandOffer(Number(counter), minimum)} onClick={async () => { await onRespond(request.id, 'counter', Number(counter)); setCounterOpen(false); }}>Send counter</Button></div>
      </div>}
    </div>
  );
};

export default function TileRequestsPanel(props: Props) {
  return <Dialog open={props.open} onOpenChange={open => { if (!open) props.onClose(); }}>
    <DialogContent className="max-h-[85vh] w-[calc(100%-2rem)] overflow-y-auto">
      <DialogTitle>Land Requests</DialogTitle>
      <DialogDescription>Offers, contests, and responses</DialogDescription>
      {props.requests.length === 0 ? <p className="py-6 text-center text-muted-foreground">No land requests</p> : props.requests.map(request => <RequestRow key={request.id} {...props} request={request} />)}
    </DialogContent>
  </Dialog>;
}