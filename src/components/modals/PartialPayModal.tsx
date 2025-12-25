// src/components/modals/PartialPayModal.tsx
'use client';

import React, { useState } from 'react';
import { Debt } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Landmark } from 'lucide-react';
import { formatCurrencyBRL } from '@/lib/utils';
import { toast } from 'sonner';

interface PartialPayModalProps {
  debt: Debt;
  onSave: (debtId: string, amount: number) => void;
  onClose: () => void;
}

export const PartialPayModal = ({ debt, onSave, onClose }: PartialPayModalProps) => {
    const [amountToPay, setAmountToPay] = useState('');

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        if (!rawValue) {
            setAmountToPay('');
            return;
        }
        const numericValue = parseInt(rawValue, 10);
        const formattedValue = (numericValue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setAmountToPay(formattedValue);
    };

    const parseAmount = (formattedAmount: string): number => {
        if (!formattedAmount) return 0;
        const numericString = formattedAmount.replace(/\./g, '').replace(',', '.');
        return parseFloat(numericString) || 0;
    };

    const handleSave = () => {
        const numericAmount = parseAmount(amountToPay);
        if (numericAmount <= 0) {
            return toast.error("Por favor, insira um valor de pagamento válido.");
        }
        if (numericAmount >= debt.installmentAmount) {
            return toast.error("O valor parcial deve ser menor que o valor total da parcela. Para pagar integralmente, use a função de exclusão.");
        }
        onSave(debt.id, numericAmount);
        toast.success(`Pagamento parcial de ${formatCurrencyBRL(numericAmount)} registrado.`);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white">
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        Pagamento Parcial
                        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center">
                        <p className="font-medium text-lg">{debt.name}</p>
                        <p className="text-slate-500">Valor Total da Parcela: <span className="font-bold text-red-600">{formatCurrencyBRL(debt.installmentAmount)}</span></p>
                    </div>
                    <div>
                        <Label htmlFor="partialAmount">Quanto você quer pagar agora?</Label>
                        <div className="relative">
                            <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="partialAmount"
                                name="partialAmount"
                                type="text"
                                inputMode="decimal"
                                placeholder="0,00"
                                value={amountToPay}
                                onChange={handleAmountChange}
                                className="pl-10 text-lg"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSave}>Dividir Dívida</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
