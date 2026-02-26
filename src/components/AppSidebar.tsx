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
    <div className="flex flex-col h-full" style={{ background: 'hsl(222 75% 18%)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b" style={{ borderColor: 'hsl(222 50% 25%)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'hsl(213 90% 55% / 0.2)', border: '1px solid hsl(213 90% 55% / 0.4)' }}>
          <Layers className="w-4 h-4" style={{ color: 'hsl(213 90% 65%)' }} />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-sm font-bold text-white leading-tight whitespace-nowrap">Central de</div>
            <div className="text-xs font-semibold whitespace-nowrap" style={{ color: 'hsl(213 90% 65%)' }}>Integrações</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-xs font-semibold uppercase tracking-widest px-3 py-2 mb-1" style={{ color: 'hsl(222 30% 55%)' }}>
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'text-white'
                  : 'hover:text-white',
              )}
              style={{
                color: isActive ? 'white' : 'hsl(220 30% 70%)',
                background: isActive ? 'hsl(213 90% 55% / 0.18)' : 'transparent',
                borderLeft: isActive ? '3px solid hsl(213 90% 55%)' : '3px solid transparent',
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'hsl(222 60% 25%)';
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info + Sign Out */}
      <div className="p-3 border-t" style={{ borderColor: 'hsl(222 50% 25%)' }}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-2 rounded-lg" style={{ background: 'hsl(222 60% 22%)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: 'hsl(213 90% 55% / 0.3)', color: 'hsl(213 90% 65%)' }}>
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-xs font-medium text-white truncate">{user?.email}</div>
              <div className="text-xs capitalize" style={{ color: 'hsl(213 90% 65%)' }}>
                {userRole === 'admin' ? 'Administrador' : 'Visualizador'}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ color: 'hsl(0 72% 70%)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'hsl(0 72% 20%)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
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
