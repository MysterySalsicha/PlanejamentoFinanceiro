// src/components/screens/planning/CycleSummaryCard.tsx
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencyBRL } from '@/lib/utils';
import { ArrowUpCircle, ArrowDownCircle, Banknote } from 'lucide-react';
import { Debt, Transaction } from '../../../types';

interface CycleSummaryCardProps {
    title: string;
    incomes: Transaction[];
    debts: Debt[];
    cycleColor: 'blue' | 'green';
}

export const CycleSummaryCard = ({ title, incomes, debts, cycleColor }: CycleSummaryCardProps) => {
    const totals = useMemo(() => {
        const totalIncome = incomes.reduce((acc, t) => acc + t.amount, 0);
        const totalDebt = debts.reduce((acc, d) => acc + d.installmentAmount, 0);
        const balance = totalIncome - totalDebt;
        return { totalIncome, totalDebt, balance };
    }, [incomes, debts]);
    
    const colors = {
        blue: {
            bg: 'bg-blue-600',
            text: 'text-blue-50',
            icon: 'text-blue-200'
        },
        green: {
            bg: 'bg-emerald-600',
            text: 'text-emerald-50',
            icon: 'text-emerald-200'
        }
    }
    const color = colors[cycleColor];

    return (
        <Card className={`${color.bg} ${color.text} shadow-lg`}>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ArrowUpCircle className={color.icon} />
                        <span className="font-medium">Entradas</span>
                    </div>
                    <span className="font-bold text-base md:text-lg">{formatCurrencyBRL(totals.totalIncome)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ArrowDownCircle className={color.icon} />
                        <span className="font-medium">Saídas</span>
                    </div>
                    <span className="font-bold text-base md:text-lg text-red-300">{formatCurrencyBRL(totals.totalDebt > 0 ? totals.totalDebt * -1 : 0)}</span>
                </div>
                <div className="border-t border-white/20 my-2"></div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Banknote className={color.icon} />
                        <span className="font-medium">Saldo Previsto</span>
                    </div>
                    <span className={`font-bold text-xl md:text-2xl ${totals.balance < 0 ? 'text-red-300' : ''}`}>{formatCurrencyBRL(totals.balance)}</span>
                </div>
            </CardContent>
        </Card>
    );
};