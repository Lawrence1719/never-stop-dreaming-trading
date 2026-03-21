    -- Migration: Add images array column to products table
-- This allows storing multiple image URLs per product

-- 1. Add the column
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- 2. Migrate existing data from image_url to the first element of the images array
-- Only if image_url is not null and images is empty
UPDATE products 
SET images = ARRAY[image_url] 
WHERE image_url IS NOT NULL AND (images IS NULL OR array_length(images, 1) IS NULL);

-- 3. Add comment for documentation
COMMENT ON COLUMN products.images IS 'Array of image URLs for the product image gallery';
