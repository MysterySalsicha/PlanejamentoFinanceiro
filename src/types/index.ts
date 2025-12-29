// src/types/index.ts

export interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
    isFixed?: boolean;
    cycle: 'day_05' | 'day_20';
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
    currentInstallment: number;
    totalInstallments: number;
    isFixed?: boolean;
    billingMonth?: string;
    category?: string;
    cycle: 'day_05' | 'day_20';
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
    type: 'day_05' | 'day_20';
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
    categoryMappings: Record<string, string>; // NOVO: Memória de Categorias
}

export interface ImportedTransaction {
    id: string;
    description: string;
    sender?: string;
    amount: number;
    date: string;
    type: 'income' | 'expense';
    category: string;
    installments?: { current: number, total: number };
    isDuplicate?: boolean;
    needsReview?: boolean;
}
