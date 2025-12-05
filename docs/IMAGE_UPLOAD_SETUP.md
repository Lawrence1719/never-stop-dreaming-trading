# Image Upload Setup Guide

## Supabase Storage Configuration

Before using the product form's image upload feature, you need to set up a storage bucket in Supabase.

### Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Configure the bucket:
   - **Name:** `product-images`
   - **Public bucket:** ✅ **Enable** (so images are publicly accessible)
   - **File size limit:** 5242880 bytes (5MB)
   - **Allowed MIME types:** `image/jpeg,image/png,image/webp`

### Step 2: Set Bucket Policies

Make the bucket publicly readable:

```sql
-- Allow public read access to product-images bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'product-images' )
WITH CHECK ( bucket_id = 'product-images' );

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'product-images' );
```

### Step 3: Verify Configuration

Test the bucket by uploading an image:
1. Go to Storage > product-images
2. Click "Upload file"
3. Upload a test image
4. Click on the image and verify you can access the public URL

## Image Upload Features

The product form now includes:

✅ **Drag & Drop** - Drag images directly into the upload zone
✅ **File Selection** - Click to browse and select files
✅ **Image Preview** - See the image before uploading
✅ **Validation** - File type (JPEG, PNG, WebP) and size (max 5MB)
✅ **Progress Indicator** - Visual upload progress
✅ **Error Handling** - Clear error messages
✅ **Remove/Replace** - Easy image management

## Usage

```tsx
import { ProductForm } from "@/components/admin/product-form";

<ProductForm
  onSubmit={async (data) => {
    // data.image_url will contain the Supabase public URL
    console.log(data.image_url); 
    // https://[project].supabase.co/storage/v1/object/public/product-images/[filename]
    
    await supabase.from("products").insert([data]);
  }}
/>
```

## Image URL Format

Uploaded images will have URLs like:
```
https://yourproject.supabase.co/storage/v1/object/public/product-images/1733504832123-a3k9x2.jpg
```

## File Validation

- **Max Size:** 5MB
- **Formats:** JPEG (.jpg, .jpeg), PNG (.png), WebP (.webp)
- **Upload:** Automatic on form submit
- **Storage:** Supabase Storage bucket `product-images`

## Troubleshooting

### "Failed to upload image"
- Check if the `product-images` bucket exists
- Verify bucket is set to public
- Check storage policies allow uploads
- Ensure you're authenticated

### Images not displaying
- Verify bucket is set to **public**
- Check the public URL is correct
- Ensure bucket policies allow SELECT

### Upload is slow
- Large images take longer to upload
- Consider compressing images before upload
- Check your internet connection

## Optional: Image Optimization

For better performance, consider:
1. Client-side image compression before upload
2. Resize large images to reasonable dimensions
3. Use WebP format for better compression
4. Implement lazy loading for product images

## Security Notes

- Public bucket allows anyone to view images (intended for product photos)
- Upload/delete requires authentication
- File size is limited to 5MB
- Only image types are allowed
- Unique filenames prevent conflicts
