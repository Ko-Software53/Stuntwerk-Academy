import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import type { TrendData } from '@/hooks/useDashboardData';

const chartConfig: ChartConfig = {
  enrollments: { label: 'Einschreibungen', color: 'hsl(var(--chart-1))' },
  completions: { label: 'Abschlüsse', color: 'hsl(var(--chart-2))' },
};

export function EnrollmentTrendsChart({ data }: { data: TrendData[] }) {
  return (
    <Card className="border-border/50 rounded-md shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold tracking-tight">Einschreibungen</CardTitle>
        <CardDescription className="text-xs">Letzte 6 Monate</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ChartContainer config={chartConfig} className="aspect-[2/1] w-full">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="fillEnrollments" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs" allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="enrollments"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill="url(#fillEnrollments)"
              animationDuration={800}
            />
            <Line
              type="monotone"
              dataKey="completions"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: 'hsl(var(--chart-2))' }}
              activeDot={{ r: 5 }}
              animationDuration={800}
            />
          </ComposedChart>
        </ChartContainer>
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--chart-1))]" />
            Einschreibungen
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--chart-2))]" style={{ opacity: 0.7 }} />
            Abschlüsse
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
