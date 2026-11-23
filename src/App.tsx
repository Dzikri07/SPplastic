import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { OrdersPage } from './pages/admin/OrdersPage';
import { CustomersPage } from './pages/admin/CustomersPage';
import { ProductsPage } from './pages/admin/ProductsPage';
import { VehiclesPage } from './pages/admin/VehiclesPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { RoutingPage } from './pages/admin/RoutingPage';
import { EvaluationPage } from './pages/admin/EvaluationPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { GudangLayout } from './components/GudangLayout';
import { GudangDashboard } from './pages/gudang/GudangDashboard';
import { GudangStockPage } from './pages/gudang/GudangStockPage';
import { GudangOrdersPage } from './pages/gudang/GudangOrdersPage';
import { DriverDashboard } from './pages/driver/DriverDashboard';

// Komponen penentu rute beranda berdasarkan role yang aktif
const HomeRedirect: React.FC = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomeRedirect />} />

          {/* Rute Khusus Admin dengan AdminLayout */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/orders" element={<OrdersPage />} />
              <Route path="/admin/customers" element={<CustomersPage />} />
              <Route path="/admin/products" element={<ProductsPage />} />
              <Route path="/admin/vehicles" element={<VehiclesPage />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
              <Route path="/admin/routing" element={<RoutingPage />} />
              <Route path="/admin/evaluation" element={<EvaluationPage />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
            </Route>
          </Route>

          {/* Rute Khusus Gudang dengan GudangLayout */}
          <Route element={<ProtectedRoute allowedRoles={['gudang']} />}>
            <Route element={<GudangLayout />}>
              <Route path="/gudang/dashboard" element={<GudangDashboard />} />
              <Route path="/gudang/stock" element={<GudangStockPage />} />
              <Route path="/gudang/orders" element={<GudangOrdersPage />} />
            </Route>
          </Route>

          {/* Rute Khusus Driver */}
          <Route element={<ProtectedRoute allowedRoles={['driver']} />}>
            <Route path="/driver/dashboard" element={<DriverDashboard />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
