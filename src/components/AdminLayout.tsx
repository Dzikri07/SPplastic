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
    <div className="min-h-screen bg-surface-subtle flex flex-col lg:flex-row text-ink">
      {/* Mobile Top Bar (<1024px) */}
      <header className="lg:hidden bg-petrol-900 text-white px-4 h-14 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-mint-300">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="font-display font-semibold text-sm block leading-tight text-white">CV Saripan Plastik</span>
            <span className="text-xs text-mint-300/80 block leading-none">Distribusi CVRP</span>
          </div>
        </div>
        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white rounded-md hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-mint-300 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          role="presentation"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-[#0F2E33]/60 z-40 lg:hidden"
        />
      )}

      {/* Sidebar: Desktop fixed width & Mobile drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-petrol-900 text-white z-50 flex flex-col transition-transform lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-mint-300 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="truncate">
              <span className="font-display font-bold text-white text-base block leading-tight truncate">
                CV Saripan Plastik
              </span>
              <span className="text-xs text-mint-300/80 block leading-none truncate">
                Distribusi & CVRP
              </span>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-mint-300 hover:text-white rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-mint-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links Grouped */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <p className="px-3 text-xs font-medium text-mint-300/70 mb-1">
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
                      `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors border-l-2 min-h-[40px] focus:outline-none focus-visible:ring-2 focus-visible:ring-mint-300 ${
                        isActive
                          ? 'border-mint-300 text-white font-semibold bg-white/10'
                          : 'border-transparent text-white/70 hover:text-white hover:bg-white/5'
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
        <div className="p-3 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="truncate min-w-0">
            <span className="block text-sm font-medium text-white truncate">
              {profile?.nama || profile?.username || 'Administrator'}
            </span>
            <span className="block text-xs text-mint-300/80 capitalize truncate">
              {profile?.role || 'Admin'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            title="Keluar"
            aria-label="Keluar dari akun"
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-mint-300"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
