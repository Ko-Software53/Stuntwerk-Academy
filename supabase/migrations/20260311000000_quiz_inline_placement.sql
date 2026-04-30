-- Add placement column to course_quizzes to allow quizzes between lessons
-- NULL or -1 means "end of course" (final exam), otherwise it's the lesson order_index after which this quiz appears
ALTER TABLE public.course_quizzes ADD COLUMN IF NOT EXISTS after_lesson_index INTEGER DEFAULT NULL;

-- Add a title column for quiz sections (e.g. "Wissenscheck zu Lektion 3")
ALTER TABLE public.course_quizzes ADD COLUMN IF NOT EXISTS quiz_title TEXT DEFAULT NULL;
