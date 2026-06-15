import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || 'dummy'
);

async function check() {
  const { data, error } = await supabase.from('users').select('*');
  console.log("Users in public.users:", data);
  console.log("Error:", error);
}

check();
