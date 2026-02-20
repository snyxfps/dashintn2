import React, { useState } from 'react';
import { Menu, Search, Bell } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

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
    <header className="h-16 flex items-center gap-4 px-4 lg:px-6 bg-card border-b border-border flex-shrink-0">
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
        <div className="hidden sm:flex relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={searchValue}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm bg-muted/50 border-0"
          />
        </div>
      )}

      {/* Actions */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
};
