'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FinancialState, Transaction, Debt, ImportedTransaction, UserSettings, FinancialCycle } from '@/types';
import { MONTHS_FULL } from '@/lib/constants';

// Helper to get today's month string "YYYY-MM"
const getCurrentMonthStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const initialState: FinancialState = {
  cycles: [], // Start empty, will be populated on load or init
  categories: [
    { id: 'cat1', name: 'Salário', type: 'income', color: '#10b981' },
    { id: 'cat2', name: 'Casa', type: 'expense', color: '#3b82f6' },
    { id: 'cat3', name: 'Mercado', type: 'expense', color: '#f59e0b' },
    { id: 'cat4', name: 'Transporte', type: 'expense', color: '#ef4444' },
    { id: 'cat5', name: 'Lazer', type: 'expense', color: '#8b5cf6' },
    { id: 'cat6', name: 'Saúde', type: 'expense', color: '#ec4899' },
    { id: 'cat7', name: 'Educação', type: 'expense', color: '#14b8a6' },
    { id: 'cat8', name: 'Outros', type: 'expense', color: '#64748b' },
  ],
  settings: { salaryDay: 5, hasAdvance: true, advanceDay: 20, theme: 'system' },
  categoryMappings: {}
};

interface FinancialContextType {
  state: FinancialState;
  updateSettings: (s: UserSettings) => void;
  addCategory: (n: string, t: 'income'|'expense', c: string) => void;
  updateCategory: (id: string, n: string, c: string) => void;
  removeCategory: (id: string) => void;
  addTransaction: (t: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, t: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addDebt: (d: Omit<Debt, 'id'>) => void;
  addProjectedDebt: (d: Omit<Debt, 'id'>) => void;
  addBatchedTransactions: (t: ImportedTransaction[]) => void;
  updateDebt: (id: string, d: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  payPartialDebt: (debtId: string, amountToPay: number) => void;
  switchCycle: (id: string) => void;
  learnCategory: (sender: string, category: string, amount: number, isFixed: boolean) => void; 
  clearDatabase: (range: 'all' | '2months' | '6months') => void;
  getCyclesForMonth: (monthStr: string) => FinancialCycle[];
  toggleDebtStatus: (id: string) => void;
  toggleTransactionStatus: (id: string) => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<FinancialState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('finance_db_v7');
    if (saved) { 
        try { 
            const parsed = JSON.parse(saved);
            if (!parsed.categoryMappings) parsed.categoryMappings = {};

            // Migration check: Ensure cycles have month property
            if (parsed.cycles && parsed.cycles.length > 0 && !parsed.cycles[0].month) {
                const currentMonth = getCurrentMonthStr();
                parsed.cycles = parsed.cycles.map((c: any) => ({ ...c, month: currentMonth }));
            }

            setState(parsed); 
        } catch (e) { console.error(e); } 
    } else {
        // Initialize with current month cycles if no data
        const currentMonth = getCurrentMonthStr();
        setState(prev => ({
            ...prev,
            cycles: [
                { id: `${currentMonth}_day_05`, month: currentMonth, type: 'day_05', transactions: [], debts: [] },
                { id: `${currentMonth}_day_20`, month: currentMonth, type: 'day_20', transactions: [], debts: [] }
            ]
        }));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('finance_db_v7', JSON.stringify(state));
  }, [state, isLoaded]);

  const updateSettings = (s: UserSettings) => setState(prev => ({ ...prev, settings: s }));
  
  const addCategory = (name: string, type: 'income'|'expense', color: string) => {
      setState(prev => ({ ...prev, categories: [...prev.categories, { id: uuidv4(), name, type, color }] }));
  };

  const updateCategory = (id: string, name: string, color: string) => {
      setState(prev => ({ ...prev, categories: prev.categories.map(c => c.id === id ? { ...c, name, color } : c) }));
  };

  const removeCategory = (id: string) => setState(prev => ({ ...prev, categories: prev.categories.filter(c => c.id !== id) }));

  const learnCategory = (sender: string, category: string, amount: number, isFixed: boolean) => {
      if (!sender || !category) return;
      const key = isFixed 
          ? sender.toLowerCase().trim()
          : `${sender.toLowerCase().trim()}-${amount.toFixed(2)}`;

      setState(prev => ({
          ...prev,
          categoryMappings: { ...prev.categoryMappings, [key]: category }
      }));
  };

  // Helper to find or create cycles for a given month
  const ensureCyclesForMonth = (cycles: FinancialCycle[], monthStr: string): FinancialCycle[] => {
      const exists = cycles.some(c => c.month === monthStr);
      if (exists) return cycles;

      return [
          ...cycles,
          { id: `${monthStr}_day_05`, month: monthStr, type: 'day_05', transactions: [], debts: [] },
          { id: `${monthStr}_day_20`, month: monthStr, type: 'day_20', transactions: [], debts: [] }
      ];
  };

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    const dateObj = new Date(t.date);
    const monthStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

    setState(prev => {
        const cyclesWithMonth = ensureCyclesForMonth(prev.cycles, monthStr);
        return {
            ...prev,
            cycles: cyclesWithMonth.map(c => (c.month === monthStr && c.type === t.cycle)
                ? { ...c, transactions: [...c.transactions, { ...t, id: uuidv4(), isPaid: false, needsReview: false }] }
                : c)
        };
    });
  };

  const updateTransaction = (id: string, updated: Partial<Transaction>) => {
      setState(prev => ({ ...prev, cycles: prev.cycles.map(c => ({ ...c, transactions: c.transactions.map(t => t.id === id ? { ...t, ...updated } : t) })) }));
  };

  const deleteTransaction = (id: string) => {
    setState(prev => ({ ...prev, cycles: prev.cycles.map(c => ({ ...c, transactions: c.transactions.filter(t => t.id !== id) })) }));
  };

  const addDebt = (d: Omit<Debt, 'id'>) => {
    // If purchaseDate is available, use it to determine month, otherwise use current month or based on dueDate logic if needed
    // However, debts are usually assigned to a cycle. We will trust the current context or derived logic.
    // Ideally, Debt date should drive the cycle month.
    const dateStr = d.purchaseDate || new Date().toISOString();
    const dateObj = new Date(dateStr);
    const monthStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

    setState(prev => {
        const cyclesWithMonth = ensureCyclesForMonth(prev.cycles, monthStr);
        return {
            ...prev,
            cycles: cyclesWithMonth.map(c => (c.month === monthStr && c.type === d.cycle)
                ? { ...c, debts: [...c.debts, { ...d, id: uuidv4(), isPaid: false, needsReview: false }] }
                : c)
        };
    });
  };
  
  const addProjectedDebt = (d: Omit<Debt, 'id'>) => {
      const { salaryDay, advanceDay, hasAdvance } = state.settings;
      const debtDate = new Date(d.purchaseDate!);
      const debtDay = debtDate.getDate();

      let targetCycle: 'day_05' | 'day_20' = 'day_05';
      if(hasAdvance) {
          const distToSalary = Math.abs(debtDay - salaryDay);
          const distToAdvance = Math.abs(debtDay - advanceDay);
          if (distToAdvance < distToSalary) targetCycle = 'day_20';
      }

      const debtWithCycle = { ...d, cycle: targetCycle };
      addDebt(debtWithCycle);
  };

  const updateDebt = (id: string, updated: Partial<Debt>) => {
      setState(prev => {
          // Find the debt to get its current cycle/month to handle moves if necessary
          // For now, assume simple update in place or simple cycle switch within same month
          // If month changes, we might need more complex logic, but usually cycle switch is enough.

          return { ...prev, cycles: prev.cycles.map(c => ({ ...c, debts: c.debts.map(d => d.id === id ? { ...d, ...updated } : d) })) };
      });
  };

  const deleteDebt = (id: string) => {
    setState(prev => ({ ...prev, cycles: prev.cycles.map(c => ({ ...c, debts: c.debts.filter(d => d.id !== id) })) }));
  };

  const payPartialDebt = (debtId: string, amountToPay: number) => {
    setState(prev => {
      let debtToSplit: Debt | null = null;
      let originalCycleType: 'day_05' | 'day_20' | null = null;
      let originalCycleMonth: string | null = null;

      for (const cycle of prev.cycles) {
        const found = cycle.debts.find(d => d.id === debtId);
        if (found) {
          debtToSplit = found;
          originalCycleType = cycle.type;
          originalCycleMonth = cycle.month;
          break;
        }
      }

      if (!debtToSplit || !originalCycleType || !originalCycleMonth) return prev;

      const remainingAmount = debtToSplit.installmentAmount - amountToPay;
      if (remainingAmount <= 0) {
        return { ...prev, cycles: prev.cycles.map(c => ({ ...c, debts: c.debts.filter(d => d.id !== debtId) }))};
      }
      
      const newCycles = prev.cycles.map(c => {
        if (c.type === originalCycleType && c.month === originalCycleMonth) {
            const otherDebts = c.debts.filter(d => d.id !== debtId);
            const paidPart: Debt = {
                ...debtToSplit!,
                id: uuidv4(),
                name: `${debtToSplit!.name} (Parcial Paga)`,
                installmentAmount: amountToPay,
                paidAmount: amountToPay,
                totalAmount: debtToSplit!.installmentAmount,
                isPaid: true
            };
            const remainingPart: Debt = {
                ...debtToSplit!,
                id: uuidv4(),
                name: `Restante - ${debtToSplit!.name}`,
                installmentAmount: remainingAmount,
                paidAmount: 0,
                totalAmount: debtToSplit!.installmentAmount,
                isPaid: false
            };
            return { ...c, debts: [...otherDebts, paidPart, remainingPart] };
        }
        return c;
      });

      return { ...prev, cycles: newCycles };
    });
  };

  const switchCycle = (id: string) => {
      setState(prev => {
          let item: Debt | undefined;
          let currentCycle: FinancialCycle | undefined;

          for (const c of prev.cycles) {
              const found = c.debts.find(d => d.id === id);
              if (found) {
                  item = found;
                  currentCycle = c;
                  break;
              }
          }

          if (!item || !currentCycle) return prev;

          // Logic to switch cycle. If day_20, might move to next month day_05?
          // Or just switch between day_05 and day_20 within same month?
          // Original logic: day_20 -> next month day_05. day_05 -> same month day_20.

          let targetMonth = currentCycle.month;
          let targetType: 'day_05' | 'day_20';
          let updatedItem = { ...item };

          if (currentCycle.type === 'day_20') {
              // Move to next month day_05
              const [y, m] = currentCycle.month.split('-').map(Number);
              const nextDate = new Date(y, m, 1); // m is 1-based from split? No, Month in Date is 0-based.
              // split('2024-01') -> y=2024, m=1. new Date(2024, 1, 1) is Feb 1st. Correct.
              targetMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
              targetType = 'day_05';

              const currentMonthIdx = MONTHS_FULL.indexOf(item.billingMonth || '');
              const nextMonthName = MONTHS_FULL[(currentMonthIdx + 1) % 12];
              updatedItem.billingMonth = nextMonthName;
              updatedItem.cycle = 'day_05';
          } else {
              // Move to same month day_20
              targetType = 'day_20';
              updatedItem.cycle = 'day_20';
          }

          const cyclesWithTarget = ensureCyclesForMonth(prev.cycles, targetMonth);

          return {
              ...prev,
              cycles: cyclesWithTarget.map(c => {
                  // Remove from old
                  if (c.id === currentCycle!.id) {
                      return { ...c, debts: c.debts.filter(d => d.id !== id) };
                  }
                  // Add to new
                  if (c.month === targetMonth && c.type === targetType) {
                      return { ...c, debts: [...c.debts, updatedItem] };
                  }
                  return c;
              })
          };
      });
  };

  const addBatchedTransactions = (transactions: ImportedTransaction[]) => {
    setState(prev => {
        let newCycles = [...prev.cycles];
        const { salaryDay, advanceDay, hasAdvance } = prev.settings;
        const currentMonthName = MONTHS_FULL[new Date().getMonth()];

        transactions.forEach(t => {
            const dateObj = new Date(t.date); // expects YYYY-MM-DD or valid date string
            // Fix: imported dates might be DD/MM/YYYY or YYYY-MM-DD.
            // If from importer (UniversalImporter later), we should standardize to YYYY-MM-DD.
            // Assuming t.date is standard YYYY-MM-DD for now or ISO.

            // If date is invalid or needs parsing, we'll handle it.
            // For now, assume t.date is good.
            const monthStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;

            newCycles = ensureCyclesForMonth(newCycles, monthStr);

            const day = dateObj.getDate();
            let targetType: 'day_05' | 'day_20' = 'day_05';
            if (hasAdvance) {
                const distSalary = Math.abs(day - salaryDay);
                const distAdvance = Math.abs(day - advanceDay);
                if (distAdvance < distSalary) targetType = 'day_20';
            }
            
            const idx = newCycles.findIndex(c => c.month === monthStr && c.type === targetType);

            if(t.sender && t.category) {
                const key = t.sender.toLowerCase().trim();
                prev.categoryMappings[key] = t.category;
            }

            if (idx !== -1) {
                if (t.type === 'income') {
                    newCycles[idx].transactions.push({
                        id: uuidv4(), description: t.sender || t.description, amount: Math.abs(t.amount),
                        type: 'income', category: t.category || 'Salário', date: t.date, isFixed: false, cycle: targetType,
                        needsReview: true, isPaid: false
                    });
                } else {
                    const isInst = !!t.installments;
                    const finalName = t.sender ? t.sender : t.description;
                    newCycles[idx].debts.push({
                        id: uuidv4(), name: finalName,
                        totalAmount: Math.abs(t.amount) * (isInst ? t.installments!.total : 1),
                        installmentAmount: Math.abs(t.amount), dueDate: t.date, purchaseDate: t.date,
                        currentInstallment: isInst ? t.installments!.current : 1,
                        totalInstallments: isInst ? t.installments!.total : 1,
                        isFixed: false, billingMonth: currentMonthName, cycle: targetType,
                        category: t.category || 'Outros', paymentMethod: t.description.includes('Pix') ? 'Pix' : 'Cartão',
                        needsReview: true, isPaid: false
                    });
                }
            }
        });
        return { ...prev, cycles: newCycles, categoryMappings: prev.categoryMappings };
    });
  };

  const clearDatabase = (range: 'all' | '2months' | '6months') => {
      if (range === 'all') setState({ ...initialState, settings: state.settings, categories: state.categories, categoryMappings: state.categoryMappings });
      // TODO: Implement other ranges if needed
  };

  const getCyclesForMonth = (monthStr: string) => {
      // Returns the two cycles for the requested month. If not exist, returns empty placeholders (but doesn't modify state)
      // or we can ensure they exist in state? Better to just filter what we have.
      // Actually, PlanningScreen expects them to exist.
      // If we don't find them, we can return virtual empty cycles.
      const found = state.cycles.filter(c => c.month === monthStr);
      if (found.length === 0) {
          return [
             { id: `${monthStr}_day_05`, month: monthStr, type: 'day_05', transactions: [], debts: [] } as FinancialCycle,
             { id: `${monthStr}_day_20`, month: monthStr, type: 'day_20', transactions: [], debts: [] } as FinancialCycle
          ];
      }
      // Sort to ensure day_05 is first
      return found.sort((a, b) => a.type === 'day_05' ? -1 : 1);
  };

  const toggleDebtStatus = (id: string) => {
      setState(prev => ({
          ...prev,
          cycles: prev.cycles.map(c => ({
              ...c,
              debts: c.debts.map(d => d.id === id ? { ...d, isPaid: !d.isPaid } : d)
          }))
      }));
  };

  const toggleTransactionStatus = (id: string) => {
    setState(prev => ({
        ...prev,
        cycles: prev.cycles.map(c => ({
            ...c,
            transactions: c.transactions.map(t => t.id === id ? { ...t, isPaid: !t.isPaid } : t)
        }))
    }));
  };

  return (
    <FinancialContext.Provider value={{ state, updateSettings, addCategory, updateCategory, removeCategory, addTransaction, updateTransaction, deleteTransaction, addDebt, addProjectedDebt, addBatchedTransactions, updateDebt, deleteDebt, payPartialDebt, switchCycle, learnCategory, clearDatabase, getCyclesForMonth, toggleDebtStatus, toggleTransactionStatus }}>
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancials = () => {
  const ctx = useContext(FinancialContext);
  if (!ctx) throw new Error('useFinancials must be used within FinancialProvider');
  return ctx;
};
