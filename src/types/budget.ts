export interface BudgetAllocation {
  id: string;
  userId: string;
  category: string;
  amount: number;
  currency: string;
  createdAt: Date;
  updatedAt?: Date;
}
