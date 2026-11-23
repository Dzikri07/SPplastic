import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password) {
      setErrorMsg('Harap isi username dan password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(username, password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.error || 'Username atau password salah');
      return;
    }

    // Role redirect akan ditangani otomatis atau diarahkan langsung
    // Tunggu sesaat jika role baru dimuat
    navigate('/', { replace: true });
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-slate-100 sm:px-6 lg:px-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Header Brand */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-8 text-center text-white">
          <div className="mx-auto w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-3 shadow-inner">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">CV Saripan Plastik</h1>
          <p className="text-blue-100 text-xs mt-1">
            Sistem Informasi Distribusi & Penentuan Rute Optimal (CVRP)
          </p>
        </div>

        {/* Form Area */}
        <div className="p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Masuk ke Sistem</h2>
          <p className="text-xs text-slate-500 mb-6">
            Gunakan akun yang telah didaftarkan untuk mengakses dashboard.
          </p>

          {errorMsg && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-sm text-red-700 animate-shake">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: admin"
                  autoComplete="username"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memeriksa kredensial...</span>
                </>
              ) : (
                <>
                  <span>Masuk</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Akun Contoh (Development / Seed Mode Only) */}
          {import.meta.env.DEV && (
            <div className="mt-8 pt-5 border-t border-slate-200">
              <p className="text-xs font-medium text-slate-500 mb-2.5 text-center">
                Pilihan Akun Cepat (Development / Seed):
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin', 'Admin123!')}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition text-center"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('gudang', 'Gudang123!')}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition text-center"
                >
                  Gudang
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('driver', 'Driver123!')}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition text-center"
                >
                  Driver
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-500">
        Kerja Praktek Teknik Informatika &bull; CV Saripan Plastik Cianjur
      </p>
    </div>
  );
};
