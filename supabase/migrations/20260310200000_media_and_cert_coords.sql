-- Add certificate coordinates to courses table
ALTER TABLE public.courses 
ADD COLUMN certificate_name_x NUMERIC DEFAULT 0.5,
ADD COLUMN certificate_name_y NUMERIC DEFAULT 0.5;

-- Create storage bucket for course media if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('course-media', 'course-media', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for course-media bucket
CREATE POLICY "Public read access for course media"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-media');

CREATE POLICY "Authenticated users can upload course media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'course-media' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own course media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'course-media' 
  AND auth.uid() = owner
);

CREATE POLICY "Users can delete their own course media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'course-media' 
  AND auth.uid() = owner
);
