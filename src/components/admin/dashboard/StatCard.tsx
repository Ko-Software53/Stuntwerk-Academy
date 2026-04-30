import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: LucideIcon;
  trend: number;
  sparklineData: number[];
  gradient: string;
  iconColor: string;
  chartColor: string;
}

function useAnimatedCounter(target: number, duration = 600): number {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    startTime.current = null;
    const animate = (ts: number) => {
      if (!startTime.current) startTime.current = ts;
      const progress = Math.min((ts - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return count;
}

export function StatCard({ label, value, icon: Icon, trend, sparklineData, gradient, iconColor, chartColor }: StatCardProps) {
  const animatedValue = useAnimatedCounter(value);
  const trendDirection = trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral';

  return (
    <div className="bg-card border border-border/50 rounded-md p-5 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
         <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold tracking-wider uppercase">{label}</p>
      </div>

      <div className="flex items-baseline gap-3">
        {/* We format numbers larger than 999 with a comma or 'K' if we needed to, for now just use the animated values */}
        <p className="text-2xl font-black text-foreground tabular-nums tracking-tight">
          {animatedValue.toLocaleString('de-DE')}
        </p>
        
        {trend !== 0 && (
          <div className={`flex items-center gap-0.5 font-bold text-xs ${trendDirection === 'up' ? 'text-chart-2' : 'text-destructive'}`}>
            {trendDirection === 'up' ? <TrendingUp className="h-3 w-3 stroke-[3]" /> : <TrendingDown className="h-3 w-3 stroke-[3]" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
}
