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
  cycles: [],
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
  categoryMappings: {},
  viewDate: getCurrentMonthStr()
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
  setViewDate: (date: string) => void;
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

            // Migration: Add viewDate if missing
            if (!parsed.viewDate) parsed.viewDate = getCurrentMonthStr();

            // Migration check: Ensure cycles have month property
            if (parsed.cycles && parsed.cycles.length > 0 && !parsed.cycles[0].month) {
                const currentMonth = getCurrentMonthStr();
                parsed.cycles = parsed.cycles.map((c: any) => ({ ...c, month: currentMonth }));
            }

            setState(parsed); 
        } catch (e) { console.error(e); } 
    } else {
        const currentMonth = getCurrentMonthStr();
        setState(prev => ({
            ...prev,
            viewDate: currentMonth,
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
  
  const setViewDate = (date: string) => setState(prev => ({ ...prev, viewDate: date }));

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
    // If it's an installment debt, we need to create multiple debts for future months
    const dateStr = d.purchaseDate || d.dueDate || new Date().toISOString();
    const dateObj = new Date(dateStr);

    setState(prev => {
        let newCycles = [...prev.cycles];
        const count = (d.totalInstallments > 1) ? d.totalInstallments : 1;

        // Loop to create installments
        for (let i = 0; i < count; i++) {
            const installmentDate = new Date(dateObj);
            installmentDate.setMonth(installmentDate.getMonth() + i);
            const monthStr = `${installmentDate.getFullYear()}-${String(installmentDate.getMonth() + 1).padStart(2, '0')}`;

            // Due date adjustment? Assuming same day of month.
            const dueDateObj = new Date(d.dueDate);
            dueDateObj.setMonth(dueDateObj.getMonth() + i);
            const dueDateStr = dueDateObj.toISOString().split('T')[0];

            newCycles = ensureCyclesForMonth(newCycles, monthStr);

            const currentInstallment = d.currentInstallment + i;
            // Should we add only if currentInstallment <= totalInstallments? Yes.
            if (currentInstallment > d.totalInstallments) break;

            // Create debt for this month
            // We need to find the cycle within newCycles for this month
            const cycleIndex = newCycles.findIndex(c => c.month === monthStr && c.type === d.cycle);
            if (cycleIndex !== -1) {
                newCycles[cycleIndex].debts.push({
                    ...d,
                    id: uuidv4(),
                    dueDate: dueDateStr,
                    currentInstallment: currentInstallment,
                    isPaid: false,
                    needsReview: i === 0 ? (d.needsReview ?? false) : false // Only flag first one if needed? Or none?
                });
            }
        }

        return { ...prev, cycles: newCycles };
    });
  };
  
  const addProjectedDebt = (d: Omit<Debt, 'id'>) => {
      const { salaryDay, advanceDay, hasAdvance } = state.settings;
      const debtDate = new Date(d.purchaseDate || d.dueDate);
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
                isPaid: true,
                paymentDate: new Date().toISOString()
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

          let targetMonth = currentCycle.month;
          let targetType: 'day_05' | 'day_20';
          let updatedItem = { ...item };

          if (currentCycle.type === 'day_20') {
              const [y, m] = currentCycle.month.split('-').map(Number);
              const nextDate = new Date(y, m, 1);
              targetMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
              targetType = 'day_05';
              updatedItem.cycle = 'day_05';
          } else {
              targetType = 'day_20';
              updatedItem.cycle = 'day_20';
          }

          const cyclesWithTarget = ensureCyclesForMonth(prev.cycles, targetMonth);

          return {
              ...prev,
              cycles: cyclesWithTarget.map(c => {
                  if (c.id === currentCycle!.id) {
                      return { ...c, debts: c.debts.filter(d => d.id !== id) };
                  }
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
            const dateObj = new Date(t.date);
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

                    // Handle installments in import (simplified: create just one, or loop?)
                    // For massive import, if "installments" detected, we might need logic.
                    // But imported transactions usually represent ONE charge (e.g. 1/10).
                    // So we treat it as single record. The 'total' in installments object suggests tracking.

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
  };

  const getCyclesForMonth = (monthStr: string) => {
      const found = state.cycles.filter(c => c.month === monthStr);
      if (found.length === 0) {
          return [
             { id: `${monthStr}_day_05`, month: monthStr, type: 'day_05', transactions: [], debts: [] } as FinancialCycle,
             { id: `${monthStr}_day_20`, month: monthStr, type: 'day_20', transactions: [], debts: [] } as FinancialCycle
          ];
      }
      return found.sort((a, b) => a.type === 'day_05' ? -1 : 1);
  };

  const toggleDebtStatus = (id: string) => {
      setState(prev => ({
          ...prev,
          cycles: prev.cycles.map(c => ({
              ...c,
              debts: c.debts.map(d => d.id === id ? { ...d, isPaid: !d.isPaid, paymentDate: !d.isPaid ? new Date().toISOString() : undefined } : d)
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
    <FinancialContext.Provider value={{ state, updateSettings, addCategory, updateCategory, removeCategory, addTransaction, updateTransaction, deleteTransaction, addDebt, addProjectedDebt, addBatchedTransactions, updateDebt, deleteDebt, payPartialDebt, switchCycle, learnCategory, clearDatabase, getCyclesForMonth, toggleDebtStatus, toggleTransactionStatus, setViewDate }}>
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancials = () => {
  const ctx = useContext(FinancialContext);
  if (!ctx) throw new Error('useFinancials must be used within FinancialProvider');
  return ctx;
};
