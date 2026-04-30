import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer } from '@/components/ui/chart';
import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts';
import { Progress } from '@/components/ui/progress';

interface CompletionRateChartProps {
  rate: number;
  completed: number;
  total: number;
}

function getRateColor(rate: number): string {
  if (rate >= 75) return 'hsl(var(--chart-2))';
  if (rate >= 50) return 'hsl(var(--chart-4))';
  return 'hsl(var(--chart-5))';
}

const chartConfig: ChartConfig = {
  rate: { label: 'Abschlussrate', color: 'hsl(var(--chart-2))' },
};

export function CompletionRateChart({ rate, completed, total }: CompletionRateChartProps) {
  const color = getRateColor(rate);
  const endAngle = 90 - (rate / 100) * 360;

  return (
    <Card className="border-border/50 rounded-md shadow-sm flex flex-col pt-3">
      <CardHeader className="pb-0 text-center items-center">
        <CardTitle className="text-sm font-bold tracking-tight">Abschlussrate</CardTitle>
        <CardDescription className="text-xs">Gesamte Kursabschlüsse</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 justify-end items-center pt-2">
        <ChartContainer config={chartConfig} className="mx-auto aspect-square w-full max-w-[200px]">
          <RadialBarChart data={[{ rate, fill: color }]} startAngle={90} endAngle={endAngle} innerRadius={70} outerRadius={95}>
            <PolarGrid gridType="circle" radialLines={false} stroke="none" className="first:fill-muted last:fill-card" polarRadius={[74, 66]} />
            <RadialBar dataKey="rate" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                          {rate}%
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
        <div className="w-full space-y-2 mt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completed} von {total} abgeschlossen</span>
            <span style={{ color }}>{rate}%</span>
          </div>
          <Progress value={rate} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  );
}
