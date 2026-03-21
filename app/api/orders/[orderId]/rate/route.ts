import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    const { rating, reviewText } = body;

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Invalid rating. Must be an integer between 1 and 5." },
        { status: 400 }
      );
    }

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

    // Determine the product_id. The order.items is a jsonb array.
    let targetProductId = null;
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    if (Array.isArray(items) && items.length > 0) {
      targetProductId = items[0].product_id || items[0].productId;
    }

    // Insert the rating data into the reviews table
    const { error: insertError } = await supabaseClient
      .from("reviews")
      .insert({
        order_id: orderId,
        user_id: user.id,
        product_id: targetProductId,
        rating: rating,
        comment: reviewText || null,
      });

    if (insertError) {
      console.error("Failed to save rating:", insertError);
      return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
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
