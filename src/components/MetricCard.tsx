import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'danger' | 'success';
  className?: string;
}

export function MetricCard({ title, value, subtitle, icon: Icon, variant = 'default', className }: MetricCardProps) {
  return (
    <div className={cn(
      "rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm",
      variant === 'danger' && "border-destructive/20 bg-danger",
      variant === 'success' && "border-primary/20 bg-safe",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={cn(
            "text-2xl font-semibold tracking-tight",
            variant === 'danger' && "text-danger-foreground",
            variant === 'success' && "text-safe-foreground",
          )}>
            {value}
          </p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={cn(
            "rounded-lg p-2",
            variant === 'danger' ? "bg-destructive/10 text-destructive" :
            variant === 'success' ? "bg-primary/10 text-primary" :
            "bg-muted text-muted-foreground"
          )}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
    </div>
  );
}
