"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { Cart, CartItem, Product, ProductVariant } from "@/lib/types";
import { useAuth } from "@/lib/context/auth-context";
import { supabase } from "@/lib/supabase/client";

interface CartContextType {
  cart: Cart;
  addItem: (productOrId: string | Product, quantity: number, variant?: ProductVariant) => Promise<void>;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => Promise<void>;
  clearCart: () => void;
  isMigrating: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({ items: [], total: 0 });
  const { user } = useAuth();
  const migratedRef = useRef(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // Session-based guest cart: do NOT use localStorage, just keep in memory for session
  // If you want to persist across tabs or refresh, use localStorage (disabled for this prompt)
  // On refresh, cart will reset

  // CartItem now stores productId, name, price, quantity, image
  const calculateTotal = (items: CartItem[]) => {
    return items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  };

  const addItem = async (productOrId: string | Product, quantity: number, variant?: ProductVariant) => {
    let product: Product | undefined;
    let productId: string;
    
    if (typeof productOrId === "string") {
      productId = productOrId;
      // Fetch product details from database
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          product = {
            id: data.id,
            name: data.name,
            slug: data.slug || data.id,
            description: data.description || '',
            price: Number(data.price) || 0,
            compareAtPrice: data.compare_at_price ? Number(data.compare_at_price) : undefined,
            images: data.image_url ? [data.image_url] : [],
            category: data.category || '',
            stock: data.stock ?? 0,
            sku: data.sku || '',
            rating: data.rating ?? 0,
            reviewCount: data.review_count ?? 0,
            featured: data.featured ?? false,
          };
        }
      } catch (err) {
        console.error('Error fetching product details for cart:', err);
      }
    } else {
      product = productOrId;
      productId = product.id;
    }

    // If variant is provided, use its price; otherwise use product price
    const name = product?.name || "";
    const price = Number(variant?.price ?? product?.price ?? 0);
    const image = product?.images?.[0] || "";
    const variantId = variant?.id || "";
    const variantLabel = variant?.variant_label || "";
    const sku = variant?.sku || product?.sku || "";
    
    console.debug('[Cart] addItem called:', {
      productId,
      productName: name,
      variant: variant ? { id: variant.id, label: variant.variant_label, price: variant.price } : null,
      calculatedPrice: price,
      quantity
    });

    // Capture current user value to avoid stale closure
    const currentUser = user;

    setCart((prev) => {
      // When looking for existing item, match both productId and variantId (if variant is used)
      const existingItem = prev.items.find((i) => 
        i.productId === productId && (!variantId || i.variantId === variantId)
      );
      
      let newItems: CartItem[];
      if (existingItem) {
        newItems = prev.items.map((i) =>
          i.productId === productId && (!variantId || i.variantId === variantId)
            ? { ...i, quantity: i.quantity + quantity, price, variantLabel, sku }
            : i
        );
      } else {
        const newItem: CartItem = {
          productId,
          variantId,
          quantity,
          name,
          price,
          image,
          variantLabel,
          sku,
        };
        newItems = [...prev.items, newItem];
      }
      const newCart = { items: newItems, total: calculateTotal(newItems) };
      
      // Sync with database if user is logged in
      if (currentUser && migratedRef.current) {
        const updatedItem = newItems.find((i) => i.productId === productId && (!variantId || i.variantId === variantId));
        if (updatedItem) {
          try {
            supabase
              .from('cart')
              .upsert(
                { 
                  user_id: currentUser.id, 
                  product_id: productId,
                  variant_id: variantId || null,
                  quantity: updatedItem.quantity 
                },
                { onConflict: 'user_id,product_id' }
              )
              .then(({ error }) => {
                if (error) {
                  console.debug('Cart sync skipped (non-critical):', error?.message);
                }
              });
          } catch (err) {
            console.debug('Cart sync to database skipped or failed (non-critical)');
          }
        }
      }
      
      return newCart;
    });
  };

  const removeItem = (productId: string, variantId?: string) => {
    // Capture current user value to avoid stale closure
    const currentUser = user;
    
    setCart((prev) => {
      const newItems = prev.items.filter((i) => 
        !(i.productId === productId && (!variantId || i.variantId === variantId))
      );
      const newCart = { items: newItems, total: calculateTotal(newItems) };
      
      // Sync with database if user is logged in
      if (currentUser && migratedRef.current) {
        try {
          supabase
            .from('cart')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('product_id', productId)
            .then(({ error }) => {
              if (error) {
                console.debug('Cart item removal sync skipped (non-critical):', error?.message);
              }
            });
        } catch (err) {
          console.debug('Cart item removal sync to database skipped or failed (non-critical)');
        }
      }
      
      return newCart;
    });
  };

  const updateQuantity = async (productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }
    
    // Capture current user value to avoid stale closure
    const currentUser = user;
    
    setCart((prev) => {
      // Check if item exists
      const existingItem = prev.items.find((i) => 
        i.productId === productId && (!variantId || i.variantId === variantId)
      );
      
      let newItems: CartItem[];
      if (existingItem) {
        // Update existing item
        newItems = prev.items.map((i) =>
          i.productId === productId && (!variantId || i.variantId === variantId)
            ? { ...i, quantity }
            : i
        );
      } else {
        // Item doesn't exist, this shouldn't happen but handle gracefully
        // Product details should already be in cart items, but if not, create minimal entry
        newItems = [...prev.items, {
          productId,
          variantId: variantId || "",
          name: "",
          price: 0,
          quantity,
          image: "",
        }];
      }
      
      const newCart = { items: newItems, total: calculateTotal(newItems) };
      
      // Sync with database if user is logged in
      if (currentUser && migratedRef.current) {
        try {
          supabase
            .from('cart')
            .upsert(
              { 
                user_id: currentUser.id, 
                product_id: productId,
                variant_id: variantId || null,
                quantity 
              },
              { onConflict: 'user_id,product_id' }
            )
            .then(({ error }) => {
              if (error) {
                console.debug('Cart quantity update sync skipped (non-critical):', error?.message);
              }
            });
        } catch (err) {
          console.debug('Cart quantity update sync to database skipped or failed (non-critical)');
        }
      }
      
      return newCart;
    });
  };

  const clearCart = () => {
    // Capture current user value to avoid stale closure
    const currentUser = user;
    
    const newCart = { items: [], total: 0 };
    setCart(newCart);
    
    // Sync with database if user is logged in
    if (currentUser && migratedRef.current) {
      supabase
        .from('cart')
        .delete()
        .eq('user_id', currentUser.id)
        .then(({ error }) => {
          if (error) {
            console.error('Error clearing cart from database', error);
          }
        });
    }
  };

  // When a guest user with items logs in, migrate their in-memory cart to DB
  useEffect(() => {
    const migrate = async () => {
      if (!user) return;
      if (cart.items.length === 0) return;
      if (migratedRef.current) return;

      try {
        const itemsToMigrate = cart.items;
        setIsMigrating(true);

        // Upsert each cart item into DB under the logged-in user
        for (const item of itemsToMigrate) {
          // Try to read existing cart item for this user/product so we can increment quantity
          const { data: existingRows } = await supabase
            .from('cart')
            .select('quantity')
            .eq('user_id', user.id)
            .eq('product_id', item.productId)
            .limit(1)
            .maybeSingle();

          const existingQty = existingRows?.quantity ?? 0;
          const newQty = existingQty + item.quantity;

          const { error } = await supabase
            .from('cart')
            .upsert(
              { user_id: user.id, product_id: item.productId, quantity: newQty },
              { onConflict: 'user_id,product_id' }
            );

          if (error) {
            console.error('Error upserting cart item during migration', error);
          }
        }

        // Fetch product details for migrated items to rebuild client cart
        const productIds = itemsToMigrate.map((i) => i.productId);
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);

        const newItems: CartItem[] = itemsToMigrate.map((i) => {
          const p = productsData?.find((pd: any) => pd.id === i.productId);
          return {
            productId: i.productId,
            quantity: i.quantity,
            name: p?.name || i.name,
            price: p?.price ?? i.price ?? 0,
            image: p?.image_url || i.image || '',
          } as CartItem;
        });

        setCart({ items: newItems, total: calculateTotal(newItems) });
        migratedRef.current = true;
        setIsMigrating(false);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Cart migration failed', err);
        setIsMigrating(false);
      }
    };

    migrate();
  }, [user]);

  // When a user is present and there are no in-memory cart items to migrate,
  // load the cart from the database so authenticated users keep their cart
  // across refreshes. We also avoid fetching if migration already ran.
  useEffect(() => {
    const fetchUserCart = async () => {
      if (!user) return;
      if (migratedRef.current) return;
      // If there are guest items in memory, migration effect will handle upserting them.
      if (cart.items.length > 0) return;

      try {
        setIsMigrating(true);
        const { data: cartRows, error: cartErr } = await supabase
          .from('cart')
          .select('product_id,quantity')
          .eq('user_id', user.id);

        if (cartErr) {
          console.error('Error fetching user cart', cartErr);
          setIsMigrating(false);
          return;
        }

        if (!cartRows || cartRows.length === 0) {
          // No items in DB cart
          setCart({ items: [], total: 0 });
          migratedRef.current = true;
          setIsMigrating(false);
          return;
        }

        const productIds = cartRows.map((r: any) => r.product_id);
        const { data: productsData } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds);

        const newItems: CartItem[] = (cartRows as any[]).map((r) => {
          const p = productsData?.find((pd: any) => pd.id === r.product_id);
          return {
            productId: r.product_id,
            quantity: r.quantity,
            name: p?.name || '',
            price: p?.price ?? 0,
            image: p?.image_url || '',
          } as CartItem;
        });

        setCart({ items: newItems, total: calculateTotal(newItems) });
        migratedRef.current = true;
        setIsMigrating(false);
      } catch (err) {
        console.error('Failed to fetch user cart', err);
        setIsMigrating(false);
      }
    };

    fetchUserCart();
  }, [user]);

  // When the user logs out (user becomes null), clear the cart and reset migration state.
  useEffect(() => {
    if (!user) {
      // Clear in-memory cart when signing out
      setCart({ items: [], total: 0 });
      // Allow future migrations for a new login session
      migratedRef.current = false;
    }
  }, [user]);

  return (
    <CartContext.Provider value={{ cart, addItem, removeItem, updateQuantity, clearCart, isMigrating }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
