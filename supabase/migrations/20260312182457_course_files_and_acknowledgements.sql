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
