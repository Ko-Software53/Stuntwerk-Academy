import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
    ChevronLeft, Mail, BookOpen, Award, Calendar, Building2, Briefcase, CheckCircle, Clock, Send, Trash2, AlertTriangle, Loader2, Plus, X, Download
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Profile {
    id: string; user_id: string; email: string; full_name: string | null;
    department: string | null; job_title: string | null; created_at: string;
}

interface CourseProgress {
    courseId: string; courseTitle: string; enrolledAt: string; completedAt: string | null;
    totalLessons: number; completedLessons: number;
}

interface CertificateInfo {
    id: string; courseTitle: string; issuedAt: string; certificateNumber: string;
}

export default function EmployeeDetail() {
    const { userId } = useParams();
    const { user, isAdmin, loading } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [courses, setCourses] = useState<CourseProgress[]>([]);
    const [availableCourses, setAvailableCourses] = useState<{id: string, title: string, difficulty: string}[]>([]);
    const [certificates, setCertificates] = useState<CertificateInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [debugCourseError, setDebugCourseError] = useState<any>(null);
    const [isSendingReminder, setIsSendingReminder] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);

    useEffect(() => {
        if (user && isAdmin && userId) fetchData();
    }, [user, isAdmin, userId]);

    const fetchData = async () => {
        // Profile
        const { data: profileData } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
        if (profileData) setProfile(profileData);

        // Enrollments with course info
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select('course_id, enrolled_at, completed_at, courses (id, title)')
            .eq('user_id', userId!);

        if (enrollments) {
            // For each enrollment, get lesson progress
            const courseProgressList: CourseProgress[] = [];

            for (const enrollment of enrollments) {
                const course = enrollment.courses as any;
                if (!course) continue;

                // Get total lessons for the course
                const { count: totalLessons } = await supabase
                    .from('lessons')
                    .select('id', { count: 'exact', head: true })
                    .eq('course_id', course.id);

                // Get completed lessons for this user
                const { data: lessonIds } = await supabase
                    .from('lessons')
                    .select('id')
                    .eq('course_id', course.id);

                let completedLessons = 0;
                if (lessonIds && lessonIds.length > 0) {
                    const { count } = await supabase
                        .from('lesson_progress')
                        .select('id', { count: 'exact', head: true })
                        .eq('user_id', userId!)
                        .eq('completed', true)
                        .in('lesson_id', lessonIds.map(l => l.id));
                    completedLessons = count || 0;
                }

                courseProgressList.push({
                    courseId: course.id,
                    courseTitle: course.title,
                    enrolledAt: enrollment.enrolled_at,
                    completedAt: enrollment.completed_at,
                    totalLessons: totalLessons || 0,
                    completedLessons,
                });
            }
            setCourses(courseProgressList);

            // Available courses that the user is not enrolled in yet
            const enrolledCourseIds = courseProgressList.map(c => c.courseId);
            let query = supabase.from('courses').select('id, title, difficulty');
            
            if (enrolledCourseIds.length > 0) {
                query = query.not('id', 'in', `(${enrolledCourseIds.join(',')})`);
            }
            
            const { data: availableCoursesData, error: courseError } = await query;
            if (courseError) {
                console.error("Error fetching available courses:", courseError);
                setDebugCourseError(JSON.stringify(courseError));
            }
            if (availableCoursesData) {
                setAvailableCourses(availableCoursesData);
            }
        } else {
             // If no enrollments, fetch all courses
             const { data: availableCoursesData, error: courseError } = await supabase.from('courses').select('id, title, difficulty');
             if (courseError) {
                 console.error("Error fetching all courses:", courseError);
                 setDebugCourseError(JSON.stringify(courseError));
             }
             if (availableCoursesData) {
                 setAvailableCourses(availableCoursesData);
             }
        }

        // Certificates
        const { data: certs } = await supabase
            .from('certificates')
            .select('id, issued_at, certificate_number, courses (title)')
            .eq('user_id', userId!)
            .order('issued_at', { ascending: false });

        if (certs) {
            setCertificates(certs.map((c: any) => ({
                id: c.id,
                courseTitle: c.courses?.title || '',
                issuedAt: c.issued_at,
                certificateNumber: c.certificate_number,
            })));
        }

        setIsLoading(false);
    };

    const sendReminder = async () => {
        if (!profile) return;
        setIsSendingReminder(true);
        try {
            const incompleteCourses = courses.filter(c => !c.completedAt).map(c => c.courseTitle);
            const { error } = await supabase.functions.invoke('send-email', {
                body: {
                    type: 'reminder',
                    to: profile.email,
                    data: {
                        name: profile.full_name || 'Mitarbeiter',
                        courses: incompleteCourses,
                    },
                },
            });
            if (error) throw error;
            toast({ title: 'Erinnerung gesendet', description: `E-Mail an ${profile.email} gesendet.` });
        } catch {
            toast({ title: 'Fehler', description: 'E-Mail konnte nicht gesendet werden.', variant: 'destructive' });
        } finally {
            setIsSendingReminder(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!profile) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase.functions.invoke('delete-user', {
                body: { userId: profile.user_id },
            });
            
            if (error) throw error;
            
            toast({ title: 'Mitarbeiter gelöscht', description: `${profile.full_name || 'Der Mitarbeiter'} wurde erfolgreich aus dem System entfernt.` });
            navigate('/admin/employees');
        } catch (error: any) {
            console.error(error);
            toast({ title: 'Fehler beim Löschen', description: error.message || 'Mitarbeiter konnte nicht gelöscht werden. Bitte überprüfen Sie die Backend-Logs.', variant: 'destructive' });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleAssignCourse = async (courseId: string, courseTitle: string) => {
        if (!profile) return;
        setIsAssigning(true);
        try {
            const { error } = await supabase.from('enrollments').insert({
                user_id: profile.user_id,
                course_id: courseId
            });

            if (error) throw error;

            toast({ title: 'Kurs zugewiesen', description: `Der Kurs "${courseTitle}" wurde erfolgreich zugewiesen.` });
            setAssignmentDialogOpen(false);
            fetchData(); // Refresh the list
        } catch (error: any) {
            console.error(error);
            toast({ title: 'Fehler bei Zuweisung', description: error.message || 'Kurs konnte nicht zugewiesen werden.', variant: 'destructive' });
        } finally {
            setIsAssigning(false);
        }
    };

    const getInitials = (name: string | null) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleExportCSV = () => {
        if (!profile || courses.length === 0) return;

        const headers = ['Kurs', 'Schwierigkeit', 'Status', 'Fortschritt', 'Lektionen', 'Eingeschrieben Am', 'Abgeschlossen Am', 'Zertifikat'];

        const rows = courses.map(course => {
            const courseData = availableCourses.find(c => c.id === course.courseId) || { difficulty: 'unbekannt' }; // Fallback
            // But availableCourses doesn't contain enrolled courses! We need the difficulty.
            // Let's rely on what we have in course or skip difficulty if not fetched.
            // Re-evaluating: The course progress object doesn't have difficulty right now.
            // Let's keep it simple with what we have in CourseProgress.
            
            const status = course.completedAt ? 'Erfolgreich' : 'In Bearbeitung';
            const progress = course.totalLessons > 0 ? `${Math.round((course.completedLessons / course.totalLessons) * 100)}%` : '0%';
            const lessonsCount = `${course.completedLessons}/${course.totalLessons}`;
            const enrolled = new Date(course.enrolledAt).toLocaleDateString('de-DE');
            const completed = course.completedAt ? new Date(course.completedAt).toLocaleDateString('de-DE') : '-';
            const cert = certificates.find(c => c.courseTitle === course.courseTitle);
            const certNumber = cert ? cert.certificateNumber : '-';

            return [
                `"${course.courseTitle.replace(/"/g, '""')}"`,
                `"${status}"`,
                `"${progress}"`,
                `"${lessonsCount}"`,
                `"${enrolled}"`,
                `"${completed}"`,
                `"${certNumber}"`
            ].join(',');
        });

        const adjustedHeaders = ['Kurs', 'Status', 'Fortschritt', 'Lektionen', 'Eingeschrieben Am', 'Abgeschlossen Am', 'Zertifikat'];
        
        const csvContent = "data:text/csv;charset=utf-8," + [adjustedHeaders.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        const safeName = profile.full_name ? profile.full_name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'mitarbeiter';
        link.setAttribute("download", `kurse_${safeName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading || isLoading) {
        return <div className="flex items-center justify-center py-20"><div className="animate-pulse text-muted-foreground">Laden...</div></div>;
    }

    if (!profile) {
        return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Mitarbeiter nicht gefunden</p></div>;
    }

    const inProgressCourses = courses.filter(c => !c.completedAt);
    const completedCourses = courses.filter(c => c.completedAt);

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Back Action */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/employees')} className="gap-2 text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="h-4 w-4" />Zurück zur Übersicht
                </Button>
                
                <div className="flex items-center gap-2">
                    {courses.length > 0 && (
                        <Button variant="outline" size="sm" className="gap-2 rounded-md h-9 border-border/50" onClick={handleExportCSV}>
                            <Download className="h-4 w-4 text-muted-foreground" />
                            <span className="hidden sm:inline">CSV Export</span>
                        </Button>
                    )}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="gap-2 rounded-md h-9" disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                Mitarbeiter löschen
                            </Button>
                        </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-md border-border/50">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                <AlertTriangle className="h-5 w-5" />
                                Mitarbeiter endgültig löschen?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Dies löscht den Mitarbeiter <strong>{profile.full_name}</strong> und alle damit verbundenen Daten (Kurse, Zertifikate, Fortschritte) dauerhaft. Diese Aktion kann nicht rückgängig gemacht werden.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-md">Abbrechen</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md">
                                Ja, unwiderruflich löschen
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Profile & Stats */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Profile Card */}
                    <Card className="rounded-md border-border/40 shadow-sm overflow-hidden bg-card text-center relative">
                        {/* Soft Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
                        
                        <CardContent className="p-8 pt-10 flex flex-col items-center relative z-10">
                            <Avatar className="h-28 w-28 ring-4 ring-background shadow-md mb-6">
                                <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                                    {getInitials(profile.full_name)}
                                </AvatarFallback>
                            </Avatar>
                            
                            <h1 className="text-2xl font-bold text-foreground tracking-tight">{profile.full_name || 'Unbenannt'}</h1>
                            {profile.job_title && <p className="text-muted-foreground font-medium mt-1">{profile.job_title}</p>}
                            
                            <div className="w-full mt-8 space-y-3 text-sm text-left bg-muted/30 p-4 rounded-md border border-border/50">
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Mail className="h-4 w-4 text-primary/70 shrink-0" />
                                    <span className="truncate">{profile.email}</span>
                                </div>
                                {profile.department && (
                                    <div className="flex items-center gap-3 text-muted-foreground">
                                        <Building2 className="h-4 w-4 text-primary/70 shrink-0" />
                                        <span className="truncate">{profile.department}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Calendar className="h-4 w-4 text-primary/70 shrink-0" />
                                    <span>Seit {format(new Date(profile.created_at), 'MMM yyyy', { locale: de })}</span>
                                </div>
                            </div>
                            
                            <Button 
                                variant="outline" 
                                className="w-full mt-6 rounded-md border-border/50 gap-2 h-11 shadow-sm hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all font-semibold" 
                                onClick={sendReminder} 
                                disabled={isSendingReminder || inProgressCourses.length === 0}
                            >
                                <Send className="h-4 w-4" />
                                {isSendingReminder ? 'Wird gesendet...' : 'Erinnerung senden'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <Card className="rounded-md border-border/40 shadow-sm bg-card">
                            <CardContent className="p-5 flex flex-col items-center justify-center text-center">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                </div>
                                <p className="text-3xl font-extrabold text-foreground">{courses.length}</p>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Kurse gesamt</p>
                            </CardContent>
                        </Card>
                        <Card className="rounded-md border-border/40 shadow-sm bg-card">
                            <CardContent className="p-5 flex flex-col items-center justify-center text-center">
                                <div className="h-10 w-10 rounded-full bg-chart-2/10 flex items-center justify-center mb-3">
                                    <Award className="h-5 w-5 text-chart-2" />
                                </div>
                                <p className="text-3xl font-extrabold text-foreground">{certificates.length}</p>
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Zertifikate</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Right Column: Courses & Progress */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="rounded-md border-border/40 shadow-sm bg-card overflow-hidden">
                        <div className="px-6 py-5 border-b border-border/40 flex items-center justify-between bg-muted/10">
                            <div className="flex items-center gap-4">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-primary" />
                                    Laufende Kurse
                                </h2>
                                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{inProgressCourses.length}</Badge>
                            </div>
                            <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="gap-2 h-9 border-primary/20 text-primary hover:bg-primary/5">
                                        <Plus className="h-4 w-4" />
                                        Kurs zuweisen
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px] border-border/50">
                                    <DialogHeader>
                                        <DialogTitle>Kurs zuweisen</DialogTitle>
                                        <DialogDescription>
                                            Wählen Sie einen verfügbaren Kurs aus, um ihn <strong className="text-foreground">{profile.full_name}</strong> zuzuweisen.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[300px] overflow-y-auto space-y-2 mt-4 pr-2">
                                        {debugCourseError && (
                                            <div className="bg-red-50 text-red-500 p-2 text-xs break-all rounded border border-red-200">
                                                DEBUG ERROR: {debugCourseError}
                                            </div>
                                        )}
                                        {availableCourses.length === 0 ? (
                                            <p className="text-sm text-center text-muted-foreground py-8">Alle verfügbaren Kurse sind bereits zugewiesen.</p>
                                        ) : (
                                            availableCourses.map(course => (
                                                <div key={course.id} className="flex items-center justify-between p-3 rounded-md border border-border/50 bg-muted/10 hover:bg-muted/30 transition-colors">
                                                    <div>
                                                        <p className="font-semibold text-sm">{course.title}</p>
                                                        <p className="text-xs text-muted-foreground capitalize">{course.difficulty === 'beginner' ? 'Anfänger' : course.difficulty === 'intermediate' ? 'Fortgeschritten' : 'Experte'}</p>
                                                    </div>
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        className="text-primary hover:text-primary hover:bg-primary/10"
                                                        disabled={isAssigning}
                                                        onClick={() => handleAssignCourse(course.id, course.title)}
                                                    >
                                                        Zuweisen
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <CardContent className="p-6">
                            {inProgressCourses.length > 0 ? (
                                <div className="space-y-4">
                                    {inProgressCourses.map((course) => {
                                        const progress = course.totalLessons > 0 ? (course.completedLessons / course.totalLessons) * 100 : 0;
                                        return (
                                            <div key={course.courseId} className="group p-4 rounded-md border border-border/50 bg-background hover:border-primary/30 transition-all shadow-sm">
                                                <div className="flex items-start justify-between mb-3">
                                                    <h3 className="font-semibold text-foreground">{course.courseTitle}</h3>
                                                    <span className="text-sm font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">{Math.round(progress)}%</span>
                                                </div>
                                                <Progress value={progress} className="h-2.5 mb-3 bg-muted" />
                                                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                                                    <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" />{course.completedLessons} / {course.totalLessons} Lektionen</span>
                                                    <span>Begonnen: {format(new Date(course.enrolledAt), 'dd.MM.yyyy')}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-12 text-center flex flex-col items-center justify-center">
                                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                        <CheckCircle className="h-8 w-8 text-muted-foreground/50" />
                                    </div>
                                    <p className="text-muted-foreground font-medium">Keine aktiven Kurse</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="rounded-md border-border/40 shadow-sm bg-card overflow-hidden">
                        <div className="px-6 py-5 border-b border-border/40 flex items-center justify-between bg-muted/10">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-chart-2" />
                                Abgeschlossene Kurse & Zertifikate
                            </h2>
                            <Badge variant="secondary" className="bg-chart-2/10 text-chart-2 hover:bg-chart-2/20">{completedCourses.length}</Badge>
                        </div>
                        <CardContent className="p-0">
                            {completedCourses.length > 0 ? (
                                <div className="divide-y divide-border/40">
                                    {completedCourses.map((course) => {
                                        const relatedCert = certificates.find(c => c.courseTitle === course.courseTitle);
                                        return (
                                            <div key={course.courseId} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                                                <div className="flex items-start gap-4">
                                                    <div className="h-10 w-10 rounded-full bg-chart-2/10 flex items-center justify-center shrink-0">
                                                        <CheckCircle className="h-5 w-5 text-chart-2" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-foreground">{course.courseTitle}</h3>
                                                        <p className="text-sm text-muted-foreground mt-1">Beendet am {format(new Date(course.completedAt!), 'd. MMMM yyyy', { locale: de })}</p>
                                                    </div>
                                                </div>
                                                
                                                {relatedCert && (
                                                    <div className="bg-muted/30 px-4 py-2 rounded-md flex items-center gap-3 border border-border/50 shrink-0">
                                                        <Award className="h-4 w-4 text-chart-2" />
                                                        <div className="text-right">
                                                            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Zertifikat</p>
                                                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{relatedCert.certificateNumber}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-16 text-center">
                                    <p className="text-muted-foreground font-medium">Bisher keine abgeschlossenen Kurse.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
