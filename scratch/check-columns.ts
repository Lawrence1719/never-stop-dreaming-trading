import { getClient } from './lib/supabase/admin.ts';

async function test() {
  const admin = getClient();
  const { data, error } = await admin.from('profiles').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Columns:', Object.keys(data[0] || {}));
}

test();
