import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getSessionIdFromAccessToken } from '@/lib/auth/session-id'

export const dynamic = 'force-dynamic'

function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || ''
  }
  return request.headers.get('x-real-ip') || ''
}

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token
    const currentSessionId = getSessionIdFromAccessToken(accessToken)
    const userAgent = request.headers.get('user-agent') || ''
    const ip = clientIpFromRequest(request)

    if (currentSessionId) {
      const { error: touchError } = await supabase.rpc('record_user_session_touch', {
        p_session_id: currentSessionId,
        p_user_agent: userAgent,
        p_ip_address: ip || null,
      })
      if (touchError) {
        console.warn('record_user_session_touch:', touchError.message)
      }
    }

    const { data: sessions, error: rpcError } = await supabase.rpc('get_user_active_sessions', {
      p_current_session_id: currentSessionId,
    })

    if (rpcError) {
      console.error('RPC Error:', rpcError)

      if (
        rpcError.message.includes('function public.get_user_active_sessions() does not exist') ||
        rpcError.message.includes('function public.get_user_active_sessions(uuid) does not exist')
      ) {
        return NextResponse.json({
          error: 'Session management database functions not installed.',
          setupRequired: true,
        }, { status: 501 })
      }

      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    const { data: sessionHistory, error: historyError } = await supabase.rpc('get_user_session_history', {
      p_limit: 40,
    })
    if (historyError) {
      console.warn('get_user_session_history:', historyError.message)
    }

    return NextResponse.json({
      sessions,
      sessionHistory: sessionHistory ?? [],
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope')

    const supabase = await createServerClient()

    if (scope === 'all') {
      const { error } = await supabase.rpc('revoke_all_user_sessions', { include_current: true })
      if (error) throw error
    } else if (scope === 'others') {
      const { data: { session } } = await supabase.auth.getSession()
      const currentSessionId = getSessionIdFromAccessToken(session?.access_token)
      if (!currentSessionId) {
        return NextResponse.json(
          { error: 'Could not resolve current session; try again after refreshing the page.' },
          { status: 400 },
        )
      }
      const { error } = await supabase.rpc('revoke_all_user_sessions', {
        include_current: false,
        p_current_session_id: currentSessionId,
      })
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Delete API Error:', error)
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
