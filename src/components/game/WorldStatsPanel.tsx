import { useState } from 'react';
import { X, Globe, Users, Map, Flag, Package, Coins, Crown } from 'lucide-react';
import { GameWorld, Resource, TILE_TYPES, calculateTileValue, RARITY_COLORS } from '@/types/game';
import { WorldMember } from '@/hooks/useGameWorld';
import { cn } from '@/lib/utils';

interface WorldStatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  world: GameWorld;
  resources: Resource[];
  members: WorldMember[];
}

type TabType = 'overview' | 'players' | 'terrain' | 'resources';

const WorldStatsPanel = ({ isOpen, onClose, world, resources, members }: WorldStatsPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  if (!isOpen) return null;

  const totalTiles = world.map.width * world.map.height;
  const claimedTiles = world.map.tiles.flat().filter(t => t.claimedBy).length;
  const claimedPercent = ((claimedTiles / totalTiles) * 100).toFixed(1);

  let totalWorldValue = 0;
  world.map.tiles.flat().forEach(tile => {
    totalWorldValue += calculateTileValue(tile, resources);
  });

  const resourceCounts: Record<string, number> = {};
  world.map.tiles.flat().forEach(tile => {
    tile.resources.forEach(resourceId => {
      resourceCounts[resourceId] = (resourceCounts[resourceId] || 0) + 1;
    });
  });

  const tileTypeCounts: Record<string, number> = {};
  world.map.tiles.flat().forEach(tile => {
    tileTypeCounts[tile.type] = (tileTypeCounts[tile.type] || 0) + 1;
  });

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Globe className="w-4 h-4" /> },
    { id: 'players', label: `Players (${members.length})`, icon: <Users className="w-4 h-4" /> },
    { id: 'terrain', label: 'Terrain', icon: <Map className="w-4 h-4" /> },
    { id: 'resources', label: 'Resources', icon: <Package className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="game-panel w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">{world.name}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm transition-colors",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 overflow-auto flex-1">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Users className="w-3 h-3" /> Players
                </div>
                <div className="text-2xl font-bold">{members.length}</div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Map className="w-3 h-3" /> Total Tiles
                </div>
                <div className="text-2xl font-bold">{totalTiles.toLocaleString()}</div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Flag className="w-3 h-3" /> Claimed
                </div>
                <div className="text-2xl font-bold">{claimedTiles.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{claimedPercent}% of world</div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Coins className="w-3 h-3" /> World Value
                </div>
                <div className="text-2xl font-bold text-amber-400">{totalWorldValue.toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Players Tab */}
          {activeTab === 'players' && (
            <div className="space-y-2">
              {members.length > 0 ? (
                members.map(member => (
                  <div key={member.id} className="bg-secondary/30 rounded-lg p-3 flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      member.role === 'owner' ? "bg-amber-500/20" : "bg-primary/20"
                    )}>
                      {member.role === 'owner' ? (
                        <Crown className="w-5 h-5 text-amber-500" />
                      ) : (
                        <Users className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{member.username}</div>
                      <div className={cn(
                        "text-xs",
                        member.role === 'owner' ? "text-amber-400" : "text-muted-foreground"
                      )}>
                        {member.role === 'owner' ? 'Owner' : 'Player'}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Joined {new Date(member.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No players in this world yet
                </div>
              )}
            </div>
          )}

          {/* Terrain Tab */}
          {activeTab === 'terrain' && (
            <div className="grid grid-cols-3 gap-2">
              {TILE_TYPES.map(tileType => {
                const count = tileTypeCounts[tileType.type] || 0;
                const percent = ((count / totalTiles) * 100).toFixed(0);
                return (
                  <div key={tileType.type} className="bg-secondary/30 rounded p-3 text-center">
                    <div className={`w-6 h-6 rounded mx-auto mb-2 ${tileType.color}`} />
                    <div className="text-sm font-medium">{tileType.label}</div>
                    <div className="text-lg font-bold">{count.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{percent}%</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div>
              {Object.keys(resourceCounts).length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {resources
                    .filter(r => resourceCounts[r.id])
                    .sort((a, b) => (resourceCounts[b.id] || 0) - (resourceCounts[a.id] || 0))
                    .map(resource => (
                      <div key={resource.id} className="bg-secondary/30 rounded p-2 flex items-center gap-2">
                        <span className="text-lg">{resource.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{resource.name}</div>
                          <div className={`text-xs ${RARITY_COLORS[resource.rarity]}`}>{resource.rarity}</div>
                        </div>
                        <div className="text-sm font-bold">{resourceCounts[resource.id]}</div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No resources remaining in the world
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorldStatsPanel;
