import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Layers, Users, FileCheck, Truck, History,
  ChevronLeft, ChevronRight, LogOut, Settings, Menu, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/smp', label: 'SMP', icon: Layers },
  { path: '/multicadastro', label: 'Multicadastro', icon: Users },
  { path: '/rcv', label: 'RC-V', icon: FileCheck },
  { path: '/tecnologia-logistica', label: 'Tecnologia Logística', icon: Truck },
  { path: '/tecnologia-risco', label: 'Tecnologia Risco', icon: Settings },
  { path: '/auditoria', label: 'Auditoria', icon: History },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const { user, userRole, signOut } = useAuth();
  const location = useLocation();

  const sidebarContent = (
    <div className="flex flex-col h-full sidebar-premium border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0 border border-white/10">
          <Layers className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden anim-fade">
            <div className="text-sm font-black text-white leading-none tracking-tighter uppercase italic">
              Central <span className="text-blue-400">de Integrações</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-2 mb-1 text-sidebar-foreground/40">
            Menu principal
          </p>
        )}
        {navItems.map(item => {
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              className={cn(
                'sidebar-nav-item group transition-all duration-200',
                isActive && 'active'
              )}
            >
              <item.icon className={cn(
                "w-4 h-4 flex-shrink-0 transition-transform duration-200 group-hover:scale-110",
                isActive ? "text-white" : "text-sidebar-foreground/60 group-hover:text-white"
              )} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info + Sign Out */}
      <div className="p-3 border-t border-sidebar-border bg-black/10">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-2 rounded-lg bg-white/5 border border-white/5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-blue-500/20 text-blue-400">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-xs font-medium text-white truncate">{user?.email}</div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-blue-400/80">
                {userRole === 'admin' ? 'Administrador' : 'Visualizador'}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:bg-rose-500/10 active:scale-[0.98] group text-rose-400"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 transition-transform group-hover:-translate-x-1" />
          {!collapsed && <span className="font-bold">Sair do Sistema</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 relative',
          collapsed ? 'w-16' : 'w-60'
        )}
        style={{ background: 'hsl(222 75% 18%)' }}
      >
        {sidebarContent}
        {/* Toggle button */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-md"
          style={{ background: 'hsl(213 90% 55%)', color: 'white' }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={onMobileClose}
          style={{ background: 'hsl(220 30% 12% / 0.5)', backdropFilter: 'blur(2px)' }} />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'hsl(222 75% 18%)' }}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
