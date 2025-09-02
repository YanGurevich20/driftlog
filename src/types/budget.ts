export interface BudgetAllocation {
  id: string;
  userId: string;
  categories: string[];
  amount: number;
  currency: string;
  createdAt: Date;
  updatedAt?: Date;
}
