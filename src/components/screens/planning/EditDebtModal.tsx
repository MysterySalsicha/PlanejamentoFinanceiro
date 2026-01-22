// src/components/screens/planning/EditDebtModal.tsx
'use client';

import React, { useState } from 'react';
import { Debt, Category } from '../../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface EditDebtModalProps {
  debt: Debt;
  categories: Category[];
  onSave: (updatedFields: Partial<Debt>) => void;
  onClose: () => void;
}

export const EditDebtModal = ({ debt, categories, onSave, onClose }: EditDebtModalProps) => {
    const [editedDebt, setEditedDebt] = useState<Partial<Debt>>(debt);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEditedDebt(prev => ({ ...prev, [name]: value }));
    };

    const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditedDebt(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };
    
    const handleSaveChanges = () => {
        // We only pass the fields that have actually changed
        const changedFields: Partial<Debt> = {};
        for (const key in editedDebt) {
            if (editedDebt[key as keyof Debt] !== debt[key as keyof Debt]) {
                changedFields[key as keyof Debt] = editedDebt[key as keyof Debt] as any;
            }
        }
        
        if(Object.keys(changedFields).length === 0) {
            return toast.info("Nenhuma alteração foi feita.");
        }

        onSave(changedFields);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white">
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        Editar Dívida
                        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div><Label>Nome</Label><Input name="name" value={editedDebt.name || ''} onChange={handleChange} /></div>
                    <div><Label>Valor da Parcela</Label><Input name="installmentAmount" type="number" value={editedDebt.installmentAmount || 0} onChange={handleValueChange} /></div>
                    <div><Label>Dia do Vencimento</Label><Input name="dueDate" type="number" value={editedDebt.dueDate || ''} onChange={handleChange} /></div>
                    <div>
                        <Label>Categoria</Label>
                        <select name="category" value={editedDebt.category || ''} onChange={handleChange} className="w-full p-2 border rounded-md">
                            <option value="">Selecione...</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <Label>Ciclo de Pagamento</Label>
                        <select name="cycle" value={editedDebt.cycle || 'salary'} onChange={handleChange} className="w-full p-2 border rounded-md">
                            <option value="salary">Ciclo Salário</option>
                            <option value="advance">Ciclo Vale</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSaveChanges}>Salvar Alterações</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
