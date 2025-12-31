import React, { useState, useEffect } from 'react';
import { ImportedTransaction, Debt } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, ArrowRight, Check, Upload, Loader2, Info, GripVertical, UploadCloud, Clipboard, ChevronDown, Trash2 } from 'lucide-react';
import { useFinancials } from '@/context/FinancialContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { detectBank, parseBradesco, parseMercadoPago, parseNubank, parsePicPay, parseGenericScanner, parseExcel } from '@/lib/importers';
import { formatCurrencyBRL } from '@/lib/utils';


interface UniversalImporterProps {
    onImport: (transactions: ImportedTransaction[]) => void;
    onClose: () => void;
}

export const UniversalImporter: React.FC<UniversalImporterProps> = ({ onImport, onClose }) => {
    const { state, getCyclesForMonth, updateMultipleDebts } = useFinancials();
    const [text, setText] = useState('');
    const [preview, setPreview] = useState<ImportedTransaction[]>([]);
    const [step, setStep] = useState<'input' | 'preview'>('input');
    const [loading, setLoading] = useState(false);
    const [openDebts, setOpenDebts] = useState<Debt[]>([]);
    const [linkedDebts, setLinkedDebts] = useState<Record<string, string>>({});
    const [importSource, setImportSource] = useState<'paste' | 'file'>('paste');
    const [isBrowser, setIsBrowser] = useState(false);
    const [detectedBank, setDetectedBank] = useState<string>('Genérico');

    useEffect(() => {
        setIsBrowser(true);
    }, []);

    const handlePreviewChange = (index: number, field: keyof ImportedTransaction, value: any) => {
        const updatedPreview = [...preview];
        updatedPreview[index] = { ...updatedPreview[index], [field]: value };
        setPreview(updatedPreview);
    };

    const deleteRow = (index: number) => {
        const updatedPreview = [...preview];
        updatedPreview.splice(index, 1);
        setPreview(updatedPreview);
    };

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const items = Array.from(preview);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setPreview(items);
    };

    const processText = (inputRaw: string, source: 'paste' | 'file', isExcel = false, jsonData: any[][] = []) => {
        if (!inputRaw.trim() && !isExcel) return;

        setImportSource(source);

        let found: ImportedTransaction[] = [];
        const mappings = state.categoryMappings;

        try {
            if (isExcel) {
                setDetectedBank('Excel');
                found = parseExcel(jsonData, mappings);
            } else {
                const bank = detectBank(inputRaw);
                setDetectedBank(bank);
                if (bank === 'Bradesco') found = parseBradesco(inputRaw, mappings);
                else if (bank === 'PicPay') found = parsePicPay(inputRaw, mappings);
                else if (bank === 'Mercado Pago') found = parseMercadoPago(inputRaw, mappings);
                else if (bank === 'Nubank') found = parseNubank(inputRaw, mappings);

                if (found.length === 0) {
                    setDetectedBank('Genérico');
                    found = parseGenericScanner(inputRaw, mappings);
                }
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

        if (found.length > 0) {
            const firstDateStr = found[0].date.split('/').reverse().join('-');
            const firstDate = new Date(firstDateStr);
            // Check if date is valid before proceeding
            if (!isNaN(firstDate.getTime())) {
                 const monthStr = `${firstDate.getFullYear()}-${String(firstDate.getMonth() + 1).padStart(2, '0')}`;
                 const cycles = getCyclesForMonth(monthStr);
                 const debts = cycles.flatMap(c => c.debts).filter(d => !d.isPaid);
                 setOpenDebts(debts);
            }
        }

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
            if (file.name.endsWith('.xlsx')) {
                const xlsx = await import('xlsx');
                const workbook = xlsx.read(await file.arrayBuffer(), { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                processText('', 'file', true, json);
            } else if (file.type === 'application/pdf') {
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
                processText(txt, 'file');
            } else {
                const textContent = await file.text();
                setText(textContent);
                processText(textContent, 'file');
            }
        } catch (err) {
            console.error(err);
            toast.error("Erro ao ler arquivo.");
        }
        setLoading(false);
    };

    const confirmImport = () => {
        const toAdd: ImportedTransaction[] = [];
        const toUpdate: Partial<Debt>[] = [];

        preview.forEach(item => {
            const linkedDebtId = linkedDebts[item.id];
            if (linkedDebtId && linkedDebtId !== 'new') {
                const debt = openDebts.find(d => d.id === linkedDebtId);
                if (debt) {
                    toUpdate.push({
                        id: debt.id,
                        installmentAmount: typeof item.amount === 'string' ? parseFloat(item.amount.replace('.', '').replace(',', '.')) : item.amount,
                        isPaid: true,
                        paymentDate: item.date,
                    });
                }
            } else {
                toAdd.push(item);
            }
        });

        if (toAdd.length > 0) {
            onImport(toAdd);
        }
        if (toUpdate.length > 0) {
            updateMultipleDebts(toUpdate);
        }

        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-6xl h-[85vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Importação Massiva</h2>
                        <p className="text-sm text-slate-500">
                            {step === 'input' ? 'Arraste um arquivo ou cole o texto para começar.' : `Banco detectado: ${detectedBank}. Revise e edite antes de importar.`}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto bg-white p-0">
                    {step === 'input' && (
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                            <label className="border-2 border-dashed border-blue-200 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-400 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group p-10 text-center">
                                <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                    {loading ? <Loader2 className="h-10 w-10 text-blue-500 animate-spin"/> : <UploadCloud className="h-10 w-10 text-blue-500" />}
                                </div>
                                <h3 className="text-lg font-bold text-slate-700">{loading ? 'Processando...' : 'Arraste seu arquivo aqui'}</h3>
                                <p className="text-sm text-slate-400 mt-2">PDF, Excel, CSV ou TXT</p>
                                <input type="file" className="hidden" onChange={handleFileUpload} disabled={loading}/>
                            </label>
                            <div className="flex flex-col h-full">
                                <label className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Clipboard className="h-4 w-4" /> Ou cole o texto abaixo:
                                </label>
                                <textarea
                                    className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none custom-scrollbar shadow-inner"
                                    placeholder={`DATA       DESCRIÇÃO       VALOR\n20/12/2025 Supermercado    150,00`}
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                />
                                <Button onClick={() => processText(text, 'paste')} disabled={!text || loading} className="mt-4 w-full h-12 text-base shadow-lg shadow-blue-200">
                                    {loading ? <Loader2 className="h-5 w-5 animate-spin"/> : 'Processar Texto'}
                                </Button>
                            </div>
                        </div>
                    )}
                    {step === 'preview' && (
                        <div className="relative flex-1 overflow-auto">
                            {isBrowser && <DragDropContext onDragEnd={onDragEnd}>
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
                                        <tr>
                                            <th className="w-10 py-3 px-2"></th>
                                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</th>
                                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Valor</th>
                                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</th>
                                            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ciclo</th>
                                            {importSource === 'file' && <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vincular (Conciliação)</th>}
                                            <th className="w-10 py-3 px-2"></th>
                                        </tr>
                                    </thead>
                                    <Droppable droppableId="droppable" isDropDisabled={false}>{(provided) => (
                                            <tbody {...provided.droppableProps} ref={provided.innerRef} className="divide-y divide-slate-50">
                                                {preview.map((item, index) => (
                                                    <Draggable key={item.id} draggableId={item.id} index={index}>{(provided, snapshot) => (
                                                            <tr
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                className={`group transition-colors ${snapshot.isDragging ? 'bg-blue-50 shadow-lg' : 'hover:bg-slate-50 bg-white'}`}
                                                            >
                                                                <td className="py-2 px-2 text-center" {...provided.dragHandleProps}>
                                                                    <GripVertical className="h-5 w-5 text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing mx-auto" />
                                                                </td>
                                                                <td className="py-2 px-2">
                                                                    <input
                                                                        value={item.date}
                                                                        onChange={(e) => handlePreviewChange(index, 'date', e.target.value)}
                                                                        className="w-28 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1.5 text-sm text-slate-600 transition-all"
                                                                    />
                                                                </td>
                                                                <td className="py-2 px-2">
                                                                    <input
                                                                        value={item.description}
                                                                        onChange={(e) => handlePreviewChange(index, 'description', e.target.value)}
                                                                        className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1.5 text-sm font-medium text-slate-800 transition-all"
                                                                    />
                                                                </td>
                                                                <td className="py-2 px-2">
                                                                    <input
                                                                        value={formatCurrencyBRL(Number(item.amount))}
                                                                        onChange={(e) => handlePreviewChange(index, 'amount', e.target.value)}
                                                                        className="w-24 text-right bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-2 py-1.5 text-sm font-bold text-slate-700"
                                                                    />
                                                                </td>
                                                                <td className="py-2 px-2">
                                                                    <select
                                                                        value={item.category}
                                                                        onChange={(e) => handlePreviewChange(index, 'category', e.target.value)}
                                                                        className="w-32 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-500 rounded px-1 py-1.5 text-sm text-slate-600"
                                                                    >
                                                                        {state.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                                    </select>
                                                                </td>
                                                                <td className="py-2 px-2">
                                                                    <select
                                                                        value={item.cycle}
                                                                        onChange={(e) => handlePreviewChange(index, 'cycle', e.target.value)}
                                                                        className="w-32 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-blue-500 rounded px-1 py-1.5 text-sm text-slate-600"
                                                                    >
                                                                        <option value="day_05">Ciclo Dia 05</option>
                                                                        <option value="day_20">Ciclo Dia 20</option>
                                                                    </select>
                                                                </td>
                                                                {importSource === 'file' && <td className="py-2 px-2">
                                                                    <div className="relative">
                                                                        <select
                                                                            className="w-48 appearance-none bg-blue-50/50 border border-blue-100 hover:border-blue-300 rounded px-3 py-1.5 text-xs font-medium text-blue-700 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                                                            value={linkedDebts[item.id] || 'new'}
                                                                            onChange={(e) => setLinkedDebts(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                        >
                                                                            <option value="new">✨ Novo Item</option>
                                                                            {openDebts.map(debt => (
                                                                                <option key={debt.id} value={debt.id}>{debt.name}</option>
                                                                            ))}
                                                                        </select>
                                                                        <div className="absolute right-2 top-2 pointer-events-none text-blue-400">
                                                                            <ChevronDown className="h-3 w-3"/>
                                                                        </div>
                                                                    </div>
                                                                </td>}
                                                                <td className="py-2 px-2 text-center">
                                                                    <button
                                                                        onClick={() => deleteRow(index)}
                                                                        className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </tbody>
                                        )}
                                    </Droppable>
                                </table>
                            </DragDropContext>}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center rounded-b-2xl">
                    <Button variant="ghost" onClick={step === 'input' ? onClose : () => setStep('input')} className="text-slate-500 hover:text-slate-800">
                        {step === 'input' ? 'Cancelar' : 'Voltar'}
                    </Button>
                    {step === 'preview' && (
                        <Button onClick={confirmImport} disabled={preview.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 px-8">
                           <Check className="mr-2 h-4 w-4"/> Importar {preview.length} Itens
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
