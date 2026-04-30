import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Clock, Award, Play, CheckCircle, ArrowRight } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  duration_minutes: number;
  difficulty: string;
  is_published: boolean;
}

interface Enrollment {
  id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  courses: Course;
}

const getDifficultyLabel = (d: string) => {
  if (d === 'beginner') return 'Anfänger';
  if (d === 'intermediate') return 'Fortgeschritten';
  if (d === 'advanced') return 'Experte';
  return d;
};

export default function Dashboard() {
  const { user, profile, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [courseProgress, setCourseProgress] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else if (profile && isAdmin) {
        // Bounce admins out of the regular employee dashboard
        navigate('/admin/courses');
      }
    }
  }, [user, loading, navigate, profile, isAdmin]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    const { data: enrollmentData } = await supabase
      .from('enrollments')
      .select(`id, course_id, enrolled_at, completed_at, courses (id, title, description, thumbnail_url, duration_minutes, difficulty)`)
      .eq('user_id', user!.id);

    if (enrollmentData) {
      setEnrollments(enrollmentData as unknown as Enrollment[]);
      const progressMap: Record<string, number> = {};
      for (const enrollment of enrollmentData) {
        const { data: lessons } = await supabase.from('lessons').select('id').eq('course_id', enrollment.course_id);
        const { data: completed } = await supabase.from('lesson_progress').select('id').eq('user_id', user!.id).in('lesson_id', lessons?.map(l => l.id) || []).eq('completed', true);
        progressMap[enrollment.course_id] = Math.round(((completed?.length || 0) / (lessons?.length || 1)) * 100);
      }
      setCourseProgress(progressMap);
    }

    const enrolledIds = enrollmentData?.map(e => e.course_id) || [];
    const { data: coursesData } = await supabase.from('courses').select('*').eq('is_published', true).not('id', 'in', enrolledIds.length > 0 ? `(${enrolledIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)');
    if (coursesData) setAvailableCourses(coursesData);
    setIsLoading(false);
  };

  const handleEnroll = async (courseId: string) => {
    const { error } = await supabase.from('enrollments').insert({ user_id: user!.id, course_id: courseId });
    if (!error) fetchData();
  };

  const getDifficultyColor = (d: string) => {
    if (d === 'beginner') return 'bg-chart-2/10 text-chart-2 border-chart-2/20';
    if (d === 'intermediate') return 'bg-chart-4/10 text-chart-4 border-chart-4/20';
    if (d === 'advanced') return 'bg-destructive/10 text-destructive border-destructive/20';
    return '';
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20"><div className="animate-pulse text-muted-foreground">Laden...</div></div>
      </div>
    );
  }

  const validEnrollments = enrollments.filter(e => e.courses);
  const completedCount = validEnrollments.filter(e => e.completed_at).length;

  return (
    <div className="min-h-screen bg-transparent pb-16 text-sm">
      <main className="w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Willkommen zurück, {profile?.full_name?.split(' ')[0] || 'Mitarbeiter'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Setze deine Weiterbildung fort</p>
        </div>

        {/* Top Stats Grid (Technical/Clean Look) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <Card className="rounded-md border-border/50 shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <BookOpen className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Eingeschrieben</span>
              </div>
              <p className="text-2xl font-black text-foreground tracking-tight">{validEnrollments.length}</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-md border-border/50 shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Abgeschlossen</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-chart-2 tracking-tight">{completedCount}</p>
                {validEnrollments.length > 0 && (
                  <span className="text-xs font-medium text-chart-2/80 bg-chart-2/10 px-1.5 py-0.5 rounded-md">
                    {Math.round((completedCount / validEnrollments.length) * 100)}%
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-md border-border/50 shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Lernzeit Min.</span>
              </div>
              <p className="text-2xl font-black text-foreground tracking-tight">
                {validEnrollments.reduce((acc, curr) => acc + (curr.courses?.duration_minutes || 0), 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-md border-border/50 shadow-sm bg-card hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Award className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Zertifikate</span>
              </div>
              <p className="text-2xl font-black text-chart-4 tracking-tight">{completedCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* My Courses */}
        {validEnrollments.length > 0 && (
          <section className="mb-14">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold tracking-tight">Meine Kurse</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {validEnrollments.map((enrollment) => (
                <Card key={enrollment.id} className="overflow-hidden group border-border/50 hover:shadow-md transition-all duration-300 rounded-md bg-card flex flex-col">
                  <div className="relative aspect-[16/10] bg-muted overflow-hidden shrink-0 m-2 rounded-md">
                    {enrollment.courses.thumbnail_url ? (
                      <img src={enrollment.courses.thumbnail_url} alt={enrollment.courses.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-chart-4/10">
                        <BookOpen className="h-12 w-12 text-primary/30" />
                      </div>
                    )}
                    <Link to={`/course/${enrollment.course_id}`} className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="h-6 w-6 text-white ml-0.5" />
                      </div>
                    </Link>
                  </div>
                  <CardHeader className="pb-2 pt-4 px-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={`text-[10px] font-semibold tracking-wide uppercase ${getDifficultyColor(enrollment.courses.difficulty)}`}>
                        {getDifficultyLabel(enrollment.courses.difficulty)}
                      </Badge>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {enrollment.courses.duration_minutes} Min.
                      </span>
                    </div>
                    <CardTitle className="text-sm font-bold leading-snug tracking-tight">{enrollment.courses.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 mt-auto flex flex-col justify-end">
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">Fortschritt</span>
                        <span className="text-primary">{courseProgress[enrollment.course_id] || 0}%</span>
                      </div>
                      <Progress value={courseProgress[enrollment.course_id] || 0} className="h-1.5 bg-primary/10" />
                    </div>
                    <Button asChild className="w-full gap-2 rounded-md h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm hover:shadow-md transition-all text-xs">
                      <Link to={`/course/${enrollment.course_id}`}>
                        Weiterlernen
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Available Courses */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold tracking-tight">Verfügbare Kurse</h2>
          </div>
          {availableCourses.length === 0 ? (
            <Card className="border-border/60 border-dashed rounded-md bg-transparent shadow-none">
              <CardContent className="py-20 text-center">
                <div className="h-16 w-16 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <BookOpen className="h-8 w-8 text-primary/40" />
                </div>
                <p className="text-base font-medium text-muted-foreground">
                  {enrollments.length === 0 ? 'Noch keine Kurse verfügbar.' : 'Du bist in allen verfügbaren Kursen eingeschrieben!'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {availableCourses.map((course) => (
                <Card key={course.id} className="overflow-hidden border-border/50 hover:shadow-md transition-all duration-300 rounded-md bg-card flex flex-col group">
                  <div className="relative aspect-[16/10] bg-muted overflow-hidden shrink-0 m-2 rounded-md">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-chart-3/10 to-chart-4/10">
                        <BookOpen className="h-8 w-8 text-chart-3/30" />
                      </div>
                    )}
                  </div>
                  <CardHeader className="pb-2 pt-4 px-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={`text-[10px] font-semibold tracking-wide uppercase ${getDifficultyColor(course.difficulty)}`}>
                        {getDifficultyLabel(course.difficulty)}
                      </Badge>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {course.duration_minutes} Min.
                      </span>
                    </div>
                    <CardTitle className="text-sm font-bold leading-snug tracking-tight">{course.title}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2 mt-1.5">{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 mt-auto">
                    <Button onClick={() => handleEnroll(course.id)} variant="outline" className="w-full gap-2 rounded-md h-10 border-border/60 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all font-semibold text-xs">
                      Jetzt einschreiben
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
