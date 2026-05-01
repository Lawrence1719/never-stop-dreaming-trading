import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }
    
    const { password } = result.data;
    
    const supabase = await createServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Invalid or expired reset link.' }, { status: 401 });
    }
    
    const { error: updateError } = await supabase.auth.updateUser({ password });
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
    
    return NextResponse.json({ message: "Password updated successfully." }, { status: 200 });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
