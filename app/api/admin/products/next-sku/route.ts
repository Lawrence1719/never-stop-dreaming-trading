import { createServerClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get('prefix');

  if (!prefix) {
    return NextResponse.json({ error: 'Prefix is required' }, { status: 400 });
  }

  try {
    const supabase = await createServerClient();
    
    // Query existing variants for the prefix
    const { data: variants, error } = await supabase
      .from('product_variants')
      .select('sku')
      .ilike('sku', `${prefix}-%`);

    if (error) throw error;

    // Extract numbers, find max, and increment
    let nextNum = 1;
    if (variants && variants.length > 0) {
      const numbers = variants
        .map((v: { sku: string }) => {
          const parts = v.sku.split('-');
          const lastPart = parts[parts.length - 1];
          return parseInt(lastPart, 10);
        })
        .filter((n: number) => !isNaN(n));
      
      if (numbers.length > 0) {
        nextNum = Math.max(...numbers) + 1;
      }
    }

    // Return zero-padded 3-digit string
    const sequence = nextNum.toString().padStart(3, '0');
    return NextResponse.json({ data: { sequence } });
  } catch (err: any) {
    console.error('Error fetching next SKU sequence:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
