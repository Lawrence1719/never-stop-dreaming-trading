import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerClient()
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Call the RPC function to get sessions
    const { data: sessions, error: rpcError } = await supabase.rpc('get_user_active_sessions')

    if (rpcError) {
      console.error('RPC Error:', rpcError)
      
      // Fallback for when RPC isn't installed yet - return informative error
      if (rpcError.message.includes('function public.get_user_active_sessions() does not exist')) {
        return NextResponse.json({ 
          error: 'Session management database functions not installed.',
          setupRequired: true 
        }, { status: 501 })
      }
      
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') // 'all' or 'others'
    
    const supabase = await createServerClient()

    if (scope === 'all') {
      // Revoke ALL sessions via RPC
      const { error } = await supabase.rpc('revoke_all_user_sessions', { include_current: true })
      if (error) throw error
    } else if (scope === 'others') {
       // Revoke all OTHER sessions via RPC
       const { error } = await supabase.rpc('revoke_all_user_sessions', { include_current: false })
       if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
