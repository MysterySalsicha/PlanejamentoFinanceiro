// src/components/modals/SettingsModal.tsx
'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { useFinancials } from '../../context/FinancialContext';
import { UserSettings, Category } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, PlusCircle, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal = ({ onClose }: SettingsModalProps) => {
  const { state, updateSettings, addCategory, deleteCategory } = useFinancials();
  
  const [settings, setSettings] = useState<UserSettings>(state.settings);
  const [newCategory, setNewCategory] = useState({ name: '', type: 'expense' as 'income' | 'expense' });

  const handleSave = () => {
    updateSettings(settings);
    toast.success('Configurações salvas com sucesso!');
    onClose();
  };

  const handleAddCategory = () => {
    if (newCategory.name.trim()) {
      addCategory(newCategory.name, newCategory.type);
      setNewCategory({ name: '', type: 'expense' });
      toast.success(`Categoria "${newCategory.name}" adicionada.`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Configurações do Sistema
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8 max-h-[80vh] overflow-y-auto">
          {/* Seção de Ciclos */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold text-lg">Ciclos de Pagamento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Dia do Pagamento Principal</Label>
                <Input 
                  type="number" 
                  value={settings.salaryDay}
                  onChange={(e) => setSettings(s => ({ ...s, salaryDay: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                 <input
                    type="checkbox"
                    id="hasAdvance"
                    className="h-4 w-4"
                    checked={settings.hasAdvance}
                    onChange={(e) => setSettings(s => ({ ...s, hasAdvance: e.target.checked }))}
                />
                <Label htmlFor="hasAdvance">Recebe Adiantamento/Vale?</Label>
              </div>
            </div>
            {settings.hasAdvance && (
              <div className="pt-2">
                <Label>Dia do Adiantamento/Vale</Label>
                <Input 
                  type="number" 
                  value={settings.advanceDay}
                  onChange={(e) => setSettings(s => ({ ...s, advanceDay: parseInt(e.target.value) || 1 }))}
                />
              </div>
            )}
          </div>

          {/* Seção de Categorias */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold text-lg">Gerenciar Categorias</h3>
            <div className="flex gap-2">
              <Input 
                placeholder="Nome da nova categoria" 
                value={newCategory.name}
                onChange={(e) => setNewCategory(nc => ({ ...nc, name: e.target.value }))}
              />
              <select 
                value={newCategory.type} 
                onChange={(e) => setNewCategory(nc => ({ ...nc, type: e.target.value as 'income' | 'expense' }))}
                className="p-2 border rounded-md"
              >
                <option value="expense">Despesa</option>
                <option value="income">Renda</option>
              </select>
              <Button onClick={handleAddCategory}><PlusCircle className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
                <p className="text-sm font-medium">Categorias de Renda</p>
                <div className="flex flex-wrap gap-2">
                    {state.categories.filter(c => c.type === 'income').map(cat => (
                        <span key={cat.id} className="flex items-center gap-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {cat.name}
                            <button onClick={() => deleteCategory(cat.id)}><X className="h-3 w-3" /></button>
                        </span>
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                <p className="text-sm font-medium">Categorias de Despesa</p>
                <div className="flex flex-wrap gap-2">
                    {state.categories.filter(c => c.type === 'expense').map(cat => (
                        <span key={cat.id} className="flex items-center gap-2 bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {cat.name}
                            <button onClick={() => deleteCategory(cat.id)}><X className="h-3 w-3" /></button>
                        </span>
                    ))}
                </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button size="lg" onClick={handleSave}>
              Salvar e Atualizar Tudo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
