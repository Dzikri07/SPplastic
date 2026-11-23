import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL atau Anon Key belum terkonfigurasi. Pastikan variabel VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY tersedia di .env.local atau Vercel.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Memetakan username login menjadi email internal Firebase/Supabase Auth.
 * Format: <username>@spplastik.app
 */
export function usernameToEmail(username: string): string {
  const sanitized = username.trim().toLowerCase();
  return `${sanitized}@spplastik.app`;
}

/**
 * Mengekstrak kembali username dari email internal.
 */
export function emailToUsername(email: string): string {
  return email.replace(/@spplastik\.app$/i, '');
}
