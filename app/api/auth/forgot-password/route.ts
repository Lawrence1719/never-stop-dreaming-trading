import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const schema = z.object({
  email: z.string().email('Invalid email address')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }
    
    const { email } = result.data;
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://never-stop-dreaming-trading.vercel.app';
    
    const supabase = await createServerClient();
    
    // We swallow errors here and unconditionally return 200 to prevent email enumeration
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/reset-password`,
    });
    
    return NextResponse.json({ message: "If an account exists, a reset email has been sent." }, { status: 200 });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
