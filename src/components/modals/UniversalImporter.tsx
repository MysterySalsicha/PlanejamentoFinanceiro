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
import { X, Search, Trash2, CheckCircle, Upload, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { Input } from '../ui/input';
import { parseSimpleList } from '@/lib/importers';

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
            await new Promise(resolve => setTimeout(resolve, 50)); 
            const results = parseSimpleList(rawText, state.categoryMappings);
            setParsed(results);
            if (results.length > 0) {
                toast.success(`${results.length} itens encontrados!`);
            } else {
                toast.error("Nenhum item válido encontrado.");
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

    const loadPdf = async (file: File): Promise<string> => {
        try {
            const pdfjs = await import('pdfjs-dist');
            // @ts-ignore
            pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
            const doc = await pdfjs.getDocument(await file.arrayBuffer()).promise;
            let txt = '';
            for(let i=1; i<=doc.numPages; i++) {
                const p = await doc.getPage(i);
                const c = await p.getTextContent();
                // @ts-ignore
                txt += c.items.map((it:any)=>it.str).join('\n') + '\n';
            }
            return txt;
        } catch(e) {
            toast.error("Erro ao ler PDF.");
            throw e;
        }
    };

    const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsProcessing(true);

        try {
            const extension = file.name.split('.').pop()?.toLowerCase();
            let text = '';

            if (extension === 'pdf') {
                text = await loadPdf(file);
            } else if (extension === 'docx') {
                const mammoth = await import('mammoth');
                const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
                text = result.value;
            } else if (extension === 'txt' || extension === 'csv') {
                 text = await file.text();
            } else {
                toast.error("Formato não suportado. Use PDF, DOCX, TXT ou CSV.");
                setIsProcessing(false);
                return;
            }

            setRawText(text);
            const results = parseSimpleList(text, state.categoryMappings);
            setParsed(results);
            if (results.length > 0) toast.success(`${results.length} itens encontrados!`);
            else toast.warning("Nenhum item identificado no arquivo.");

        } catch (error) {
            console.error(error);
            toast.error("Erro ao processar arquivo.");
        } finally {
            setIsProcessing(false);
            e.target.value = '';
        }
    };

    // Get all active debts for linking
    const activeDebts = React.useMemo(() => {
        return state.cycles.flatMap(c => c.debts).filter((d, i, self) =>
            // Unique by ID or just list all? Debts might repeat across cycles if installments.
            // We want the debt definition. Usually linking pays an installment.
            // Let's show unique names + total amount? Or just list all recent debts?
            // Ideally we link to a specific Debt ID.
            // Let's deduplicate by 'id' if possible or show relevant info.
            // Actually, in this system, Debt ID is unique per installment in cycle? No, usually ID is persistent or has parent.
            // Let's just list all debts from current and future cycles?
            // For simplicity, let's list all debts from all cycles, deduplicated by name/totalAmount to avoid clutter?
            // Or just list all unique debt IDs found in state.
            self.findIndex(t => t.id === d.id) === i
        ).sort((a,b) => a.name.localeCompare(b.name));
    }, [state.cycles]);

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl bg-white relative max-h-[90vh] flex flex-col">
                {isProcessing && (
                    <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center rounded-lg">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                        <p className="mt-4 text-slate-700 font-semibold">Processando...</p>
                    </div>
                )}
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        Importador Universal (Massivo)
                        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 overflow-hidden flex flex-col flex-1">
                    <div className="flex-shrink-0 space-y-2">
                        <p className="text-sm text-slate-600">Cole sua lista abaixo ou carregue um arquivo (PDF, Word, TXT).</p>

                        <div className="flex gap-2">
                            <label className="flex-1">
                                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors h-24">
                                    <Upload className="h-6 w-6 text-slate-400 mb-2"/>
                                    <span className="text-xs text-slate-500 font-semibold">Carregar Arquivo</span>
                                </div>
                                <input type="file" className="hidden" accept=".pdf,.docx,.txt,.csv" onChange={handleFileLoad} />
                            </label>
                            <Textarea
                                value={rawText}
                                onChange={e => setRawText(e.target.value)}
                                placeholder={"25/12/2025 Lanche 25,50\nFaculdade 1000\n..."}
                                className="flex-[3] h-24 font-mono text-xs resize-none"
                                disabled={isProcessing}
                            />
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleParse} size="sm" className="w-auto" disabled={isProcessing || !rawText}>
                                <Search className="mr-2 h-4 w-4"/> Re-Analisar Texto
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
                                             <th className="p-2">Vincular Dívida</th>
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
                                                <td className="p-1">
                                                    <select
                                                        className="h-7 w-full border rounded px-1 text-xs"
                                                        value={t.linkedDebtId || ''}
                                                        onChange={e => updateItem(t.id, 'linkedDebtId', e.target.value || undefined)}
                                                    >
                                                        <option value="">-- Nenhum --</option>
                                                        {activeDebts.map(d => (
                                                            <option key={d.id} value={d.id}>
                                                                {d.name} ({formatCurrencyBRL(d.installmentAmount)})
                                                            </option>
                                                        ))}
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
