// src/types/index.ts

export interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
    isFixed?: boolean;
    cycle: 'salary' | 'advance';
    preferredCycle?: 'salary' | 'advance';
    isPaid?: boolean;
    needsReview?: boolean;
}
  
export interface Debt {
    id: string;
    name: string;
    totalAmount: number;
    installmentAmount: number;
    paidAmount?: number;
    dueDate: string;
    purchaseDate?: string;
    paymentDate?: string; // ISO String
    originalId?: string; // Para rastreio caso venha de uma importação
    currentInstallment: number;
    totalInstallments: number;
    isFixed?: boolean;
    billingMonth?: string;
    category?: string;
    cycle: 'salary' | 'advance';
    preferredCycle?: 'salary' | 'advance';
    paymentMethod?: string;
    isPaid?: boolean;
    needsReview?: boolean;
}
  
export interface Category {
    id: string;
    name: string;
    type: 'income' | 'expense';
    color?: string;
}
  
export interface FinancialCycle {
    id: string;
    month: string; // Format: YYYY-MM
    type: 'salary' | 'advance';
    transactions: Transaction[];
    debts: Debt[];
}
  
export interface UserSettings {
    salaryDay: number;
    hasAdvance: boolean;
    advanceDay: number;
    theme?: 'light' | 'dark' | 'system';
}
  
export interface FinancialState {
    cycles: FinancialCycle[];
    categories: Category[];
    settings: UserSettings;
    categoryMappings: Record<string, string>;
    viewDate: string; // Format: YYYY-MM
}

export interface ImportedTransaction {
    id: string;
    description: string;
    sender?: string;
    amount: string | number;
    date: string;
    category: string;
    type: 'income' | 'expense';
    cycle: 'salary' | 'advance';
    installments?: { current: number, total: number };
    isDuplicate?: boolean;
    needsReview?: boolean;
    isPaid?: boolean;
    linkedDebtId?: string;
}
