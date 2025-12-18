import { Gamepad2, Box, Hammer, Settings } from 'lucide-react';

interface GameHeaderProps {
  worldName: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const GameHeader = ({ worldName, activeTab, onTabChange }: GameHeaderProps) => {
  const tabs = [
    { id: 'dashboard', label: 'World', icon: Gamepad2 },
    { id: 'resources', label: 'Resources', icon: Box },
    { id: 'recipes', label: 'Recipes', icon: Hammer },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="game-panel mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary flex items-center justify-center pixel-border">
            <span className="text-2xl animate-bounce-pixel">🌍</span>
          </div>
          <div>
            <h1 className="text-lg font-pixel text-accent pixel-text-shadow">{worldName}</h1>
            <p className="text-[8px] font-pixel text-muted-foreground">World Editor</p>
          </div>
        </div>

        <nav className="flex gap-1 flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 font-pixel text-[8px] uppercase tracking-wider transition-colors ${
                  activeTab === tab.id
                    ? 'bg-accent text-accent-foreground pixel-border'
                    : 'bg-input text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default GameHeader;
