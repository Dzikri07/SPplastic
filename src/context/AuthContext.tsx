import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, usernameToEmail } from '../lib/supabase';
import type { Profile, UserRole } from '../types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Ambil data profil dari tabel public.profiles berdasarkan UID auth
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as Profile;
    } catch (err) {
      console.error('Unexpected error fetching profile:', err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Cek session saat pertama kali inisialisasi
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        const userProfile = await fetchProfile(session.user.id);
        if (mounted) {
          setProfile(userProfile);
          setLoading(false);
        }
      } else {
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    });

    // Pasang listener auth state change
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        const userProfile = await fetchProfile(session.user.id);
        if (mounted) {
          setProfile(userProfile);
          setLoading(false);
        }
      } else {
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const email = usernameToEmail(username);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        return {
          success: false,
          error: 'Username atau password salah',
        };
      }

      const userProfile = await fetchProfile(data.user.id);
      setUser(data.user);
      setProfile(userProfile);

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: 'Terjadi kesalahan pada sistem saat login',
      };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role ?? null,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return context;
};
