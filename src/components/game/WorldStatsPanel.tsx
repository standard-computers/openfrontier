import { useState, useMemo } from 'react';
import { X, Globe, Users, Map, Flag, Package, Coins, Crown, Bot, Heart, MapPin, Trophy } from 'lucide-react';
import { RankingList } from './PlayerRankingPanel';
import { GameWorld, Resource, TILE_TYPES, calculateTileValue, RARITY_COLORS, NPC, Position } from '@/types/game';
import { WorldMember, MemberSovereignty } from '@/hooks/useGameWorld';
import { buildSovereigntyRows, SovereigntyRow } from '@/lib/sovereigntyRows';
import { cn } from '@/lib/utils';
import ResourceIcon from './ResourceIcon';

interface WorldStatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  world: GameWorld;
  resources: Resource[];
  members: WorldMember[];
  worldSovereignties: MemberSovereignty[];
  onViewUser: (member: WorldMember) => void;
  onNavigateToPosition: (position: Position) => void;
}

type TabType = 'overview' | 'sovereignties' | 'players' | 'leaderboard' | 'terrain' | 'resources';

const WorldStatsPanel = ({ isOpen, onClose, world, resources, members, worldSovereignties, onViewUser, onNavigateToPosition }: WorldStatsPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Calculate claimed tiles per NPC - must be before any early returns
  const npcClaimedTiles = useMemo(() => {
    const counts: Record<string, number> = {};
    world.map.tiles.flat().forEach(tile => {
      if (tile.claimedBy?.startsWith('npc-')) {
        counts[tile.claimedBy] = (counts[tile.claimedBy] || 0) + 1;
      }
    });
    return counts;
  }, [world.map.tiles]);

  // One row per founded sovereignty: territory, value, pledged population and home tile
  const sovereigntyRows = useMemo<SovereigntyRow[]>(
    () =>
      buildSovereigntyRows({
        tiles: world.map.tiles,
        strangers: world.strangers || [],
        npcs: world.npcs || [],
        worldSovereignties,
        currentSovereignty: world.sovereignty,
        userId: world.userId,
        userColor: world.userColor,
        currentUsername: members.find(m => m.userId === world.userId)?.username || 'You',
        resources,
      }),
    [world.map.tiles, world.strangers, world.npcs, world.sovereignty, world.userId, world.userColor, resources, worldSovereignties, members]
  );

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

  const npcs = world.npcs || [];
  const totalPopulation = members.length + npcs.length;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Globe className="w-4 h-4" /> },
    { id: 'sovereignties', label: `Sovereignties (${sovereigntyRows.length})`, icon: <Flag className="w-4 h-4" /> },
    { id: 'players', label: `Players (${totalPopulation})`, icon: <Users className="w-4 h-4" /> },
    { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy className="w-4 h-4" /> },
    { id: 'terrain', label: 'Terrain', icon: <Map className="w-4 h-4" /> },
    { id: 'resources', label: 'Resources', icon: <Package className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className={cn(
        "game-panel w-full max-h-[85vh] overflow-hidden flex flex-col",
        activeTab === 'sovereignties' ? "max-w-3xl" : "max-w-lg"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">{world.name}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm transition-colors",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              {tab.icon}
              <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
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
                  <Bot className="w-3 h-3" /> NPCs
                </div>
                <div className="text-2xl font-bold">{npcs.length}</div>
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
              <div className="bg-secondary/50 rounded-lg p-3 col-span-2">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <Coins className="w-3 h-3" /> World Value
                </div>
                <div className="text-2xl font-bold text-amber-400">{totalWorldValue.toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Sovereignties Tab */}
          {activeTab === 'sovereignties' && (
            <div>
              {sovereigntyRows.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No sovereignties founded yet
                </div>
              ) : (
                <table className="w-full text-xs border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="sticky top-0 bg-background/95 backdrop-blur text-left font-medium py-2 pr-2">Sovereignty</th>
                      <th className="sticky top-0 bg-background/95 backdrop-blur text-left font-medium py-2 pr-2">Ruler</th>
                      <th className="sticky top-0 bg-background/95 backdrop-blur text-right font-medium py-2 pr-2">Tiles</th>
                      <th className="sticky top-0 bg-background/95 backdrop-blur text-right font-medium py-2 pr-2">Value</th>
                      <th className="sticky top-0 bg-background/95 backdrop-blur text-right font-medium py-2 pr-2">Pop.</th>
                      <th className="sticky top-0 bg-background/95 backdrop-blur text-right font-medium py-2">Home</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sovereigntyRows.map(row => (
                      <tr key={row.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base leading-none shrink-0">{row.flag}</span>
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: row.color }}
                              title="Territory color"
                            />
                            <div className="min-w-0">
                              <div className="font-medium truncate max-w-[150px]">{row.name}</div>
                              {row.motto && (
                                <div className="text-[10px] italic text-muted-foreground truncate max-w-[150px]">
                                  "{row.motto}"
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 pr-2 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            {row.isNPC ? <Bot className="w-3 h-3 shrink-0" /> : <Users className="w-3 h-3 shrink-0" />}
                            <span className="truncate max-w-[180px]">{row.ruler}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums">{row.tiles.toLocaleString()}</td>
                        <td className="py-2 pr-2 text-right tabular-nums text-amber-400">{row.value.toLocaleString()}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{row.population.toLocaleString()}</td>
                        <td className="py-2 text-right">
                          {row.home ? (
                            <button
                              onClick={() => onNavigateToPosition(row.home!)}
                              className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-0.5"
                              title="Jump to home tile"
                            >
                              <MapPin className="w-3 h-3" />
                              ({row.home.x}, {row.home.y})
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Players Tab */}
          {activeTab === 'players' && (
            <div className="space-y-4">
              {/* Human Players Section */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Players ({members.length})
                </h3>
                <div className="space-y-2">
                  {members.length > 0 ? (
                    members.map(member => (
                      <button
                        key={member.id}
                        onClick={() => onViewUser(member)}
                        className="w-full bg-secondary/30 rounded-lg p-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left"
                      >
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
                            "text-xs flex items-center gap-1",
                            member.role === 'owner' ? "text-amber-400" : "text-muted-foreground"
                          )}>
                            {member.role === 'owner' ? 'Owner' : 'Player'}
                            {(() => {
                              // Find player position on map
                              for (let y = 0; y < world.map.tiles.length; y++) {
                                for (let x = 0; x < world.map.tiles[y].length; x++) {
                                  const tile = world.map.tiles[y][x];
                                  if (tile.claimedBy === member.userId) {
                                    return (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onNavigateToPosition({ x, y });
                                        }}
                                        className="ml-1 text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                                      >
                                        <MapPin className="w-3 h-3" />
                                        ({x}, {y})
                                      </button>
                                    );
                                  }
                                }
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-4 text-sm">
                      No players in this world yet
                    </div>
                  )}
                </div>
              </div>

              {/* NPCs Section */}
              {npcs.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Bot className="w-4 h-4" /> NPCs ({npcs.length})
                  </h3>
                  <div className="space-y-2">
                    {npcs.map(npc => {
                      const claimedCount = npcClaimedTiles[npc.id] || 0;
                      const inventoryItems = npc.inventory?.filter(s => s.resourceId).length || 0;
                      
                      return (
                        <div
                          key={npc.id}
                          className="w-full bg-secondary/30 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: `${npc.color}20` }}
                            >
                              <Bot className="w-5 h-5" style={{ color: npc.color }} />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{npc.name}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <span>{npc.sovereignty.flag}</span>
                                <span>{npc.sovereignty.name}</span>
                                <button
                                  onClick={() => onNavigateToPosition(npc.position)}
                                  className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                                >
                                  <MapPin className="w-3 h-3" />
                                  ({npc.position.x}, {npc.position.y})
                                </button>
                              </div>
                            </div>
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: npc.color }}
                              title={`Territory color: ${npc.color}`}
                            />
                          </div>
                          {/* NPC Stats */}
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="bg-secondary/50 rounded px-2 py-1 flex items-center gap-1">
                              <Coins className="w-3 h-3 text-amber-400" />
                              <span>{npc.coins?.toLocaleString() || 0}</span>
                            </div>
                            <div className="bg-secondary/50 rounded px-2 py-1 flex items-center gap-1">
                              <Flag className="w-3 h-3 text-primary" />
                              <span>{claimedCount}</span>
                            </div>
                            <div className="bg-secondary/50 rounded px-2 py-1 flex items-center gap-1">
                              <Package className="w-3 h-3 text-muted-foreground" />
                              <span>{inventoryItems}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <RankingList
              world={world}
              resources={resources}
              members={members}
              onViewUser={onViewUser}
              onNavigateToPosition={(pos) => {
                onNavigateToPosition(pos);
                onClose();
              }}
            />
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
                        <ResourceIcon icon={resource.icon} iconType={resource.iconType} size="md" />
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
