-- Create storage bucket for emergency contact photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('emergency-contacts', 'emergency-contacts', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for emergency-contacts bucket
-- Allow public read access
CREATE POLICY "Public read access for emergency contact photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'emergency-contacts');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload emergency contact photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'emergency-contacts' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update emergency contact photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'emergency-contacts' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete emergency contact photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'emergency-contacts' 
  AND auth.role() = 'authenticated'
);
