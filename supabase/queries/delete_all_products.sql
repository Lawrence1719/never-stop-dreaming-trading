-- Delete all products safely
-- First, we need to handle order_items that reference products

-- Step 1: Delete order_items that reference products we're about to delete
DELETE FROM order_items 
WHERE product_id IN (SELECT id FROM products);

-- Step 2: Delete product_variants (if they exist)
DELETE FROM product_variants;

-- Step 3: Delete products
DELETE FROM products;

-- Verify deletion
SELECT COUNT(*) as remaining_products FROM products;
SELECT COUNT(*) as remaining_variants FROM product_variants;
SELECT COUNT(*) as remaining_order_items FROM order_items;
