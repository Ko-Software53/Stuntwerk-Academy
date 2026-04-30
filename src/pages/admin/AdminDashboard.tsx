import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus } from 'lucide-react';
import { WelcomeBanner } from '@/components/admin/dashboard/WelcomeBanner';
import { StatsGrid } from '@/components/admin/dashboard/StatsGrid';
import { EnrollmentTrendsChart } from '@/components/admin/dashboard/EnrollmentTrendsChart';
import { CompletionRateChart } from '@/components/admin/dashboard/CompletionRateChart';
import { CoursePopularityChart } from '@/components/admin/dashboard/CoursePopularityChart';
import { DepartmentBreakdownChart } from '@/components/admin/dashboard/DepartmentBreakdownChart';
import { TopPerformersWidget } from '@/components/admin/dashboard/TopPerformersWidget';
import { ActivityFeed } from '@/components/admin/dashboard/ActivityFeed';

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-md" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-md" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-2 h-72 rounded-md" />
        <Skeleton className="h-72 rounded-md" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="h-64 rounded-md" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-64 rounded-md" />
        <Skeleton className="lg:col-span-2 h-64 rounded-md" />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, profile, isAdmin } = useAuth();
  const data = useDashboardData(user?.id, isAdmin);

  if (data.isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      {/* Row 1: Welcome Banner */}
      <div className="flex items-start justify-between gap-4">
        <WelcomeBanner userName={profile?.full_name} quickStats={data.quickStats} />
      </div>

      {/* Row 2: Stat Cards */}
      <StatsGrid stats={data.stats} sparklines={data.sparklines} />

      {/* Row 3: Enrollment Trends (2/3) + Completion Rate (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EnrollmentTrendsChart data={data.trendData} />
        </div>
        <CompletionRateChart
          rate={data.stats.completionRate}
          completed={data.stats.completedEnrollments}
          total={data.stats.totalEnrollments}
        />
      </div>

      {/* Row 4: Course Popularity (1/2) + Department Breakdown (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CoursePopularityChart data={data.coursePopularity} />
        <DepartmentBreakdownChart data={data.departmentBreakdown} />
      </div>

      {/* Row 5: Top Performers (1/3) + Activity Feed (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopPerformersWidget data={data.topPerformers} />
        <div className="lg:col-span-2">
          <ActivityFeed data={data.recentActivity} />
        </div>
      </div>
    </div>
  );
}
