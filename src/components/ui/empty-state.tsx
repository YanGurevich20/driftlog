import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ 
  title = "No data yet",
  description = "Get started by adding your first item",
  icon: Icon,
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex items-center gap-3",
      className
    )}>
      {Icon && (
        <div className="p-2 rounded-full bg-muted flex-shrink-0">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 text-left">
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {description}
        </p>
      </div>
      {action && (
        <div className="flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}