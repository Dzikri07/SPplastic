import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  CheckSquare,
  LogOut,
  Menu,
  X,
  PackageCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const GudangLayout: React.FC = () => {
  const { profile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard Gudang', href: '/gudang/dashboard', icon: LayoutDashboard },
    { name: 'Lihat Stok Produk', href: '/gudang/stock', icon: Boxes },
    { name: 'Konfirmasi Kesiapan', href: '/gudang/orders', icon: CheckSquare },
  ];

  return (
    <div className="min-h-screen bg-surface-subtle flex flex-col text-ink">
      {/* Top Header Navbar */}
      <header className="bg-petrol-900 text-white sticky top-0 z-30 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center text-mint-300">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="font-display font-bold text-white tracking-tight block text-base leading-tight">
                  CV Saripan Plastik
                </span>
                <span className="text-xs text-mint-300/80 font-medium block">
                  Logistik & Tim Gudang
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
                      `flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-colors border-b-2 ${
                        isActive
                          ? 'border-mint-300 text-white bg-white/10'
                          : 'border-transparent text-white/75 hover:text-white hover:bg-white/5'
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
            <div className="hidden md:flex items-center gap-3 border-l border-white/15 pl-4">
              <div className="text-right">
                <span className="block text-xs font-semibold text-white">
                  {profile?.nama || profile?.username}
                </span>
                <span className="block text-[11px] text-mint-300/80">
                  Tim Gudang
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

            {/* Mobile Menu Button */}
            <div className="flex md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Tutup navigasi' : 'Buka navigasi'}
                className="p-2 text-white hover:bg-white/10 rounded-md transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-petrol-900 px-4 pt-2 pb-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/10 text-white font-semibold'
                        : 'text-white/75 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 text-mint-300" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}

            <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">{profile?.nama}</p>
                <p className="text-[11px] text-mint-300/80">Tim Gudang</p>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-white/10 hover:bg-white/20 rounded-md font-medium transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};
