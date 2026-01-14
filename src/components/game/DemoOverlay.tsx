import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, Map, Sparkles } from 'lucide-react';

const DemoOverlay = () => {
  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
      {/* Semi-transparent overlay just behind the buttons */}
      <div className="pointer-events-auto bg-background/80 backdrop-blur-sm rounded-2xl p-8 flex flex-col items-center gap-6 shadow-2xl border border-border/50">
        {/* Logo/Title */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Map className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">WorldSmith</h1>
            <p className="text-muted-foreground text-sm">Explore • Claim • Build</p>
          </div>
        </div>

        {/* Description */}
        <div className="text-center max-w-xs">
          <p className="text-muted-foreground text-sm">
            Walk around and explore the world! Sign up to claim tiles, gather resources, and build your empire.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 w-full">
          <Link to="/auth?mode=signup" className="w-full">
            <Button size="lg" className="w-full gap-2">
              <UserPlus className="w-5 h-5" />
              Sign Up
            </Button>
          </Link>
          <Link to="/auth" className="w-full">
            <Button variant="outline" size="lg" className="w-full gap-2">
              <LogIn className="w-5 h-5" />
              Log In
            </Button>
          </Link>
        </div>

        {/* Hint */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3" />
          <span>Use arrow keys or WASD to move</span>
        </div>
      </div>
    </div>
  );
};

export default DemoOverlay;
