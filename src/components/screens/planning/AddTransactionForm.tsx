// src/components/screens/planning/AddTransactionForm.tsx
'use client';

import { useState, useMemo } from 'react';
import { useFinancials } from '../../../context/FinancialContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrencyBRL } from '@/lib/utils';

type FormType = 'income' | 'debt';

export const AddTransactionForm = () => {
    const { addTransaction, addDebt, state } = useFinancials();
    const [formType, setFormType] = useState<FormType>('debt');
    
    // Common fields
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [cycle, setCycle] = useState<'day_05' | 'day_20'>('day_05');
    const [category, setCategory] = useState('');

    // Debt specific fields
    const [debtType, setDebtType] = useState<'onetime' | 'fixed' | 'installment'>('onetime');
    const [dueDate, setDueDate] = useState('');
    const [installments, setInstallments] = useState('');
    const [firstBillDate, setFirstBillDate] = useState('');

    const totalValue = useMemo(() => {
        const numAmount = parseFloat(amount);
        const numInstallments = parseInt(installments);
        if (debtType === 'installment' && !isNaN(numAmount) && !isNaN(numInstallments)) {
            return numAmount * numInstallments;
        }
        return null;
    }, [amount, installments, debtType]);

    const resetForm = () => {
        setName(''); setAmount(''); setCategory(''); setDueDate(''); setInstallments(''); setFirstBillDate('');
    };

    const handleSubmit = () => {
        const numAmount = parseFloat(amount);
        if (!name || isNaN(numAmount) || !category) return toast.error("Preencha Nome, Valor e Categoria.");

        const today = new Date();
        const todayStr = today.toLocaleDateString('pt-BR');

        if (formType === 'income') {
            addTransaction({ description: name, amount: numAmount, type: 'income', category, date: todayStr, isFixed: debtType === 'fixed' }, cycle);
            toast.success(`Renda "${name}" adicionada!`);
        } else {
            const dueDay = parseInt(dueDate);
            if (!dueDay || dueDay < 1 || dueDay > 31) return toast.error("Preencha um dia de vencimento válido (1-31).");
            
            const fullDueDate = `${String(dueDay).padStart(2,'0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

            addDebt({
                name,
                installmentAmount: numAmount,
                totalAmount: totalValue || numAmount,
                dueDate: fullDueDate,
                purchaseDate: todayStr,
                firstBillDate: debtType === 'installment' ? firstBillDate : undefined,
                currentInstallment: 1,
                totalInstallments: debtType === 'installment' && installments ? parseInt(installments) : 1,
                isFixed: debtType === 'fixed',
                category,
            }, cycle);
            toast.success(`Dívida "${name}" adicionada!`);
        }
        resetForm();
    };
    
    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex bg-slate-100 rounded-lg p-1 mb-4">
                    <Button onClick={() => setFormType('debt')} className={`w-1/2 ${formType === 'debt' ? 'bg-white shadow' : 'bg-transparent text-slate-600'}`} variant="ghost"><Minus className="mr-2 h-4 w-4 text-red-500"/>Adicionar Dívida</Button>
                    <Button onClick={() => setFormType('income')} className={`w-1/2 ${formType === 'income' ? 'bg-white shadow' : 'bg-transparent text-slate-600'}`} variant="ghost"><Plus className="mr-2 h-4 w-4 text-green-500"/>Adicionar Renda</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2"><Label>Descrição</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder={formType === 'debt' ? "Ex: Fatura Nubank" : "Ex: Freelance"}/></div>
                    <div><Label>{formType === 'debt' ? 'Valor da Parcela' : 'Valor'}</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="150,00"/></div>
                </div>

                {formType === 'debt' && (
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                        <div>
                            <Label>Tipo de Dívida</Label>
                            <select value={debtType} onChange={e => setDebtType(e.target.value as any)} className="w-full p-2 border rounded-md">
                                <option value="onetime">Pontual</option>
                                <option value="fixed">Fixa (Mensal)</option>
                                <option value="installment">Parcelada</option>
                            </select>
                        </div>
                        <div><Label>Vencimento (Dia)</Label><Input type="number" value={dueDate} onChange={e => setDueDate(e.target.value)} placeholder="Ex: 10"/></div>
                        
                        {debtType === 'installment' && (
                            <>
                                <div><Label>Qtd. Parcelas</Label><Input type="number" value={installments} onChange={e => setInstallments(e.target.value)} placeholder="12"/></div>
                                <div><Label>1ª Fatura (MM/AAAA)</Label><Input value={firstBillDate} onChange={e => setFirstBillDate(e.target.value)} placeholder="Ex: 02/2026"/></div>
                                {totalValue && <div className="md:col-span-4 mt-2"><Label>Valor Total Calculado</Label><Input value={formatCurrencyBRL(totalValue)} disabled className="bg-slate-100 font-bold"/></div>}
                            </>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                     <div>
                        <Label>Categoria</Label>
                        <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2 border rounded-md">
                            <option value="">Selecione...</option>
                            {state.categories.filter(c => c.type === formType).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    {state.settings.hasAdvance && (
                         <div>
                            <Label>Pagar com</Label>
                            <select value={cycle} onChange={e => setCycle(e.target.value as any)} className="w-full p-2 border rounded-md">
                                <option value="day_05">Ciclo Salário (Dia {state.settings.salaryDay})</option>
                                <option value="day_20">Ciclo Vale (Dia {state.settings.advanceDay})</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSubmit} size="lg">Adicionar Lançamento</Button>
                </div>
            </CardContent>
        </Card>
    );
};
