import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateToken } from '@/lib/integration/token-store';

/**
 * POST /api/integration/products
 * 
 * Receives product data from BeatRoute / external ERP system.
 * Creates or updates products and their variants.
 * 
 * Authentication: Bearer token (from /api/integration/user/refresh)
 * 
 * Accepts a single product or an array of products.
 * 
 * Request Body (single):
 * {
 *   "sku": "130001103",
 *   "name": "Product Name",
 *   "description": "Product description",
 *   "category": "Beverages",
 *   "price": 100.00,
 *   "stock": 50,
 *   "image_url": "https://...",
 *   "variants": [
 *     { "sku": "130001103_BC", "label": "Box/Case", "price": 61.60, "stock": 20 },
 *     { "sku": "130001103_EA", "label": "Each", "price": 10.27, "stock": 100 }
 *   ]
 * }
 * 
 * Request Body (batch):
 * [
 *   { "sku": "130001103", "name": "Product A", ... },
 *   { "sku": "130003041", "name": "Product B", ... }
 * ]
 */

interface VariantInput {
    sku: string;
    label: string;
    price: number;
    stock?: number;
}

interface ProductInput {
    sku: string;
    name: string;
    description?: string;
    category?: string;
    price?: number;
    stock?: number;
    image_url?: string;
    variants?: VariantInput[];
}

// Validate API key or token
async function validateAuth(authHeader: string | null): Promise<boolean> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return false;
    }

    const token = authHeader.substring(7);

    // First, try to validate as a static API key (no DB round-trip).
    const expectedApiKey = process.env.INTEGRATION_API_KEY;
    if (expectedApiKey && token === expectedApiKey) {
        return true;
    }

    // Fall back to DB-backed token validation.
    return await validateToken(token);
}

// Validate a single product
function validateProduct(p: unknown): { valid: boolean; error?: string } {
    if (!p || typeof p !== 'object') {
        return { valid: false, error: 'Each product must be an object' };
    }

    const prod = p as Record<string, unknown>;

    if (!prod.sku || typeof prod.sku !== 'string') {
        return { valid: false, error: 'Each product must have sku (string)' };
    }

    if (!prod.name || typeof prod.name !== 'string') {
        return { valid: false, error: 'Each product must have name (string)' };
    }

    return { valid: true };
}

export async function POST(request: NextRequest) {
    try {
        // Validate auth
        const authHeader = request.headers.get('authorization');
        if (!await validateAuth(authHeader)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized', message: 'Invalid or missing token' },
                { status: 401 }
            );
        }

        // Parse body
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid JSON', message: 'Request body must be valid JSON' },
                { status: 400 }
            );
        }

        // Normalize to array
        const products: unknown[] = Array.isArray(body) ? body : [body];

        if (products.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Empty request', message: 'At least one product is required' },
                { status: 400 }
            );
        }

        // Validate all products
        for (const p of products) {
            const v = validateProduct(p);
            if (!v.valid) {
                return NextResponse.json(
                    { success: false, error: 'Invalid product data', message: v.error },
                    { status: 400 }
                );
            }
        }

        // Supabase setup
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json(
                { success: false, error: 'Server configuration error' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const results: Array<{ sku: string; status: 'created' | 'updated'; product_id: string; variants_synced: number }> = [];
        const errors: Array<{ sku: string; error: string }> = [];

        for (const item of products) {
            const prod = item as ProductInput;

            try {
                // Check if product exists by SKU
                const { data: existing } = await supabase
                    .from('products')
                    .select('id')
                    .eq('sku', prod.sku)
                    .limit(1)
                    .single();

                let productId: string;
                let status: 'created' | 'updated';

                if (existing) {
                    // Update existing product
                    const ex = existing as unknown as { id: string };
                    productId = ex.id;
                    status = 'updated';

                    const updateData: Record<string, unknown> = {
                        name: prod.name,
                        updated_at: new Date().toISOString(),
                    };
                    if (prod.description !== undefined) updateData.description = prod.description;
                    if (prod.category !== undefined) updateData.category = prod.category;
                    if (prod.price !== undefined) updateData.price = prod.price;
                    if (prod.stock !== undefined) updateData.stock = prod.stock;
                    if (prod.image_url !== undefined) updateData.image_url = prod.image_url;

                    await supabase
                        .from('products')
                        .update(updateData)
                        .eq('id', productId);
                } else {
                    // Create new product
                    status = 'created';

                    const { data: newProduct, error: insertError } = await supabase
                        .from('products')
                        .insert({
                            name: prod.name,
                            sku: prod.sku,
                            description: prod.description || '',
                            category: prod.category || '',
                            price: prod.price || 0,
                            stock: prod.stock || 0,
                            image_url: prod.image_url || null,
                            is_active: true,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .select('id')
                        .single();

                    if (insertError || !newProduct) {
                        errors.push({ sku: prod.sku, error: insertError?.message || 'Failed to create product' });
                        continue;
                    }

                    const np = newProduct as unknown as { id: string };
                    productId = np.id;
                }

                // Sync variants if provided
                let variantsSynced = 0;

                if (prod.variants && prod.variants.length > 0) {
                    for (const variant of prod.variants) {
                        // Check if variant exists by SKU
                        const { data: existingVariant } = await supabase
                            .from('product_variants')
                            .select('id')
                            .eq('sku', variant.sku)
                            .limit(1)
                            .single();

                        if (existingVariant) {
                            // Update existing variant
                            const updateData: Record<string, unknown> = {
                                variant_label: variant.label,
                                price: variant.price,
                                product_id: productId,
                                updated_at: new Date().toISOString(),
                            };
                            if (variant.stock !== undefined) updateData.stock = variant.stock;

                            await supabase
                                .from('product_variants')
                                .update(updateData)
                                .eq('sku', variant.sku);
                        } else {
                            // Create new variant
                            await supabase
                                .from('product_variants')
                                .insert({
                                    product_id: productId,
                                    sku: variant.sku,
                                    variant_label: variant.label,
                                    price: variant.price,
                                    stock: variant.stock || 0,
                                    is_active: true,
                                    created_at: new Date().toISOString(),
                                    updated_at: new Date().toISOString(),
                                });
                        }

                        variantsSynced++;
                    }
                }

                results.push({ sku: prod.sku, status, product_id: productId, variants_synced: variantsSynced });
            } catch (err) {
                errors.push({ sku: prod.sku, error: err instanceof Error ? err.message : 'Unknown error' });
            }
        }

        return NextResponse.json(
            {
                success: true,
                message: `Processed ${results.length} product(s)`,
                results,
                errors: errors.length > 0 ? errors : undefined,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error('Unexpected error in integration products endpoint:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Server error',
                message: error instanceof Error ? error.message : 'An unexpected error occurred',
            },
            { status: 500 }
        );
    }
}
