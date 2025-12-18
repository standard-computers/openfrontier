import { GameWorld, Resource, RARITY_COLORS } from '@/types/game';
import { cn } from '@/lib/utils';
import { Package, Map, Hammer, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  world: GameWorld;
  resources: Resource[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar = ({ world, resources, activeTab, onTabChange }: SidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  const tabs = [
    { id: 'play', icon: Map, label: 'Play' },
    { id: 'edit', icon: Hammer, label: 'Edit' },
    { id: 'resources', icon: Package, label: 'Resources' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const getResource = (id: string | null) => resources.find(r => r.id === id);

  const inventoryCount = world.inventory.filter(s => s.resourceId).length;

  return (
    <div className={cn(
      'h-full flex flex-col pixel-panel transition-all duration-300',
      collapsed ? 'w-14' : 'w-64'
    )}>
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-[10px] font-pixel text-primary text-shadow-pixel truncate">
              {world.name}
            </h1>
            <p className="text-[8px] font-pixel text-muted-foreground">
              {world.maps.find(m => m.id === world.currentMapId)?.name}
            </p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="toolbar-btn !w-8 !h-8"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 transition-colors',
                'hover:bg-muted text-[10px] font-pixel',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{tab.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Inventory Preview */}
      {!collapsed && (
        <div className="flex-1 p-3 border-t border-border overflow-hidden">
          <p className="text-[8px] font-pixel text-muted-foreground mb-2">
            INVENTORY ({inventoryCount}/20)
          </p>
          <div className="grid grid-cols-5 gap-1">
            {world.inventory.slice(0, 10).map((slot, i) => {
              const resource = getResource(slot.resourceId);
              return (
                <div key={i} className="inventory-slot">
                  {resource && (
                    <>
                      <span>{resource.icon}</span>
                      {slot.quantity > 1 && (
                        <span className="absolute bottom-0 right-0.5 text-[6px] font-pixel">
                          {slot.quantity}
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Position */}
      {!collapsed && (
        <div className="p-3 border-t border-border">
          <p className="text-[8px] font-pixel text-muted-foreground">
            POS: {world.playerPosition.x}, {world.playerPosition.y}
          </p>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
