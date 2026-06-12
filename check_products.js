import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('products').select('id, name, is_active, category_id');
  console.log('All products:', data?.length);
  console.log('Active products:', data?.filter(p => p.is_active).length);
  console.log(data);
}
check();
