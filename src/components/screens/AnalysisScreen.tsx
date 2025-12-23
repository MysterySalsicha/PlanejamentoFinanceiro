import React, { useState } from 'react';
import { useFinancials } from '@/context/FinancialContext';
import { ImportedTransaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrencyBRL } from '@/lib/utils';
import { toast } from 'sonner';
import { Upload, Loader2, Trash2, Search, ArrowRight, X, Info, Eraser, Bug, CheckCircle, Copy, MessageSquarePlus } from 'lucide-react';

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
  
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showBankInfo, setShowBankInfo] = useState(false);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  const copyLogs = () => { navigator.clipboard.writeText(logs.join('\n')); toast.success("Logs copiados!"); };

  const detectBank = (text: string): BankType => {
      const lower = text.toLowerCase();
      if (lower.includes('nu pagamentos') || lower.includes('nubank')) return 'Nubank';
      if (lower.includes('bradesco')) return 'Bradesco';
      if (lower.includes('mercado pago') || lower.includes('mercadopago')) return 'Mercado Pago';
      if (lower.includes('picpay')) return 'PicPay';
      return 'Genérico';
  };

  const createTransaction = (date: string, description: string, sender: string, amount: number, type: 'income' | 'expense'): ImportedTransaction => {
      let category = '';
      const cleanSender = sender.replace(/[\d\.\-\/]{9,}/g, '')
                                .replace(/(\d{2}\/\d{2})/g, '')
                                .replace(/Docto\./g, '')
                                .trim().substring(0, 40);
      
      if (cleanSender && state.categoryMappings && state.categoryMappings[cleanSender.toLowerCase()]) {
          category = state.categoryMappings[cleanSender.toLowerCase()];
      }
      if (!category) {
          const lower = (sender + ' ' + description).toLowerCase();
          for (const [k, c] of Object.entries(CATEGORY_KEYWORDS)) {
              if (lower.includes(k)) { category = c; break; }
          }
      }
      return {
          id: Math.random().toString(36).substr(2,9),
          date,
          description: description.substring(0, 30),
          sender: cleanSender,
          amount,
          type,
          category
      };
  };

  // --- PARSER BRADESCO 5.0 (Multi-transaction per day) ---
  const parseBradesco = (text: string): ImportedTransaction[] => {
      addLog(">>> Iniciando Parser Bradesco 5.0 (Multi-transação)");
      const results: ImportedTransaction[] = [];
      
      const cleanText = text.replace(/"/g, ' ').replace(/\s+/g, ' ');
      
      const dateBlockRegex = /(\d{2}\/\d{2}\/\d{4})\s(.*?)(?=\s\d{2}\/\d{2}\/\d{4}|$)/g;
      let blockMatch;

      while((blockMatch = dateBlockRegex.exec(cleanText)) !== null) {
          const date = blockMatch[1];
          const content = blockMatch[2];

          const transactionRegex = /(.*?)\s(\d{5,})\s([\d\.]+,\d{2})\s([\d\.]+,\d{2})/g;
          let transactionMatch;

          while((transactionMatch = transactionRegex.exec(content)) !== null) {
              let rawDesc = transactionMatch[1].trim();
              const rawAmount = transactionMatch[3];
              const amount = parseFloat(rawAmount.replace(/\./g, '').replace(',', '.'));

              if (amount === 0) continue; 
              if (rawDesc.match(/(Total|Saldo|LANC|Agência|Folha)/i)) continue;

              let type: 'income' | 'expense' = 'expense';
              let description = 'Transação';
              let sender = '';

              if (rawDesc.includes('REM:')) {
                  type = 'income';
                  description = 'Pix Recebido';
                  sender = rawDesc.split('REM:')[1].trim();
              } else if (rawDesc.includes('DES:')) {
                  type = 'expense';
                  description = 'Pix Enviado';
                  sender = rawDesc.split('DES:')[1].trim();
              } else if (rawDesc.includes('PIX QR CODE')) {
                  type = 'expense';
                  description = 'Pagamento QR';
                  if (rawDesc.includes('DES:')) sender = rawDesc.split('DES:')[1].trim();
                  else sender = rawDesc.split('PIX QR CODE')[1].trim() || 'QR Code';
              } else if (rawDesc.includes('DEP DISPONIVEL')) {
                  type = 'income';
                  description = 'Depósito';
                  sender = 'Depósito em Conta';
              } else if (rawDesc.includes('TRANSF SALDO C/SAL P/CC')) {
                  type = 'income';
                  description = 'Resgate/Transf.';
                  sender = rawDesc.split('TRANSF SALDO C/SAL P/CC')[1].trim() || 'Resgate/Transf. Saldo';
              } else if (rawDesc.includes('TRANSF SALDO')) {
                  type = 'income';
                  sender = 'Resgate/Transf. Saldo';
              }
              else {
                  sender = rawDesc;
                  if (rawDesc.match(/(CR[ÉE]DITO|RECEB|DEP[ÓO]SITO)/i)) type = 'income';
              }

              sender = sender.replace(/\d{2}\/\d{2}/g, '').trim();
              sender = sender.split(/\s\d{5,}/)[0].trim();

              if (sender) {
                  const isDuplicate = results.some(r => r.date === date && r.amount === amount && r.sender === sender);
                  if (!isDuplicate) {
                      results.push(createTransaction(date, description, sender, amount, type));
                  }
              }
          }
      }
      return results;
  };

  const parseGenericScanner = (text: string, bank: BankType) => {
      addLog(`Iniciando Scanner para ${bank}...`);
      const results: ImportedTransaction[] = [];
      const cleanText = text.replace(/"/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ');
      
      const dateRegex = /(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})|(\d{2})\s(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)(?:\s(\d{4}))?/gi;
      const amountRegex = /(?:R\$\s?)?(-)?\s?(\d{1,3}(?:\.\d{3})*,\d{2})([+-])?/g;

      let dateMatch;
      const datePositions = [];
      while ((dateMatch = dateRegex.exec(cleanText)) !== null) {
          let dateStr = '';
          if (dateMatch[1]) { 
              const y = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
              dateStr = `${dateMatch[1]}/${dateMatch[2]}/${y}`;
          } else { 
              const month = MONTH_MAP[dateMatch[5].toUpperCase()];
              const year = dateMatch[6] || new Date().getFullYear().toString();
              dateStr = `${dateMatch[4]}/${month}/${year}`; 
          }
          if (!dateStr.includes('2021')) datePositions.push({ pos: dateMatch.index, end: dateMatch.index + dateMatch[0].length, date: dateStr });
      }

      for (let i = 0; i < datePositions.length; i++) {
          const current = datePositions[i];
          const next = datePositions[i+1];
          const searchLimit = next ? Math.min(next.pos, current.end + 600) : current.end + 600;
          const blockText = cleanText.substring(current.end, searchLimit);

          amountRegex.lastIndex = 0;
          let amountMatch;
          let foundOne = false; // Só pega 1 transação por data no genérico para evitar pegar saldo
          
          while ((amountMatch = amountRegex.exec(blockText)) !== null) {
              if (foundOne && bank !== 'Mercado Pago') continue; // MP pode ter várias no mesmo dia

              const valStr = amountMatch[2].replace('.', '').replace(',', '.');
              const amount = parseFloat(valStr);
              if (amount === 0) continue; 

              const textBefore = blockText.substring(Math.max(0, amountMatch.index - 30), amountMatch.index);
              if (textBefore.match(/Saldo|Total/i)) continue;

              const isNegative = amountMatch[1] === '-' || amountMatch[3] === '-';
              
              let rawDesc = blockText.substring(0, amountMatch.index).trim();
              if (rawDesc.length < 3) rawDesc = blockText.substring(amountMatch.index + amountMatch[0].length).trim().split(/(R\$|\d{2}\/)/)[0];
              rawDesc = rawDesc.replace(/^[\s\-,]+/, ''); 

              let type: 'income' | 'expense' = isNegative ? 'expense' : 'income';
              let description = 'Transação';
              let sender = '';
              const lowerDesc = rawDesc.toLowerCase();

              if (lowerDesc.match(/(recebid|dep[óo]sito|estorno|cr[ée]dito|entrada)/)) type = 'income';
              else if (lowerDesc.match(/(pagamento|envio|saque|compra|d[ée]bito|saída)/)) type = 'expense';

              if (bank === 'Mercado Pago') {
                  if (rawDesc.includes('Pix recebida')) sender = rawDesc.replace(/.*recebida/, '').trim();
                  else if (rawDesc.includes('Pix enviada')) sender = rawDesc.replace(/.*enviada/, '').trim();
                  else if (rawDesc.includes('Compra')) sender = rawDesc.replace(/.*Compra de/, '').trim();
                  else sender = rawDesc;
              } else if (bank === 'PicPay') {
                  if (lowerDesc.includes('pix')) sender = rawDesc.replace(/pix (enviado|recebido)/i, '').trim();
                  else sender = rawDesc;
                  if (sender.length < 3) sender = 'PicPay Diversos';
              } else {
                  sender = rawDesc.replace(/(pelo Pix|via Open Banking|Pagamento de)/gi, '').trim();
              }

              sender = sender.replace(/(\d{10,}|\d{2}:\d{2}:\d{2}|CPF).*/gi, '').trim();
              
              if (sender && !sender.match(/(Total|Agência|Extrato)/i) && sender.length > 2) {
                  const isDuplicate = results.some(r => r.date === current.date && r.amount === amount && r.sender === sender);
                  if (!isDuplicate) {
                      results.push(createTransaction(current.date, description, sender, amount, type));
                      foundOne = true;
                  }
              }
          }
      }
      return results;
  };

  const parseMercadoPago = (text: string): ImportedTransaction[] => {
      addLog(">>> Iniciando Parser MercadoPago 3.0 (ID Dedicado)");
      const results: ImportedTransaction[] = [];
      const processedIds = new Set<string>();
      const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');

      // Expressão Regular mais estrita para transações do Mercado Pago.
      // Procura por uma data, seguida por qualquer texto que NÃO seja outra data,
      // um ID de operação, e o valor. Isso evita que a regex comece no cabeçalho.
      const transactionRegex = /(\d{2}-\d{2}-\d{4})\s((?:(?!\d{2}-\d{2}-\d{4}).)*?)\s(\d{12,})\s(R\$\s-?[\d\.]+,\d{2})/g;

      let match;
      while ((match = transactionRegex.exec(cleanText)) !== null) {
          const id = match[3];
          if (processedIds.has(id)) continue; // Deduplicação pelo ID da operação

          const date = match[1].replace(/-/g, '/');
          let description = match[2].trim();
          const valueStr = match[4];
          
          // Filtra lixo residual do cabeçalho que possa ter vazado
          if (description.includes('DETALHE DOS MOVIMENTOS') || description.includes('ID da operação')) continue;

          const amount = parseFloat(valueStr.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
          const absAmount = Math.abs(amount);
          const type = amount < 0 ? 'expense' : 'income';
          
          let sender = 'Mercado Pago';
          let mainDesc = 'Transação';

          if (description.includes('Transferência Pix recebida')) {
              mainDesc = 'Pix Recebido';
              sender = description.replace('Transferência Pix recebida', '').trim();
          } else if (description.includes('Transferência Pix enviada')) {
              mainDesc = 'Pix Enviado';
              sender = description.replace('Transferência Pix enviada', '').trim();
          } else if (description.startsWith('Compra de')) {
              mainDesc = 'Compra';
              sender = description.replace('Compra de', '').trim();
          } else if (description.startsWith('Pagamento com QR Pix')) {
              mainDesc = 'Pagamento QR';
              sender = description.replace('Pagamento com QR Pix', '').trim();
          } else if (description.startsWith('Pagamento')) {
              mainDesc = 'Pagamento';
              sender = description.replace('Pagamento', '').trim();
          } else if (description.startsWith('Rendimentos')) {
              mainDesc = 'Rendimento';
              sender = 'Mercado Pago';
          } else {
              sender = description;
          }
          
          if (sender) {
              processedIds.add(id);
              results.push(createTransaction(date, mainDesc, sender, absAmount, type));
          }
      }
      return results;
  };

  const parseNubank = (text: string): ImportedTransaction[] => {
      addLog(">>> Iniciando Parser Nubank 2.0 (Dedicado)");
      const results: ImportedTransaction[] = [];
      
      // Heurística para recriar linhas, separando o texto a cada nova data.
      const cleanText = text.replace(/(\d{2} \w{3} \d{4})/g, '---SPLIT---$1').replace(/\s+/g, ' ');
      const lines = cleanText.split('---SPLIT---');

      let currentDate = '';
      let currentType: 'income' | 'expense' = 'expense';

      for (const line of lines) {
          if (!line.trim()) continue;

          const dateMatch = line.match(/(\d{2} (\w{3}) \d{4})/);
          if (dateMatch) {
              const month = MONTH_MAP[dateMatch[2]];
              if(month) currentDate = `${dateMatch[1].substring(0,2)}/${month}/${dateMatch[1].substring(7,11)}`;
          }

          if (!currentDate) continue;

          // Divide a linha em seções de entrada e saída para processamento
          const sections = line.split(/Total de entradas|Total de saídas/i);
          let sectionType: 'income' | 'expense' = line.toLowerCase().includes('total de entradas') ? 'income' : 'expense';

          for(const section of sections) {
              if (!section.trim()) continue;

              // Determina o tipo baseado no que precedeu a seção
              const fullSectionStr = (sectionType === 'income' ? 'Total de entradas ' : 'Total de saídas ') + section;
              if (fullSectionStr.toLowerCase().includes('total de saídas')) sectionType = 'expense';
              if (fullSectionStr.toLowerCase().includes('total de entradas')) sectionType = 'income';
              
              const amountRegex = /([\d\.]*,\d{2})/g;
              const amounts = (section.match(amountRegex) || []);

              // O primeiro valor é o total, os seguintes são as transações reais.
              if (amounts.length > 1) {
                  for (let i = 1; i < amounts.length; i++) {
                      const amountVal = amounts[i];
                      const amount = parseFloat(amountVal.replace(/\./g, '').replace(',', '.'));
                      
                      // Encontra a descrição: texto entre o valor anterior e o atual
                      const prevAmountIndex = section.indexOf(amounts[i-1]) + amounts[i-1].length;
                      const currentAmountIndex = section.indexOf(amountVal, prevAmountIndex);
                      let description = section.substring(prevAmountIndex, currentAmountIndex).trim();

                      if (description.length < 3) continue;

                      let sender = description;
                      if (sender.includes('pelo Pix')) sender = sender.split('pelo Pix')[1].trim();
                      else if (sender.includes('Pagamento de fatura')) sender = 'Fatura Nubank';
                      else if (sender.includes('Reembolso recebido')) sender = sender.split('pelo Pix')[1].trim();


                      results.push(createTransaction(currentDate, description, sender, amount, sectionType));
                  }
              }
          }
      }
      return results;
  };

  const parsePicPay = (text: string): ImportedTransaction[] => {
      addLog(">>> Iniciando Parser PicPay 2.0 (Dedicado)");
      const results: ImportedTransaction[] = [];
      const processed = new Set<string>();
      const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');

      // Regex para o padrão de transação do PicPay
      // G1: Data/Hora, G2: Descrição, G3: Valor
      const transactionRegex = /(\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2})\s((?:(?!(?:\s-)?\s?R\$\s).)*?)\s((?:- )?R\$\s[\d\.]+,\d{2})/g;

      let match;
      while ((match = transactionRegex.exec(cleanText)) !== null) {
          const dateTime = match[1];
          let description = match[2].trim();
          const valueStr = match[3];
          
          // Chave única para evitar reprocessar a mesma linha
          const uniqueKey = `${dateTime} ${description} ${valueStr}`;
          if (processed.has(uniqueKey)) continue;

          // Filtra lixo
          if (description.includes('Descrição das Movimentações') || description.length < 3) continue;

          const hasMinusSign = valueStr.includes('-');
          const amount = parseFloat(valueStr.replace('-','').replace('R$','').replace(/\./g,'').replace(',','.').trim());
          if (isNaN(amount)) continue;
          
          const type = hasMinusSign ? 'expense' : 'income';
          
          // No PicPay, a descrição é a melhor informação que temos sobre o "sender"
          let sender = description;
          let mainDesc = description;

          if (description.startsWith('Pagamento de boleto')) {
              sender = 'Pagamento Boleto';
          } else if (description.startsWith('Recarga em carteira')) {
              sender = 'Recarga PicPay';
          }

          processed.add(uniqueKey);
          results.push(createTransaction(dateTime.split(' ')[0], mainDesc, sender, amount, type));
      }
      return results;
  };

  // --- CONTROLLER ---
  const processText = (forceGeneric = false) => {
      if(!raw.trim()) return toast.error("Sem texto.");
      setLogs([]);
      
      const bank = forceGeneric ? 'Genérico' : detectBank(raw);
      setDetectedBank(bank);
      addLog(`Processando... Banco: ${bank}`);
      
      let found: ImportedTransaction[] = [];

      try {
          if (bank === 'Bradesco') found = parseBradesco(raw);
          else if (bank === 'PicPay') found = parsePicPay(raw);
          else if (bank === 'Mercado Pago') found = parseMercadoPago(raw);
          else if (bank === 'Nubank') found = parseNubank(raw);
          
          if (found.length === 0) {
              addLog("Parser específico: 0 itens. Tentando Genérico...");
              found = parseGenericScanner(raw, 'Genérico');
          }
      } catch (e: any) {
          addLog(`ERRO: ${e.message}`);
      }

      // Ordena os resultados por data (crescente)
      found.sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('-')).getTime();
        const dateB = new Date(b.date.split('/').reverse().join('-')).getTime();
        return dateA - dateB;
      });

      setParsed(found);
      
      if (found.length > 0) toast.success(`${found.length} itens encontrados!`);
      else toast.error("Nada encontrado.");
  };

  // --- OUTRAS FUNÇÕES UI ---
  const handleClear = () => { setRaw(''); setParsed([]); setLogs([]); setDetectedBank('Genérico'); toast.info("Limpo."); };
  
  const handleWhatsAppRequest = () => {
    const phone = "5511949197669";
    const message = `Olá! Gostaria de solicitar suporte para um novo tipo de extrato bancário.`;
    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${phone}?text=${encoded}`;
    window.open(url, '_blank');
    toast.info("WhatsApp abrindo... Por favor, cole o texto do extrato na conversa.");
  };

  const loadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if(!f) return;
      setLoading(true); setLogs([]);
      try {
          const pdfjs = await import('pdfjs-dist');
          pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
          const doc = await pdfjs.getDocument(await f.arrayBuffer()).promise;
          let txt = '';
          for(let i=1; i<=doc.numPages; i++) {
              const p = await doc.getPage(i);
              const c = await p.getTextContent();
              txt += c.items.map((it:any)=>it.str).join(' ') + ' '; 
          }
          setRaw(txt);
          addLog(`PDF Lido: ${doc.numPages} pgs.`);
          toast.success("PDF Carregado.");
      } catch(e) { console.error(e); addLog("Erro PDF"); toast.error("Erro PDF."); }
      setLoading(false);
  };

  const updateItem = (id: string, field: keyof ImportedTransaction, value: any) => {
      setParsed(prev => prev.map(p => {
          if (p.id === id) {
              const updated = { ...p, [field]: value };
              if (field === 'category' && updated.sender) learnCategory(updated.sender, value as string);
              return updated;
          }
          return p;
      }));
  };

  const removeItem = (id: string) => setParsed(prev => prev.filter(p => p.id !== id));

  const handleConfirm = () => {
      if(parsed.length === 0) return;
      addBatchedTransactions(parsed);
      toast.success("Salvo!");
      onFinish();
  };

  const filteredList = parsed.filter(t => 
      t.sender?.toLowerCase().includes(filterText.toLowerCase()) || 
      t.description.toLowerCase().includes(filterText.toLowerCase())
  );

  const totalIn = filteredList.filter(t=>t.type==='income').reduce((a,b)=>a+b.amount, 0);
  const totalOut = filteredList.filter(t=>t.type==='expense').reduce((a,b)=>a+b.amount, 0);

  return (
      <div className="space-y-6 pb-24">
          {showLogs && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                  <div className="bg-white p-6 rounded-lg max-w-2xl w-full shadow-2xl h-[500px] flex flex-col">
                      <div className="flex justify-between mb-4">
                          <h3 className="font-bold flex gap-2"><Bug/> Logs</h3>
                          <div className="flex gap-2"><Button size="sm" variant="outline" onClick={copyLogs}><Copy className="w-3 h-3 mr-1"/> Copiar</Button><X onClick={()=>setShowLogs(false)} className="cursor-pointer"/></div>
                      </div>
                      <div className="flex-1 overflow-auto bg-slate-900 text-green-400 font-mono text-xs p-4 rounded">{logs.map((l,i)=><div key={i}>{l}</div>)}</div>
                  </div>
              </div>
          )}

          {showBankInfo && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                  <div className="bg-white p-6 rounded-lg max-w-sm w-full shadow-2xl">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Info className="text-blue-500"/> Bancos</h3>
                      <div className="space-y-4 text-sm text-slate-600">
                          <p>Parsers dedicados para os seguintes bancos:</p><ul className="list-disc pl-5 font-bold"><li>Bradesco</li><li>Mercado Pago</li><li>PicPay</li><li>Nubank</li></ul>
                      </div>
                      <Button onClick={()=>setShowBankInfo(false)} className="w-full mt-6 bg-slate-800">OK</Button>
                  </div>
              </div>
          )}

          <Card className="border-2 border-dashed border-slate-300 bg-slate-50/50">
              <CardContent className="pt-6 space-y-4">
                  <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
                      <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${detectedBank === 'Genérico' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>Modo: {detectedBank}</span>
                          <Info onClick={()=>setShowBankInfo(true)} className="h-4 w-4 text-slate-400 cursor-pointer hover:text-blue-500"/>
                          {detectedBank === 'Genérico' && raw.length > 10 && (
                            <Button variant="outline" size="sm" onClick={handleWhatsAppRequest} className="h-7 text-xs border-green-400 text-green-600 hover:bg-green-50 hover:text-green-700">
                                <MessageSquarePlus className="h-3 w-3 mr-1"/> Solicitar Suporte
                            </Button>
                          )}
                      </div>
                      <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={()=>processText(true)} className="h-7 text-xs border-slate-400">Forçar Genérico</Button>
                          <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 text-xs text-red-500 hover:bg-red-50"><Eraser className="h-3 w-3 mr-1"/> Limpar</Button>
                          <Button variant="ghost" size="sm" onClick={()=>setShowLogs(true)} className="h-7 text-xs text-slate-500"><Bug className="h-3 w-3 mr-1"/> Logs</Button>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Label htmlFor="pdf" className="cursor-pointer flex flex-col items-center justify-center p-6 bg-white border rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                          {loading ? <Loader2 className="h-8 w-8 animate-spin text-blue-500"/> : <Upload className="h-8 w-8 text-slate-400"/>}
                          <span className="mt-2 text-sm font-medium text-slate-600">{loading ? 'Lendo...' : 'Carregar Extrato (PDF)'}</span>
                          <input id="pdf" type="file" className="hidden" accept=".pdf" onChange={loadPdf} />
                      </Label>
                      <div className="flex flex-col space-y-2">
                          <Textarea value={raw} onChange={e=>setRaw(e.target.value)} placeholder="Texto extraído..." className="flex-1 min-h-[80px] text-xs font-mono bg-white resize-none"/>
                          <Button onClick={()=>processText(false)} className="w-full bg-slate-800 text-white"><Search className="mr-2 h-4 w-4"/> Transcrever</Button>
                      </div>
                  </div>
              </CardContent>
          </Card>

          {parsed.length > 0 && (
              <Card className="shadow-lg border-0 ring-1 ring-black/5 animate-in slide-in-from-bottom-10">
                  <CardHeader className="pb-2 border-b bg-white sticky top-0 z-10 rounded-t-xl">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-2">
                          <CardTitle className="text-lg">Revisão ({parsed.length})</CardTitle>
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
                                      <th className="p-3 w-8 bg-slate-100"></th>
                                      <th className="p-3 w-20 bg-slate-100">Data</th>
                                      <th className="p-3 bg-slate-100 w-1/3">Nome / Estabelecimento</th>
                                      <th className="p-3 bg-slate-100">Tipo</th>
                                      <th className="p-3 w-32 bg-slate-100">Categoria</th>
                                      <th className="p-3 text-right bg-slate-100">Valor</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                  {filteredList.map(t=>(
                                      <tr key={t.id} className={`group hover:bg-slate-50 transition-colors ${t.type === 'income' ? 'bg-emerald-50/30' : 'bg-red-50/20'}`}>
                                          <td className="p-2 text-center"><Trash2 onClick={()=>removeItem(t.id)} className="h-4 w-4 text-slate-300 cursor-pointer hover:text-red-500"/></td>
                                          <td className="p-2 text-slate-600 font-medium">{t.date}</td>
                                          <td className="p-2"><Input value={t.sender} onChange={e=>updateItem(t.id, 'sender', e.target.value)} className="h-7 text-xs font-bold text-slate-700 bg-transparent border-transparent hover:border-slate-300 focus:bg-white rounded px-1 w-full"/></td>
                                          <td className="p-2"><Input value={t.description} onChange={e=>updateItem(t.id, 'description', e.target.value)} className="h-7 text-xs text-slate-500 bg-transparent border-transparent hover:border-slate-300 focus:bg-white rounded px-1 w-full"/></td>
                                          <td className="p-2">
                                              <select className="h-7 w-full text-xs bg-transparent border-transparent hover:border-slate-300 focus:bg-white rounded px-1 cursor-pointer" value={t.category} onChange={e=>updateItem(t.id, 'category', e.target.value)}>
                                                  <option value="">-</option>
                                                  {state.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                              </select>
                                          </td>
                                          <td className="p-2 text-right"><div className={`font-bold ${t.type==='income'?'text-emerald-600':'text-red-600'}`}>{t.type==='income' ? '+' : '-'} {formatCurrencyBRL(t.amount)}</div></td>
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