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
  LogOut,
  Menu,
  X,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AdminLayout: React.FC = () => {
  const { profile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Pesanan', href: '/admin/orders', icon: ShoppingCart },
    { name: 'Penentuan Rute', href: '/admin/routing', icon: RouteIcon },
    { name: 'Pelanggan & Peta', href: '/admin/customers', icon: Users },
    { name: 'Produk', href: '/admin/products', icon: Package },
    { name: 'Kendaraan', href: '/admin/vehicles', icon: Truck },
    { name: 'Pengaturan Depot', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <span className="font-bold text-slate-900 tracking-tight block text-base leading-tight">
                  CV SP Plastik
                </span>
                <span className="text-[11px] text-blue-600 font-medium block">
                  Distribusi & Saving Matrix CVRP
                </span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* User Info & Logout */}
            <div className="hidden md:flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="text-right">
                <span className="block text-xs font-semibold text-slate-800">
                  {profile?.nama || profile?.username}
                </span>
                <span className="block text-[10px] text-slate-500 capitalize">
                  {profile?.role}
                </span>
              </div>
              <button
                onClick={() => logout()}
                title="Keluar"
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 animate-fadeIn">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 text-blue-600" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}

            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-800">{profile?.nama}</p>
                <p className="text-[11px] text-slate-500 capitalize">{profile?.role}</p>
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};
