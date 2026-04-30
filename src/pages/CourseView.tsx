import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, CheckCircle, Circle, BookOpen, Clock, Award, HelpCircle, Sparkles, Files, Download, File as FileIcon } from 'lucide-react';
import { CraftRenderer } from '@/components/craft/CraftRenderer';
import { CourseQuiz } from '@/components/admin/QuizBuilder';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import confetti from 'canvas-confetti';
import NdaAgreement from '@/components/NdaAgreement';

interface CourseFile { id: string; course_id: string; name: string; file_url: string; size: number; created_at: string; }

interface Lesson { id: string; title: string; content: string; video_url: string | null; order_index: number; duration_minutes: number; }
interface Course { id: string; title: string; description: string; difficulty: string; duration_minutes: number; }

type ViewMode = 'lesson' | 'inline-quiz' | 'final-quiz' | 'files';

export default function CourseView() {
  const { courseId } = useParams();
  const { user, profile, isAdmin, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<CourseQuiz[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('lesson');
  const [inlineQuizLessonIdx, setInlineQuizLessonIdx] = useState<number | null>(null);

  const [courseFiles, setCourseFiles] = useState<CourseFile[]>([]);
  const [filesAcknowledged, setFilesAcknowledged] = useState(false);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);

  // Inline quiz answers (separate state so they don't interfere)
  const [inlineAnswers, setInlineAnswers] = useState<Record<string, number>>({});
  const [inlineSubmitted, setInlineSubmitted] = useState<Set<number>>(new Set());

  // Celebration state
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  useEffect(() => { if (!loading && !user) navigate('/auth'); }, [user, loading, navigate]);
  useEffect(() => { if (user && courseId) fetchCourseData(); }, [user, courseId]);

  const finalQuizzes = quizzes.filter(q => q.after_lesson_index == null || q.after_lesson_index < 0);
  const getInlineQuizzesAfter = (lessonIdx: number) =>
    quizzes.filter(q => q.after_lesson_index === lessonIdx);

  const fetchCourseData = async () => {
    setIsLoading(true);
    const { data: enrollment } = await supabase.from('enrollments').select('id, completed_at').eq('user_id', user!.id).eq('course_id', courseId).maybeSingle();
    
    if (!enrollment && !isAdmin) { 
      toast({ title: 'Nicht eingeschrieben', description: 'Du musst dich zuerst einschreiben.', variant: 'destructive' }); 
      navigate('/dashboard'); 
      return; 
    }
    
    const { data: courseData } = await supabase.from('courses').select('*').eq('id', courseId).single();
    if (courseData) setCourse(courseData);
    const { data: lessonsData } = await supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index');
    if (lessonsData) {
      setLessons(lessonsData);
      const { data: progressData } = await supabase.from('lesson_progress').select('lesson_id').eq('user_id', user!.id).in('lesson_id', lessonsData.map(l => l.id)).eq('completed', true);
      if (progressData) setCompletedLessons(new Set(progressData.map(p => p.lesson_id)));
    }

    const { data: filesData } = await supabase.from('course_files').select('*').eq('course_id', courseId).order('created_at', { ascending: false });
    if (filesData) setCourseFiles(filesData as CourseFile[]);

    const { data: ackData } = await supabase.from('course_acknowledgements').select('id').eq('course_id', courseId).eq('user_id', user!.id).maybeSingle();
    if (ackData) setFilesAcknowledged(true);

    const { data: quizzesData } = await (supabase.from('course_quizzes' as any) as any).select('*').eq('course_id', courseId).order('order_index');
    if (quizzesData) setQuizzes(quizzesData as CourseQuiz[]);

    if (enrollment?.completed_at) {
      setQuizPassed(true);
      setQuizSubmitted(true);
    }

    setIsLoading(false);
  };

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  const markLessonComplete = async (lessonId: string) => {
    // If Admin and not really enrolled, just update local state
    let success = true;
    
    // Check if user is actually enrolled before upserting progress
    const { data: checkEnrollment } = await supabase.from('enrollments').select('id').eq('user_id', user!.id).eq('course_id', courseId).maybeSingle();
    
    if (checkEnrollment) {
      const { error } = await supabase.from('lesson_progress').upsert({ user_id: user!.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() });
      if (error) success = false;
    }

    if (success) {
      const newCompleted = new Set([...completedLessons, lessonId]);
      setCompletedLessons(newCompleted);

      // Check for inline quiz after this lesson
      const inlineQs = getInlineQuizzesAfter(currentLessonIndex);
      if (inlineQs.length > 0 && !inlineSubmitted.has(currentLessonIndex)) {
        setInlineQuizLessonIdx(currentLessonIndex);
        setViewMode('inline-quiz');
        return;
      }

      if (lessons.every(l => newCompleted.has(l.id) || l.id === lessonId)) {
        if (courseFiles.length > 0 && !filesAcknowledged) {
          toast({ title: 'Lektionen abgeschlossen', description: 'Bitte überprüfen Sie noch die bereitgestellten Dateien.' });
        } else if (finalQuizzes.length === 0) {
          await issueCertificate();
        } else {
          toast({ title: 'Alle Lektionen abgeschlossen', description: 'Sie können nun den Abschlusstest starten.' });
        }
      }
    }
  };

  const issueCertificate = async () => {
    // Only issue a real certificate if they are actually enrolled
    const { data: checkEnrollment } = await supabase.from('enrollments').select('id').eq('user_id', user!.id).eq('course_id', courseId).maybeSingle();
    
    if (checkEnrollment) {
      const certNum = `EDT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      await supabase.from('certificates').insert({ user_id: user!.id, course_id: courseId, certificate_number: certNum });
      await supabase.from('enrollments').update({ completed_at: new Date().toISOString() }).eq('user_id', user!.id).eq('course_id', courseId);
    }
    
    setShowCompletionModal(true);
    triggerConfetti();
  };

  const evaluateFinalQuiz = async () => {
    setQuizSubmitted(true);
    let correctCount = 0;
    finalQuizzes.forEach(q => {
      if (quizAnswers[q.id!] === q.correct_index) correctCount++;
    });

    const passed = correctCount === finalQuizzes.length;
    setQuizPassed(passed);

    if (passed) {
      toast({ title: 'Test bestanden!', description: `Sie haben alle ${finalQuizzes.length} Fragen richtig beantwortet.` });
      await issueCertificate();
    } else {
      toast({ title: 'Test nicht bestanden', description: `Sie haben ${correctCount} von ${finalQuizzes.length} Fragen richtig. Versuchen Sie es erneut!`, variant: 'destructive' });
    }
  };

  const handleInlineQuizSubmit = (lessonIdx: number) => {
    setInlineSubmitted(prev => new Set([...prev, lessonIdx]));
  };

  const goToLesson = (index: number) => {
    setCurrentLessonIndex(index);
    setViewMode('lesson');
    setInlineQuizLessonIdx(null);
  };

  const currentLesson = lessons[currentLessonIndex] || lessons[0];
  const progress = lessons.length > 0 ? Math.round((completedLessons.size / lessons.length) * 100) : 0;
  const allLessonsComplete = completedLessons.size === lessons.length;

  if (loading || isLoading) {
    return <div className="min-h-screen bg-background"><Header /><div className="flex items-center justify-center py-20"><div className="animate-pulse text-muted-foreground">Laden...</div></div></div>;
  }

  if (!course || lessons.length === 0) {
    return (
      <div className="min-h-screen bg-background"><Header /><div className="container py-8">
        <Card className="border-border/50"><CardContent className="py-12 text-center">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Noch keine Lektionen verfügbar.</p>
          <Button size="sm" onClick={() => navigate('/dashboard')} className="mt-4">Zurück zum Dashboard</Button>
        </CardContent></Card>
      </div></div>
    );
  }

  const needsNda = profile && !profile.nda_accepted_at && !isAdmin;

  return (
    <div className="min-h-screen bg-background">
      {needsNda && (
        <NdaAgreement
          profileId={profile.id}
          onAccepted={() => refreshProfile()}
        />
      )}
      <Header />
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <Card className="sticky top-24 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{course.title}</CardTitle>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Fortschritt</span><span className="font-medium">{progress}%</span></div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-0.5">
                  {lessons.map((lesson, index) => {
                    const inlineQs = getInlineQuizzesAfter(index);
                    return (
                      <div key={lesson.id}>
                        <button onClick={() => goToLesson(index)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm rounded-md transition-colors ${index === currentLessonIndex && viewMode === 'lesson' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                          {completedLessons.has(lesson.id) ? <CheckCircle className="h-4 w-4 flex-shrink-0 text-chart-2" /> : <Circle className="h-4 w-4 flex-shrink-0 opacity-40" />}
                          <span className="line-clamp-1 text-xs">{lesson.title}</span>
                        </button>
                        {/* Inline quiz entry in sidebar */}
                        {inlineQs.length > 0 && (
                          <button
                            onClick={() => { setInlineQuizLessonIdx(index); setViewMode('inline-quiz'); }}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 ml-4 text-left rounded-md transition-colors ${viewMode === 'inline-quiz' && inlineQuizLessonIdx === index ? 'bg-chart-4/20 text-chart-4 font-medium' : 'hover:bg-muted text-muted-foreground'}`}
                          >
                            {inlineSubmitted.has(index)
                              ? <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-chart-2" />
                              : <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                            }
                            <span className="text-[11px]">Wissenscheck</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {courseFiles.length > 0 && (
                    <button onClick={() => { if (allLessonsComplete) { setViewMode('files'); setInlineQuizLessonIdx(null); } }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm rounded-md transition-colors mt-2 ${viewMode === 'files' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} ${!allLessonsComplete ? 'opacity-50 cursor-not-allowed' : 'border border-primary/20'}`}>
                      {filesAcknowledged ? <CheckCircle className="h-4 w-4 flex-shrink-0 text-chart-2" /> : <Files className="h-4 w-4 flex-shrink-0 opacity-60" />}
                      <span className="line-clamp-1 text-xs font-medium">Dateien & Kenntnisnahme</span>
                    </button>
                  )}
                  {finalQuizzes.length > 0 && (
                    <button onClick={() => { if (allLessonsComplete) { setViewMode('final-quiz'); setInlineQuizLessonIdx(null); } }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm rounded-md transition-colors mt-2 ${viewMode === 'final-quiz' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} ${!allLessonsComplete ? 'opacity-50 cursor-not-allowed' : 'border border-primary/20'}`}>
                      {quizPassed ? <Award className="h-4 w-4 flex-shrink-0 text-chart-2" /> : <HelpCircle className="h-4 w-4 flex-shrink-0 opacity-60" />}
                      <span className="line-clamp-1 text-xs font-medium">Abschlusstest</span>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            {viewMode === 'files' ? (
              <CourseFilesView
                files={courseFiles}
                acknowledged={filesAcknowledged}
                onAcknowledge={async () => {
                  const { error } = await supabase.from('course_acknowledgements').insert({ 
                    course_id: courseId, 
                    user_id: user!.id 
                  });
                  if (!error) {
                    setFilesAcknowledged(true);
                    toast({ title: 'Bestätigt', description: 'Du hast die Kenntnisnahme bestätigt.' });
                    
                    // If everything is completely done now (all lessons finished, no final quiz)
                    if (allLessonsComplete && finalQuizzes.length === 0) {
                      await issueCertificate();
                    }
                  } else {
                    toast({ title: 'Fehler', description: 'Konnte nicht gespeichert werden.', variant: 'destructive' });
                  }
                }}
                onBack={() => goToLesson(lessons.length - 1)}
                onContinue={() => {
                  if (finalQuizzes.length > 0) {
                    setViewMode('final-quiz');
                  } else {
                    issueCertificate();
                  }
                }}
                hasFinalQuiz={finalQuizzes.length > 0}
              />
            ) : viewMode === 'final-quiz' ? (
              <FinalQuizView
                quizzes={finalQuizzes}
                quizAnswers={quizAnswers}
                setQuizAnswers={setQuizAnswers}
                quizSubmitted={quizSubmitted}
                quizPassed={quizPassed}
                onEvaluate={evaluateFinalQuiz}
                onBack={() => setViewMode('lesson')}
                onViewCertificate={() => navigate('/certificates')}
              />
            ) : viewMode === 'inline-quiz' && inlineQuizLessonIdx !== null ? (
              <InlineQuizView
                quizzes={getInlineQuizzesAfter(inlineQuizLessonIdx)}
                lessonTitle={lessons[inlineQuizLessonIdx]?.title || ''}
                answers={inlineAnswers}
                setAnswers={setInlineAnswers}
                submitted={inlineSubmitted.has(inlineQuizLessonIdx)}
                onSubmit={() => handleInlineQuizSubmit(inlineQuizLessonIdx)}
                onContinue={() => {
                  if (currentLessonIndex < lessons.length - 1) {
                    goToLesson(currentLessonIndex + 1);
                  } else {
                    setViewMode('lesson');
                    setInlineQuizLessonIdx(null);
                  }
                }}
                onBack={() => setViewMode('lesson')}
              />
            ) : (
              <Card className="border-border/50">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                    <Badge variant="outline" className="text-xs">Lektion {currentLessonIndex + 1} von {lessons.length}</Badge>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{currentLesson?.duration_minutes || 0} Min.</span>
                  </div>
                  <CardTitle className="text-xl tracking-tight">{currentLesson?.title || ''}</CardTitle>
                </CardHeader>
                <CardContent>
                  {currentLesson?.video_url && (
                    <div className="aspect-video bg-muted rounded-md overflow-hidden mb-6">
                      <iframe src={currentLesson.video_url} className="w-full h-full" allowFullScreen />
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none text-foreground">
                    {currentLesson?.content ? (
                      (() => {
                        try {
                          JSON.parse(currentLesson.content);
                          return <CraftRenderer data={currentLesson.content} />;
                        } catch {
                          return <div dangerouslySetInnerHTML={{ __html: currentLesson.content }} />;
                        }
                      })()
                    ) : (
                      <p className="text-muted-foreground">Kein Inhalt verfügbar.</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-8 pt-5 border-t border-border/50">
                    <Button variant="outline" size="sm" onClick={() => goToLesson(currentLessonIndex - 1)} disabled={currentLessonIndex === 0}>
                      <ChevronLeft className="h-4 w-4 mr-1" />Zurück
                    </Button>
                    {!completedLessons.has(currentLesson?.id) && (
                      <Button size="sm" onClick={() => markLessonComplete(currentLesson?.id)} className="gap-2">
                        <CheckCircle className="h-4 w-4" />Als abgeschlossen markieren
                      </Button>
                    )}
                    {currentLessonIndex === lessons.length - 1 && allLessonsComplete ? (
                      courseFiles.length > 0 && !filesAcknowledged ? (
                        <Button size="sm" onClick={() => setViewMode('files')} className="gap-2">
                          Zu den Dateien<ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      ) : finalQuizzes.length > 0 ? (
                        <Button size="sm" onClick={() => setViewMode('final-quiz')} className="gap-2">
                          Zum Abschlusstest<ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => navigate('/certificates')} className="gap-2"><Award className="h-4 w-4" />Zertifikat anzeigen</Button>
                      )
                    ) : (
                      <Button size="sm" onClick={() => goToLesson(currentLessonIndex + 1)} disabled={currentLessonIndex === lessons.length - 1}>
                        Weiter<ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="sm:max-w-md text-center border-border/50">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center">
                <Award className="h-10 w-10 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-2xl text-center">Herzlichen Glückwunsch!</DialogTitle>
            <DialogDescription className="text-center pt-2">
              Du hast den Kurs "{course.title}" erfolgreich abgeschlossen.
              Dein Zertifikat wurde ausgestellt.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button onClick={() => { setShowCompletionModal(false); navigate('/certificates'); }} className="w-full gap-2 font-medium">
              <Download className="h-4 w-4" />
              Zertifikat herunterladen
            </Button>
            <Button variant="outline" onClick={() => { setShowCompletionModal(false); navigate('/dashboard'); }} className="w-full">
              Zurück zum Dashboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----- Course Files View ----- */
function CourseFilesView({ files, acknowledged, onAcknowledge, onBack, onContinue, hasFinalQuiz }: {
  files: CourseFile[];
  acknowledged: boolean;
  onAcknowledge: () => void;
  onBack: () => void;
  onContinue: () => void;
  hasFinalQuiz: boolean;
}) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs">Wichtig</Badge>
        </div>
        <CardTitle className="text-xl tracking-tight">Dateien und Kenntnisnahme</CardTitle>
        <p className="text-sm text-muted-foreground">Bitte laden Sie die folgenden Dateien herunter und bestätigen Sie die Kenntnisnahme.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {files.map(file => (
            <div key={file.id} className="flex items-center justify-between p-4 border rounded-md bg-card shadow-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-primary/10 rounded">
                  <FileIcon className="h-5 w-5 text-primary flex-shrink-0" />
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{file.size < 1024 * 1024 ? (file.size / 1024).toFixed(1) + ' KB' : (file.size / (1024 * 1024)).toFixed(1) + ' MB'}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild className="gap-2">
                <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" /> Download
                </a>
              </Button>
            </div>
          ))}
        </div>

        <div className="p-5 border rounded-md bg-muted/30 space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {acknowledged ? (
                <CheckCircle className="h-5 w-5 text-chart-2" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">Bestätigung der Kenntnisnahme</p>
              <p className="text-xs text-muted-foreground mt-1">
                Hiermit bestätige ich, dass ich die oben aufgeführten Dateien heruntergeladen und vollständig gelesen sowie verstanden habe.
              </p>
            </div>
          </div>
          {!acknowledged && (
            <Button onClick={onAcknowledge} className="w-full mt-2">
              Ich habe die Dateien gesehen und gelesen
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between mt-8 pt-5 border-t border-border/50">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />Zurück zur Lektion
          </Button>
          <Button onClick={onContinue} disabled={!acknowledged} className="gap-2">
            {hasFinalQuiz ? 'Zum Abschlusstest' : 'Abschließen'} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ----- Final Quiz View ----- */
function FinalQuizView({ quizzes, quizAnswers, setQuizAnswers, quizSubmitted, quizPassed, onEvaluate, onBack, onViewCertificate }: {
  quizzes: CourseQuiz[];
  quizAnswers: Record<string, number>;
  setQuizAnswers: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  quizSubmitted: boolean;
  quizPassed: boolean;
  onEvaluate: () => void;
  onBack: () => void;
  onViewCertificate: () => void;
}) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl tracking-tight">Abschlusstest</CardTitle>
        <p className="text-sm text-muted-foreground">Beantworten Sie alle Fragen korrekt, um das Zertifikat zu erhalten.</p>
      </CardHeader>
      <CardContent className="space-y-8">
        {quizzes.map((quiz, qIdx) => (
          <QuizQuestion
            key={quiz.id}
            quiz={quiz}
            index={qIdx}
            selectedAnswer={quizAnswers[quiz.id!]}
            onSelect={(oIdx) => !quizPassed && setQuizAnswers(prev => ({ ...prev, [quiz.id!]: oIdx }))}
            showFeedback={quizSubmitted}
            disabled={quizPassed}
          />
        ))}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-border/50">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />Zurück zur Lektion
          </Button>
          {!quizPassed ? (
            <Button onClick={onEvaluate} disabled={Object.keys(quizAnswers).length < quizzes.length} className="gap-2">
              Test auswerten
            </Button>
          ) : (
            <Button size="sm" onClick={onViewCertificate} className="gap-2 bg-chart-2 hover:bg-chart-2/90 text-primary-foreground">
              <Award className="h-4 w-4" />Zertifikat anzeigen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ----- Inline Quiz View ----- */
function InlineQuizView({ quizzes, lessonTitle, answers, setAnswers, submitted, onSubmit, onContinue, onBack }: {
  quizzes: CourseQuiz[];
  lessonTitle: string;
  answers: Record<string, number>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  submitted: boolean;
  onSubmit: () => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const allAnswered = quizzes.every(q => answers[q.id!] !== undefined);
  const correctCount = quizzes.filter(q => answers[q.id!] === q.correct_index).length;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-xs bg-chart-4/10 text-chart-4 border-chart-4/20 gap-1">
            <Sparkles className="h-3 w-3" />
            Wissenscheck
          </Badge>
        </div>
        <CardTitle className="text-lg tracking-tight">Wissenscheck: {lessonTitle}</CardTitle>
        <p className="text-sm text-muted-foreground">Testen Sie Ihr Wissen zu dieser Lektion, bevor Sie fortfahren.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {quizzes.map((quiz, qIdx) => (
          <QuizQuestion
            key={quiz.id}
            quiz={quiz}
            index={qIdx}
            selectedAnswer={answers[quiz.id!]}
            onSelect={(oIdx) => !submitted && setAnswers(prev => ({ ...prev, [quiz.id!]: oIdx }))}
            showFeedback={submitted}
            disabled={submitted}
          />
        ))}

        {submitted && (
          <div className={`p-4 rounded-md text-sm font-medium ${correctCount === quizzes.length ? 'bg-chart-2/10 text-chart-2' : 'bg-chart-4/10 text-chart-4'}`}>
            {correctCount === quizzes.length
              ? `Alle ${quizzes.length} Fragen richtig beantwortet!`
              : `${correctCount} von ${quizzes.length} Fragen richtig.`
            }
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-1" />Zurück
          </Button>
          {!submitted ? (
            <Button onClick={onSubmit} disabled={!allAnswered} className="gap-2">
              Antworten prüfen
            </Button>
          ) : (
            <Button onClick={onContinue} className="gap-2">
              Weiter<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ----- Shared Quiz Question Component ----- */
function QuizQuestion({ quiz, index, selectedAnswer, onSelect, showFeedback, disabled }: {
  quiz: CourseQuiz;
  index: number;
  selectedAnswer?: number;
  onSelect: (oIdx: number) => void;
  showFeedback: boolean;
  disabled: boolean;
}) {
  const isCorrect = selectedAnswer === quiz.correct_index;

  return (
    <div className="space-y-3 p-4 border rounded-md bg-card shadow-sm">
      <h3 className="font-medium flex gap-2">
        <span className="text-muted-foreground">{index + 1}.</span> {quiz.question}
      </h3>
      <div className="space-y-2 pl-6">
        {quiz.options.map((opt, oIdx) => {
          const isSelected = selectedAnswer === oIdx;
          let btnClass = isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border/50 hover:bg-muted/50';
          if (showFeedback) {
            if (oIdx === quiz.correct_index) {
              btnClass = 'border-chart-2 ring-1 ring-chart-2 bg-chart-2/10';
            } else if (isSelected) {
              btnClass = 'border-destructive ring-1 ring-destructive bg-destructive/10 text-destructive';
            } else {
              btnClass = 'border-border/50 opacity-50';
            }
          }
          return (
            <button
              key={oIdx}
              onClick={() => onSelect(oIdx)}
              disabled={disabled}
              className={`w-full text-left p-3 rounded-md border transition-all text-sm ${btnClass}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {showFeedback && quiz.explanation && (
        <div className={`mt-3 p-3 rounded-md text-sm ${isCorrect ? 'bg-chart-2/10 text-chart-2' : 'bg-destructive/10 text-destructive'}`}>
          <strong>Erklärung:</strong> {quiz.explanation}
        </div>
      )}
    </div>
  );
}
