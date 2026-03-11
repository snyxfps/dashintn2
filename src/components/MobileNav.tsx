import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Layers, History, Search, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MobileNavProps {
    onMenuClick: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onMenuClick }) => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-40 lg:hidden flex items-center justify-around px-2">
            <NavLink
                to="/"
                className={({ isActive }) => cn(
                    "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                    isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-[10px]">Dashboard</span>
            </NavLink>

            <NavLink
                to="/smp"
                className={({ isActive }) => cn(
                    "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                    isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Layers className="w-5 h-5" />
                <span className="text-[10px]">Serviços</span>
            </NavLink>

            <NavLink
                to="/auditoria"
                className={({ isActive }) => cn(
                    "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors",
                    isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <History className="w-5 h-5" />
                <span className="text-[10px]">Auditoria</span>
            </NavLink>

            <button
                onClick={onMenuClick}
                className="flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
                <Menu className="w-5 h-5" />
                <span className="text-[10px]">Menu</span>
            </button>
        </nav>
    );
};
