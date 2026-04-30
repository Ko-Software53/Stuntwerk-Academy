-- Allow users to view courses they are enrolled in, even if not published
CREATE POLICY "Enrolled users can view their courses" ON public.courses FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = id AND e.user_id = auth.uid()
  )
);
