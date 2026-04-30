import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { CraftEditor } from '@/components/craft/CraftEditor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft } from 'lucide-react';

interface Lesson {
    id: string;
    title: string;
    content: string;
    course_id: string;
}

export default function LessonPageBuilder() {
    const { courseId, lessonIndex } = useParams();
    const { user, isAdmin, loading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [courseTitle, setCourseTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!loading && (!user || !isAdmin)) navigate('/dashboard');
    }, [user, isAdmin, loading, navigate]);

    useEffect(() => {
        if (user && isAdmin && courseId) fetchLessonData();
    }, [user, isAdmin, courseId, lessonIndex]);

    const fetchLessonData = async () => {
        // Get course title
        const { data: course } = await supabase.from('courses').select('title').eq('id', courseId).single();
        if (course) setCourseTitle(course.title);

        // Get lesson by order_index
        const idx = parseInt(lessonIndex || '0');
        const { data: lessons } = await supabase
            .from('lessons')
            .select('*')
            .eq('course_id', courseId!)
            .order('order_index');

        if (lessons && lessons[idx]) {
            setLesson(lessons[idx]);
        }
        setIsLoading(false);
    };

    const handleSave = async (json: string) => {
        if (!lesson) return;
        setIsSaving(true);

        try {
            const { error } = await supabase
                .from('lessons')
                .update({ content: json })
                .eq('id', lesson.id);

            if (error) throw error;

            toast({ title: 'Gespeichert', description: 'Lektionsinhalt wurde gespeichert.' });
        } catch {
            toast({ title: 'Fehler', description: 'Inhalt konnte nicht gespeichert werden.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading || isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Laden...</div>
            </div>
        );
    }

    if (!lesson) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Lektion nicht gefunden</p>
                    <button onClick={() => navigate(`/admin/courses/${courseId}`)} className="text-primary hover:underline text-sm">
                        Zurück zum Kurs
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            {/* Top nav bar */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card flex-shrink-0">
                <button
                    onClick={() => navigate(`/admin/courses/${courseId}`)}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Zurück
                </button>
                <div className="h-4 w-px bg-border" />
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{courseTitle}</p>
                    <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
                </div>
            </div>

            {/* Editor fills remaining space */}
            <div className="flex-1 min-h-0">
                <CraftEditor
                    initialData={lesson.content || undefined}
                    onSave={handleSave}
                    isSaving={isSaving}
                />
            </div>
        </div>
    );
}
