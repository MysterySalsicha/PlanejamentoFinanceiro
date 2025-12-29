import React, { useState } from 'react';
import { ImportedTransaction } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ArrowRight, Check, Upload, Loader2, Info } from 'lucide-react';
import { formatCurrencyBRL } from '@/lib/utils';
import { detectBank, parseBradesco, parseMercadoPago, parseNubank, parsePicPay, parseGenericScanner } from '@/lib/importers';
import { useFinancials } from '@/context/FinancialContext';
import { toast } from 'sonner';

interface UniversalImporterProps {
    onImport: (transactions: ImportedTransaction[]) => void;
    onClose: () => void;
}

export const UniversalImporter: React.FC<UniversalImporterProps> = ({ onImport, onClose }) => {
    const { state } = useFinancials();
    const [text, setText] = useState('');
    const [preview, setPreview] = useState<ImportedTransaction[]>([]);
    const [step, setStep] = useState<'input' | 'preview'>('input');
    const [loading, setLoading] = useState(false);
    const [detectedBank, setDetectedBank] = useState<string>('Genérico');

    const processText = (inputRaw: string) => {
        if (!inputRaw.trim()) return;

        const bank = detectBank(inputRaw);
        setDetectedBank(bank);

        let found: ImportedTransaction[] = [];
        const mappings = state.categoryMappings;

        try {
            if (bank === 'Bradesco') found = parseBradesco(inputRaw, mappings);
            else if (bank === 'PicPay') found = parsePicPay(inputRaw, mappings);
            else if (bank === 'Mercado Pago') found = parseMercadoPago(inputRaw, mappings);
            else if (bank === 'Nubank') found = parseNubank(inputRaw, mappings);

            if (found.length === 0) {
                found = parseGenericScanner(inputRaw, mappings);
            }
        } catch (e: any) {
            console.error(e);
            toast.error("Erro ao processar texto.");
        }

        found.sort((a, b) => {
            const dateA = new Date(a.date.split('/').reverse().join('-')).getTime();
            const dateB = new Date(b.date.split('/').reverse().join('-')).getTime();
            return dateA - dateB;
        });

        setPreview(found);
        setStep('preview');

        if(found.length > 0) toast.success(`${found.length} itens identificados.`);
        else toast.warning("Nenhum item identificado.");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            if (file.type === 'application/pdf') {
                const pdfjs = await import('pdfjs-dist');
                pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
                const doc = await pdfjs.getDocument(await file.arrayBuffer()).promise;
                let txt = '';
                for(let i=1; i<=doc.numPages; i++) {
                    const p = await doc.getPage(i);
                    const c = await p.getTextContent();
                    txt += c.items.map((it:any)=>it.str).join('\n') + '\n';
                }
                setText(txt);
                processText(txt);
            } else {
                // TXT, CSV, etc
                const textContent = await file.text();
                setText(textContent);
                processText(textContent);
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao ler arquivo.");
        }
        setLoading(false);
    };

    const confirmImport = () => {
        onImport(preview);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-50">
            <Card className="w-full max-w-2xl bg-white shadow-2xl h-[80vh] flex flex-col">
                <CardHeader className="flex flex-row justify-between items-center border-b py-3">
                    <CardTitle className="text-lg">Importação Massiva</CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}><X className="h-5 w-5"/></Button>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                    {step === 'input' ? (
                        <div className="flex-1 p-4 flex flex-col gap-4">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="cursor-pointer flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl hover:bg-blue-50 hover:border-blue-300 transition-all group">
                                    {loading ? <Loader2 className="h-8 w-8 animate-spin text-blue-500"/> : <Upload className="h-8 w-8 text-slate-400 group-hover:text-blue-500"/>}
                                    <span className="mt-2 text-sm font-medium text-slate-600 group-hover:text-blue-600">
                                        {loading ? 'Processando...' : 'Arraste ou Clique (PDF, TXT, CSV)'}
                                    </span>
                                    <input type="file" className="hidden" accept=".pdf,.txt,.csv" onChange={handleFileUpload} />
                                </label>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2">
                                    <p className="font-bold flex items-center gap-2"><Info className="h-3 w-3"/> Dica:</p>
                                    <p>Você pode colar o texto de faturas (PDF), planilhas (Excel) ou conversas do WhatsApp.</p>
                                    <p>O sistema tenta identificar automaticamente o banco (Nubank, Bradesco, etc).</p>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col">
                                <span className="text-xs font-bold text-slate-500 mb-1 uppercase">Área de Transferência (Cola)</span>
                                <textarea
                                    className="flex-1 w-full border rounded-md p-3 text-xs font-mono resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder={`Cole seu extrato aqui...\n05/01 Uber *Viagem R$ 15,90\n...`}
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={() => processText(text)} disabled={!text.trim() || loading}>
                                    Processar Texto <ArrowRight className="ml-2 h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            <div className="bg-slate-50 p-2 border-b flex justify-between items-center px-4">
                                <span className="text-xs text-slate-500">Banco Detectado: <b>{detectedBank}</b></span>
                                <span className="text-xs text-slate-500">{preview.length} itens</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-100 text-slate-600 sticky top-0">
                                        <tr>
                                            <th className="p-2 text-left">Data</th>
                                            <th className="p-2 text-left">Descrição</th>
                                            <th className="p-2 text-left">Categoria</th>
                                            <th className="p-2 text-right">Valor</th>
                                            <th className="p-2 text-center">Tipo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {preview.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2">{item.date}</td>
                                                <td className="p-2">{item.description}</td>
                                                <td className="p-2 text-slate-500">{item.category}</td>
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
                                    <Check className="mr-2 h-4 w-4"/> Importar Tudo
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
