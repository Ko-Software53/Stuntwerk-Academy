import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Award, Trophy } from 'lucide-react';
import type { PerformerItem } from '@/hooks/useDashboardData';

const rankColors = ['text-[hsl(var(--chart-4))]', 'text-muted-foreground', 'text-[hsl(var(--chart-4))]'];

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function TopPerformersWidget({ data }: { data: PerformerItem[] }) {
  if (data.length === 0) {
    return (
      <Card className="border-border/50 rounded-md shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold tracking-tight">Top Lernende</CardTitle>
          <CardDescription className="text-xs">Mitarbeiter mit den meisten Abschlüssen</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Trophy className="h-8 w-8 opacity-20 mb-2" />
          <p className="text-sm">Noch keine Abschlüsse</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 rounded-md shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold tracking-tight">Top Lernende</CardTitle>
        <CardDescription className="text-xs">Mitarbeiter mit den meisten Abschlüssen</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {data.map((performer, i) => {
          const progress = performer.totalEnrolled > 0 ? Math.round((performer.completedCourses / performer.totalEnrolled) * 100) : 0;
          return (
            <div key={performer.userId} className="flex items-center gap-3 py-2.5 px-3 -mx-3 rounded-md hover:bg-muted/50 transition-colors">
              <span className={`w-5 text-center text-sm font-bold ${i < 3 ? rankColors[i] : 'text-muted-foreground'}`}>
                {i === 0 ? <Award className="h-4 w-4 inline" /> : `${i + 1}`}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={performer.avatarUrl || ''} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-[hsl(260,60%,55%)] text-white text-[10px] font-semibold">
                  {getInitials(performer.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{performer.fullName}</p>
                  {performer.department && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 hidden sm:inline-flex">{performer.department}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Progress value={progress} className="h-1 flex-1" />
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{performer.completedCourses}/{performer.totalEnrolled}</span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
