import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { BookOpen, CheckCircle, Award, Clock } from 'lucide-react';
import type { ActivityItem } from '@/hooks/useDashboardData';

const typeConfig = {
  enrolled: { icon: BookOpen, label: 'Eingeschrieben', color: 'hsl(var(--chart-1))', badgeClass: 'text-[10px]', verb: 'hat sich für', suffix: 'eingeschrieben' },
  completed: { icon: CheckCircle, label: 'Abgeschlossen', color: 'hsl(var(--chart-2))', badgeClass: 'bg-[hsl(var(--chart-2)/0.1)] text-[hsl(var(--chart-2))] text-[10px]', verb: 'hat', suffix: 'abgeschlossen' },
  certified: { icon: Award, label: 'Zertifiziert', color: 'hsl(var(--chart-4))', badgeClass: 'bg-[hsl(var(--chart-4)/0.1)] text-[hsl(var(--chart-4))] text-[10px]', verb: 'hat Zertifikat für', suffix: 'erhalten' },
};

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function ActivityFeed({ data }: { data: ActivityItem[] }) {
  if (data.length === 0) {
    return (
      <Card className="border-border/50 rounded-md shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold tracking-tight">Letzte Aktivitäten</CardTitle>
          <CardDescription className="text-xs">Aktuelle Schulungsaktivitäten</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Clock className="h-8 w-8 opacity-20 mb-2" />
          <p className="text-sm">Noch keine Aktivitäten</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 rounded-md shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold tracking-tight">Letzte Aktivitäten</CardTitle>
        <CardDescription className="text-xs">Aktuelle Schulungsaktivitäten</CardDescription>
      </CardHeader>
      <CardContent className="space-y-0 pt-0">
        {data.map((activity, i) => {
          const config = typeConfig[activity.type];
          const Icon = config.icon;
          return (
            <div key={activity.id} className="flex gap-3 py-3 relative">
              {/* Timeline connector */}
              {i < data.length - 1 && (
                <div className="absolute left-[15px] top-[40px] bottom-0 w-px bg-border/50" />
              )}
              <div className="relative flex-shrink-0 mt-0.5">
                <div className="h-[30px] w-[30px] rounded-full flex items-center justify-center" style={{ background: `${config.color}15` }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={activity.userAvatar || ''} />
                      <AvatarFallback className="text-[8px] bg-muted">{getInitials(activity.userName)}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm truncate">
                      <span className="font-medium">{activity.userName}</span>{' '}
                      <span className="text-muted-foreground">{config.verb}</span>{' '}
                      <span className="font-medium">{activity.courseName}</span>{' '}
                      <span className="text-muted-foreground">{config.suffix}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className={`${config.badgeClass} flex-shrink-0 font-medium`}>
                    {config.label}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 ml-8">{activity.timeAgo}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
