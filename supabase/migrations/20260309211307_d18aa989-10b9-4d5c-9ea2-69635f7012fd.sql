
-- Add certificate_pdf_url to courses table
ALTER TABLE public.courses ADD COLUMN certificate_pdf_url text;

-- Create storage bucket for certificate PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true);

-- Allow admins to upload certificate PDFs
CREATE POLICY "Admins can upload certificates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'certificates' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Allow anyone to read certificate PDFs
CREATE POLICY "Anyone can read certificates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'certificates');

-- Allow admins to delete certificates
CREATE POLICY "Admins can delete certificates"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'certificates' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);
