-- Migration: Add delete policy for product-images storage bucket
-- This allows the application to delete images from Storage when products are deleted

-- Drop existing policy if exists (idempotent)
drop policy if exists "Allow authenticated users to delete product images" on storage.objects;

-- Allow authenticated users to delete product images
create policy "Allow authenticated users to delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images');
