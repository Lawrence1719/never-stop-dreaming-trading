import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 2) {
      return NextResponse.json({ data: {} });
    }

    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = getClient();
    const searchTerm = `%${q}%`;

    // Perform all searches in parallel
    const [
      orders,
      products,
      customers,
      categories,
      notifications,
      pages,
      faqs,
      testimonials,
      campaigns,
      subscribers,
      banners,
      settings,
    ] = await Promise.all([
      // Orders: Search by ID, or customer name/email (join profiles)
      adminClient
        .from('orders')
        .select(`
          id, 
          status, 
          total,
          profiles!inner(name, email)
        `)
        .or(`id.ilike.${searchTerm},profiles.name.ilike.${searchTerm},profiles.email.ilike.${searchTerm}`)
        .limit(4),

      // Products: Search by name, category, description, and variant SKU
      adminClient
        .from('products')
        .select(`
          id, 
          name, 
          category, 
          description,
          product_variants(sku)
        `)
        .or(`name.ilike.${searchTerm},category.ilike.${searchTerm},description.ilike.${searchTerm}`)
        // Note: OR for variants would be trickier in one call without RPC, 
        // but we'll stick to basic product search for now or improve later
        .limit(4),

      // Customers: Search profiles with 'customer' role (or all for admin search)
      adminClient
        .from('profiles')
        .select('id, name, email, phone')
        .or(`name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`)
        .limit(4),

      // Categories
      adminClient
        .from('categories')
        .select('id, name, slug')
        .or(`name.ilike.${searchTerm},slug.ilike.${searchTerm}`)
        .limit(4),

      // Notifications
      adminClient
        .from('notifications')
        .select('id, title, message')
        .or(`title.ilike.${searchTerm},message.ilike.${searchTerm}`)
        .limit(4),

      // CMS Pages
      adminClient
        .from('cms_pages')
        .select('id, title, slug')
        .or(`title.ilike.${searchTerm},slug.ilike.${searchTerm},content.ilike.${searchTerm}`)
        .limit(4),

      // CMS FAQs
      adminClient
        .from('cms_faqs')
        .select('id, question, answer')
        .or(`question.ilike.${searchTerm},answer.ilike.${searchTerm}`)
        .limit(4),

      // CMS Testimonials
      adminClient
        .from('cms_testimonials')
        .select('id, name, comment')
        .or(`name.ilike.${searchTerm},comment.ilike.${searchTerm}`)
        .limit(4),

      // Marketing Campaigns
      adminClient
        .from('newsletter_campaigns')
        .select('id, subject, status')
        .or(`subject.ilike.${searchTerm}`)
        .limit(4),

      // Newsletter Subscribers
      adminClient
        .from('newsletter_subscribers')
        .select('id, email, full_name')
        .or(`email.ilike.${searchTerm},full_name.ilike.${searchTerm}`)
        .limit(4),

      // Banners
      adminClient
        .from('banners')
        .select('id, title, placement, status')
        .or(`title.ilike.${searchTerm},placement.ilike.${searchTerm}`)
        .limit(4),

      // Settings
      adminClient
        .from('settings')
        .select('id, key, value')
        .or(`key.ilike.${searchTerm},value.ilike.${searchTerm}`)
        .limit(4),
    ]);

    const results = {
      orders: orders.data || [],
      products: products.data || [],
      customers: customers.data || [],
      categories: categories.data || [],
      notifications: notifications.data || [],
      pages: pages.data || [],
      faqs: faqs.data || [],
      testimonials: testimonials.data || [],
      campaigns: campaigns.data || [],
      subscribers: subscribers.data || [],
      banners: banners.data || [],
      settings: settings.data || [],
    };

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('[global-search] API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
