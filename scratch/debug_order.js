
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Simple .env parser
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUrl() {
  const { data, error } = await supabase
    .from('orders')
    .select('items')
    .eq('id', 'e56613e4-7c9e-4831-b55d-394145dde848')
    .single();

  if (error) {
    console.error('Error fetching order:', error);
    return;
  }

  const item = data.items[0];
  if (item && item.image) {
    const publicUrl = supabase.storage.from('product-images').getPublicUrl(item.image).data.publicUrl;
    console.log('Original image path:', item.image);
    console.log('Generated Public URL:', publicUrl);
  } else {
    console.log('No image found in item');
  }
}

debugUrl();
