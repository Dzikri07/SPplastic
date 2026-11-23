import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/database';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Memuat sesi pengguna...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Arahkan ke dashboard yang sesuai dengan hak akses pengguna
    switch (role) {
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      case 'gudang':
        return <Navigate to="/gudang/dashboard" replace />;
      case 'driver':
        return <Navigate to="/driver/dashboard" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};
