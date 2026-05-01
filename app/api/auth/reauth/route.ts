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
    
    // Verify an existing session exists
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      // Do not expose raw Supabase error messages
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Reauth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
