import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { toast } from 'sonner';
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
    onDeleteDebt: (id: string) => void;
    onDeleteTransaction: (id: string) => void;
}

export const EditDebtModal: React.FC<EditDebtModalProps> = ({ isOpen, onClose, item, type, onSave, onDeleteDebt, onDeleteTransaction }) => {
    const { state } = useFinancials();

    // Local State
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [purchaseDate, setPurchaseDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [paymentDate, setPaymentDate] = useState('');
    const [cycle, setCycle] = useState('salary');
    const [method, setMethod] = useState('');

    // Flags
    const [isFixed, setIsFixed] = useState(false);
    const [isInstallment, setIsInstallment] = useState(false);
    const [isPaid, setIsPaid] = useState(false);

    // Installment specifics
    const [instCount, setInstCount] = useState('1');
    const [instVal, setInstVal] = useState('');
    const [billingMonth, setBillingMonth] = useState('');
    const [currentInst, setCurrentInst] = useState('1');

    // Confirmation dialog state
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    const formatDateForInput = (dateString: string | undefined | null): string => {
        if (!dateString) return '';
        if (dateString.includes('T')) {
            return dateString.split('T')[0];
        }
        if (dateString.includes('/')) {
            const parts = dateString.split('/');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }
        return '';
    };

    useEffect(() => {
        if (isOpen && item) {
            setIsPaid(!!item.isPaid);
            if (type === 'debt') {
                const d = item as Debt;
                setName(d.name);
                setAmount(formatMoney(d.totalAmount));
                setCategory(d.category || 'Outros');
                setPurchaseDate(formatDateForInput(d.purchaseDate));
                setDueDate(formatDateForInput(d.dueDate));
                if (d.isPaid) {
                    setPaymentDate(formatDateForInput(d.paymentDate));
                }
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
                setPurchaseDate(formatDateForInput(t.date));
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

        const toISOStringOrKeep = (dateStr: string) => {
            if (!dateStr || dateStr.includes('T')) return dateStr;
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    const localDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    return localDate.toISOString();
                }
            }
            return dateStr;
        };

        const updated: any = { ...item };
        updated.isPaid = isPaid;

        if (type === 'debt') {
            updated.name = name;
            updated.totalAmount = finalAmount;
            updated.category = category;
            updated.purchaseDate = toISOStringOrKeep(purchaseDate);
            updated.dueDate = toISOStringOrKeep(dueDate);
            if (isPaid) {
                updated.paymentDate = toISOStringOrKeep(paymentDate);
            }
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
            updated.date = toISOStringOrKeep(purchaseDate);
            updated.cycle = cycle;

            if (updated.description && updated.category && updated.amount > 0) {
                updated.needsReview = false;
            }
        }

        onSave(updated);
        onClose();
    };

    const confirmDelete = () => {
        if (!item) return;
        if (type === 'debt') {
            onDeleteDebt(item.id);
        } else {
            onDeleteTransaction(item.id);
        }
        toast.success("Item excluído!");
        setShowConfirmDelete(false); // Hide the confirmation dialog
        onClose(); // Close the main edit modal
    };

    const handleDelete = () => {
        setShowConfirmDelete(true); // Open custom confirmation dialog
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
                    {/* Row 1: Name | Total */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-1">
                            <Label className="text-xs font-bold text-slate-500 mb-1 block">DESCRIÇÃO</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Nome" />
                        </div>
                        <div className="col-span-1">
                            <Label className="text-[10px] font-bold text-slate-500 mb-1 block">TOTAL</Label>
                            <Input value={amount} onChange={handleMoneyChange(setAmount)} className="font-bold text-slate-700" disabled={isInstallment} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-[10px] font-bold text-slate-500 mb-1 block">DATA DE COMPRA</Label>
                            <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-[10px] font-bold text-slate-500 mb-1 block">DATA DE VENCIMENTO</Label>
                            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                        </div>
                    </div>

                    {isPaid && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-[10px] font-bold text-slate-500 mb-1 block">DATA DE PAGAMENTO</Label>
                                <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                            </div>
                        </div>
                    )}

                    {/* Row 2: Category */}
                    <div className="grid grid-cols-2 gap-3">
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
                            <input type="checkbox" checked={isFixed} onChange={e => { setIsFixed(e.target.checked); if (e.target.checked) setIsInstallment(false); }} className="w-4 h-4 accent-blue-600" /> Fixa?
                        </label>
                        {type === 'debt' && (
                            <>
                                <div className="w-px h-4 bg-slate-300"></div>
                                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={isInstallment} onChange={e => { setIsInstallment(e.target.checked); if (e.target.checked) setIsFixed(false); }} className="w-4 h-4 accent-blue-600" /> Parcelada?
                                </label>
                            </>
                        )}
                        <div className="w-px h-4 bg-slate-300"></div>
                         <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                            <input type="checkbox" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} className="w-4 h-4 accent-green-600" /> Pago/Quitado?
                        </label>
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
                                        <option value="salary">Dia {state.settings.salaryDay}</option>
                                        <option value="advance">Dia {state.settings.advanceDay}</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Conditional Installment Row */}
                    {isInstallment && (
                        <div className="grid grid-cols-3 gap-2 bg-blue-50 p-2 rounded">
                            <div>
                                <Label className="text-[10px] font-bold text-slate-500 mb-1 block">QTD PARC.</Label>
                                <Input type="number" value={instCount} onChange={e => setInstCount(e.target.value)} className="h-8 text-xs bg-white" />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold text-slate-500 mb-1 block">VALOR PARC.</Label>
                                <Input value={instVal} onChange={handleMoneyChange(setInstVal)} className="h-8 text-xs bg-white font-bold" />
                            </div>
                            <div>
                                <Label className="text-[10px] font-bold text-slate-500 mb-1 block">ATUAL</Label>
                                <Input type="number" value={currentInst} onChange={e => setCurrentInst(e.target.value)} className="h-8 text-xs bg-white" />
                            </div>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-4 border-t">
                        {item && <Button variant="destructive" onClick={handleDelete}>Excluir</Button>}
                        <Button className="flex-1 ml-2 bg-blue-600 hover:bg-blue-700" onClick={handleSave}>Salvar Alterações</Button>
                    </div>
                </CardContent>
            </Card>

            {showConfirmDelete && (
                <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/70 p-4">
                    <Card onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-white shadow-2xl animate-in zoom-in-95">
                        <CardHeader><CardTitle>Confirmar Exclusão</CardTitle></CardHeader>
                        <CardContent className="flex flex-col gap-4">
                            <p className="text-sm text-slate-600">Tem certeza que deseja excluir este item?</p>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setShowConfirmDelete(false)}>Não</Button>
                                <Button variant="destructive" onClick={confirmDelete}>Sim, Excluir</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
