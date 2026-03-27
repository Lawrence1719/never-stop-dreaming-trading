import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Filter } from 'bad-words';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    
    // Get the session from the request
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json().catch(() => ({}));
    const { rating, reviewText, title } = body;

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Invalid rating. Must be an integer between 1 and 5." },
        { status: 400 }
      );
    }

    // Auto-moderation logic
    let isOffensive = false;
    try {
      const filter = new Filter();
      isOffensive = (title && filter.isProfane(title)) || (reviewText && filter.isProfane(reviewText));
    } catch (moderationError) {
      console.warn("Moderation filter failed, proceeding without moderation:", moderationError);
    }
    
    const status = isOffensive ? 'rejected' : 'approved';
    const rejectionReason = isOffensive ? 'Violates community guidelines' : null;
    const moderatedAt = new Date().toISOString();

    // Create a Supabase client with the user's token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the order to verify ownership and current state
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found or unauthorized" }, { status: 404 });
    }

    // Apply strict business logic gates
    if (order.status !== "delivered" && order.status !== "completed") {
      return NextResponse.json(
        { error: "Order must be delivered before it can be rated" },
        { status: 400 }
      );
    }

    if (!order.confirmed_by_customer_at && !order.auto_confirmed) {
      return NextResponse.json(
        { error: "You must confirm receipt before rating the order" },
        { status: 400 }
      );
    }

    // Check if the order has already been rated by querying reviews
    const { data: existingReview, error: existingReviewError } = await supabaseClient
      .from("reviews")
      .select("id")
      .eq("order_id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already rated this order" },
        { status: 400 }
      );
    }

    // Determine the product_id and variant_name. The order.items is a jsonb array.
    let targetProductId = null;
    let variantName = null;
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    
    if (Array.isArray(items) && items.length > 0) {
      const targetItem = items[0]; 
      targetProductId = targetItem.product_id || targetItem.productId;
      variantName = targetItem.variant_name || targetItem.variantName || null;
    }

    // Insert the rating data into the reviews table
    // Note: We use a more permissive insert to support environments where migration might have failed
    const insertData: any = {
      order_id: orderId,
      user_id: user.id,
      product_id: targetProductId,
      rating: rating,
      comment: reviewText || null,
    };

    // Only add new columns if we think they exist (will fail gracefully if they don't and we catch it)
    if (title) insertData.title = title;
    if (variantName) insertData.variant_name = variantName;
    insertData.status = status;
    if (rejectionReason) insertData.rejection_reason = rejectionReason;
    insertData.moderated_at = moderatedAt;

    const { error: insertError } = await supabaseClient
      .from("reviews")
      .insert(insertData);

    if (insertError) {
      console.error("Failed to save rating:", insertError);
      return NextResponse.json({ 
        error: `Database error: ${insertError.message}. Please ensure the migration script (036) has been run in the Supabase SQL Editor.`,
        details: insertError 
      }, { status: 500 });
    }

    // If offensive, send a notification
    if (isOffensive) {
      await supabaseClient.from('notifications').insert({
        user_id: user.id,
        type: 'info',
        target_role: 'customer',
        title: 'Review Moderation',
        message: 'Your review was not posted due to violating community guidelines.',
      });

      return NextResponse.json({ 
        success: false, 
        message: "Your review violates community guidelines and was not posted.",
        moderated: true 
      });
    }

    return NextResponse.json({ success: true, message: "Rating saved successfully" });
  } catch (error) {
    console.error("Error in POST /api/orders/[orderId]/rate:", error);
    return NextResponse.json(
      { error: "Internal server error processing rating" },
      { status: 500 }
    );
  }
}
