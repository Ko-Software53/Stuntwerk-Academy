import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { LessonBuilder, Lesson } from '@/components/admin/LessonBuilder';
import { QuizBuilder, CourseQuiz } from '@/components/admin/QuizBuilder';
import { CourseFileBuilder } from '@/components/admin/CourseFileBuilder';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronLeft, Save, Loader2, Settings, BookOpen, Eye, Upload, FileText, X, MousePointer2, HelpCircle, CheckCircle, Circle, Clock, Award, Sparkles, Monitor, Files, Users, Plus, Download } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Course {
  id?: string;
  title: string;
  description: string;
  thumbnail_url: string;
  duration_minutes: number;
  difficulty: string;
  is_published: boolean;
  certificate_pdf_url?: string | null;
  certificate_name_x: number;
  certificate_name_y: number;
  certificate_name_size: number;
}

export default function CourseEditor() {
  const { courseId } = useParams();
  const isEditing = courseId !== 'new';
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course>({
    title: '', description: '', thumbnail_url: '', duration_minutes: 0, difficulty: 'beginner', is_published: false, certificate_pdf_url: null, certificate_name_x: 0.5, certificate_name_y: 0.5, certificate_name_size: 28,
  });
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<CourseQuiz[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [activeTab, setActiveTab] = useState('settings');
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Participants Tab State
  const [participants, setParticipants] = useState<{ id: string; user_id: string; full_name: string; email: string; enrolled_at: string; completed_at: string | null; completed_lessons: number; progress_percentage: number }[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<{ user_id: string; full_name: string; email: string }[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [debugEmpError, setDebugEmpError] = useState<any>(null);
  const [debugRawData, setDebugRawData] = useState<any>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isEditing && user && isAdmin) fetchCourse();
  }, [isEditing, user, isAdmin, courseId]);

  const fetchCourse = async () => {
    const { data: courseData } = await supabase.from('courses').select('*').eq('id', courseId).single();
    if (courseData) {
      const dbCourse = courseData as any;
      setCourse({
        ...dbCourse,
        certificate_name_x: dbCourse.certificate_name_x ?? 0.5,
        certificate_name_y: dbCourse.certificate_name_y ?? 0.5,
        certificate_name_size: dbCourse.certificate_name_size ?? 28,
      });
    }
    const { data: lessonsData } = await supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index');
    if (lessonsData) setLessons(lessonsData);

    const { data: quizzesData } = await (supabase.from('course_quizzes' as any) as any).select('*').eq('course_id', courseId).order('order_index');
    if (quizzesData) setQuizzes(quizzesData as CourseQuiz[]);

    // Fetch Participants
    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select('user_id, enrolled_at, completed_at')
      .eq('course_id', courseId);

    if (enrollmentsError) {
      console.error("Failed to fetch enrollments:", enrollmentsError);
    }

    if (enrollmentsData) {
      // Fetch corresponding profiles manually
      const enrolledUserIds = enrollmentsData.map(e => e.user_id);
      let profilesMap: Record<string, { full_name: string; email: string }> = {};
      
      if (enrolledUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', enrolledUserIds);
          
        if (profilesData) {
          profilesMap = profilesData.reduce((acc, profile) => {
            acc[profile.user_id] = {
              full_name: profile.full_name || 'Unbenannt',
              email: profile.email || ''
            };
            return acc;
          }, {} as Record<string, { full_name: string; email: string }>);
        }
      }

      const parts = enrollmentsData.map(e => ({
        id: e.user_id,
        user_id: e.user_id,
        full_name: profilesMap[e.user_id]?.full_name || 'Unbenannt',
        email: profilesMap[e.user_id]?.email || '',
        enrolled_at: e.enrolled_at,
        completed_at: e.completed_at,
        completed_lessons: 0,
        progress_percentage: 0
      }));

      // Fetch lesson progress for these participants
      if (parts.length > 0 && lessonsData && lessonsData.length > 0) {
          const lessonIds = lessonsData.map((l: any) => l.id);
          const { data: progressData } = await supabase
              .from('lesson_progress')
              .select('user_id')
              .eq('completed', true)
              .in('lesson_id', lessonIds)
              .in('user_id', parts.map(p => p.user_id));
              
          if (progressData) {
              const progressMap = progressData.reduce((acc, curr) => {
                  acc[curr.user_id] = (acc[curr.user_id] || 0) + 1;
                  return acc;
              }, {} as Record<string, number>);
              
              parts.forEach(p => {
                  p.completed_lessons = progressMap[p.user_id] || 0;
                  p.progress_percentage = lessonsData.length > 0 ? Math.round((p.completed_lessons / lessonsData.length) * 100) : 0;
              });
          }
      }

      setParticipants(parts);

      // Fetch Available Employees
      const enrolledIds = parts.map(p => p.user_id);
      let pQuery = supabase.from('profiles').select('user_id, full_name, email');
      if (enrolledIds.length > 0) {
        pQuery = pQuery.not('user_id', 'in', `(${enrolledIds.join(',')})`);
      }
      const { data: profilesData, error: empError } = await pQuery;
      if (empError) setDebugEmpError(JSON.stringify(empError));
      setDebugRawData(JSON.stringify({ len: profilesData?.length, data: profilesData }));
      if (profilesData) {
        setAvailableEmployees(profilesData);
      }
    }

    setIsLoading(false);
  };

  const handleUploadCertificatePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      toast({ title: 'Ungültige Datei', description: 'Bitte laden Sie eine PDF-Datei hoch.', variant: 'destructive' });
      return;
    }
    setIsUploadingPdf(true);
    const fileName = `cert-${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { data, error } = await supabase.storage.from('certificates').upload(fileName, file, { contentType: 'application/pdf' });
    if (error) {
      toast({ title: 'Upload fehlgeschlagen', description: error.message, variant: 'destructive' });
    } else {
      const { data: urlData } = supabase.storage.from('certificates').getPublicUrl(data.path);
      setCourse(prev => ({
        ...prev,
        certificate_pdf_url: urlData.publicUrl,
        certificate_name_x: 0.5,
        certificate_name_y: 0.5
      }));
      toast({ title: 'Zertifikat hochgeladen', description: 'Das PDF-Zertifikat wurde erfolgreich hochgeladen.' });
    }
    setIsUploadingPdf(false);
  };

  const handleUploadThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast({ title: 'Ungültige Datei', description: 'Bitte laden Sie ein Bild hoch.', variant: 'destructive' });
      return;
    }
    setIsUploadingThumbnail(true);
    const fileName = `thumbnail-${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { data, error } = await supabase.storage.from('course-media').upload(fileName, file, { contentType: file.type });
    if (error) {
      toast({ title: 'Upload fehlgeschlagen', description: error.message, variant: 'destructive' });
    } else {
      const { data: urlData } = supabase.storage.from('course-media').getPublicUrl(data.path);
      setCourse(prev => ({
        ...prev,
        thumbnail_url: urlData.publicUrl
      }));
      toast({ title: 'Vorschaubild hochgeladen', description: 'Das Bild wurde erfolgreich hochgeladen.' });
    }
    setIsUploadingThumbnail(false);
  };

  const handleSave = async () => {
    if (!course.title.trim()) {
      toast({ title: 'Titel erforderlich', description: 'Bitte geben Sie einen Kurstitel ein.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const totalDuration = lessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
      let savedCourseId = courseId;

      const courseDataToSave = {
        title: course.title,
        description: course.description,
        thumbnail_url: course.thumbnail_url,
        duration_minutes: totalDuration,
        difficulty: course.difficulty,
        is_published: course.is_published,
        certificate_pdf_url: course.certificate_pdf_url,
        certificate_name_x: course.certificate_name_x,
        certificate_name_y: course.certificate_name_y,
        certificate_name_size: course.certificate_name_size,
      };

      if (isEditing) {
        const { error: updateError } = await supabase.from('courses').update(courseDataToSave).eq('id', courseId);
        if (updateError) throw updateError;
      } else {
        const { data: newCourse, error: insertError } = await supabase.from('courses').insert({ ...courseDataToSave, created_by: user!.id }).select().single();
        if (insertError) throw insertError;
        savedCourseId = newCourse?.id;
      }

      if (savedCourseId) {
        if (isEditing) {
          const existingLessonIds = lessons.filter(l => l.id).map(l => l.id);
          await supabase.from('lessons').delete().eq('course_id', savedCourseId).not('id', 'in', existingLessonIds.length > 0 ? `(${existingLessonIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)');
        }
        for (let i = 0; i < lessons.length; i++) {
          const lesson = lessons[i];
          if (lesson.id) {
            await supabase.from('lessons').update({ title: lesson.title, content: lesson.content, video_url: lesson.video_url, order_index: i, duration_minutes: lesson.duration_minutes }).eq('id', lesson.id);
          } else {
            await supabase.from('lessons').insert({ course_id: savedCourseId, title: lesson.title, content: lesson.content, video_url: lesson.video_url, order_index: i, duration_minutes: lesson.duration_minutes });
          }
        }

        // Save Quizzes
        if (isEditing) {
          const existingQuizIds = quizzes.filter(q => q.id).map(q => q.id);
          await (supabase.from('course_quizzes' as any) as any).delete().eq('course_id', savedCourseId).not('id', 'in', existingQuizIds.length > 0 ? `(${existingQuizIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)');
        }
        for (let i = 0; i < quizzes.length; i++) {
          const quiz = quizzes[i];
          const quizData = {
            course_id: savedCourseId,
            question: quiz.question,
            options: quiz.options,
            correct_index: quiz.correct_index,
            explanation: quiz.explanation,
            order_index: i,
            after_lesson_index: quiz.after_lesson_index ?? null,
            quiz_title: quiz.quiz_title ?? null,
          };
          if (quiz.id) {
            await (supabase.from('course_quizzes' as any) as any).update(quizData).eq('id', quiz.id);
          } else {
            await (supabase.from('course_quizzes' as any) as any).insert(quizData);
          }
        }
      }

      toast({ title: 'Kurs gespeichert', description: 'Ihre Änderungen wurden erfolgreich gespeichert.' });
      navigate('/admin/courses');
    } catch (err: any) {
      console.error("Save error:", err);
      toast({ title: 'Fehler', description: err.message || 'Kurs konnte nicht gespeichert werden.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let newX = (e.clientX - rect.left) / rect.width;
    let newY = (e.clientY - rect.top) / rect.height;
    newX = Math.max(0, Math.min(1, newX));
    newY = Math.max(0, Math.min(1, newY));
    setCourse(prev => ({ ...prev, certificate_name_x: newX, certificate_name_y: newY }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleAssignEmployee = async (employeeId: string, employeeName: string) => {
    if (!courseId) return;
    setIsAssigning(true);
    try {
      const { error } = await supabase.from('enrollments').insert({
        user_id: employeeId,
        course_id: courseId
      });

      if (error) throw error;

      toast({ title: 'Mitarbeiter hinzugefügt', description: `${employeeName} wurde erfolgreich eingeschrieben.` });
      setAssignmentDialogOpen(false);
      fetchCourse(); // Refresh the lists
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Fehler bei Einschreibung', description: error.message || 'Mitarbeiter konnte nicht eingeschrieben werden.', variant: 'destructive' });
    } finally {
      setIsAssigning(false);
    }
  };

  const lessonOptions = lessons.map((l, i) => ({ index: i, title: l.title }));
  const inlineQuizCount = quizzes.filter(q => q.after_lesson_index != null && q.after_lesson_index >= 0).length;
  const finalQuizCount = quizzes.filter(q => q.after_lesson_index == null || q.after_lesson_index < 0).length;

  const handleExportCSV = () => {
    // CSV Header row
    const headers = ['Name', 'Email', 'Kurs Status', 'Fortschritt', 'Abgeschlossene Lektionen', 'Eingeschrieben Am', 'Abgeschlossen Am'];
    
    // Map participant data to CSV rows
    const rows = participants.map(p => {
        const status = p.completed_at ? 'Erfolgreich' : 'In Bearbeitung';
        const enrolled = new Date(p.enrolled_at).toLocaleDateString('de-DE');
        const completed = p.completed_at ? new Date(p.completed_at).toLocaleDateString('de-DE') : '-';
        const progress = `${p.progress_percentage}%`;
        const lessonsCount = `${p.completed_lessons}/${lessons.length}`;
        
        // Escape quotes and fields containing commas by wrapping in double quotes
        return [
            `"${p.full_name.replace(/"/g, '""')}"`,
            `"${p.email.replace(/"/g, '""')}"`,
            `"${status}"`,
            `"${progress}"`,
            `"${lessonsCount}"`,
            `"${enrolled}"`,
            `"${completed}"`
        ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const safeTitle = course.title ? course.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'kurs';
    link.setAttribute("download", `teilnehmer_${safeTitle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20"><div className="animate-pulse text-muted-foreground">Laden...</div></div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/courses')} className="mb-4 gap-2 text-muted-foreground">
          <ChevronLeft className="h-4 w-4" />
          Zurück zu Kurse
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              {isEditing ? 'Kurs bearbeiten' : 'Neuen Kurs erstellen'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Bauen Sie Ihren Kurs mit Drag-and-Drop Inhaltsblöcken</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="gap-2">
              <Monitor className="h-4 w-4" />
              {showPreview ? 'Editor' : 'Vorschau'}
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kurs speichern
            </Button>
          </div>
        </div>
      </div>

        {showPreview ? (
          <CoursePreview course={course} lessons={lessons} quizzes={quizzes} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid grid-cols-6 w-full max-w-4xl">
                  <TabsTrigger value="settings" className="gap-2 text-sm">
                    <Settings className="h-4 w-4" />
                    Einstellungen
                  </TabsTrigger>
                  <TabsTrigger value="lessons" className="gap-2 text-sm">
                    <BookOpen className="h-4 w-4" />
                    Lektionen ({lessons.length})
                  </TabsTrigger>
                  <TabsTrigger value="quiz" className="gap-2 text-sm">
                    <HelpCircle className="h-4 w-4" />
                    Quiz ({quizzes.length})
                  </TabsTrigger>
                  <TabsTrigger value="files" className="gap-2 text-sm">
                    <Files className="h-4 w-4" />
                    Dateien
                  </TabsTrigger>
                  <TabsTrigger value="certificate" className="gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    Zertifikat
                  </TabsTrigger>
                  <TabsTrigger value="participants" className="gap-2 text-sm" disabled={!isEditing}>
                    <Users className="h-4 w-4" />
                    Teilnehmer
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-5">
                  <Card className="border-border/50">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base">Kursdetails</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="title" className="text-sm">Kurstitel</Label>
                        <Input id="title" value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} placeholder="Kurstitel eingeben" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="description" className="text-sm">Beschreibung</Label>
                        <Textarea id="description" value={course.description} onChange={(e) => setCourse({ ...course, description: e.target.value })} placeholder="Was lernen die Mitarbeiter?" rows={3} />
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-1.5 flex flex-col justify-end">
                          <Label className="text-sm">Vorschaubild</Label>
                          <Button variant="outline" className="w-full justify-start gap-2 relative overflow-hidden" disabled={isUploadingThumbnail} title="Bild hochladen">
                            {isUploadingThumbnail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {isUploadingThumbnail ? 'Wird hochgeladen...' : 'Bild auswählen'}
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleUploadThumbnail} disabled={isUploadingThumbnail} />
                          </Button>
                        </div>
                      </div>
                      {course.thumbnail_url && (
                        <div className="border border-border rounded-md overflow-hidden">
                          <img src={course.thumbnail_url} alt="Vorschau" className="w-full h-40 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-border/50">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Kurs veröffentlichen</p>
                          <p className="text-xs text-muted-foreground">Für alle Mitarbeiter sichtbar machen</p>
                        </div>
                        <Switch checked={course.is_published} onCheckedChange={(checked) => setCourse({ ...course, is_published: checked })} />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="lessons">
                  <LessonBuilder lessons={lessons} onChange={setLessons} />
                </TabsContent>

                <TabsContent value="quiz">
                  <QuizBuilder quizzes={quizzes} onChange={setQuizzes} lessons={lessonOptions} />
                </TabsContent>

                <TabsContent value="files">
                  <CourseFileBuilder courseId={courseId} />
                </TabsContent>

                <TabsContent value="certificate" className="space-y-5">
                  <Card className="border-border/50">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base">Zertifikat-PDF & Teilnehmername</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <p className="text-sm text-muted-foreground">
                        Laden Sie ein Zertifikats-PDF hoch und definieren Sie anschließend visuell,
                        an welcher Stelle der Name des Teilnehmers erscheinen soll.
                      </p>

                      {!course.certificate_pdf_url ? (
                        <div className="border-2 border-dashed border-border rounded-md p-8 text-center">
                          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground mb-3">PDF hier ablegen oder klicken zum Hochladen</p>
                          <Button variant="outline" size="sm" className="gap-2" asChild disabled={isUploadingPdf}>
                            <label className="cursor-pointer">
                              {isUploadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              {isUploadingPdf ? 'Wird hochgeladen...' : 'PDF auswählen'}
                              <input type="file" accept=".pdf" className="hidden" onChange={handleUploadCertificatePdf} />
                            </label>
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-accent rounded-md">
                            <div className="flex items-center gap-3">
                              <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">Zertifikat hochgeladen</p>
                                <p className="text-xs text-muted-foreground">Ziehen Sie den Namen-Platzhalter an die gewünschte Position.</p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={async () => {
                              // Remove old cert from storage
                              if (course.certificate_pdf_url) {
                                const idx = course.certificate_pdf_url.indexOf('/storage/v1/object/public/certificates/');
                                if (idx !== -1) {
                                  const path = course.certificate_pdf_url.substring(idx + '/storage/v1/object/public/certificates/'.length);
                                  await supabase.storage.from('certificates').remove([path]);
                                }
                              }
                              setCourse(prev => ({ ...prev, certificate_pdf_url: null }));
                            }}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="bg-muted/30 p-4 rounded-md flex justify-center border border-border/50 overflow-auto">
                            <Document
                              file={course.certificate_pdf_url}
                              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                              className="bg-white shadow-md select-none"
                              loading={
                                <div className="h-64 flex items-center justify-center">
                                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                              }
                            >
                              <div className="relative" ref={containerRef}>
                                <Page
                                  pageNumber={1}
                                  width={600}
                                  renderTextLayer={false}
                                  renderAnnotationLayer={false}
                                />
                                <div
                                  className={`absolute flex items-center gap-2 px-3 py-1.5 border-2 rounded select-none touch-none touch-action-none whitespace-nowrap -translate-x-1/2 -translate-y-1/2 ${isDragging ? 'border-primary cursor-grabbing bg-primary/10 text-primary shadow-lg scale-105' : 'border-primary/50 cursor-grab bg-white/80 text-foreground shadow'
                                    } transition-transform`}
                                  style={{
                                    left: `${course.certificate_name_x * 100}%`,
                                    top: `${course.certificate_name_y * 100}%`,
                                    fontSize: `${course.certificate_name_size}px`,
                                    fontFamily: '"Times New Roman", Times, serif',
                                    fontStyle: 'italic',
                                  }}
                                  onPointerDown={handlePointerDown}
                                  onPointerMove={handlePointerMove}
                                  onPointerUp={handlePointerUp}
                                  onPointerCancel={handlePointerUp}
                                >
                                  <MousePointer2 className="h-4 w-4 opacity-50" />
                                  Max Mustermann
                                </div>
                              </div>
                            </Document>
                          </div>

                          {/* Font Size Slider */}
                          <div className="bg-muted/30 p-4 rounded-md border border-border/50">
                            <div className="flex items-center justify-between mb-4">
                              <Label className="text-sm font-medium">Name Schriftgröße</Label>
                              <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-md border border-border/50">
                                {course.certificate_name_size}px
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-muted-foreground">A</span>
                              <Slider
                                value={[course.certificate_name_size]}
                                min={12}
                                max={80}
                                step={1}
                                onValueChange={(vals) => setCourse(prev => ({ ...prev, certificate_name_size: vals[0] }))}
                                className="flex-1"
                              />
                              <span className="text-base font-bold text-muted-foreground line-clamp-1 truncate w-4 text-center">A</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="participants" className="space-y-5">
                  <Card className="border-border/50">
                    <div className="px-6 py-5 border-b border-border/40 flex items-center justify-between bg-muted/10">
                      <div className="flex items-center gap-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          Teilnehmer verwalten
                        </CardTitle>
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{participants.length}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {participants.length > 0 && (
                            <Button size="sm" variant="outline" className="gap-2 h-9 border-border/50" onClick={handleExportCSV}>
                                <Download className="h-4 w-4 text-muted-foreground" />
                                <span className="hidden sm:inline">CSV Export</span>
                            </Button>
                        )}
                        <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-2 h-9 border-primary/20 text-primary hover:bg-primary/5">
                            <Plus className="h-4 w-4" />
                            Mitarbeiter einschreiben
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] border-border/50">
                          <DialogHeader>
                            <DialogTitle>Mitarbeiter einschreiben</DialogTitle>
                            <DialogDescription>
                              Wählen Sie einen Mitarbeiter aus, um ihn in den Kurs <strong>{course.title}</strong> einzuschreiben.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-2 mt-4">
                            <Input 
                              placeholder="Mitarbeiter suchen..." 
                              value={employeeSearch}
                              onChange={(e) => setEmployeeSearch(e.target.value)}
                              className="w-full"
                            />
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                              {availableEmployees.length === 0 ? (
                                <p className="text-sm text-center text-muted-foreground py-8 border border-dashed rounded-md bg-muted/20">Alle verfügbaren Mitarbeiter sind bereits in diesem Kurs.</p>
                              ) : (
                                <>
                                  {availableEmployees
                                    .filter(emp => emp.full_name?.toLowerCase().includes(employeeSearch.toLowerCase()) || emp.email?.toLowerCase().includes(employeeSearch.toLowerCase()))
                                    .map(emp => (
                                      <div key={emp.user_id} className="flex items-center justify-between p-3 rounded-md border border-border/50 bg-muted/10 hover:bg-muted/30 transition-colors">
                                        <div>
                                          <p className="font-semibold text-sm">{emp.full_name || 'Unbenannt'}</p>
                                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-primary hover:text-primary hover:bg-primary/10"
                                          disabled={isAssigning}
                                          onClick={() => handleAssignEmployee(emp.user_id, emp.full_name || 'Unbenannt')}
                                        >
                                          Einschreiben
                                        </Button>
                                      </div>
                                    ))}
                                  {availableEmployees.length > 0 && availableEmployees.filter(emp => emp.full_name?.toLowerCase().includes(employeeSearch.toLowerCase()) || emp.email?.toLowerCase().includes(employeeSearch.toLowerCase())).length === 0 && (
                                    <div className="text-center py-6 text-muted-foreground bg-muted/20 border border-border/50 rounded-md border-dashed">
                                      Keine Ergebnisse für "{employeeSearch}"
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    </div>
                    <CardContent className="p-0">
                      {participants.length > 0 ? (
                        <div className="divide-y divide-border/40">
                          {participants.map((p) => (
                            <div key={p.user_id} className="p-5 flex items-center justify-between gap-4 hover:bg-muted/5 transition-colors">
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{p.full_name}</span>
                                <span className="text-xs text-muted-foreground">{p.email}</span>
                              </div>
                              <div className="flex flex-col flex-1 mx-4">
                                <span className="text-xs text-muted-foreground mb-1">Fortschritt {p.progress_percentage}% ({p.completed_lessons}/{lessons.length})</span>
                                <Progress value={p.progress_percentage} className="h-1.5" />
                              </div>
                              <div className="flex flex-col items-end shrink-0 w-[120px]">
                                {p.completed_at ? (
                                  <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/20 shrink-0">Abgeschlossen</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground shrink-0 w-[120px] justify-center">In Bearbeitung</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-12 text-center">
                          <p className="text-muted-foreground text-sm font-medium">Bisher keine Teilnehmer in diesem Kurs.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Kursübersicht</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Lektionen</span>
                    <span className="font-medium">{lessons.length}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Zwischenquizze</span>
                    <span className="font-medium">{inlineQuizCount}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Abschlusstest</span>
                    <span className="font-medium">{finalQuizCount} Fragen</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Dauer</span>
                    <span className="font-medium">{lessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0)} Min.</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Schwierigkeit</span>
                    <span className="font-medium capitalize">{course.difficulty === 'beginner' ? 'Anfänger' : course.difficulty === 'intermediate' ? 'Fortgeschritten' : 'Experte'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Zertifikat</span>
                    <span className="font-medium">{course.certificate_pdf_url ? '✓' : '—'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`font-medium ${course.is_published ? 'text-chart-2' : 'text-muted-foreground'}`}>
                      {course.is_published ? 'Veröffentlicht' : 'Entwurf'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-4 space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => setActiveTab('lessons')}>
                    <BookOpen className="h-4 w-4" />
                    Lektion hinzufügen
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => setShowPreview(!showPreview)}>
                    <Monitor className="h-4 w-4" />
                    {showPreview ? 'Zum Editor' : 'Kursvorschau'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Live Course Preview — shows how the course looks to students              */
/* -------------------------------------------------------------------------- */

function CoursePreview({ course, lessons, quizzes }: { course: Course; lessons: Lesson[]; quizzes: CourseQuiz[] }) {
  const [activeLesson, setActiveLesson] = useState(0);
  const [previewShowQuiz, setPreviewShowQuiz] = useState(false);
  const [activeInlineQuiz, setActiveInlineQuiz] = useState<number | null>(null);

  const finalQuizzes = quizzes.filter(q => q.after_lesson_index == null || q.after_lesson_index < 0);
  const currentLesson = lessons[activeLesson];

  // Get inline quizzes for a given lesson index
  const getInlineQuizzesAfter = (lessonIdx: number) =>
    quizzes.filter(q => q.after_lesson_index === lessonIdx);

  return (
    <div className="border border-border rounded-md overflow-hidden bg-background shadow-lg">
      {/* Preview header bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 border-b border-border">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400/60" />
          <div className="h-3 w-3 rounded-full bg-yellow-400/60" />
          <div className="h-3 w-3 rounded-full bg-green-400/60" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-background border border-border rounded-md px-4 py-1 text-xs text-muted-foreground">
            stuntwerk-academy/course/{course.id || 'preview'}
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">Vorschau</Badge>
      </div>

      {/* Preview content area mimicking CourseView */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 min-h-[600px]">
        {/* Sidebar */}
        <div className="lg:col-span-1 border-r border-border bg-card/50 p-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold truncate">{course.title || 'Kursname'}</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Fortschritt</span>
                <span className="font-medium">0%</span>
              </div>
              <Progress value={0} className="h-1.5" />
            </div>

            <div className="space-y-0.5 pt-2">
              {lessons.map((lesson, index) => {
                const inlineQuizzesAfter = getInlineQuizzesAfter(index);
                return (
                  <div key={index}>
                    <button
                      onClick={() => { setActiveLesson(index); setPreviewShowQuiz(false); setActiveInlineQuiz(null); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm rounded-md transition-colors ${index === activeLesson && !previewShowQuiz && activeInlineQuiz === null ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                      <Circle className="h-4 w-4 flex-shrink-0 opacity-40" />
                      <span className="line-clamp-1 text-xs">{lesson.title}</span>
                    </button>
                    {/* Inline quiz indicators */}
                    {inlineQuizzesAfter.length > 0 && (
                      <button
                        onClick={() => { setActiveInlineQuiz(index); setPreviewShowQuiz(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs rounded-md transition-colors ml-2 ${activeInlineQuiz === index ? 'bg-chart-4/20 text-chart-4' : 'hover:bg-muted text-muted-foreground'}`}
                      >
                        <Sparkles className="h-3 w-3 flex-shrink-0" />
                        <span className="line-clamp-1">Wissenscheck ({inlineQuizzesAfter.length})</span>
                      </button>
                    )}
                  </div>
                );
              })}
              {finalQuizzes.length > 0 && (
                <button
                  onClick={() => { setPreviewShowQuiz(true); setActiveInlineQuiz(null); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm rounded-md transition-colors mt-2 ${previewShowQuiz ? 'bg-primary text-primary-foreground' : 'hover:bg-muted border border-primary/20'}`}
                >
                  <HelpCircle className="h-4 w-4 flex-shrink-0 opacity-60" />
                  <span className="line-clamp-1 text-xs font-medium">Abschlusstest</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 p-6">
          {activeInlineQuiz !== null ? (
            // Inline quiz preview
            <InlineQuizPreview
              quizzes={getInlineQuizzesAfter(activeInlineQuiz)}
              lessonTitle={lessons[activeInlineQuiz]?.title || ''}
              onBack={() => setActiveInlineQuiz(null)}
            />
          ) : previewShowQuiz ? (
            // Final quiz preview
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl tracking-tight">Abschlusstest</CardTitle>
                <p className="text-sm text-muted-foreground">Beantworten Sie alle Fragen korrekt, um das Zertifikat zu erhalten.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {finalQuizzes.map((quiz, qIdx) => (
                  <div key={qIdx} className="space-y-3 p-4 border rounded-md bg-card shadow-sm">
                    <h3 className="font-medium flex gap-2">
                      <span className="text-muted-foreground">{qIdx + 1}.</span> {quiz.question || 'Frage...'}
                    </h3>
                    <div className="space-y-2 pl-6">
                      {quiz.options.map((opt, oIdx) => (
                        <div key={oIdx} className={`w-full text-left p-3 rounded-md border border-border/50 text-sm ${oIdx === quiz.correct_index ? 'bg-chart-2/5 border-chart-2/30' : ''}`}>
                          {opt || `Option ${oIdx + 1}`}
                          {oIdx === quiz.correct_index && <span className="ml-2 text-xs text-chart-2">(korrekt)</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {finalQuizzes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Keine Abschlusstest-Fragen definiert.</p>
                )}
              </CardContent>
            </Card>
          ) : currentLesson ? (
            // Lesson preview
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                  <Badge variant="outline" className="text-xs">Lektion {activeLesson + 1} von {lessons.length}</Badge>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{currentLesson.duration_minutes || 0} Min.</span>
                </div>
                <CardTitle className="text-xl tracking-tight">{currentLesson.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {currentLesson.video_url && (
                  <div className="aspect-video bg-muted rounded-md overflow-hidden mb-6 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">Video: {currentLesson.video_url}</span>
                  </div>
                )}
                <div className="prose prose-sm max-w-none text-foreground">
                  {currentLesson.content ? (
                    <div className="bg-muted/30 rounded-md p-4 text-sm text-muted-foreground">
                      Lektionsinhalt wird hier dargestellt...
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Kein Inhalt verfügbar.</p>
                  )}
                </div>

                {/* Show inline quiz hint */}
                {getInlineQuizzesAfter(activeLesson).length > 0 && (
                  <div className="mt-6 p-4 rounded-md border border-chart-4/30 bg-chart-4/5">
                    <div className="flex items-center gap-2 text-sm font-medium text-chart-4">
                      <Sparkles className="h-4 w-4" />
                      Wissenscheck nach dieser Lektion ({getInlineQuizzesAfter(activeLesson).length} Fragen)
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-8 pt-5 border-t border-border/50">
                  <Button variant="outline" size="sm" disabled={activeLesson === 0} onClick={() => setActiveLesson(prev => prev - 1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />Zurück
                  </Button>
                  <Button size="sm" className="gap-2">
                    <CheckCircle className="h-4 w-4" />Als abgeschlossen markieren
                  </Button>
                  <Button size="sm" disabled={activeLesson === lessons.length - 1} onClick={() => setActiveLesson(prev => prev + 1)}>
                    Weiter<ChevronLeft className="h-4 w-4 ml-1 rotate-180" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Keine Lektionen vorhanden. Erstellen Sie zuerst Lektionen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InlineQuizPreview({ quizzes, lessonTitle, onBack }: { quizzes: CourseQuiz[]; lessonTitle: string; onBack: () => void }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs bg-chart-4/10 text-chart-4 border-chart-4/20">Wissenscheck</Badge>
        </div>
        <CardTitle className="text-lg tracking-tight">Wissenscheck: {lessonTitle}</CardTitle>
        <p className="text-sm text-muted-foreground">Testen Sie Ihr Wissen zu dieser Lektion.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {quizzes.map((quiz, qIdx) => (
          <div key={qIdx} className="space-y-3 p-4 border rounded-md bg-card shadow-sm">
            <h3 className="font-medium flex gap-2">
              <span className="text-muted-foreground">{qIdx + 1}.</span> {quiz.question || 'Frage...'}
            </h3>
            <div className="space-y-2 pl-6">
              {quiz.options.map((opt, oIdx) => (
                <div key={oIdx} className={`w-full text-left p-3 rounded-md border border-border/50 text-sm ${oIdx === quiz.correct_index ? 'bg-chart-2/5 border-chart-2/30' : ''}`}>
                  {opt || `Option ${oIdx + 1}`}
                  {oIdx === quiz.correct_index && <span className="ml-2 text-xs text-chart-2">(korrekt)</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Zurück zur Lektion
        </Button>
      </CardContent>
    </Card>
  );
}
