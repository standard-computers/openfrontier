import { X, Trophy, Coins, Crown, Bot, Users } from 'lucide-react';
import { GameWorld, Resource, calculateTileValue, NPC } from '@/types/game';
import { WorldMember } from '@/hooks/useGameWorld';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface PlayerRankingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  world: GameWorld;
  resources: Resource[];
  members: WorldMember[];
  onViewUser: (member: WorldMember) => void;
}

export interface RankedPlayer {
  id: string;
  name: string;
  color: string;
  isNPC: boolean;
  coins: number;
  inventoryValue: number;
  landValue: number;
  netWorth: number;
  claimedTiles: number;
  member?: WorldMember;
}

export const calculateNetWorth = (
  playerId: string,
  coins: number,
  inventory: { resourceId: string | null; quantity: number }[],
  resources: Resource[],
  tiles: { claimedBy?: string | null; resources: string[] }[][]
): { inventoryValue: number; landValue: number; netWorth: number; claimedTiles: number } => {
  // Calculate inventory value
  let inventoryValue = 0;
  inventory.forEach(slot => {
    if (slot.resourceId) {
      const resource = resources.find(r => r.id === slot.resourceId);
      if (resource) {
        inventoryValue += resource.coinValue * slot.quantity;
      }
    }
  });

  // Calculate land value (sum of tile values for claimed tiles)
  let landValue = 0;
  let claimedTiles = 0;
  tiles.flat().forEach(tile => {
    if (tile.claimedBy === playerId) {
      claimedTiles++;
      // Base tile value + resource values
      tile.resources.forEach(resourceId => {
        const resource = resources.find(r => r.id === resourceId);
        if (resource) {
          landValue += resource.coinValue;
        }
      });
      landValue += 10; // Base tile value
    }
  });

  return {
    inventoryValue,
    landValue,
    netWorth: coins + inventoryValue + landValue,
    claimedTiles,
  };
};

const PlayerRankingPanel = ({ isOpen, onClose, world, resources, members, onViewUser }: PlayerRankingPanelProps) => {
  const rankedPlayers = useMemo(() => {
    const players: RankedPlayer[] = [];

    // Add human players
    members.forEach(member => {
      // We need to get player data from world_members - for now use current player's data if it matches
      const isCurrentPlayer = member.userId === world.userId;
      
      if (isCurrentPlayer) {
        const stats = calculateNetWorth(
          world.userId,
          world.coins,
          world.inventory,
          resources,
          world.map.tiles
        );

        players.push({
          id: member.userId,
          name: member.username,
          color: world.userColor,
          isNPC: false,
          coins: world.coins,
          inventoryValue: stats.inventoryValue,
          landValue: stats.landValue,
          netWorth: stats.netWorth,
          claimedTiles: stats.claimedTiles,
          member,
        });
      } else {
        // For other players, we estimate based on their claimed tiles
        let claimedTiles = 0;
        let landValue = 0;
        world.map.tiles.flat().forEach(tile => {
          if (tile.claimedBy === member.userId) {
            claimedTiles++;
            tile.resources.forEach(resourceId => {
              const resource = resources.find(r => r.id === resourceId);
              if (resource) {
                landValue += resource.coinValue;
              }
            });
            landValue += 10;
          }
        });

        players.push({
          id: member.userId,
          name: member.username,
          color: '#888888', // Default color for other players
          isNPC: false,
          coins: 0, // We don't have access to other player's coins
          inventoryValue: 0,
          landValue,
          netWorth: landValue,
          claimedTiles,
          member,
        });
      }
    });

    // Add NPCs
    (world.npcs || []).forEach(npc => {
      const stats = calculateNetWorth(
        npc.id,
        npc.coins || 0,
        npc.inventory || [],
        resources,
        world.map.tiles
      );

      players.push({
        id: npc.id,
        name: npc.name,
        color: npc.color,
        isNPC: true,
        coins: npc.coins || 0,
        inventoryValue: stats.inventoryValue,
        landValue: stats.landValue,
        netWorth: stats.netWorth,
        claimedTiles: stats.claimedTiles,
      });
    });

    // Sort by net worth descending
    return players.sort((a, b) => b.netWorth - a.netWorth);
  }, [world, resources, members]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="game-panel w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold">Leaderboard</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rankings */}
        <div className="p-4 overflow-auto flex-1 space-y-2">
          {rankedPlayers.map((player, index) => (
            <button
              key={player.id}
              onClick={() => player.member && onViewUser(player.member)}
              disabled={!player.member}
              className={cn(
                "w-full rounded-lg p-3 text-left transition-colors",
                player.member ? "hover:bg-secondary/50 cursor-pointer" : "cursor-default",
                index === 0 ? "bg-amber-500/10 border border-amber-500/30" :
                index === 1 ? "bg-gray-400/10 border border-gray-400/30" :
                index === 2 ? "bg-orange-600/10 border border-orange-600/30" :
                "bg-secondary/30"
              )}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                  index === 0 ? "bg-amber-500 text-black" :
                  index === 1 ? "bg-gray-400 text-black" :
                  index === 2 ? "bg-orange-600 text-white" :
                  "bg-muted text-muted-foreground"
                )}>
                  {index + 1}
                </div>

                {/* Player info */}
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${player.color}20` }}
                >
                  {player.isNPC ? (
                    <Bot className="w-4 h-4" style={{ color: player.color }} />
                  ) : (
                    <Users className="w-4 h-4" style={{ color: player.color }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{player.name}</span>
                    {player.isNPC && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">NPC</span>
                    )}
                    {player.id === world.userId && (
                      <span className="text-xs text-primary bg-primary/20 px-1.5 py-0.5 rounded">You</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{player.claimedTiles} tiles</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="flex items-center gap-0.5">
                      <Coins className="w-3 h-3 text-amber-400" />
                      {player.coins.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Net worth */}
                <div className="text-right">
                  <div className="font-bold text-amber-400">{player.netWorth.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">net worth</div>
                </div>
              </div>
            </button>
          ))}

          {rankedPlayers.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No players yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerRankingPanel;

// Helper to get top player for button label
export const getTopPlayer = (
  world: GameWorld,
  resources: Resource[],
  members: WorldMember[]
): RankedPlayer | null => {
  const players: RankedPlayer[] = [];

  // Add current player
  const currentMember = members.find(m => m.userId === world.userId);
  if (currentMember) {
    const stats = calculateNetWorth(
      world.userId,
      world.coins,
      world.inventory,
      resources,
      world.map.tiles
    );

    players.push({
      id: world.userId,
      name: currentMember.username,
      color: world.userColor,
      isNPC: false,
      coins: world.coins,
      inventoryValue: stats.inventoryValue,
      landValue: stats.landValue,
      netWorth: stats.netWorth,
      claimedTiles: stats.claimedTiles,
      member: currentMember,
    });
  }

  // Add other members (estimate)
  members.forEach(member => {
    if (member.userId === world.userId) return;
    
    let claimedTiles = 0;
    let landValue = 0;
    world.map.tiles.flat().forEach(tile => {
      if (tile.claimedBy === member.userId) {
        claimedTiles++;
        tile.resources.forEach(resourceId => {
          const resource = resources.find(r => r.id === resourceId);
          if (resource) {
            landValue += resource.coinValue;
          }
        });
        landValue += 10;
      }
    });

    players.push({
      id: member.userId,
      name: member.username,
      color: '#888888',
      isNPC: false,
      coins: 0,
      inventoryValue: 0,
      landValue,
      netWorth: landValue,
      claimedTiles,
      member,
    });
  });

  // Add NPCs
  (world.npcs || []).forEach(npc => {
    const stats = calculateNetWorth(
      npc.id,
      npc.coins || 0,
      npc.inventory || [],
      resources,
      world.map.tiles
    );

    players.push({
      id: npc.id,
      name: npc.name,
      color: npc.color,
      isNPC: true,
      coins: npc.coins || 0,
      inventoryValue: stats.inventoryValue,
      landValue: stats.landValue,
      netWorth: stats.netWorth,
      claimedTiles: stats.claimedTiles,
    });
  });

  // Sort and return top
  players.sort((a, b) => b.netWorth - a.netWorth);
  return players[0] || null;
};
