-- ============================================================================
-- Stuntwerk Academy: complete backend reset + setup
-- ============================================================================
-- Run this once against the target Supabase project to:
--   1. Drop the old application objects in `public` (tables, types, functions,
--      policies, etc.) and the storage policies this app installed.
--   2. Re-create the canonical schema by replaying every explorado-academy
--      migration in order.
--
-- IMPORTANT: This script does NOT delete existing storage objects or
-- buckets — Supabase blocks direct DELETE on storage tables via
-- storage.protect_delete(). The migrations create buckets idempotently
-- (ON CONFLICT (id) DO NOTHING) so they will simply re-attach to whatever is
-- already there. If you want to wipe stored files, do it from the Supabase
-- Storage dashboard (Storage → bucket → Empty).
--
-- The auth schema is not touched. Existing auth users keep their accounts
-- but their profiles / roles / progress will need to be re-created.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Drop the storage.objects policies this app installed
--    (DROP POLICY does NOT trigger storage.protect_delete().)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can read certificates"                     ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload certificates"                   ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete certificates"                   ON storage.objects;
DROP POLICY IF EXISTS "Public read access for course media"              ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload course media"      ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own course media"          ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own course media"          ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read course files storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage course files storage"           ON storage.objects;

-- ----------------------------------------------------------------------------
-- 2. Reset the public schema
--    Drops every table, view, type, function, sequence, etc. that lives in
--    public, then re-creates the schema with the standard Supabase grants.
-- ----------------------------------------------------------------------------
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

GRANT USAGE  ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL    ON SCHEMA public TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;

-- Ensure the client roles can access tables/functions (RLS still applies).
GRANT USAGE ON SCHEMA public TO anon, authenticated;
-- Make sure this applies even if objects are created by postgres/service_role.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres     IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres     IN SCHEMA public GRANT USAGE, SELECT, UPDATE           ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres     IN SCHEMA public GRANT EXECUTE                        ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE service_role IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE service_role IN SCHEMA public GRANT USAGE, SELECT, UPDATE           ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE service_role IN SCHEMA public GRANT EXECUTE                        ON FUNCTIONS TO authenticated;

COMMIT;

-- ============================================================================
-- 3. Apply migrations (each in its own transaction)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- migration: 20260113230959_20bb814b-f6ae-4508-975f-3e3a344eb7b7.sql
-- ----------------------------------------------------------------------------
BEGIN;
-- Create role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  department TEXT,
  job_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'employee',
  UNIQUE(user_id, role)
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  order_index INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create enrollments table
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, course_id)
);

-- Create lesson progress table
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, lesson_id)
);

-- Create certificates table
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  certificate_number TEXT UNIQUE NOT NULL,
  UNIQUE(user_id, course_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles policies (only admins can manage roles)
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Courses policies
CREATE POLICY "Anyone authenticated can view published courses" ON public.courses FOR SELECT USING (is_published = true AND auth.uid() IS NOT NULL);
CREATE POLICY "Admins can view all courses" ON public.courses FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Lessons policies
CREATE POLICY "Enrolled users can view lessons" ON public.lessons FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = course_id
    WHERE e.user_id = auth.uid() AND e.course_id = lessons.course_id
  )
);
CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Enrollments policies
CREATE POLICY "Users can view own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all enrollments" ON public.enrollments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can enroll themselves" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Lesson progress policies
CREATE POLICY "Users can view own progress" ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can modify own progress" ON public.lesson_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all progress" ON public.lesson_progress FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Certificates policies
CREATE POLICY "Users can view own certificates" ON public.certificates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all certificates" ON public.certificates FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can issue certificates" ON public.certificates FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger function for profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  -- Default role is employee
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
COMMIT;

-- ----------------------------------------------------------------------------
-- migration: 20260309211307_d18aa989-10b9-4d5c-9ea2-69635f7012fd.sql
-- ----------------------------------------------------------------------------
BEGIN;

-- Add certificate_pdf_url to courses table
ALTER TABLE public.courses ADD COLUMN certificate_pdf_url text;

-- Create storage bucket for certificate PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', true) ON CONFLICT (id) DO NOTHING;

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

COMMIT;

-- ----------------------------------------------------------------------------
-- migration: 20260310200000_media_and_cert_coords.sql
-- ----------------------------------------------------------------------------
BEGIN;
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

COMMIT;

-- ----------------------------------------------------------------------------
-- migration: 20260310210000_course_quizzes.sql
-- ----------------------------------------------------------------------------
BEGIN;
-- Create quiz_questions table to hold course-level quizzes
CREATE TABLE public.course_quizzes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_index INTEGER NOT NULL DEFAULT 0,
    explanation TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.course_quizzes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all users" ON public.course_quizzes FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.course_quizzes FOR ALL USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
);

COMMIT;

-- ----------------------------------------------------------------------------
-- migration: 20260311000000_quiz_inline_placement.sql
-- ----------------------------------------------------------------------------
BEGIN;
-- Add placement column to course_quizzes to allow quizzes between lessons
-- NULL or -1 means "end of course" (final exam), otherwise it's the lesson order_index after which this quiz appears
ALTER TABLE public.course_quizzes ADD COLUMN IF NOT EXISTS after_lesson_index INTEGER DEFAULT NULL;

-- Add a title column for quiz sections (e.g. "Wissenscheck zu Lektion 3")
ALTER TABLE public.course_quizzes ADD COLUMN IF NOT EXISTS quiz_title TEXT DEFAULT NULL;

COMMIT;

-- ----------------------------------------------------------------------------
-- migration: 20260312182457_course_files_and_acknowledgements.sql
-- ----------------------------------------------------------------------------
BEGIN;
-- Create course_files table
CREATE TABLE public.course_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create course_acknowledgements table
CREATE TABLE public.course_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.course_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_acknowledgements ENABLE ROW LEVEL SECURITY;

-- Policies for course_files
CREATE POLICY "Admins can manage course_files" ON public.course_files FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Enrolled users can view course_files" ON public.course_files FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = auth.uid() AND e.course_id = course_files.course_id
  ) OR public.has_role(auth.uid(), 'admin')
);

-- Policies for course_acknowledgements
CREATE POLICY "Users can view own acknowledgements" ON public.course_acknowledgements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own acknowledgements" ON public.course_acknowledgements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all acknowledgements" ON public.course_acknowledgements FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Set up storage bucket for course_files
INSERT INTO storage.buckets (id, name, public)
VALUES ('course_files', 'course_files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for course_files bucket
CREATE POLICY "Admins can manage course files storage"
ON storage.objects FOR ALL USING (
  bucket_id = 'course_files' AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Authenticated users can read course files storage"
ON storage.objects FOR SELECT USING (
  bucket_id = 'course_files' AND auth.role() = 'authenticated'
);

COMMIT;

-- ----------------------------------------------------------------------------
-- migration: 20260312214900_add_certificate_font_size.sql
-- ----------------------------------------------------------------------------
BEGIN;
-- Add certificate_name_size to courses
ALTER TABLE courses
ADD COLUMN certificate_name_size NUMERIC DEFAULT 28;

COMMIT;

-- ----------------------------------------------------------------------------
-- migration: 20260312222600_allow_viewing_enrolled_drafts.sql
-- ----------------------------------------------------------------------------
BEGIN;
-- Allow users to view courses they are enrolled in, even if not published
CREATE POLICY "Enrolled users can view their courses" ON public.courses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = id AND e.user_id = auth.uid()
  )
);

COMMIT;

-- ----------------------------------------------------------------------------
-- migration: 20260313080500_revert_allow_viewing_enrolled_drafts.sql
-- ----------------------------------------------------------------------------
BEGIN;
-- Revert the previous policy change. Only allow viewing published courses.
DROP POLICY IF EXISTS "Enrolled users can view their courses" ON public.courses;

COMMIT;

-- ----------------------------------------------------------------------------
-- migration: 20260313084000_allow_viewing_enrolled_courses.sql
-- ----------------------------------------------------------------------------
BEGIN;
-- Allow users to view courses they are enrolled in
CREATE POLICY "Enrolled users can view their courses" ON public.courses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = id AND e.user_id = auth.uid()
  )
);

COMMIT;

-- ----------------------------------------------------------------------------
-- migration: 20260319120000_add_nda_accepted_at.sql
-- ----------------------------------------------------------------------------
BEGIN;
-- Add NDA acceptance tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN nda_accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Allow users to update their own nda_accepted_at
-- (existing RLS policy already allows users to update their own profile)

COMMIT;

-- ============================================================================
-- 4. Post-migration grants (white-label safety net)
--    RLS policies control *which rows* can be accessed, but Postgres GRANTs
--    control whether the role can touch the table/function at all. This block
--    ensures a freshly cloned project works on first try.
-- ============================================================================
BEGIN;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT, UPDATE          ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE                        ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
COMMIT;

