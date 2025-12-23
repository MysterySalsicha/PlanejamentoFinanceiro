// src/components/screens/planning/CycleColumn.tsx
'use client';

import React from 'react';
import { Debt, Transaction, Category } from '../../../types';
import { CycleSummaryCard } from './CycleSummaryCard';
import { DonutChart } from './DonutChart';
import { formatCurrencyBRL } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ArrowRightLeft } from 'lucide-react';

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

const getCategoryIcon = (categoryName?: string) => {
    if (categoryName?.includes('Moradia')) return '🏠';
    if (categoryName?.includes('Alimentação')) return '🍔';
    if (categoryName?.includes('Transporte')) return '🚗';
    if (categoryName?.includes('Salário')) return '💰';
    return '🛒';
}

export const CycleColumn = ({ cycle, title, cycleColor, categories, onEditDebt, onDeleteDebt, onMoveDebt }: CycleColumnProps) => {
    const getCategoryName = (id?: string) => categories.find(c => c.id === id)?.name || 'N/A';
    const incomes = cycle.transactions.filter(t => t.type === 'income');

    return (
        <div className="space-y-4">
            <CycleSummaryCard 
                title={title}
                incomes={incomes}
                debts={cycle.debts}
                cycleColor={cycleColor}
            />
            
            {/* Tabela de Dívidas */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-3 text-left font-semibold text-slate-600">Descrição</th>
                            <th className="p-3 text-left font-semibold text-slate-600">Categoria</th>
                            <th className="p-3 text-right font-semibold text-slate-600">Valor</th>
                            <th className="p-3 text-center font-semibold text-slate-600 w-28">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cycle.debts.length === 0 && <tr><td colSpan={4} className="text-center p-4 text-slate-500">Nenhuma dívida neste ciclo.</td></tr>}
                        {cycle.debts.map(debt => (
                            <tr key={debt.id} className="border-t">
                                <td className="p-3">
                                    <p className="font-medium text-slate-800">{debt.name}</p>
                                    <p className="text-xs text-slate-500">
                                        Vence dia {debt.dueDate}
                                        {debt.totalInstallments > 1 && ` | ${debt.currentInstallment}/${debt.totalInstallments}`}
                                    </p>
                                </td>
                                <td className="p-3">
                                    <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded-full">{getCategoryName(debt.category)}</span>
                                </td>
                                <td className="p-3 text-right font-semibold text-red-600">{formatCurrencyBRL(debt.installmentAmount * -1)}</td>
                                <td className="p-3 text-center">
                                    <div className="flex justify-center gap-1">
                                        <Button size="icon" variant="ghost" onClick={() => onMoveDebt(debt)}><ArrowRightLeft className="h-4 w-4 text-slate-500"/></Button>
                                        <Button size="icon" variant="ghost" onClick={() => onEditDebt(debt)}><Edit className="h-4 w-4 text-slate-500"/></Button>
                                        <Button size="icon" variant="ghost" onClick={() => onDeleteDebt(debt.id)}><Trash2 className="h-4 w-4 text-slate-500"/></Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Tabela de Rendas */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="p-3 text-left font-semibold text-slate-600">Descrição</th>
                            <th className="p-3 text-left font-semibold text-slate-600">Categoria</th>
                            <th className="p-3 text-right font-semibold text-slate-600">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {incomes.length === 0 && <tr><td colSpan={3} className="text-center p-4 text-slate-500">Nenhuma renda neste ciclo.</td></tr>}
                        {incomes.map(income => (
                            <tr key={income.id} className="border-t">
                                <td className="p-3">
                                    <p className="font-medium text-slate-800">{income.description}</p>
                                    <p className="text-xs text-slate-500">{income.isFixed ? 'Renda Fixa' : 'Renda Pontual'}</p>
                                </td>
                                <td className="p-3">
                                    <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded-full">{getCategoryName(income.category)}</span>
                                </td>
                                <td className="p-3 text-right font-semibold text-green-600">{formatCurrencyBRL(income.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
