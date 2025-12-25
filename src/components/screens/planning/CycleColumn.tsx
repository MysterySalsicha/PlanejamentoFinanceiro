// src/components/screens/planning/CycleColumn.tsx
'use client';

import React, { useState } from 'react';
import { Debt, Transaction, Category } from '../../../types';
import { CycleSummaryCard } from './CycleSummaryCard';
import { formatCurrencyBRL } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ArrowRightLeft, GitCommitHorizontal } from 'lucide-react';
import { PartialPayModal } from '../../modals/PartialPayModal';
import { useFinancials } from '../../../context/FinancialContext';


interface CycleColumnProps {
    cycle: {
        id: string;
        type: 'day_05' | 'day_20';
        transactions: Transaction[];
        debts: Debt[];
    };
    title: string;
    cycleColor: 'blue' | 'green';
    categories: Category[];
    onEditDebt: (debt: Debt) => void;
    onDeleteDebt: (id: string) => void;
    onMoveDebt: (debt: Debt) => void;
}

export const CycleColumn = ({ cycle, title, cycleColor, categories, onEditDebt, onDeleteDebt, onMoveDebt }: CycleColumnProps) => {
    const { payPartialDebt } = useFinancials();
    const getCategoryName = (id?: string) => categories.find(c => c.id === id)?.name || 'N/A';
    const incomes = cycle.transactions.filter(t => t.type === 'income');
    const [splittingDebt, setSplittingDebt] = useState<Debt | null>(null);

    return (
        <>
            {splittingDebt && (
                <PartialPayModal 
                    debt={splittingDebt}
                    onClose={() => setSplittingDebt(null)}
                    onSave={payPartialDebt}
                />
            )}
            <div className="space-y-4">
                <CycleSummaryCard 
                    title={title}
                    incomes={incomes}
                    debts={cycle.debts}
                    cycleColor={cycleColor}
                />
                
                {/* Lista de Dívidas Responsiva */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-3 bg-slate-50 hidden md:grid grid-cols-4 gap-4 text-left font-semibold text-slate-600 text-sm">
                        <div className="col-span-2">Descrição</div>
                        <div className="text-right">Valor</div>
                        <div className="text-center">Ações</div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {cycle.debts.length === 0 && <p className="text-center p-4 text-slate-500 text-sm">Nenhuma dívida neste ciclo.</p>}
                        {cycle.debts.map(debt => (
                            <div key={debt.id} className="p-3 grid grid-cols-3 md:grid-cols-4 gap-2 items-center text-sm">
                                <div className="col-span-3 md:col-span-2">
                                    <p className="font-medium text-slate-800">{debt.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{getCategoryName(debt.category)}</span>
                                        <span>Vence dia {debt.dueDate}{debt.totalInstallments > 1 && ` | ${debt.currentInstallment}/${debt.totalInstallments}`}</span>
                                    </div>
                                </div>
                                <div className="text-right font-semibold text-red-600 md:col-start-3">
                                    {formatCurrencyBRL(debt.installmentAmount * -1)}
                                </div>
                                <div className="col-span-3 md:col-span-1 md:col-start-4 flex justify-end md:justify-center gap-1">
                                    <Button size="icon" variant="ghost" onClick={() => setSplittingDebt(debt)}><GitCommitHorizontal className="h-4 w-4 text-slate-500"/></Button>
                                    <Button size="icon" variant="ghost" onClick={() => onMoveDebt(debt)}><ArrowRightLeft className="h-4 w-4 text-slate-500"/></Button>
                                    <Button size="icon" variant="ghost" onClick={() => onEditDebt(debt)}><Edit className="h-4 w-4 text-slate-500"/></Button>
                                    <Button size="icon" variant="ghost" onClick={() => onDeleteDebt(debt.id)}><Trash2 className="h-4 w-4 text-slate-500"/></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Lista de Rendas Responsiva */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-3 bg-slate-50 hidden md:grid grid-cols-3 gap-4 text-left font-semibold text-slate-600 text-sm">
                        <div>Descrição</div>
                        <div>Categoria</div>
                        <div className="text-right">Valor</div>
                    </div>
                     <div className="divide-y divide-slate-100">
                        {incomes.length === 0 && <p className="text-center p-4 text-slate-500 text-sm">Nenhuma renda neste ciclo.</p>}
                        {incomes.map(income => (
                            <div key={income.id} className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2 items-center text-sm">
                                <div className="col-span-2 md:col-span-1">
                                    <p className="font-medium text-slate-800">{income.description}</p>
                                    <p className="text-xs text-slate-500">{income.isFixed ? 'Renda Fixa' : 'Renda Pontual'}</p>
                                </div>
                                <div className="hidden md:block">
                                    <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded-full">{getCategoryName(income.category)}</span>
                                </div>
                                <div className="text-right font-semibold text-green-600">
                                    {formatCurrencyBRL(income.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};
