import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Label, Pie, PieChart } from 'recharts';
import type { DepartmentItem } from '@/hooks/useDashboardData';
import { Building2 } from 'lucide-react';

export function DepartmentBreakdownChart({ data }: { data: DepartmentItem[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const chartConfig: ChartConfig = data.reduce((acc, d, i) => {
    acc[d.department] = { label: d.department, color: d.fill };
    return acc;
  }, {} as ChartConfig);

  if (data.length === 0) {
    return (
      <Card className="border-border/50 rounded-md shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold tracking-tight">Abteilungen</CardTitle>
          <CardDescription className="text-xs">Einschreibungen nach Abteilung</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Building2 className="h-8 w-8 opacity-20 mb-2" />
          <p className="text-sm">Noch keine Abteilungsdaten</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 rounded-md shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold tracking-tight">Abteilungen</CardTitle>
        <CardDescription className="text-xs">Einschreibungen nach Abteilung</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col items-center">
          <ChartContainer config={chartConfig} className="mx-auto aspect-square w-full max-w-[220px]">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="department" />} />
              <Pie
                data={data}
                dataKey="count"
                nameKey="department"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                strokeWidth={2}
                stroke="hsl(var(--card))"
                animationDuration={800}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 6} className="fill-foreground text-2xl font-bold">{total}</tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 12} className="fill-muted-foreground text-[10px]">Gesamt</tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
            {data.map((d) => (
              <span key={d.department} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                {d.department} ({d.count})
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
