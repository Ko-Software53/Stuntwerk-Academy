-- Add certificate_name_size to courses
ALTER TABLE courses
ADD COLUMN certificate_name_size NUMERIC DEFAULT 28;
