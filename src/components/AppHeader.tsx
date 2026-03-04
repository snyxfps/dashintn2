import React from 'react';
import { Menu, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/ThemeToggle';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  actions?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title, subtitle, onMenuClick, searchValue, onSearchChange, actions
}) => {
  return (
    <header className="h-16 flex items-center gap-4 px-4 lg:px-6 bg-card/70 backdrop-blur-md border-b border-border flex-shrink-0 sticky top-0 z-30">
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-foreground truncate" style={{ letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      {/* Search */}
      {onSearchChange && (
        <div className="hidden sm:flex relative max-w-sm w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-all group-focus-within:text-blue-500 group-focus-within:scale-110" />
          <Input
            placeholder="Pesquisar cliente ou serviço..."
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-10 h-10 text-sm bg-muted/40 border-border/50 transition-all focus:bg-background focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 rounded-xl"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-bold text-muted-foreground pointer-events-none group-focus-within:opacity-0 transition-opacity">
            ⌘ K
          </div>
        </div>
      )}

      <ThemeToggle />

      {/* Actions */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
};
