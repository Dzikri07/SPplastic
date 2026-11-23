import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Truck,
  Settings,
  Route as RouteIcon,
  BarChart3,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminLayout: React.FC = () => {
  const { profile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navGroups = [
    {
      group: 'Operasional',
      items: [
        { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Pesanan', href: '/admin/orders', icon: ShoppingCart },
        { name: 'Penentuan Rute', href: '/admin/routing', icon: RouteIcon },
        { name: 'Evaluasi Rute', href: '/admin/evaluation', icon: BarChart3 },
        { name: 'Laporan', href: '/admin/reports', icon: FileSpreadsheet },
      ],
    },
    {
      group: 'Master data',
      items: [
        { name: 'Pelanggan & Peta', href: '/admin/customers', icon: Users },
        { name: 'Produk', href: '/admin/products', icon: Package },
        { name: 'Kendaraan', href: '/admin/vehicles', icon: Truck },
      ],
    },
    {
      group: 'Sistem',
      items: [
        { name: 'Pengaturan Depot', href: '/admin/settings', icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-surface-subtle flex flex-col lg:flex-row">
      {/* Mobile Top Bar (<1024px) */}
      <header className="lg:hidden bg-surface border-b border-line px-4 h-14 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-white">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-ink text-sm block leading-tight">CV SP Plastik</span>
            <span className="text-xs text-muted block leading-none">Distribusi CVRP</span>
          </div>
        </div>
        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-ink rounded-md hover:bg-surface-muted focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          role="presentation"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-ink/30 z-40 lg:hidden"
        />
      )}

      {/* Sidebar: Desktop fixed width & Mobile drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-surface border-r border-line z-50 flex flex-col transition-transform lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center text-white shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="truncate">
              <span className="font-bold text-ink text-base block leading-tight truncate">
                CV SP Plastik
              </span>
              <span className="text-xs text-muted block leading-none truncate">
                Distribusi & CVRP
              </span>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-muted hover:text-ink rounded-md focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links Grouped */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <p className="px-3 text-xs font-medium text-muted uppercase tracking-wider mb-1">
                {group.group}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors border-l-2 min-h-[40px] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent ${
                        isActive
                          ? 'border-accent text-accent font-semibold bg-accent-subtle'
                          : 'border-transparent text-muted hover:text-ink hover:bg-surface-muted'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Info & Logout Footer */}
        <div className="p-3 border-t border-line flex items-center justify-between gap-2">
          <div className="truncate min-w-0">
            <span className="block text-sm font-medium text-ink truncate">
              {profile?.nama || profile?.username || 'Administrator'}
            </span>
            <span className="block text-xs text-muted capitalize truncate">
              {profile?.role || 'Admin'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            title="Keluar"
            aria-label="Keluar dari akun"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

