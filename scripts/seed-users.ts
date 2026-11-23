import dotenv from 'dotenv';
import path from 'path';

// Load .env.local terlebih dahulu, fallback ke .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'ERROR: VITE_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di file .env.local'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface SeedUser {
  nama: string;
  username: string;
  role: 'admin' | 'gudang' | 'driver';
  password: string;
}

const SEED_USERS: SeedUser[] = [
  {
    nama: 'Administrator CV SP Plastik',
    username: 'admin',
    role: 'admin',
    password: 'Admin123!',
  },
  {
    nama: 'Staff Gudang SP Plastik',
    username: 'gudang',
    role: 'gudang',
    password: 'Gudang123!',
  },
  {
    nama: 'Driver Armada SP Plastik',
    username: 'driver',
    role: 'driver',
    password: 'Driver123!',
  },
];

async function seedUsers() {
  console.log('--- MEMULAI SEEDING PENGGUNA SUPABASE ---');

  for (const item of SEED_USERS) {
    const email = `${item.username.toLowerCase()}@spplastik.app`;
    console.log(`\nMemproses pengguna: ${item.username} (${email})...`);

    let userId: string | null = null;

    // Cek apakah user sudah terdaftar di auth
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existingUser = listData.users.find((u) => u.email === email);

    if (existingUser) {
      console.log(`User auth sudah ada (UID: ${existingUser.id}), memperbarui password...`);
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password: item.password,
          email_confirm: true,
          user_metadata: { nama: item.nama, username: item.username, role: item.role },
        }
      );

      if (updateError) {
        console.error(`Gagal update user auth: ${updateError.message}`);
      } else {
        userId = updateData.user.id;
      }
    } else {
      console.log(`Membuat user auth baru dengan email_confirm = true...`);
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: item.password,
        email_confirm: true,
        user_metadata: { nama: item.nama, username: item.username, role: item.role },
      });

      if (createError) {
        console.error(`Gagal membuat user auth: ${createError.message}`);
        continue;
      }
      userId = createData.user.id;
    }

    if (userId) {
      // Upsert ke public.profiles
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: userId,
        nama: item.nama,
        username: item.username,
        role: item.role,
      });

      if (profileError) {
        console.error(`Gagal upsert profile: ${profileError.message}`);
      } else {
        console.log(`✓ Profil ${item.username} [${item.role}] berhasil disimpan.`);
      }
    }
  }

  console.log('\n--- SEEDING PENGGUNA SELESAI ---');
}

seedUsers().catch((err) => {
  console.error('Fatal error saat seeding:', err);
  process.exit(1);
});
