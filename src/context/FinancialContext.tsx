import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FinancialState, Transaction, Debt, ImportedTransaction, UserSettings } from '@/types';

export const MONTHS_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const initialState: FinancialState = {
  cycles: [
    { id: 'c1', type: 'day_05', transactions: [], debts: [] },
    { id: 'c2', type: 'day_20', transactions: [], debts: [] },
  ],
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
  settings: { salaryDay: 5, hasAdvance: true, advanceDay: 20 },
  categoryMappings: {} // Inicializa vazio
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
  addBatchedTransactions: (t: ImportedTransaction[]) => void;
  updateDebt: (id: string, d: Partial<Debt>) => void;
  deleteDebt: (id: string) => void;
  switchCycle: (id: string) => void;
  learnCategory: (sender: string, category: string) => void; // NOVO
  clearDatabase: (range: 'all' | '2months' | '6months') => void;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<FinancialState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('finance_db_v7'); // Versão 7 (Mappings)
    if (saved) { 
        try { 
            const parsed = JSON.parse(saved);
            // Garante que categoryMappings existe mesmo se carregar backup antigo
            if (!parsed.categoryMappings) parsed.categoryMappings = {};
            setState(parsed); 
        } catch (e) { console.error(e); } 
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

  // --- Função de Aprendizado ---
  const learnCategory = (sender: string, category: string) => {
      if (!sender || !category) return;
      const key = sender.toLowerCase().trim();
      setState(prev => ({
          ...prev,
          categoryMappings: { ...prev.categoryMappings, [key]: category }
      }));
  };

  const addTransaction = (t: Omit<Transaction, 'id'>) => {
    setState(prev => ({
      ...prev, cycles: prev.cycles.map(c => c.type === t.cycle ? { ...c, transactions: [...c.transactions, { ...t, id: uuidv4() }] } : c)
    }));
  };

  const updateTransaction = (id: string, updated: Partial<Transaction>) => {
      setState(prev => ({ ...prev, cycles: prev.cycles.map(c => ({ ...c, transactions: c.transactions.map(t => t.id === id ? { ...t, ...updated } : t) })) }));
  };

  const deleteTransaction = (id: string) => {
    setState(prev => ({ ...prev, cycles: prev.cycles.map(c => ({ ...c, transactions: c.transactions.filter(t => t.id !== id) })) }));
  };

  const addDebt = (d: Omit<Debt, 'id'>) => {
    setState(prev => ({
      ...prev, cycles: prev.cycles.map(c => c.type === d.cycle ? { ...c, debts: [...c.debts, { ...d, id: uuidv4() }] } : c)
    }));
  };

  const updateDebt = (id: string, updated: Partial<Debt>) => {
      setState(prev => {
          const currentCycle = prev.cycles.find(c => c.debts.some(d => d.id === id))?.type;
          const newCycle = updated.cycle;

          if (currentCycle && newCycle && currentCycle !== newCycle) {
              let itemToMove: Debt | undefined;
              const cyclesRemoved = prev.cycles.map(c => {
                  if (c.type === currentCycle) {
                      const found = c.debts.find(d => d.id === id);
                      if (found) itemToMove = { ...found, ...updated };
                      return { ...c, debts: c.debts.filter(d => d.id !== id) };
                  }
                  return c;
              });
              if (itemToMove) {
                  return { ...prev, cycles: cyclesRemoved.map(c => c.type === newCycle ? { ...c, debts: [...c.debts, itemToMove!] } : c) };
              }
          }
          return { ...prev, cycles: prev.cycles.map(c => ({ ...c, debts: c.debts.map(d => d.id === id ? { ...d, ...updated } : d) })) };
      });
  };

  const deleteDebt = (id: string) => {
    setState(prev => ({ ...prev, cycles: prev.cycles.map(c => ({ ...c, debts: c.debts.filter(d => d.id !== id) })) }));
  };

  const switchCycle = (id: string) => {
      setState(prev => {
          let item: Debt | undefined;
          let currentCycleType: string = '';
          prev.cycles.forEach(c => { const f = c.debts.find(d => d.id === id); if (f) { item = f; currentCycleType = c.type; } });
          if (!item) return prev;

          if (currentCycleType === 'day_20') {
              const currentMonthIdx = MONTHS_FULL.indexOf(item.billingMonth || '');
              const nextMonth = MONTHS_FULL[(currentMonthIdx + 1) % 12];
              return { ...prev, cycles: prev.cycles.map(c => {
                  if (c.type === 'day_20') return { ...c, debts: c.debts.filter(d => d.id !== id) };
                  if (c.type === 'day_05') return { ...c, debts: [...c.debts, { ...item!, cycle: 'day_05', billingMonth: nextMonth }] };
                  return c;
              })};
          } else {
              return { ...prev, cycles: prev.cycles.map(c => {
                  if (c.type === 'day_05') return { ...c, debts: c.debts.filter(d => d.id !== id) };
                  if (c.type === 'day_20') return { ...c, debts: [...c.debts, { ...item!, cycle: 'day_20' }] };
                  return c;
              })};
          }
      });
  };

  const addBatchedTransactions = (transactions: ImportedTransaction[]) => {
    setState(prev => {
        const newCycles = [...prev.cycles];
        const currentMonthName = MONTHS_FULL[new Date().getMonth()];
        const { salaryDay, advanceDay, hasAdvance } = prev.settings;

        transactions.forEach(t => {
            const day = parseInt(t.date.split('/')[0]) || 1;
            let targetType: 'day_05' | 'day_20' = 'day_05';
            if (hasAdvance) {
                const distSalary = Math.abs(day - salaryDay);
                const distAdvance = Math.abs(day - advanceDay);
                if (distAdvance < distSalary) targetType = 'day_20';
            }
            const idx = newCycles.findIndex(c => c.type === targetType);
            
            // Auto-aprendizado na confirmação também (garantia)
            if(t.sender && t.category) {
                const key = t.sender.toLowerCase().trim();
                prev.categoryMappings[key] = t.category;
            }

            if (t.type === 'income') {
                newCycles[idx].transactions.push({
                    id: uuidv4(), description: t.description, amount: Math.abs(t.amount),
                    type: 'income', category: t.category || 'Salário', date: t.date, isFixed: false, cycle: targetType
                });
            } else {
                const isInst = !!t.installments;
                const finalName = t.sender ? t.sender : t.description; // Prefere Sender limpo
                newCycles[idx].debts.push({
                    id: uuidv4(), name: finalName, 
                    totalAmount: Math.abs(t.amount) * (isInst ? t.installments!.total : 1),
                    installmentAmount: Math.abs(t.amount), dueDate: t.date, purchaseDate: t.date,
                    currentInstallment: isInst ? t.installments!.current : 1,
                    totalInstallments: isInst ? t.installments!.total : 1,
                    isFixed: false, billingMonth: currentMonthName, cycle: targetType, 
                    category: t.category || 'Outros', paymentMethod: t.description.includes('Pix') ? 'Pix' : 'Cartão'
                });
            }
        });
        return { ...prev, cycles: newCycles, categoryMappings: prev.categoryMappings };
    });
  };

  const clearDatabase = (range: 'all') => {
      if (range === 'all') setState({ ...initialState, settings: state.settings, categories: state.categories, categoryMappings: state.categoryMappings });
  };

  return (
    <FinancialContext.Provider value={{ state, updateSettings, addCategory, updateCategory, removeCategory, addTransaction, updateTransaction, deleteTransaction, addDebt, addBatchedTransactions, updateDebt, deleteDebt, switchCycle, learnCategory, clearDatabase }}>
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancials = () => {
  const ctx = useContext(FinancialContext);
  if (!ctx) throw new Error('useFinancials must be used within FinancialProvider');
  return ctx;
};