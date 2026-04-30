-- Add NDA acceptance tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN nda_accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Allow users to update their own nda_accepted_at
-- (existing RLS policy already allows users to update their own profile)
