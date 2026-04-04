import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function DELETE(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params
    
    // Auth check - using the project's standard server client
    const supabase = await createServerClient()
    
    // Auth check - get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Revoke specifically this session via RPC
    // The RPC handles the auth.uid() ownership check internally
    const { error } = await supabase.rpc('revoke_user_session', { p_session_id: sessionId })

    if (error) {
       console.error('Revoke RPC Error:', error)
       return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
