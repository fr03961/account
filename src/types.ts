export type TransactionBase = {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // positive number
};

export type Sale = TransactionBase;

export type CostKind = 'Expense' | 'Purchase';

export type Cost = TransactionBase & {
  kind: CostKind;
};

export type AccountingState = {
  sales: Sale[];
  costs: Cost[];
};

