import React, { useState } from 'react';
import { ImportedTransaction } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'; // Assuming we have this or use standard textarea
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ArrowRight, Check } from 'lucide-react';
import { parseMoney, formatCurrencyBRL } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface UniversalImporterProps {
    onImport: (transactions: ImportedTransaction[]) => void;
    onClose: () => void;
}

export const UniversalImporter: React.FC<UniversalImporterProps> = ({ onImport, onClose }) => {
    const [text, setText] = useState('');
    const [preview, setPreview] = useState<ImportedTransaction[]>([]);
    const [step, setStep] = useState<'input' | 'preview'>('input');

    const processText = () => {
        const lines = text.split('\n');
        const extracted: ImportedTransaction[] = [];
        const dateRegex = /(\d{2})\/(\d{2})(\/\d{4})?/;
        const moneyRegex = /R?\$\s?([\d.,]+)/; // Simple money regex

        lines.forEach(line => {
            if (!line.trim()) return;

            // Simple heuristic parsing
            // 1. Try to find date
            const dateMatch = line.match(dateRegex);
            let date = new Date().toISOString().split('T')[0]; // Default today
            if (dateMatch) {
                const day = dateMatch[1];
                const month = dateMatch[2];
                const year = dateMatch[3] ? dateMatch[3].substring(1) : new Date().getFullYear();
                date = `${year}-${month}-${day}`;
            }

            // 2. Try to find amount
            // Removing everything that is not digit, comma, dot, or minus sign to help parsing
            // But we need to be careful not to mix date numbers with money.
            // Better to look for specific currency patterns or just numbers at the end/start.

            // Regex for amount: looks for digits, dots and commas, possibly preceded by minus.
            // matches: -100,00 | 1.200,50 | 50.00
            const amountMatches = line.match(/-?[\d]+(?:[.,]\d{3})*(?:[.,]\d{2})?/g);

            let amount = 0;
            let description = line;

            if (amountMatches) {
                // Take the last match as amount usually? Or the one with currency symbol if present.
                // Let's assume the one that looks most like money (has 2 decimal places or comma)
                // Filter matches that are actually dates (e.g. 2024).

                const validAmounts = amountMatches.filter(m => {
                    // if it matches date part "2024", ignore? Hard to say.
                    // Let's assume user pastes "Desc 100,00"
                    return m.includes(',') || m.includes('.');
                });

                if (validAmounts.length > 0) {
                    const rawAmount = validAmounts[validAmounts.length - 1]; // Take last one
                    amount = parseMoney(rawAmount);

                    // Remove amount from description
                    description = description.replace(rawAmount, '').trim();
                }
            }

            if (amount !== 0) {
                // Determine type
                // Heuristic: negative usually expense, but some banks show expenses as positive.
                // We'll default to expense if positive (unless it says "Depósito" etc) or keep sign logic?
                // Standard statement: -100 is expense.
                // Standard PDF copy: 100,00 could be expense.
                // Let's assume Expense by default.

                let type: 'income' | 'expense' = 'expense';
                // If text contains "Recebido", "Depósito", "Pix Recebido" -> Income
                const lowerLine = line.toLowerCase();
                if (lowerLine.includes('recebido') || lowerLine.includes('depósito') || lowerLine.includes('salário') || lowerLine.includes('pagamento recebido')) {
                    type = 'income';
                }

                // Remove date from description
                if (dateMatch) description = description.replace(dateMatch[0], '').trim();

                // Cleanup description
                description = description.replace(/R\$/g, '').replace(/-/g, '').trim();
                if (description.length > 30) description = description.substring(0, 30) + '...';

                extracted.push({
                    id: uuidv4(),
                    description: description || 'Sem descrição',
                    amount: Math.abs(amount),
                    date: date,
                    type: type,
                    category: 'Outros', // Default
                    needsReview: true
                });
            }
        });

        setPreview(extracted);
        setStep('preview');
    };

    const confirmImport = () => {
        onImport(preview);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-50">
            <Card className="w-full max-w-2xl bg-white shadow-2xl h-[80vh] flex flex-col">
                <CardHeader className="flex flex-row justify-between items-center border-b py-3">
                    <CardTitle className="text-lg">Importador Universal</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="h-5 w-5"/></Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                    {step === 'input' ? (
                        <div className="flex-1 p-4 flex flex-col gap-4">
                            <p className="text-sm text-slate-500">Cole aqui o texto da sua fatura (PDF), extrato (Excel/Site) ou mensagens.</p>
                            <textarea
                                className="flex-1 w-full border rounded-md p-3 text-xs font-mono resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder={`Exemplo:\n05/01 Uber *Viagem R$ 15,90\n06/01 Mercado Livre 120,00\n...`}
                                value={text}
                                onChange={e => setText(e.target.value)}
                            />
                            <div className="flex justify-end">
                                <Button onClick={processText} disabled={!text.trim()}>
                                    Processar <ArrowRight className="ml-2 h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            <div className="flex-1 overflow-y-auto p-4">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-100 text-slate-600 sticky top-0">
                                        <tr>
                                            <th className="p-2 text-left">Data</th>
                                            <th className="p-2 text-left">Descrição</th>
                                            <th className="p-2 text-right">Valor</th>
                                            <th className="p-2 text-center">Tipo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {preview.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2">{item.date}</td>
                                                <td className="p-2">{item.description}</td>
                                                <td className={`p-2 text-right font-bold ${item.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrencyBRL(item.amount)}
                                                </td>
                                                <td className="p-2 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${item.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {item.type === 'income' ? 'Entrada' : 'Saída'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {preview.length === 0 && <p className="text-center py-10 text-slate-400">Nenhum item identificado.</p>}
                            </div>
                            <div className="p-4 border-t flex justify-between bg-slate-50">
                                <Button variant="outline" onClick={() => setStep('input')}>Voltar</Button>
                                <Button onClick={confirmImport} disabled={preview.length === 0} className="bg-green-600 hover:bg-green-700">
                                    <Check className="mr-2 h-4 w-4"/> Confirmar Importação ({preview.length})
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
