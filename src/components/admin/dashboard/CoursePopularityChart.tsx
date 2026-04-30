import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import type { CoursePopularityItem } from '@/hooks/useDashboardData';
import { BookOpen } from 'lucide-react';

const chartConfig: ChartConfig = {
  enrollments: { label: 'Einschreibungen', color: 'hsl(var(--chart-1))' },
};

export function CoursePopularityChart({ data }: { data: CoursePopularityItem[] }) {
  const chartData = data.map(d => ({
    ...d,
    title: d.title.length > 22 ? d.title.slice(0, 20) + '...' : d.title,
  }));

  if (data.length === 0) {
    return (
      <Card className="border-border/50 rounded-md shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold tracking-tight">Vollste Kurse</CardTitle>
          <CardDescription className="text-xs">Top Kurse nach Einschreibungen</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <BookOpen className="h-8 w-8 opacity-20 mb-2" />
          <p className="text-sm">Noch keine Kursdaten</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 rounded-md shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold tracking-tight">Vollste Kurse</CardTitle>
        <CardDescription className="text-xs">Top {data.length} nach Einschreibungen</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={chartConfig} className="w-full" style={{ height: Math.max(180, data.length * 36) }}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="barFill" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <XAxis type="number" hide />
            <YAxis dataKey="title" type="category" tickLine={false} axisLine={false} width={130} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="enrollments" fill="url(#barFill)" radius={[0, 6, 6, 0]} animationDuration={800} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
