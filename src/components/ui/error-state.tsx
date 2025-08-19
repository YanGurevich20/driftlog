import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ 
  title = "Something went wrong",
  description = "We couldn't load the data. Please try again.",
  error,
  onRetry,
  className 
}: ErrorStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 text-center",
      className
    )}>
      <div className="mb-4 p-3 rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {description}
      </p>
      {error && (
      // {error && process.env.NODE_ENV === 'development' && (
        <p className="text-xs text-muted-foreground mb-4 font-mono">
          dev-only message: {error.message}
        </p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          Try again
        </Button>
      )}
    </div>
  );
}