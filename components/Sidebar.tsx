
import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, CalendarClock, ShieldCheck, Settings, Box, Warehouse, Users, Truck, CalendarDays, Container, LogOut, Briefcase, TrafficCone, Building, UserCog, Shield, MonitorPlay, BookOpen, FileText, Search, X } from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import { Logo } from './Logo';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const ADMIN_NAV_ITEMS = [
  { id: 'admin-users', label: 'Manage Users', icon: UserCog },
  { id: 'admin-roles', label: 'Manage Roles', icon: Shield },
  { id: 'admin-facilities', label: 'Facilities', icon: Building },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help & Docs', icon: BookOpen },
];

const ICON_MAP: Record<string, React.FC<any>> = {
  'LayoutDashboard': LayoutDashboard,
  'MonitorPlay': MonitorPlay,
  'CalendarDays': CalendarDays,
  'GanttChart': CalendarDays, // Fallback safe icon
  'CalendarClock': CalendarClock,
  'Barrier': TrafficCone,
  'ShieldCheck': ShieldCheck,
  'Container': Container,
  'Warehouse': Warehouse,
  'Briefcase': Briefcase,
  'Truck': Truck,
  'Users': Users,
  'LogOut': LogOut,
  'Settings': Settings,
  'BookOpen': BookOpen,
  'Box': Box,
  'FileText': FileText
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, isOpen, setIsOpen }) => {
  const { roles, currentFacilityId } = useData();
  const { userProfile, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Determine if we are in "Admin Console Mode" or "Operational Mode"
  // Admin Mode is only active when an Admin user is NOT scoped to a specific facility
  const isAdminView = isAdmin && !currentFacilityId;

  // Logic to determine operational items based on role
  const allowedOpsItems = React.useMemo(() => {
    const userRole = roles.find(r => r.id === userProfile?.role);
    // Default to all if admin or no permissions set (fallback), otherwise filter
    if (isAdmin) return NAV_ITEMS;
    if (!userRole || !userRole.permissions) return NAV_ITEMS; // Fallback
    return NAV_ITEMS.filter(item => userRole.permissions.includes(item.id));
  }, [roles, userProfile, isAdmin]);

  const items = isAdminView ? ADMIN_NAV_ITEMS : allowedOpsItems;

  const filteredItems = items.filter(item => item.label.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`
        w-[280px] h-screen fixed left-0 top-0 border-r border-slate-200 dark:border-white/10 
        bg-white/95 dark:bg-[#121212]/95 backdrop-blur-xl flex flex-col z-50 transition-transform duration-300 print:hidden shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-24 flex items-center justify-between px-6 border-b border-slate-200 dark:border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <Logo className="w-full h-full" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white block leading-none">
                SwiftYard
              </span>
              {isAdminView ? (
                <span className="text-[10px] uppercase font-black tracking-widest text-purple-500">Admin Console</span>
              ) : (
                <span className="text-[10px] uppercase font-black tracking-widest text-blue-500">Yard Portal</span>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 bg-slate-100 dark:bg-white/10 rounded-full hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-slate-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 dark:border-white/5 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search UI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-white/5 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0a84ff] text-slate-900 dark:text-white transition-all"
            />
          </div>
        </div>

        <nav className="flex-1 py-4 flex flex-col gap-1 px-3 overflow-y-auto custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No UI matches "{searchTerm}"
            </div>
          ) : (
            filteredItems.map((item) => {
              // Admin items have direct icon components, Ops items have string names mapped
              const Icon = (item as any).icon && typeof (item as any).icon === 'string' ? ICON_MAP[(item as any).icon] : (item as any).icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`
                    flex items-center p-3 rounded-xl transition-all duration-200 group w-full text-left
                    ${isActive
                      ? (isAdminView ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'bg-[#0a84ff] text-white shadow-lg shadow-blue-900/50')
                      : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                    }
                  `}
                >
                  {Icon && <Icon className={`w-6 h-6 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-gray-400 group-hover:text-slate-900 dark:group-hover:text-white'}`} />}
                  <span className="ml-3 font-bold truncate flex-1">{item.label}</span>
                </button>
              );
            }) // End map
          )}
        </nav>
      </aside>
    </>
  );
};
