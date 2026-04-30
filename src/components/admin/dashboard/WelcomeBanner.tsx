import type { QuickStats } from '@/hooks/useDashboardData';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarPlus, Activity, Timer } from 'lucide-react';

interface WelcomeBannerProps {
  userName: string | null | undefined;
  quickStats: QuickStats;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}

export function WelcomeBanner({ userName, quickStats }: WelcomeBannerProps) {
  return (
    <div className="w-full mb-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {userName || 'Admin'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hier ist Ihre Plattform-Übersicht für heute.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-chart-1/10 px-3 py-1.5 text-xs font-medium text-chart-1">
            <CalendarPlus className="h-3.5 w-3.5" />
            {quickStats.newThisWeek} neu diese Woche
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-chart-2/10 px-3 py-1.5 text-xs font-medium text-chart-2">
            <Activity className="h-3.5 w-3.5" />
            {quickStats.activeToday} heute aktiv
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-chart-3/10 px-3 py-1.5 text-xs font-medium text-chart-3">
            <Timer className="h-3.5 w-3.5" />
            ~{quickStats.avgCompletionDays}d Abschlusszeit
          </div>
        </div>
      </div>
    </div>
  );
}
