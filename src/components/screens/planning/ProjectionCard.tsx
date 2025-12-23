// src/components/screens/planning/ProjectionCard.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrencyBRL } from '@/lib/utils';
import { Debt, Transaction, Category } from '../../../types';
import { DonutChart } from './DonutChart';
import { ChevronsUpDown, PlusCircle, XCircle } from 'lucide-react';
import { useFinancials } from '../../../context/FinancialContext';
import { toast } from 'sonner';

// --- Sub-component for Quick Add ---
const QuickAddForm = ({ month, year }: { month: string, year: number }) => {
    const { addProjectedDebt, categories } = useFinancials();
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [day, setDay] = useState('');

    const handleQuickAdd = () => {
        const numAmount = parseFloat(amount);
        const numDay = parseInt(day);

        if(!name || isNaN(numAmount) || isNaN(numDay) || numDay < 1 || numDay > 31) {
            return toast.error("Preencha todos os campos para a previsão.");
        }
        
        const monthIndex = MONTHS_FULL.findIndex(m => m === month);
        const fullDate = `${String(numDay).padStart(2,'0')}/${String(monthIndex + 1).padStart(2,'0')}/${year}`;

        addProjectedDebt({
            name,
            installmentAmount: numAmount,
            totalAmount: numAmount,
            dueDate: fullDate,
            purchaseDate: fullDate, // Assume purchase and due are same for one-off
            currentInstallment: 1,
            totalInstallments: 1,
            isFixed: false,
            category: 'cat-expense-99', // Default "Outros"
        });

        toast.success(`Previsão "${name}" adicionada para ${month}.`);
        setName('');
        setAmount('');
        setDay('');
    };

    return (
         <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Adicionar Previsão Avulsa</p>
            <div className="flex gap-2 items-center">
                <Input placeholder="Ex: IPVA" value={name} onChange={e => setName(e.target.value)} className="flex-grow"/>
                <Input type="number" placeholder="Valor" value={amount} onChange={e => setAmount(e.target.value)} className="w-28"/>
                <Input type="number" placeholder="Dia" value={day} onChange={e => setDay(e.target.value)} className="w-20"/>
                <Button size="icon" onClick={handleQuickAdd}><PlusCircle className="h-4 w-4"/></Button>
            </div>
        </div>
    )
}


// --- Main Projection Card Component ---
interface ProjectionMonth {
    month: string;
    year: number;
    incomes: Transaction[];
    debts: Debt[];
    finalBalance: number;
}

interface ProjectionCardProps {
    projection: ProjectionMonth;
    categories: Category[];
}

export const ProjectionCard = ({ projection, categories }: ProjectionCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const { month, year, incomes, debts, finalBalance } = projection;

    const totalIncome = useMemo(() => incomes.reduce((acc, t) => acc + t.amount, 0), [incomes]);
    const totalDebt = useMemo(() => debts.reduce((acc, d) => acc + d.installmentAmount, 0), [debts]);
    
    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || 'Outros';

    const filteredDebts = useMemo(() => {
        if (!selectedCategory) return debts;
        return debts.filter(d => getCategoryName(d.category!) === selectedCategory);
    }, [selectedCategory, debts, categories]);

    return (
        <Card className={`transition-all duration-300 shadow-lg ${isExpanded ? 'col-span-1 md:col-span-2 lg:col-span-3 bg-slate-50' : ''}`}>
            <CardHeader 
                className="cursor-pointer hover:bg-slate-100"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <CardTitle className="flex justify-between items-center">
                    <span className="text-purple-700 font-bold">{month}/{year}</span>
                    <ChevronsUpDown className="h-5 w-5 text-purple-700" />
                </CardTitle>
            </CardHeader>
            
            {!isExpanded && (
                <CardContent className="text-center">
                    <p className="text-sm text-slate-500">Saldo Final Previsto</p>
                    <p className={`text-4xl font-bold ${finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrencyBRL(finalBalance)}
                    </p>
                    <div className="flex justify-between text-xs text-slate-500 mt-4">
                        <span>Entradas: {formatCurrencyBRL(totalIncome)}</span>
                        <span>Saídas: {formatCurrencyBRL(totalDebt)}</span>
                    </div>
                </CardContent>
            )}

            {isExpanded && (
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-center">Distribuição de Despesas</h3>
                            <DonutChart debts={debts} categories={categories} onSliceClick={setSelectedCategory} />
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold">Itens do Mês</h3>
                                {selectedCategory && (
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)} className="text-xs">
                                        <XCircle className="mr-1 h-4 w-4"/> Limpar Filtro ({selectedCategory})
                                    </Button>
                                )}
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-2 p-2 bg-white rounded border">
                                {incomes.map(i => <div key={i.id} className="flex justify-between text-sm"><span>{i.description}</span><span className="font-medium text-green-600">{formatCurrencyBRL(i.amount)}</span></div>)}
                                <hr/>
                                {filteredDebts.map(d => <div key={d.id} className="flex justify-between text-sm"><span>{d.name}</span><span className="font-medium text-red-600">{formatCurrencyBRL(d.installmentAmount * -1)}</span></div>)}
                                {filteredDebts.length === 0 && <p className="text-slate-500 text-center text-sm">Nenhuma despesa para a categoria selecionada.</p>}
                            </div>
                        </div>
                    </div>
                    <QuickAddForm month={month} year={year} />
                </CardContent>
            )}
        </Card>
    );
};