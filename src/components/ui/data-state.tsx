import { LoadingState } from './loading-state';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LucideIcon } from 'lucide-react';

interface DataStateProps {
  loading?: boolean;
  error?: Error | null;
  empty?: boolean;
  loadingVariant?: 'card' | 'list' | 'skeleton';
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: React.ReactNode;
  errorTitle?: string;
  errorDescription?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function DataState({
  loading = false,
  error = null,
  empty = false,
  loadingVariant = 'skeleton',
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  errorTitle,
  errorDescription,
  onRetry,
  children,
}: DataStateProps) {
  if (loading) {
    return <LoadingState variant={loadingVariant} />;
  }

  if (error) {
    return (
      <ErrorState
        title={errorTitle}
        description={errorDescription}
        error={error}
        onRetry={onRetry}
      />
    );
  }

  if (empty) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    );
  }

  return <>{children}</>;
}