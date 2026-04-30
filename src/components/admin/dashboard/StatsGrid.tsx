import { Users, BookOpen, TrendingUp, Award } from 'lucide-react';
import { StatCard } from './StatCard';
import type { StatsData } from '@/hooks/useDashboardData';

interface StatsGridProps {
  stats: StatsData;
  sparklines: Record<string, number[]>;
}

const cards = [
  { key: 'employees', label: 'Mitarbeiter', icon: Users, gradient: 'from-primary/10 to-chart-3/5', iconColor: 'text-primary', chartColor: 'hsl(243, 75%, 59%)' },
  { key: 'courses', label: 'Kurse', icon: BookOpen, gradient: 'from-chart-3/10 to-primary/5', iconColor: 'text-[hsl(var(--chart-3))]', chartColor: 'hsl(270, 60%, 55%)' },
  { key: 'enrollments', label: 'Einschreibungen', icon: TrendingUp, gradient: 'from-chart-2/10 to-chart-3/5', iconColor: 'text-[hsl(var(--chart-2))]', chartColor: 'hsl(160, 84%, 39%)' },
  { key: 'certificates', label: 'Zertifikate', icon: Award, gradient: 'from-chart-4/10 to-chart-5/5', iconColor: 'text-[hsl(var(--chart-4))]', chartColor: 'hsl(38, 92%, 50%)' },
] as const;

const statValueMap: Record<string, keyof StatsData> = {
  employees: 'totalEmployees',
  courses: 'totalCourses',
  enrollments: 'totalEnrollments',
  certificates: 'totalCertificates',
};

const trendMap: Record<string, keyof StatsData['trends']> = {
  employees: 'employees',
  courses: 'courses',
  enrollments: 'enrollments',
  certificates: 'certificates',
};

export function StatsGrid({ stats, sparklines }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <StatCard
          key={card.key}
          label={card.label}
          value={stats[statValueMap[card.key]] as number}
          icon={card.icon}
          trend={stats.trends[trendMap[card.key]]}
          sparklineData={sparklines[card.key] || [0, 0, 0, 0, 0, 0]}
          gradient={card.gradient}
          iconColor={card.iconColor}
          chartColor={card.chartColor}
        />
      ))}
    </div>
  );
}
