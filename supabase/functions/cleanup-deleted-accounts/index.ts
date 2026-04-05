import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const twentyFiveDaysAgoStart = new Date(now.getTime() - 26 * 24 * 60 * 60 * 1000).toISOString()
    const twentyFiveDaysAgoEnd = new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString()

    console.log(`[Cleanup] Running at ${now.toISOString()}`)

    // 1. Send Reminders (Day 25)
    const { data: reminderUsers, error: reminderError } = await supabase
      .from('profiles')
      .select('id, name, email, deleted_at')
      .lte('deleted_at', twentyFiveDaysAgoEnd)
      .gte('deleted_at', twentyFiveDaysAgoStart)

    if (reminderError) console.error('Error fetching reminder users:', reminderError)
    
    if (reminderUsers && reminderUsers.length > 0) {
      console.log(`[Reminder] Sending ${reminderUsers.length} reminders`)
      for (const user of reminderUsers) {
        // Here we trigger the internal email API or some notification layer
        // Since Edge Functions can't easily call our Next.js internal /api routes without auth,
        // it's better to implement the email sending logic directly here if using a service like Resend/SendGrid.
        // For now, we'll log it. (In production, the admin would configure a mailer here).
        console.log(`[Reminder] Should send reminder to ${user.email} (Name: ${user.name})`)
        
        // Audit Log for reminder
        await supabase.from('audit_logs').insert({
          target_id: user.id,
          target_type: 'profile',
          action: 'deletion_reminder_sent',
          metadata: { days_remaining: 5 }
        })
      }
    }

    // 2. Execute Cleanup (Day 30+)
    const { data: expiredUsers, error: expiredError } = await supabase
      .from('profiles')
      .select('id, email, name')
      .lte('deleted_at', thirtyDaysAgo)

    if (expiredError) throw expiredError

    if (expiredUsers && expiredUsers.length > 0) {
      console.log(`[Cleanup] Found ${expiredUsers.length} expired accounts`)
      
      for (const user of expiredUsers) {
        console.log(`[Cleanup] Processing ${user.id} (${user.email})`)

        // Call our anonymization RPC function
        const { error: rpcError } = await supabase.rpc('anonymize_user_data', {
          target_user_id: user.id
        })

        if (rpcError) {
          console.error(`[Cleanup] Error anonymizing ${user.id}:`, rpcError)
          continue
        }

        // Finally, delete the auth user
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id)
        if (authDeleteError) {
          console.error(`[Cleanup] Error deleting auth user ${user.id}:`, authDeleteError)
        } else {
          console.log(`[Cleanup] Successfully removed user ${user.id}`)
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      remindersProcessed: reminderUsers?.length || 0,
      cleanupsProcessed: expiredUsers?.length || 0 
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[Cleanup] Fatal Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
