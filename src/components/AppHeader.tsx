import React from 'react';
import { Menu, Search, Layers } from 'lucide-react';
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
    <header className="h-14 flex items-center gap-4 px-4 lg:px-6 bg-background border-b flex-shrink-0 sticky top-0 z-30">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-md hover:bg-muted transition-colors"
      >
        <Menu className="w-5 h-5 text-muted-foreground" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-sm font-semibold text-foreground truncate">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
      </div>

      {onSearchChange && (
        <div className="hidden sm:flex relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar..."
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      )}

      <ThemeToggle />

      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </header>
  );
};
