import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { Transaction, Debt } from '@/types';
import { MONTHS_FULL } from '@/lib/constants';
import { parseMoney, formatMoney } from '@/lib/utils';
import { useFinancials } from '@/context/FinancialContext';

interface EditDebtModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Transaction | Debt | null;
    type: 'debt' | 'income';
    onSave: (updatedItem: any) => void;
}

export const EditDebtModal: React.FC<EditDebtModalProps> = ({ isOpen, onClose, item, type, onSave }) => {
    const { state } = useFinancials();

    // Local State
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState('');
    const [cycle, setCycle] = useState('day_05');
    const [method, setMethod] = useState('');

    // Flags
    const [isFixed, setIsFixed] = useState(false);
    const [isInstallment, setIsInstallment] = useState(false);

    // Installment specifics
    const [instCount, setInstCount] = useState('1');
    const [instVal, setInstVal] = useState('');
    const [billingMonth, setBillingMonth] = useState('');
    const [currentInst, setCurrentInst] = useState('1');

    useEffect(() => {
        if (isOpen && item) {
            if (type === 'debt') {
                const d = item as Debt;
                setName(d.name);
                setAmount(formatMoney(d.totalAmount));
                setCategory(d.category || 'Outros');
                setDate(d.dueDate || d.purchaseDate || '');
                setCycle(d.cycle);
                setMethod(d.paymentMethod || 'Cartão');
                setIsFixed(!!d.isFixed);

                const isInst = (d.totalInstallments > 1);
                setIsInstallment(isInst);
                if (isInst) {
                    setInstCount(d.totalInstallments.toString());
                    setInstVal(formatMoney(d.installmentAmount));
                    setCurrentInst(d.currentInstallment.toString());
                    setBillingMonth(d.billingMonth || MONTHS_FULL[new Date().getMonth()]);
                } else {
                    setInstVal(formatMoney(d.installmentAmount));
                    setInstCount('1');
                    setCurrentInst('1');
                }
            } else {
                const t = item as Transaction;
                setName(t.description);
                setAmount(formatMoney(t.amount));
                setIsFixed(!!t.isFixed);
                setCategory(t.category);
                setDate(t.date);
                setCycle(t.cycle);
                setIsInstallment(false);
            }
        }
    }, [isOpen, item, type]);

    const handleMoneyChange = (setter: any) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '');
        if(!raw) return setter('');
        const val = parseInt(raw) / 100;
        setter(val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    };

    // Auto Calculate Total
    useEffect(() => {
        if (isInstallment && instVal && instCount) {
            const val = parseMoney(instVal);
            const count = parseInt(instCount);
            if (val > 0 && count > 0) {
                setAmount(formatMoney(val * count));
            }
        }
    }, [instVal, instCount, isInstallment]);

    const handleSave = () => {
        const finalAmount = parseMoney(amount);
        if (!name || finalAmount <= 0) return;

        const updated: any = { ...item };

        if (type === 'debt') {
            updated.name = name;
            updated.totalAmount = finalAmount;
            updated.category = category;
            updated.dueDate = date;
            updated.cycle = cycle;
            updated.paymentMethod = method;
            updated.isFixed = isFixed;

            if (isInstallment) {
                updated.totalInstallments = parseInt(instCount);
                updated.currentInstallment = parseInt(currentInst);
                updated.installmentAmount = parseMoney(instVal);
                updated.billingMonth = billingMonth;
            } else {
                updated.totalInstallments = 1;
                updated.currentInstallment = 1;
                updated.installmentAmount = finalAmount;
            }

            if (updated.name && updated.category && updated.installmentAmount > 0) {
                updated.needsReview = false;
            }
        } else {
            updated.description = name;
            updated.amount = finalAmount;
            updated.isFixed = isFixed;
            updated.category = category;
            updated.date = date;
            updated.cycle = cycle;

            if (updated.description && updated.category && updated.amount > 0) {
                updated.needsReview = false;
            }
        }

        onSave(updated);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-50">
            <Card className="w-full max-w-md bg-white shadow-2xl animate-in zoom-in-95">
                <CardHeader className="flex flex-row justify-between pb-2 border-b">
                    <CardTitle>Editar {type === 'debt' ? 'Conta' : 'Renda'}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    {/* Layout matches New Entry Card */}

                    {/* Row 1: Name | Total (Auto/Blocked if installment) */}
                    <div className="flex flex-col md:flex-row gap-3 items-end">
                        <div className="w-full">
                            <Label className="text-xs font-bold text-slate-500 mb-1 block">DESCRIÇÃO</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome" />
                        </div>
                        <div className="w-full md:w-40">
                            <Label className="text-xs font-bold text-slate-500 mb-1 block">TOTAL</Label>
                            <Input
                                value={amount}
                                onChange={handleMoneyChange(setAmount)}
                                className={`font-bold text-slate-700 ${isInstallment ? 'bg-slate-100' : ''}`}
                                disabled={isInstallment}
                            />
                        </div>
                    </div>

                    {/* Row 2: Date | Category */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-[10px] font-bold text-slate-500 mb-1 block">{isFixed ? 'DATA DE PAGAMENTO' : 'DATA DE COMPRA'}</Label>
                            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-[10px] font-bold text-slate-500 mb-1 block">CATEGORIA</Label>
                            <select className="w-full h-10 border rounded bg-white px-2 text-sm" value={category} onChange={e => setCategory(e.target.value)}>
                                {state.categories.filter(c => c.type === (type === 'debt' ? 'expense' : 'income')).map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 3: Toggles */}
                    <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2 rounded border">
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isFixed}
                                onChange={e => {
                                    setIsFixed(e.target.checked);
                                    if (e.target.checked) setIsInstallment(false);
                                }}
                                className="w-4 h-4 accent-blue-600"
                            />
                            Fixa?
                        </label>

                        {type === 'debt' && (
                            <>
                                <div className="w-px h-4 bg-slate-300"></div>
                                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isInstallment}
                                        onChange={e => {
                                            setIsInstallment(e.target.checked);
                                            if (e.target.checked) setIsFixed(false);
                                        }}
                                        className="w-4 h-4 accent-blue-600"
                                    />
                                    Parcelada?
                                </label>
                            </>
                        )}
                    </div>

                    {/* Row 4: Method | Cycle */}
                    {type === 'debt' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-[10px] font-bold text-slate-500 mb-1 block">MÉTODO</Label>
                                <select className="w-full h-10 border rounded bg-white px-2 text-sm" value={method} onChange={e => setMethod(e.target.value)}>
                                    <option value="Cartão">Cartão</option>
                                    <option value="Pix">Pix</option>
                                    <option value="Boleto">Boleto</option>
                                </select>
                            </div>
                            {state.settings.hasAdvance && (
                                <div>
                                    <Label className="text-[10px] font-bold text-slate-500 mb-1 block">CICLO</Label>
                                    <select className="w-full h-10 border rounded bg-white px-2 text-sm" value={cycle} onChange={e => setCycle(e.target.value as any)}>
                                        <option value="day_05">Dia {state.settings.salaryDay}</option>
                                        <option value="day_20">Dia {state.settings.advanceDay}</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Conditional Installment Row: Qtd Parc | Valor Parc | 1a Fatura */}
                    {isInstallment && (
                        <div className="grid grid-cols-3 gap-2 bg-blue-50 p-2 rounded animate-in slide-in-from-top-2">
                            <div>
                                <Label className="text-[10px] font-bold text-slate-500 mb-1 block">QTD PARC.</Label>
                                <Input type="number" value={instCount} onChange={e => setInstCount(e.target.value)} className="h-8 text-xs bg-white" />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold text-slate-500 mb-1 block">VALOR PARC.</Label>
                                <Input value={instVal} onChange={handleMoneyChange(setInstVal)} className="h-8 text-xs bg-white font-bold" />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold text-slate-500 mb-1 block">1ª FATURA</Label>
                                <select className="h-8 w-full text-xs border rounded bg-white px-1" value={billingMonth} onChange={e => setBillingMonth(e.target.value)}>
                                    {MONTHS_FULL.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    <Button className="w-full bg-blue-600 hover:bg-blue-700 mt-2" onClick={handleSave}>Salvar Alterações</Button>
                </CardContent>
            </Card>
        </div>
    );
};
