import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid email or password format' }, { status: 400 });
    }
    
    const { email, password } = result.data;
    
    const supabase = await createServerClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    return NextResponse.json({ user: data.user, session: data.session }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
