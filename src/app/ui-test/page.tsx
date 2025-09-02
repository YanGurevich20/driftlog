'use client';

import { useState } from 'react';
import { MultiCategorySelector } from '@/components/ui/multi-category-selector';

export default function UITestPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-2xl font-bold">UI Test Page</h1>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Multi-Category Select</h2>
        <div className="border rounded-lg p-4 space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Expense Categories</h3>
            <MultiCategorySelector
              value={selectedCategories}
              onChange={setSelectedCategories}
              type="expense"
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            Selected categories: {selectedCategories.length > 0 ? selectedCategories.join(', ') : 'None'}
          </div>
        </div>
      </div>
    </div>
  );
}