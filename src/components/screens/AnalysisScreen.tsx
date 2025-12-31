import React, { useState, useMemo, useEffect } from 'react';
import { useFinancials } from '@/context/FinancialContext';
import { ImportedTransaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrencyBRL, parseMoney } from '@/lib/utils';
import { toast } from 'sonner';
import { Upload, Loader2, Trash2, Search, X, Info, Eraser, Bug, CheckCircle, Copy, MessageSquarePlus, AlertTriangle } from 'lucide-react';
import { createTransaction as importersCreateTransaction } from '@/lib/importers';

const MONTH_MAP: Record<string, string> = {'JAN':'01','FEV':'02','MAR':'03','ABR':'04','MAI':'05','JUN':'06','JUL':'07','AGO':'08','SET':'09','OUT':'10','NOV':'11','DEZ':'12','JANEIRO':'01','FEVEREIRO':'02','MARÇO':'03','ABRIL':'04','MAIO':'05','JUNHO':'06','JULHO':'07','AGOSTO':'08','SETEMBRO':'09','OUTUBRO':'10','NOVEMBRO':'11','DEZEMBRO':'12'};

const CATEGORY_KEYWORDS: Record<string, string> = {
    'uber': 'Transporte', '99app': 'Transporte', 'posto': 'Transporte', 'shell': 'Transporte',
    'ifood': 'Alimentação', 'zema': 'Alimentação', 'mercado': 'Mercado', 'atacad': 'Mercado', 'carrefour': 'Mercado',
    'farmacia': 'Saúde', 'drogasil': 'Saúde', 'netflix': 'Lazer', 'amazon': 'Casa', 'shopee': 'Casa', 'magalu': 'Casa',
    'vivo': 'Casa', 'claro': 'Casa', 'tim': 'Casa', 'google': 'Serviços'
};

type BankType = 'Nubank' | 'Bradesco' | 'Mercado Pago' | 'PicPay' | 'Genérico';

export const AnalysisScreen = ({ onFinish }: { onFinish: () => void }) => {
  const { addBatchedTransactions, state, learnCategory } = useFinancials();
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState<ImportedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [detectedBank, setDetectedBank] = useState<BankType>('Genérico');
  const [filterText, setFilterText] = useState('');
  const [parserMode, setParserMode] = useState<'bank' | 'list'>('bank');
  
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showBankInfo, setShowBankInfo] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(true);

  const [editableListItems, setEditableListItems] = useState<ImportedTransaction[]>([]);
  const [isEditableListModalOpen, setIsEditableListModalOpen] = useState(false);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  const copyLogs = () => { navigator.clipboard.writeText(logs.join('\n')); toast.success("Logs copiados!"); };

  const createTransactionFingerprint = (trans: { date: string, amount: number | string, sender?: string, description?: string }): string => {
    if (!trans.date) return '';
    const datePart = trans.date.split('/').slice(0, 2).join('/');
    const amountPart = Math.abs(typeof trans.amount === 'string' ? parseFloat(trans.amount.replace('.', '').replace(',', '.')) : trans.amount).toFixed(2);
    const descPart = (trans.sender || trans.description || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
    return `${datePart}-${amountPart}-${descPart}`;
  };

  const existingTxFingerprints = useMemo(() => {
    const allTransactions = state.cycles.flatMap(c => c.transactions);
    const allDebts = state.cycles.flatMap(c => c.debts);
    const fingerprints = new Set<string>();
    allTransactions.forEach(t => fingerprints.add(createTransactionFingerprint({ date: t.date, amount: t.amount, description: t.description })));
    allDebts.forEach(d => fingerprints.add(createTransactionFingerprint({ date: d.purchaseDate || d.dueDate, amount: d.installmentAmount, sender: d.name })));
    return fingerprints;
  }, [state.cycles]);


  useEffect(() => {
    if (parserMode === 'bank') {
      setDetectedBank(detectBank(raw));
    } else {
      setDetectedBank('Genérico');
    }
  }, [raw, parserMode]);

  const detectBank = (text: string): BankType => {
      const lower = text.toLowerCase();
      if (lower.includes('nu pagamentos') || lower.includes('nubank')) return 'Nubank';
      if (lower.includes('bradesco')) return 'Bradesco';
      if (lower.includes('mercado pago') || lower.includes('mercadopago')) return 'Mercado Pago';
      if (lower.includes('picpay')) return 'PicPay';
      return 'Genérico';
  };

    const parseBradesco = (text: string): ImportedTransaction[] => {
        addLog(">>> Iniciando Parser Bradesco");
        const results: ImportedTransaction[] = [];
        return results;
    };
    const parseGenericScanner = (text: string): ImportedTransaction[] => {
        addLog(`Iniciando Scanner Genérico`);
        const results: ImportedTransaction[] = [];
        return results;
    };
    const parseMercadoPago = (text: string): ImportedTransaction[] => {
        addLog(">>> Iniciando Parser MercadoPago");
        const results: ImportedTransaction[] = [];
        return results;
    };
    const parseNubank = (text: string): ImportedTransaction[] => {
        addLog(">>> Iniciando Parser Nubank");
        const results: ImportedTransaction[] = [];
        return results;
    };
    const parsePicPay = (text: string): ImportedTransaction[] => {
        addLog(">>> Iniciando Parser PicPay");
        const results: ImportedTransaction[] = [];
        return results;
    };

    const parseSimpleList = (text: string): ImportedTransaction[] => {
        addLog(">>> Iniciando Parser de Lista Simples");
        const results: ImportedTransaction[] = [];
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        const dateRegex = /(\d{2}[\/\-]\d{2}(?:[\/\-]\d{2,4})?)/;
        
        lines.forEach(line => {
            let cleanLine = line.trim();
            if(cleanLine.length < 3) return;

            let date: string | null = null;
            let amount: number = 0;
            let description = cleanLine;

            const dateMatch = description.match(dateRegex);
            if (dateMatch) {
                let foundDate = dateMatch[0].replace(/-/g, '/');
                const parts = foundDate.split('/');
                if (parts.length === 2) foundDate = `${parts[0]}/${parts[1]}/${new Date().getFullYear()}`;
                else if (parts.length === 3 && parts[2].length === 2) foundDate = `${parts[0]}/${parts[1]}/20${parts[2]}`;
                const testDate = new Date(foundDate.split('/').reverse().join('-'));
                if (!isNaN(testDate.getTime())) {
                    date = foundDate;
                    description = description.replace(dateMatch[0], '').trim();
                }
            }

            const valueMatches = [...description.matchAll(/(?:R\$\s*)?(\d+(?:[.,]\d{1,2})?)/g)];
            if (valueMatches.length > 0) {
                const currencyMatch = valueMatches.find(m => m[0].includes('R$'));
                const bestMatch = currencyMatch || valueMatches[valueMatches.length - 1];

                if (bestMatch) {
                    const valueString = bestMatch[0];
                    try {
                        let cleaned = valueString.replace(/R\$\s?/i, '').trim();

                        if (cleaned.includes(',') && !cleaned.includes('.')) {
                             cleaned = cleaned.replace(',', '.');
                        } else if (cleaned.includes('.') && cleaned.includes(',')) {
                             cleaned = cleaned.replace(/\./g, '').replace(',', '.');
                        } else if (cleaned.includes('.')) {
                             cleaned = cleaned.replace(/\./g, '').replace(',', '.');
                        }

                        const parsedValue = parseFloat(cleaned);
                        if (!isNaN(parsedValue)) {
                            amount = parsedValue;
                            const idx = bestMatch.index!;
                            description = description.substring(0, idx) + description.substring(idx + valueString.length);
                        }
                    } catch(e) { addLog(`Não foi possível extrair valor de: ${valueString}`); }
                }
            }

            description = description.replace(/\s+/g, ' ').trim();
            description = description.replace(/\breais\b/gi, '').trim();
            description = description.replace(/R\$\s*$/i, '').trim();

            if (description.length === 0 && date) description = "Sem descrição";

            results.push(importersCreateTransaction(
                date || '',
                description,
                description, // sender (same as description for simple list)
                amount,
                'expense', // Default type
                state.categoryMappings // categoryMappings
            ));
        });
        return results;
    };

  const processText = (forceGeneric = false) => {
      if(!raw.trim()) return toast.error("Sem texto para processar.");
      setLogs([]); setParsed([]); setEditableListItems([]);

      if (parserMode === 'list') {
          const items = parseSimpleList(raw);
          if (items.length === 0) return toast.error("Não foi possível encontrar itens na lista.");
          setEditableListItems(items);
          setIsEditableListModalOpen(true);
          return;
      }

      const bank = forceGeneric ? 'Genérico' : detectBank(raw);
      setDetectedBank(bank);
      addLog(`Processando extrato... Banco: ${bank}`);
      let found: ImportedTransaction[] = [];
      try {
          if (bank === 'Bradesco') found = parseBradesco(raw);
          else if (bank === 'PicPay') found = parsePicPay(raw);
          else if (bank === 'Mercado Pago') found = parseMercadoPago(raw);
          else if (bank === 'Nubank') found = parseNubank(raw);
          if (found.length === 0) found = parseGenericScanner(raw);

          if (found.length === 0 && bank === 'Genérico') {
               addLog("Tentando fallback para Lista Simples...");
               const listItems = parseSimpleList(raw);
               if(listItems.length > 0) found = listItems;
          }
      } catch (e: any) { toast.error("Erro ao processar extrato."); } 

      const completeItems = found.filter(t => t.date);
      const incompleteItems = found.filter(t => !t.date);
      
      completeItems.sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime());
      
      let duplicateCount = 0;
      const foundWithDuplicates = completeItems.map(item => {
        const fingerprint = createTransactionFingerprint(item);
        const isDuplicate = existingTxFingerprints.has(fingerprint);
        if (isDuplicate) duplicateCount++;
        return { ...item, isDuplicate };
      });
      
      setParsed(foundWithDuplicates);
      if (incompleteItems.length > 0) {
          setEditableListItems(incompleteItems);
          setIsEditableListModalOpen(true);
          toast.warning(`${incompleteItems.length} transações precisam de data.`);
      } else if (completeItems.length > 0) {
          toast.success(`${completeItems.length} itens encontrados!`);
      } else {
          toast.error("Nenhuma transação encontrada no extrato.");
      }
  };

  const handleClear = () => { setRaw(''); setParsed([]); setLogs([]); setDetectedBank('Genérico'); toast.info("Limpo."); };
  const handleWhatsAppRequest = () => { window.open(`https://wa.me/5511949197669?text=${encodeURIComponent('Olá! Gostaria de suporte para um novo extrato.')}`, '_blank'); };

  const loadPdf = async (file: File) => {
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
          setRaw(txt);
          toast.success("PDF Carregado.");
      } catch(e) { toast.error("Erro ao processar PDF."); } 
      finally { setLoading(false); }
  };

  const loadXlsx = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            if (!e.target?.result) { setLoading(false); return toast.error("Não foi possível ler o arquivo."); }
            try {
                const xlsx = await import('xlsx');
                const workbook = xlsx.read(e.target.result, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const text = xlsx.utils.sheet_to_csv(worksheet, { FS: '\t' }).replace(/"/g, ''); 
                setRaw(text);
                toast.success("Planilha XLSX carregada.");
            } catch (err) { toast.error("Erro ao processar o arquivo XLSX."); } 
            finally { setLoading(false); }
        };
        reader.onerror = () => { setLoading(false); toast.error("Erro ao ler o arquivo.") }
        reader.readAsBinaryString(file);
    };

    const loadDocx = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            if (!e.target?.result) { setLoading(false); return toast.error("Não foi possível ler o arquivo.");}
            try {
                const mammoth = await import('mammoth');
                const result = await mammoth.extractRawText({ arrayBuffer: e.target.result as ArrayBuffer });
                setRaw(result.value);
                toast.success("DOCX Carregado.");
            } catch (err) { toast.error("Erro ao processar o arquivo DOCX."); } 
            finally { setLoading(false); }
        };
        reader.onerror = () => { setLoading(false); toast.error("Erro ao ler o arquivo.") }
        reader.readAsArrayBuffer(file);
    };

    const loadTxtCsv = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (!e.target?.result) { setLoading(false); return toast.error("Não foi possível ler o arquivo."); }
            setRaw(e.target.result as string);
            toast.success("Arquivo de texto carregado.");
            setLoading(false);
        };
        reader.onerror = () => { setLoading(false); toast.error("Erro ao ler o arquivo.") }
        reader.readAsText(file);
    };

  const handleFileLoad = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        setLogs([]);
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (['docx', 'txt', 'csv'].includes(extension || '')) {
            setParserMode('list');
        } else {
            setParserMode('bank');
        }

        if (extension === 'pdf') await loadPdf(file);
        else if (extension === 'xlsx') loadXlsx(file);
        else if (extension === 'docx') loadDocx(file);
        else if (['txt', 'csv'].includes(extension || '')) loadTxtCsv(file);
        else { toast.error("Formato de arquivo não suportado."); setLoading(false); }
        e.target.value = '';
    };

  const updateItem = (id: string, field: keyof ImportedTransaction, value: any) => {
      setParsed(prev => prev.map(p => p.id === id ? ({ ...p, [field]: value, ...(field === 'category' && p.sender && { _learn: learnCategory(p.sender, value, typeof p.amount === 'string' ? parseFloat(p.amount) : p.amount, false) }) }) : p));
  };

  const removeItem = (id: string) => setParsed(prev => prev.filter(p => p.id !== id));
  const handleConfirm = () => {
      const newTransactions = parsed.filter(t => !t.isDuplicate);
      if (newTransactions.length === 0) { toast.info("Nenhuma transação nova para salvar."); onFinish(); return; }
      addBatchedTransactions(newTransactions);
      toast.success(`${newTransactions.length} nova(s) transação(ões) salva(s)!`);
      onFinish();
  };

  const filteredList = parsed.filter(t => (showDuplicates || !t.isDuplicate) && (t.sender?.toLowerCase().includes(filterText.toLowerCase()) || t.description.toLowerCase().includes(filterText.toLowerCase())));
  const totalIn = 0;
  const totalOut = filteredList.reduce((a,b)=>a+(typeof b.amount === 'string' ? parseFloat(b.amount) : b.amount), 0);

  const handleItemChange = (id: string, field: keyof ImportedTransaction, value: string) => {
    setEditableListItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSaveEditableList = () => {
      const itemsWithAmount = editableListItems.map(item => ({...item, amount: typeof item.amount === 'string' ? parseMoney(item.amount) : item.amount }));
      const invalidItems = itemsWithAmount.filter(item => !item.date || !item.description || isNaN(item.amount) || item.amount <= 0);
      if (invalidItems.length > 0) return toast.error("Preencha Data, Descrição e Valor (> 0) para todos os itens.");

      let duplicateCount = 0;
      const finalItems = itemsWithAmount.map(item => {
        const fingerprint = createTransactionFingerprint(item);
        const isDuplicate = existingTxFingerprints.has(fingerprint);
        if (isDuplicate) duplicateCount++;
        return { ...item, isDuplicate, sender: item.description };
      });
      
      setParsed(prev => [...prev, ...finalItems].sort((a, b) => new Date(a.date.split('/').reverse().join('-')).getTime() - new Date(b.date.split('/').reverse().join('-')).getTime()));
      toast.success(`${finalItems.length} transações prontas para revisão!`);
      setIsEditableListModalOpen(false);
      setEditableListItems([]);
  };

  return (
      <div className="space-y-6 pb-24">
          <div className="p-4 rounded-md bg-red-50 border border-red-200">
              <div className="flex items-start"><AlertTriangle className="h-5 w-5 text-red-400 mr-3 flex-shrink-0"/>
                  <div><h3 className="text-sm font-medium text-red-800">Atenção</h3><p className="mt-2 text-sm text-red-700">A análise é um processo automático e pode não ser 100% precisa. Sempre revise os dados antes de confirmar.</p></div>
              </div>
          </div>
          <div className="bg-slate-200 p-1 rounded-full flex gap-1 shadow-inner max-w-lg mx-auto">
              <button onClick={()=>setParserMode('bank')} className={`w-full px-4 py-2 rounded-md text-xs font-bold transition-all ${parserMode ==='bank'?'bg-white shadow text-slate-900':'text-slate-500 hover:text-slate-700'}`}>Analisar Extrato Bancário</button>
              <button onClick={()=>setParserMode('list')} className={`w-full px-4 py-2 rounded-md text-xs font-bold transition-all ${parserMode ==='list'?'bg-white shadow text-slate-900':'text-slate-500 hover:text-slate-700'}`}>Analisar Lista Simples</button>
          </div>
          
          {isEditableListModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
                  <Card className="w-full max-w-4xl bg-white shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                      <CardHeader><CardTitle>Revisar e Editar Itens da Lista</CardTitle><p className="text-sm text-slate-500">Ajuste as informações extraídas da sua lista. Itens sem data, descrição ou valor não serão importados.</p></CardHeader>
                      <CardContent className="flex-1 overflow-y-auto p-0"><div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                              <thead className="bg-slate-100 sticky top-0"><tr>
                                  <th className="p-3">Data</th>
                                  <th className="p-3">Descrição</th>
                                  <th className="p-3">Valor</th>
                              </tr></thead>
                              <tbody>
                                  {editableListItems.map(item => (
                                      <tr key={item.id} className="border-b">
                                          <td className="p-2 w-40"><Input type="date" className="h-8 text-xs" value={item.date ? item.date.split('/').reverse().join('-') : ''} onChange={(e) => handleItemChange(item.id, 'date', e.target.value.split('-').reverse().join('/'))}/></td>
                                          <td className="p-2"><Input className="h-8 text-xs font-semibold" value={item.description} onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}/></td>
                                          <td className="p-2 w-32"><Input className="h-8 text-xs font-bold" value={item.amount as any} onChange={(e) => handleItemChange(item.id, 'amount', e.target.value)}/></td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div></CardContent>
                      <div className="p-4 border-t flex justify-end"><Button onClick={handleSaveEditableList}>Adicionar à Revisão</Button></div>
                  </Card>
              </div>
          )}

          {showLogs && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="bg-white p-6 rounded-lg max-w-2xl w-full shadow-2xl h-[500px] flex flex-col"><div className="flex justify-between mb-4"><h3 className="font-bold flex gap-2"><Bug/> Logs</h3><div className="flex gap-2"><Button size="sm" variant="outline" onClick={copyLogs}><Copy className="w-3 h-3 mr-1"/> Copiar</Button><X onClick={()=>setShowLogs(false)} className="cursor-pointer"/></div></div><div className="flex-1 overflow-auto bg-slate-900 text-green-400 font-mono text-xs p-4 rounded">{logs.map((l,i)=><div key={i}>{l}</div>)}</div></div></div>
          )}

          {showBankInfo && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><div className="bg-white p-6 rounded-lg max-w-sm w-full shadow-2xl"><h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Info className="text-blue-500"/> Bancos</h3><div className="space-y-4 text-sm text-slate-600"><p>Parsers dedicados para os seguintes bancos:</p><ul className="list-disc pl-5 font-bold"><li>Bradesco</li><li>Mercado Pago</li><li>PicPay</li><li>Nubank</li></ul></div><Button onClick={()=>setShowBankInfo(false)} className="w-full mt-6 bg-slate-800">OK</Button></div></div>
          )}

          <Card className="border-2 border-dashed border-slate-300 bg-slate-50/50">
              <CardContent className="pt-6 space-y-4">
                  {parserMode === 'bank' && (
                  <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
                      <div className="flex items-center gap-2"><span className={`text-xs font-bold px-2 py-1 rounded ${detectedBank === 'Genérico' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>Banco: {detectedBank}</span><Info onClick={()=>setShowBankInfo(true)} className="h-4 w-4 text-slate-400 cursor-pointer hover:text-blue-500"/>
                          {detectedBank === 'Genérico' && raw.length > 10 && (<Button variant="outline" size="sm" onClick={handleWhatsAppRequest} className="h-7 text-xs border-green-400 text-green-600 hover:bg-green-50 hover:text-green-700"><MessageSquarePlus className="h-3 w-3 mr-1"/> Solicitar Suporte</Button>)}
                      </div>
                      <div className="flex gap-2"><Button variant="outline" size="sm" onClick={()=>processText(true)} className="h-7 text-xs border-slate-400">Forçar Genérico</Button></div>
                  </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center p-4 md:p-6 bg-white border rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                          {loading ? <Loader2 className="h-8 w-8 animate-spin text-blue-500"/> : <Upload className="h-8 w-8 text-slate-400"/>}
                          <span className="mt-2 text-sm font-medium text-slate-600">{loading ? 'Lendo...' : 'Carregar Arquivo'}</span>
                          <span className="mt-1 text-[10px] text-slate-400">PDF, XLSX, DOCX, CSV, TXT</span>
                          <input id="file-upload" type="file" className="hidden" accept=".pdf,.xlsx,.docx,.csv,.txt" onChange={handleFileLoad} />
                      </Label>
                      <div className="flex flex-col space-y-2">
                          <Textarea value={raw} onChange={e=>setRaw(e.target.value)} placeholder="Ou cole o texto aqui..." className="flex-1 min-h-[80px] text-xs font-mono bg-white resize-none"/>
                      </div>
                  </div>
                   <div className="flex gap-2 justify-end items-center -mt-2 relative z-10">
                        <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 text-xs text-red-500 hover:bg-red-50"><Eraser className="h-3 w-3 mr-1"/> Limpar</Button>
                        <Button variant="ghost" size="sm" onClick={()=>setShowLogs(true)} className="h-7 text-xs text-slate-500"><Bug className="h-3 w-3 mr-1"/> Logs</Button>
                        <Button onClick={()=>processText(false)} className="w-full md:w-auto bg-slate-800 text-white shadow-lg"><Search className="mr-2 h-4 w-4"/> Transcrever</Button>
                    </div>
              </CardContent>
          </Card>

          {parsed.length > 0 && (
              <Card className="shadow-lg border-0 ring-1 ring-black/5 animate-in slide-in-from-bottom-10">
                  <CardHeader className="pb-2 border-b bg-white sticky top-0 z-10 rounded-t-xl">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-2">
                          <div className='flex items-center gap-4'>
                            <CardTitle className="text-lg">Revisão ({filteredList.length})</CardTitle>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowDuplicates(p => !p)}>
                                {showDuplicates ? 'Ocultar' : 'Mostrar'} Duplicatas
                            </Button>
                          </div>
                          <div className="relative w-40">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400"/>
                            <Input placeholder="Filtrar..." className="h-7 pl-7 pr-7 text-xs bg-slate-100 border-none" value={filterText} onChange={e=>setFilterText(e.target.value)} />
                            {filterText && (
                                <X onClick={() => setFilterText('')} className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-slate-600 cursor-pointer"/>
                            )}
                          </div>
                      </div>
                  </CardHeader>
                  <CardContent className="p-0">
                      <div className="overflow-x-auto max-h-[500px]">
                          <table className="w-full text-xs text-left whitespace-nowrap">
                              <thead className="bg-slate-100 text-slate-500 uppercase font-semibold sticky top-0 z-10 shadow-sm">
                                  <tr>
                                      <th className="p-3 bg-slate-100"></th>
                                      <th className="p-3 bg-slate-100" title="Duplicata?">Dup</th>
                                      <th className="p-3 bg-slate-100">Data</th>
                                      <th className="p-3 bg-slate-100">Nome / Estabelecimento</th>
                                      <th className="p-3 bg-slate-100">Descrição</th>
                                      <th className="p-3 bg-slate-100">Categoria</th>
                                      <th className="p-3 text-right bg-slate-100">Valor</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                  {filteredList.map(t=>(
                                      <tr key={t.id} title={t.isDuplicate ? "Esta transação parece já existir no seu planejamento." : ""}>
                                          <td className="p-2 text-center"><Trash2 onClick={()=>removeItem(t.id)} className="h-4 w-4 text-slate-300 cursor-pointer hover:text-red-500"/></td>
                                          <td className="p-2 text-center">
                                            {t.isDuplicate && <Copy className="h-3 w-3 text-amber-500" />}
                                          </td>
                                          <td className="p-2 font-medium">{t.date}</td>
                                          <td className="p-2"><Input disabled={t.isDuplicate} value={t.sender} onChange={e=>updateItem(t.id, 'sender', e.target.value)} className="h-7 text-xs font-bold text-slate-700 bg-transparent border-transparent hover:border-slate-300 focus:bg-white rounded px-1 w-full disabled:cursor-not-allowed disabled:hover:border-transparent"/></td>
                                          <td className="p-2"><Input disabled={t.isDuplicate} value={t.description} onChange={e=>updateItem(t.id, 'description', e.target.value)} className="h-7 text-xs text-slate-500 bg-transparent border-transparent hover:border-slate-300 focus:bg-white rounded px-1 w-full disabled:cursor-not-allowed disabled:hover:border-transparent"/></td>
                                          <td className="p-2">
                                              <select disabled={t.isDuplicate} className="h-7 w-full text-xs bg-transparent border-transparent hover:border-slate-300 focus:bg-white rounded px-1 cursor-pointer disabled:cursor-not-allowed disabled:hover:border-transparent" value={t.category} onChange={e=>updateItem(t.id, 'category', e.target.value)}>
                                                  <option value="">- 
                                                  </option>
                                                  {state.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                              </select>
                                          </td>
                                          <td className="p-2 text-right"><div className={`font-bold`}>- {formatCurrencyBRL(typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount)}</div></td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </CardContent>
                  <div className="sticky bottom-4 mx-4 bg-slate-900/95 backdrop-blur text-white p-4 rounded-xl shadow-2xl flex flex-col md:flex-row justify-between items-center gap-3 z-50 animate-in slide-in-from-bottom-2 border border-slate-700">
                      <div className="flex gap-6 text-xs w-full md:w-auto justify-around md:justify-start">
                          <div className="flex flex-col"><span className="text-slate-400 uppercase text-[10px] tracking-wider">Entradas</span><span className="text-emerald-400 font-bold text-base">{formatCurrencyBRL(totalIn)}</span></div>
                          <div className="w-px bg-slate-700 h-8 hidden md:block"></div>
                          <div className="flex flex-col"><span className="text-slate-400 uppercase text-[10px] tracking-wider">Saídas</span><span className="text-red-400 font-bold text-base">{formatCurrencyBRL(totalOut)}</span></div>
                      </div>
                      <Button onClick={handleConfirm} size="sm" className="bg-blue-600 hover:bg-blue-500 w-full md:w-auto shadow-lg">Confirmar <CheckCircle className="ml-2 h-4 w-4"/></Button>
                  </div>
              </Card>
          )}
      </div>
  );
};
