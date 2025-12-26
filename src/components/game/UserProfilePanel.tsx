import { X, Crown, Users, Flag, Coins, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorldMember } from '@/hooks/useGameWorld';
import { GameWorld } from '@/types/game';

interface UserProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  member: WorldMember | null;
  world: GameWorld;
}

const UserProfilePanel = ({ isOpen, onClose, member, world }: UserProfilePanelProps) => {
  if (!isOpen || !member) return null;

  // Count tiles claimed by this user
  const claimedTiles = world.map.tiles.flat().filter(t => t.claimedBy === member.userId).length;

  // Get user color from player_data if available (we'll need to fetch this)
  // For now, we'll use a default color based on role
  const isOwner = member.role === 'owner';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="game-panel w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              isOwner ? "bg-amber-500/20" : "bg-primary/20"
            )}>
              {isOwner ? (
                <Crown className="w-6 h-6 text-amber-500" />
              ) : (
                <Users className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-lg">{member.username}</h2>
              <span className={cn(
                "text-sm",
                isOwner ? "text-amber-400" : "text-muted-foreground"
              )}>
                {isOwner ? 'World Owner' : 'Player'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-primary text-xl font-bold">
                <Flag className="w-5 h-5" />
                {claimedTiles}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tiles Claimed</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground text-xl font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Joined {new Date(member.joinedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Role Badge */}
          <div className={cn(
            "p-3 rounded-lg text-center",
            isOwner ? "bg-amber-500/10 border border-amber-500/30" : "bg-primary/10 border border-primary/30"
          )}>
            <div className="flex items-center justify-center gap-2">
              {isOwner ? (
                <>
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className="text-amber-400 font-medium">World Owner</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-primary font-medium">Player</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePanel;
