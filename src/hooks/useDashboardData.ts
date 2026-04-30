import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths, startOfMonth, formatDistanceToNow, subDays } from 'date-fns';
import { de } from 'date-fns/locale';

export interface TrendData { month: string; enrollments: number; completions: number }
export interface CoursePopularityItem { title: string; enrollments: number }
export interface DepartmentItem { department: string; count: number; fill: string }
export interface PerformerItem { userId: string; fullName: string; avatarUrl: string | null; department: string | null; completedCourses: number; totalEnrolled: number }
export interface ActivityItem { id: string; type: 'enrolled' | 'completed' | 'certified'; userName: string; userAvatar: string | null; courseName: string; timestamp: string; timeAgo: string }
export interface QuickStats { newThisWeek: number; activeToday: number; avgCompletionDays: number }
export interface StatsData { totalEmployees: number; totalCourses: number; totalEnrollments: number; totalCertificates: number; completionRate: number; completedEnrollments: number; trends: { employees: number; courses: number; enrollments: number; certificates: number } }

const CHART_FILLS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))',
];

export function useDashboardData(userId: string | undefined, isAdmin: boolean) {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatsData>({ totalEmployees: 0, totalCourses: 0, totalEnrollments: 0, totalCertificates: 0, completionRate: 0, completedEnrollments: 0, trends: { employees: 0, courses: 0, enrollments: 0, certificates: 0 } });
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [coursePopularity, setCoursePopularity] = useState<CoursePopularityItem[]>([]);
  const [departmentBreakdown, setDepartmentBreakdown] = useState<DepartmentItem[]>([]);
  const [topPerformers, setTopPerformers] = useState<PerformerItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [quickStats, setQuickStats] = useState<QuickStats>({ newThisWeek: 0, activeToday: 0, avgCompletionDays: 0 });

  useEffect(() => {
    if (userId && isAdmin) fetchAll();
  }, [userId, isAdmin]);

  const fetchAll = async () => {
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

    const [employeesRes, coursesRes, enrollmentsRes, certificatesRes, profilesRes, lessonProgressRes] = await Promise.all([
      supabase.from('profiles').select('id, created_at', { count: 'exact' }),
      supabase.from('courses').select('id, title'),
      supabase.from('enrollments').select('id, user_id, course_id, enrolled_at, completed_at'),
      supabase.from('certificates').select('id, user_id, course_id, issued_at'),
      supabase.from('profiles').select('user_id, full_name, email, avatar_url, department'),
      supabase.from('lesson_progress').select('id, user_id, lesson_id, completed_at').not('completed_at', 'is', null),
    ]);

    const profiles = profilesRes.data || [];
    const courses = coursesRes.data || [];
    const enrollments = enrollmentsRes.data || [];
    const certificates = certificatesRes.data || [];
    const lessonProgress = lessonProgressRes.data || [];

    const profileMap = new Map(profiles.map(p => [p.user_id, p]));
    const courseMap = new Map(courses.map(c => [c.id, c]));

    // --- Stats ---
    const totalEnrollments = enrollments.length;
    const completedEnrollments = enrollments.filter(e => e.completed_at).length;
    const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const enrollThisMonth = enrollments.filter(e => { const d = new Date(e.enrolled_at); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; }).length;
    const enrollLastMonth = enrollments.filter(e => { const d = new Date(e.enrolled_at); return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear; }).length;
    const enrollTrend = enrollLastMonth > 0 ? Math.round(((enrollThisMonth - enrollLastMonth) / enrollLastMonth) * 100) : enrollThisMonth > 0 ? 100 : 0;

    const certThisMonth = certificates.filter(c => { const d = new Date(c.issued_at); return d.getMonth() === thisMonth && d.getFullYear() === thisYear; }).length;
    const certLastMonth = certificates.filter(c => { const d = new Date(c.issued_at); return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear; }).length;
    const certTrend = certLastMonth > 0 ? Math.round(((certThisMonth - certLastMonth) / certLastMonth) * 100) : certThisMonth > 0 ? 100 : 0;

    setStats({
      totalEmployees: employeesRes.count || 0,
      totalCourses: courses.length,
      totalEnrollments: totalEnrollments,
      totalCertificates: certificates.length,
      completionRate,
      completedEnrollments,
      trends: { employees: 0, courses: 0, enrollments: enrollTrend, certificates: certTrend },
    });

    // --- Sparklines (6 months) ---
    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      monthKeys.push(format(subMonths(now, i), 'yyyy-MM'));
    }

    const enrollSparkline = monthKeys.map(key => enrollments.filter(e => e.enrolled_at.startsWith(key)).length);
    const completionSparkline = monthKeys.map(key => enrollments.filter(e => e.completed_at?.startsWith(key)).length);
    const certSparkline = monthKeys.map(key => certificates.filter(c => c.issued_at.startsWith(key)).length);
    const employeeData = employeesRes.data || [];
    const empSparkline = monthKeys.map(key => employeeData.filter(p => (p.created_at as string)?.startsWith(key)).length);

    setSparklines({ employees: empSparkline, courses: monthKeys.map(() => 0), enrollments: enrollSparkline, certificates: certSparkline });

    // --- Trend Data (6 months) ---
    const trendMonths: Record<string, { enrollments: number; completions: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const label = format(d, 'MMM', { locale: de });
      trendMonths[label] = { enrollments: 0, completions: 0 };
    }
    enrollments.forEach(e => {
      if (new Date(e.enrolled_at) >= sixMonthsAgo) {
        const key = format(new Date(e.enrolled_at), 'MMM', { locale: de });
        if (trendMonths[key]) trendMonths[key].enrollments++;
      }
      if (e.completed_at && new Date(e.completed_at) >= sixMonthsAgo) {
        const key = format(new Date(e.completed_at), 'MMM', { locale: de });
        if (trendMonths[key]) trendMonths[key].completions++;
      }
    });
    setTrendData(Object.entries(trendMonths).map(([month, data]) => ({ month, ...data })));

    // --- Course Popularity (top 8) ---
    const courseCounts: Record<string, number> = {};
    enrollments.forEach(e => { courseCounts[e.course_id] = (courseCounts[e.course_id] || 0) + 1; });
    const popularity = Object.entries(courseCounts)
      .map(([courseId, count]) => ({ title: courseMap.get(courseId)?.title || 'Unbekannt', enrollments: count }))
      .sort((a, b) => b.enrollments - a.enrollments)
      .slice(0, 8);
    setCoursePopularity(popularity);

    // --- Department Breakdown ---
    const deptCounts: Record<string, number> = {};
    enrollments.forEach(e => {
      const dept = profileMap.get(e.user_id)?.department || 'Keine Abteilung';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    const deptData = Object.entries(deptCounts)
      .map(([department, count], i) => ({ department, count, fill: CHART_FILLS[i % CHART_FILLS.length] }))
      .sort((a, b) => b.count - a.count);
    setDepartmentBreakdown(deptData);

    // --- Top Performers ---
    const userCompleted: Record<string, { completed: number; total: number }> = {};
    enrollments.forEach(e => {
      if (!userCompleted[e.user_id]) userCompleted[e.user_id] = { completed: 0, total: 0 };
      userCompleted[e.user_id].total++;
      if (e.completed_at) userCompleted[e.user_id].completed++;
    });
    const performers = Object.entries(userCompleted)
      .filter(([, v]) => v.completed > 0)
      .sort(([, a], [, b]) => b.completed - a.completed)
      .slice(0, 5)
      .map(([uid, v]) => {
        const p = profileMap.get(uid);
        return { userId: uid, fullName: p?.full_name || p?.email || 'Unbekannt', avatarUrl: p?.avatar_url || null, department: p?.department || null, completedCourses: v.completed, totalEnrolled: v.total };
      });
    setTopPerformers(performers);

    // --- Recent Activity (last 10 events) ---
    const activities: ActivityItem[] = [];
    const recentEnrollments = [...enrollments].sort((a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime()).slice(0, 15);
    recentEnrollments.forEach(e => {
      const p = profileMap.get(e.user_id);
      const c = courseMap.get(e.course_id);
      activities.push({ id: `enroll-${e.id}`, type: 'enrolled', userName: p?.full_name || p?.email || 'Unbekannt', userAvatar: p?.avatar_url || null, courseName: c?.title || 'Unbekannt', timestamp: e.enrolled_at, timeAgo: formatDistanceToNow(new Date(e.enrolled_at), { addSuffix: true, locale: de }) });
      if (e.completed_at) {
        activities.push({ id: `complete-${e.id}`, type: 'completed', userName: p?.full_name || p?.email || 'Unbekannt', userAvatar: p?.avatar_url || null, courseName: c?.title || 'Unbekannt', timestamp: e.completed_at, timeAgo: formatDistanceToNow(new Date(e.completed_at), { addSuffix: true, locale: de }) });
      }
    });
    certificates.forEach(cert => {
      const p = profileMap.get(cert.user_id);
      const c = courseMap.get(cert.course_id);
      activities.push({ id: `cert-${cert.id}`, type: 'certified', userName: p?.full_name || p?.email || 'Unbekannt', userAvatar: p?.avatar_url || null, courseName: c?.title || 'Unbekannt', timestamp: cert.issued_at, timeAgo: formatDistanceToNow(new Date(cert.issued_at), { addSuffix: true, locale: de }) });
    });
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setRecentActivity(activities.slice(0, 10));

    // --- Quick Stats ---
    const oneWeekAgo = subDays(now, 7);
    const todayStr = format(now, 'yyyy-MM-dd');
    const newThisWeek = enrollments.filter(e => new Date(e.enrolled_at) >= oneWeekAgo).length;
    const activeToday = lessonProgress.filter(lp => lp.completed_at?.startsWith(todayStr)).length;
    const completedWithDuration = enrollments.filter(e => e.completed_at);
    const avgDays = completedWithDuration.length > 0
      ? Math.round(completedWithDuration.reduce((sum, e) => sum + (new Date(e.completed_at!).getTime() - new Date(e.enrolled_at).getTime()) / (1000 * 60 * 60 * 24), 0) / completedWithDuration.length)
      : 0;
    setQuickStats({ newThisWeek, activeToday, avgCompletionDays: avgDays });

    setIsLoading(false);
  };

  return { isLoading, stats, sparklines, trendData, coursePopularity, departmentBreakdown, topPerformers, recentActivity, quickStats };
}
