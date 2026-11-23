import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Font (taruh di index.html, sekali saja):
 * <link rel="preconnect" href="https://fonts.googleapis.com">
 * <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
 * <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Figtree:wght@400;500;600&display=swap" rel="stylesheet">
 */
const display = "font-['Bricolage_Grotesque',ui-sans-serif,system-ui,sans-serif]";
const body = "font-['Figtree',ui-sans-serif,system-ui,sans-serif]";

const inputClass =
  'w-full h-11 px-3.5 rounded-md border border-[#C5D0D1] bg-white text-[15px] text-[#172326] ' +
  'placeholder:text-[#8A9899] transition-colors hover:border-[#9BAAAB] ' +
  'focus:outline-none focus:border-[#1F7A74] focus:ring-[3px] focus:ring-[#1F7A74]/20';

/** Ilustrasi rute: satu depot, tiga rute kendaraan. Relevan dengan CVRP, bukan dekorasi acak. */
const RouteMap: React.FC = () => (
  <svg viewBox="0 0 480 360" className="w-full h-auto" fill="none" aria-hidden="true">
    {/* Rute 1 */}
    <path
      d="M240 190 C 200 150, 150 140, 110 100 S 70 50, 120 40 S 200 90, 240 190"
      stroke="#9BD6C9" strokeWidth="1.5" strokeDasharray="5 6" strokeLinecap="round"
    />
    {/* Rute 2 */}
    <path
      d="M240 190 C 300 150, 350 120, 400 90 S 440 160, 390 200 S 290 200, 240 190"
      stroke="#9BD6C9" strokeWidth="1.5" strokeDasharray="5 6" strokeLinecap="round"
    />
    {/* Rute 3 */}
    <path
      d="M240 190 C 270 240, 320 290, 340 320 S 250 330, 190 300 S 210 230, 240 190"
      stroke="#9BD6C9" strokeWidth="1.5" strokeDasharray="5 6" strokeLinecap="round"
    />
    {/* Titik pelanggan */}
    {[
      [110, 100], [120, 40], [400, 90], [440, 160], [390, 200],
      [340, 320], [190, 300], [150, 140], [320, 130],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="4" fill="#0F2E33" stroke="#9BD6C9" strokeWidth="1.5" />
    ))}
    {/* Depot */}
    <circle cx="240" cy="190" r="14" fill="#F2A93B" fillOpacity="0.18" />
    <circle cx="240" cy="190" r="7" fill="#F2A93B" />
  </svg>
);

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password) {
      setErrorMsg('Isi username dan password terlebih dahulu.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(username, password);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.error || 'Username atau password salah.');
      return;
    }

    navigate('/', { replace: true });
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
  };

  return (
    <div className={`${body} min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-white text-[#172326]`}>
      {/* Panel kiri: hanya tampil di layar lebar */}
      <aside className="hidden lg:flex flex-col justify-between bg-[#0F2E33] text-white px-14 py-12">
        <p className={`${display} text-lg font-semibold tracking-tight`}>CV Saripan Plastik</p>

        <div className="max-w-md w-full mx-auto">
          <RouteMap />
        </div>

        <div className="max-w-sm">
          <h1 className={`${display} text-[2rem] leading-[1.15] font-bold tracking-tight`}>
            Rute pengiriman yang terencana, armada yang terpantau.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#A9C4C3]">
            Sistem penentuan rute distribusi dengan metode CVRP untuk admin, gudang, dan driver.
          </p>
        </div>
      </aside>

      {/* Panel kanan: form */}
      <main className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm mx-auto">
          {/* Brand versi mobile */}
          <p className={`${display} lg:hidden mb-10 text-lg font-semibold tracking-tight text-[#0F2E33]`}>
            CV Saripan Plastik
          </p>

          <h2 className={`${display} text-[1.75rem] font-bold tracking-tight text-[#0F2E33]`}>
            Masuk
          </h2>
          <p className="mt-1.5 text-[15px] text-[#5B6B6E]">
            Gunakan akun yang sudah didaftarkan admin.
          </p>

          {errorMsg && (
            <div
              role="alert"
              className="mt-6 border-l-2 border-[#B42318] bg-[#FEF3F2] px-3.5 py-2.5 text-sm text-[#912018]"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-[#6B7C7E] hover:text-[#172326] focus:outline-none focus-visible:text-[#1F7A74]"
                >
                  {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-md bg-[#0F2E33] text-white text-[15px] font-semibold
                         transition-colors hover:bg-[#174249]
                         focus:outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-[#1F7A74]/50
                         disabled:opacity-60 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2.5"
            >
              {isSubmitting && (
                <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin motion-reduce:animate-none" />
              )}
              {isSubmitting ? 'Memeriksa akun' : 'Masuk'}
            </button>
          </form>

          {/* Hanya muncul di mode development */}
          {import.meta.env.DEV && (
            <p className="mt-8 text-[13px] text-[#6B7C7E]">
              Isi otomatis (dev):{' '}
              <button type="button" onClick={() => handleQuickFill('admin', 'Admin123!')} className="underline underline-offset-2 hover:text-[#172326]">admin</button>
              {', '}
              <button type="button" onClick={() => handleQuickFill('gudang', 'Gudang123!')} className="underline underline-offset-2 hover:text-[#172326]">gudang</button>
              {', '}
              <button type="button" onClick={() => handleQuickFill('driver', 'Driver123!')} className="underline underline-offset-2 hover:text-[#172326]">driver</button>
            </p>
          )}

          <p className="mt-12 text-xs text-[#8A9899]">
            Kerja Praktek Teknik Informatika, CV Saripan Plastik Cianjur
          </p>
        </div>
      </main>
    </div>
  );
};