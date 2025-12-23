// src/components/screens/planning/DonutChart.tsx
'use client';

import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrencyBRL } from '@/lib/utils';
import { Debt, Category } from '../../../types';

interface DonutChartProps {
    debts: Debt[];
    categories: Category[];
    onSliceClick?: (categoryName: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4E50', '#F9D423'];

export const DonutChart = ({ debts, categories, onSliceClick }: DonutChartProps) => {
    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Outros';

    const data = useMemo(() => {
        const categoryTotals = debts.reduce((acc, debt) => {
            const categoryName = getCategoryName(debt.category!);
            acc[categoryName] = (acc[categoryName] || 0) + debt.installmentAmount;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
    }, [debts, categories]);

    if (data.length === 0) return <div className="text-center p-4 text-slate-500">Sem despesas para analisar.</div>;

    const handleSliceClick = (payload: any) => {
        if (onSliceClick && payload && payload.name) {
            onSliceClick(payload.name);
        }
    };

    return (
        <ResponsiveContainer width="100%" height={200}>
            <PieChart>
                <Pie 
                    data={data} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={50} 
                    outerRadius={80} 
                    paddingAngle={3} 
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    onClick={(data, index) => handleSliceClick(data)}
                    className="cursor-pointer"
                >
                    {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrencyBRL(value)} />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
};
