import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, MoreVertical, BookOpen, Users } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Course {
  id: string; title: string; description: string | null; duration_minutes: number;
  difficulty: string; is_published: boolean; created_at: string;
  enrollmentCount: number; lessonCount: number;
}

const getDifficultyLabel = (d: string) => {
  if (d === 'beginner') return 'Anfänger';
  if (d === 'intermediate') return 'Fortgeschritten';
  if (d === 'advanced') return 'Experte';
  return d;
};

export default function CourseManagement() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { if (user && isAdmin) fetchCourses(); }, [user, isAdmin]);

  const fetchCourses = async () => {
    const { data: coursesData } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    if (coursesData) {
      const coursesWithStats = await Promise.all(
        coursesData.map(async (course) => {
          const [enrollments, lessons] = await Promise.all([
            supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('course_id', course.id),
            supabase.from('lessons').select('id', { count: 'exact', head: true }).eq('course_id', course.id),
          ]);
          return { ...course, enrollmentCount: enrollments.count || 0, lessonCount: lessons.count || 0 };
        })
      );
      setCourses(coursesWithStats);
    }
    setIsLoading(false);
  };

  const togglePublish = async (course: Course) => {
    await supabase.from('courses').update({ is_published: !course.is_published }).eq('id', course.id);
    toast({ title: course.is_published ? 'Veröffentlichung zurückgezogen' : 'Veröffentlicht' });
    fetchCourses();
  };

  const deleteCourse = async (courseId: string) => {
    // Clean up storage: get course data for certificate PDF path
    const { data: courseData } = await supabase.from('courses').select('certificate_pdf_url').eq('id', courseId).single();

    // Clean up certificate PDF from storage
    if (courseData?.certificate_pdf_url) {
      const certPath = extractStoragePath(courseData.certificate_pdf_url, 'certificates');
      if (certPath) await supabase.storage.from('certificates').remove([certPath]);
    }

    // Clean up course media images from storage
    // List all files in the course-images folder that are referenced in lesson content
    const { data: lessonsData } = await supabase.from('lessons').select('content').eq('course_id', courseId);
    if (lessonsData) {
      const mediaUrls = new Set<string>();
      for (const lesson of lessonsData) {
        if (lesson.content) {
          // Extract all course-media URLs from lesson content JSON
          const matches = lesson.content.match(/course-images\/[a-f0-9-]+\.\w+/g);
          if (matches) matches.forEach((m: string) => mediaUrls.add(m));
        }
      }
      if (mediaUrls.size > 0) {
        await supabase.storage.from('course-media').remove([...mediaUrls]);
      }
    }

    await supabase.from('courses').delete().eq('id', courseId);
    toast({ title: 'Kurs gelöscht' });
    fetchCourses();
  };

  /** Extract the storage path from a full public URL */
  const extractStoragePath = (url: string, bucket: string): string | null => {
    try {
      const idx = url.indexOf(`/storage/v1/object/public/${bucket}/`);
      if (idx === -1) return null;
      return url.substring(idx + `/storage/v1/object/public/${bucket}/`.length);
    } catch {
      return null;
    }
  };

  const getDifficultyColor = (d: string) => {
    if (d === 'beginner') return 'bg-chart-2/10 text-chart-2 border-chart-2/20';
    if (d === 'intermediate') return 'bg-chart-4/10 text-chart-4 border-chart-4/20';
    if (d === 'advanced') return 'bg-destructive/10 text-destructive border-destructive/20';
    return '';
  };

  if (loading || isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-pulse text-muted-foreground">Laden...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Kursverwaltung</h1>
          <p className="text-sm text-muted-foreground mt-1">Schulungskurse erstellen und verwalten</p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link to="/admin/courses/new"><Plus className="h-4 w-4" />Kurs erstellen</Link>
        </Button>
      </div>

        {courses.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="text-base font-medium mb-1.5">Noch keine Kurse</h3>
              <p className="text-sm text-muted-foreground mb-4">Erstellen Sie Ihren ersten Kurs.</p>
              <Button asChild size="sm"><Link to="/admin/courses/new">Kurs erstellen</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardHeader className="pb-4"><CardTitle className="text-base">Alle Kurse ({courses.length})</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Kurs</TableHead>
                    <TableHead className="text-xs">Schwierigkeit</TableHead>
                    <TableHead className="text-xs">Lektionen</TableHead>
                    <TableHead className="text-xs">Einschreibungen</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Erstellt</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{course.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{course.description || 'Keine Beschreibung'}</p>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${getDifficultyColor(course.difficulty)}`}>{getDifficultyLabel(course.difficulty)}</Badge></TableCell>
                      <TableCell><span className="flex items-center gap-1 text-sm"><BookOpen className="h-3.5 w-3.5 text-muted-foreground" />{course.lessonCount}</span></TableCell>
                      <TableCell><span className="flex items-center gap-1 text-sm"><Users className="h-3.5 w-3.5 text-muted-foreground" />{course.enrollmentCount}</span></TableCell>
                      <TableCell>
                        {course.is_published ? (
                          <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20 text-xs">Veröffentlicht</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Entwurf</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(course.created_at), 'd. MMM yyyy', { locale: de })}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link to={`/admin/courses/${course.id}`}>Bearbeiten</Link></DropdownMenuItem>
                            <DropdownMenuItem onClick={() => togglePublish(course)}>{course.is_published ? 'Zurückziehen' : 'Veröffentlichen'}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteCourse(course.id)} className="text-destructive">Löschen</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
