-- Revert the previous policy change. Only allow viewing published courses.
DROP POLICY IF EXISTS "Enrolled users can view their courses" ON public.courses;
