'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardHeader,
  CollapsibleCardTitle
} from '@/components/ui/collapsible-card';
import { CategoryName, CATEGORIES, DEFAULT_CATEGORIES } from '@/types/categories';
import { updateUserCategories } from '@/services/user';
import { toast } from 'sonner';
import { X, Plus, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { CategoryIcon } from '@/components/ui/category-icon';
import { Separator } from '@/components/ui/separator';

type CategoryType = 'expense' | 'income';

export function CategoriesSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<CategoryType>('expense');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingOperations, setLoadingOperations] = useState<Set<string>>(new Set());

  // Consolidate categories state
  const [categories, setCategories] = useState({
    expense: user?.categories?.expense || DEFAULT_CATEGORIES.expense,
    income: user?.categories?.income || DEFAULT_CATEGORIES.income,
  });

  if (!user) return null;

  const currentCategories = categories[activeTab];
  const availableCategories = (Object.keys(CATEGORIES) as CategoryName[]).filter(
    c => !currentCategories.includes(c)
  );

  const handleAddCategory = async (category: CategoryName) => {
    const operationKey = `add-${activeTab}-${category}`;
    setLoadingOperations(prev => new Set(prev).add(operationKey));

    const newCategories = {
      ...categories,
      [activeTab]: [...categories[activeTab], category],
    };

    try {
      await updateUserCategories(user.id, newCategories);
      setCategories(newCategories);
      setDialogOpen(false);
    } catch {
      toast.error(`Failed to add ${category}.`);
    } finally {
      setLoadingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(operationKey);
        return newSet;
      });
    }
  };

  const handleRemoveCategory = async (category: CategoryName) => {
    const operationKey = `remove-${activeTab}-${category}`;
    setLoadingOperations(prev => new Set(prev).add(operationKey));

    const newCategories = {
      ...categories,
      [activeTab]: categories[activeTab].filter(c => c !== category),
    };

    try {
      await updateUserCategories(user.id, newCategories);
      setCategories(newCategories);
    } catch {
      toast.error(`Failed to remove ${category}.`);
    } finally {
      setLoadingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(operationKey);
        return newSet;
      });
    }
  };

  return (
    <CollapsibleCard defaultCollapsed>
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>Manage Categories</CollapsibleCardTitle>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as CategoryType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense">Expense</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
          </TabsList>
          <TabsContent value="expense">
            <CategoryList
              categories={categories.expense}
              onRemove={handleRemoveCategory}
              onAdd={() => setDialogOpen(true)}
              availableCategories={availableCategories}
              onAddCategory={handleAddCategory}
              dialogOpen={dialogOpen}
              setDialogOpen={setDialogOpen}
              loadingOperations={loadingOperations}
              activeTab={activeTab}
            />
          </TabsContent>
          <TabsContent value="income">
            <CategoryList
              categories={categories.income}
              onRemove={handleRemoveCategory}
              onAdd={() => setDialogOpen(true)}
              availableCategories={availableCategories}
              onAddCategory={handleAddCategory}
              dialogOpen={dialogOpen}
              setDialogOpen={setDialogOpen}
              loadingOperations={loadingOperations}
              activeTab={activeTab}
            />
          </TabsContent>
        </Tabs>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}

interface CategoryListProps {
  categories: CategoryName[];
  onRemove: (category: CategoryName) => void;
  onAdd: () => void;
  availableCategories: CategoryName[];
  onAddCategory: (category: CategoryName) => void;
  dialogOpen: boolean;
  setDialogOpen: (open: boolean) => void;
  loadingOperations: Set<string>;
  activeTab: CategoryType;
}

function CategoryList({
  categories,
  onRemove,
  onAdd,
  availableCategories,
  onAddCategory,
  dialogOpen,
  setDialogOpen,
  loadingOperations,
  activeTab,
}: CategoryListProps) {

  return (
    <div>
      <div >
        {categories.map((category, index) => {
          const isRemoving = loadingOperations.has(`remove-${activeTab}-${category}`);
          return (
            <div key={category}>
              <div className={`flex items-center justify-between text-sm px-3 py-2 ${isRemoving ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <CategoryIcon category={category} />
                  <span>{category}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-6 w-6 ${categories.length <= 1 && !isRemoving ? 'opacity-30' : ''}`}
                  onClick={() => onRemove(category)}
                  disabled={isRemoving || categories.length <= 1}
                  title={categories.length <= 1 ? "Cannot delete the last category" : "Remove category"}
                >
                  {isRemoving ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <X className={categories.length <= 1 ? 'text-muted-foreground' : ''} />
                  )}
                </Button>
              </div>
              {index < categories.length - 1 && (
                <Separator/>
              )}
            </div>
          );
        })}
      </div>
      <Popover open={dialogOpen} onOpenChange={setDialogOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={onAdd}
            disabled={Array.from(loadingOperations).some(op => op.startsWith('add-'))}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="end">
          <Command>
            <CommandInput placeholder="Search categories..." />
            <CommandList>
              <CommandEmpty>No categories found.</CommandEmpty>
              <CommandGroup>
                {availableCategories.map(category => {
                  const isAdding = loadingOperations.has(`add-${activeTab}-${category}`);
                  return (
                    <CommandItem
                      key={category}
                      onSelect={() => onAddCategory(category)}
                      className={`flex items-center gap-3 ${isAdding ? 'opacity-50' : ''}`}
                      disabled={isAdding}
                    >
                      <CategoryIcon category={category} />
                      <span className="flex-1">{category}</span>
                      {isAdding && <Loader2 className="h-4 w-4 animate-spin" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
