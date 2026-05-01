import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { getClient as getSupabaseAdmin } from '@/lib/supabase/admin';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }
    
    const { name, email, phone, password } = result.data;
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://never-stop-dreaming-trading.vercel.app';
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone: phone || null,
          role: 'customer',
        },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return NextResponse.json({ error: "User already registered" }, { status: 400 });
    }
    
    
    return NextResponse.json({ user: data.user, session: data.session }, { status: 200 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
