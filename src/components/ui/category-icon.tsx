'use client';

import { getCategoryIcon } from '@/types/category';
import { cn } from '@/lib/utils';

interface CategoryIconProps {
  category: string;
  className?: string;
}

export function CategoryIcon({ category, className }: CategoryIconProps) {
  const Icon = getCategoryIcon(category);
  return <Icon className={cn("h-4 w-4", className)} />;
}
