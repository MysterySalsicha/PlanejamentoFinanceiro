// src/components/modals/UniversalImporter.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFinancials } from '@/context/FinancialContext';
import { ImportedTransaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrencyBRL } from '@/lib/utils';
import { toast } from 'sonner';
import { X, Search, Trash2, CheckCircle } from 'lucide-react';
import { Input } from '../ui/input';

const SimpleParser = (text: string): ImportedTransaction[] => {
    const results: ImportedTransaction[] = [];
    const lines = text.split('\n');

    const dateRegex = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/; 
    const amountRegex = /((?:R\$\s?)?(-)?\s?\d{1,3}(?:\.\d{3})*,\d{2})/; 

    for (const line of lines) {
        if (line.trim().length < 5) continue;

        const dateMatch = line.match(dateRegex);
        const amountMatch = line.match(amountRegex);

        if (!amountMatch) continue;

        const amountStr = amountMatch[1].replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.');
        const amount = parseFloat(amountStr);
        if (isNaN(amount)) continue;

        const date = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('pt-BR');
        
        let description = line
            .replace(date, '')
            .replace(amountMatch[0], '')
            .trim();
        
        if (description.length < 2) description = "Item importado";

        results.push({
            id: Math.random().toString(36).substr(2, 9),
            date,
            description,
            sender: description,
            amount: Math.abs(amount),
            category: 'Outros',
            cycle: 'day_05',
            type: amount < 0 ? 'expense' : 'income',
        });
    }
    return results;
};

interface UniversalImporterProps {
    onClose: () => void;
}

export const UniversalImporter = ({ onClose }: UniversalImporterProps) => {
    const { addBatchedTransactions, state } = useFinancials();
    const [rawText, setRawText] = useState('');
    const [parsed, setParsed] = useState<ImportedTransaction[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [detectedBank, setDetectedBank] = useState<string | null>(null);

    useEffect(() => {
        const text = rawText.toLowerCase();
        if (text.includes('bradesco')) {
            setDetectedBank('Bradesco');
        } else if (text.includes('nubank') || text.includes('nu pagamentos')) {
            setDetectedBank('Nubank');
        } else {
            setDetectedBank(null);
        }
    }, [rawText]);

    const handleParse = async () => {
        setIsProcessing(true);
        try {
            // Simula um pequeno atraso para o feedback ser visível
            await new Promise(resolve => setTimeout(resolve, 50)); 
            const results = SimpleParser(rawText);
            setParsed(results);
            if (results.length > 0) {
                toast.success(`${results.length} itens encontrados!`);
            } else {
                toast.error("Nenhum item válido encontrado. Tente o formato: [Data] [Descrição] [Valor]");
            }
        } finally {
            setIsProcessing(false);
        }
    };
    
    const updateItem = (id: string, field: keyof ImportedTransaction, value: any) => {
      setParsed(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const removeItem = (id: string) => {
        setParsed(prev => prev.filter(p => p.id !== id));
    };

    const handleConfirm = () => {
        if(parsed.length === 0) return;
        addBatchedTransactions(parsed);
        toast.success(`${parsed.length} transações salvas!`);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-3xl bg-white relative">
                {isProcessing && (
                    <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center rounded-lg">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                        <p className="mt-4 text-slate-700 font-semibold">Processando...</p>
                    </div>
                )}
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        Importador Universal (Beta)
                        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[80vh] overflow-y-auto">
                    <div>
                        <p className="text-sm text-slate-600 mb-2">Cole aqui sua lista de um bloco de notas ou planilha. Tente usar o formato: <code className="bg-slate-100 p-1 rounded">Data Descrição Valor</code> por linha.</p>
                        <Textarea 
                            value={rawText}
                            onChange={e => setRawText(e.target.value)}
                            placeholder={"25/12/2025 Lanche -25,50\n26/12/2025 Cinema 50,00\nUber para casa -15,00 27/12/2025"}
                            className="h-32 font-mono text-sm"
                            disabled={isProcessing}
                        />
                        <div className="flex justify-between items-center mt-2">
                             {detectedBank ? (
                                <span className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-md">
                                    Modo {detectedBank} detectado!
                                </span>
                            ) : <span />}
                            <Button onClick={handleParse} className="w-auto" disabled={isProcessing}>
                                <Search className="mr-2 h-4 w-4"/> Analisar Texto
                            </Button>
                        </div>
                    </div>

                    {parsed.length > 0 && (
                        <div className="space-y-2">
                             <h3 className="font-semibold">Itens Encontrados</h3>
                             <div className="max-h-64 overflow-y-auto border rounded-lg">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-100">
                                        <tr>
                                            <th className="p-2"></th>
                                            <th className="p-2">Data</th>
                                            <th className="p-2">Descrição</th>
                                            <th className="p-2">Categoria</th>
                                            <th className="p-2 text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {parsed.map(t => (
                                            <tr key={t.id}>
                                                <td className="p-1"><Trash2 onClick={() => removeItem(t.id)} className="h-4 w-4 text-slate-400 hover:text-red-500 cursor-pointer"/></td>
                                                <td className="p-1"><Input className="h-7" value={t.date} onChange={e => updateItem(t.id, 'date', e.target.value)} /></td>
                                                <td className="p-1"><Input className="h-7" value={t.sender} onChange={e => updateItem(t.id, 'sender', e.target.value)} /></td>
                                                <td className="p-1">
                                                     <select className="h-7 w-full border rounded px-1" value={t.category} onChange={e => updateItem(t.id, 'category', e.target.value)}>
                                                        {state.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-1"><Input className="h-7 text-right" type="number" value={t.amount} onChange={e => updateItem(t.id, 'amount', parseFloat(e.target.value))} /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Button onClick={handleConfirm} className="w-full bg-green-600 hover:bg-green-700" disabled={isProcessing}>
                                <CheckCircle className="mr-2 h-4 w-4"/> Salvar Itens
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
