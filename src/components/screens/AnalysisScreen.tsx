import React, { useState, useMemo, useEffect } from 'react';
import { useFinancials } from '@/context/FinancialContext';
import { ImportedTransaction } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrencyBRL } from '@/lib/utils';
import { toast } from 'sonner';
import { Upload, Loader2, Trash2, Search, ArrowRight, X, Info, Eraser, Bug, CheckCircle, Copy, MessageSquarePlus, AlertTriangle } from 'lucide-react';

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
  const [showDuplicates, setShowDuplicates] = useState(true);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  const copyLogs = () => { navigator.clipboard.writeText(logs.join('\n')); toast.success("Logs copiados!"); };

  // --- LÓGICA DE DETECÇÃO DE DUPLICATAS ---
  const createTransactionFingerprint = (trans: { date: string, amount: number, sender?: string, description?: string }): string => {
    const datePart = trans.date.split('/').slice(0, 2).join('/'); // Dia e mês
    const amountPart = Math.abs(trans.amount).toFixed(2);
    const descPart = (trans.sender || trans.description || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 15);
    return `${datePart}-${amountPart}-${descPart}`;
  };

  const existingTxFingerprints = useMemo(() => {
    const allTransactions = [...state.cycles[0].transactions, ...state.cycles[1].transactions];
    const allDebts = [...state.cycles[0].debts, ...state.cycles[1].debts];
    const fingerprints = new Set<string>();
    allTransactions.forEach(t => fingerprints.add(createTransactionFingerprint({ date: t.date, amount: t.amount, description: t.description })));
    allDebts.forEach(d => fingerprints.add(createTransactionFingerprint({ date: d.purchaseDate || d.dueDate, amount: d.installmentAmount, sender: d.name })));
    addLog(`${fingerprints.size} transações existentes carregadas para verificação de duplicatas.`);
    return fingerprints;
  }, [state.cycles]);


  useEffect(() => {
    setDetectedBank(detectBank(raw));
  }, [raw]);

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
      const cleanSender = sender.replace(/[\d.\-\/]{9,}/g, '')
                                .replace(/(\d{2}\/\d{2})/g, '')
                                .replace(/Docto\./g, '')
                                .trim().substring(0, 40);
      
      if (cleanSender && state.categoryMappings) {
          const specificKey = `${cleanSender.toLowerCase()}-${amount.toFixed(2)}`;
          const genericKey = cleanSender.toLowerCase();
          
          if (state.categoryMappings[specificKey]) {
              category = state.categoryMappings[specificKey];
          } else if (state.categoryMappings[genericKey]) {
              category = state.categoryMappings[genericKey];
          }
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

    // --- PARSER BRADESCO 11.0 (Split by Date) ---
    const parseBradesco = (text: string): ImportedTransaction[] => {
        addLog(">>> Iniciando Parser Bradesco 11.0 (Split por Data)");
        const results: ImportedTransaction[] = [];

        // Usa um lookahead positivo para quebrar o texto por data, mantendo a data no início de cada pedaço.
        const dateChunks = text.split(/(?=\d{2}\/\d{2}\/\d{4})/);

        for (const chunk of dateChunks) {
            const trimmedChunk = chunk.trim();
            if (trimmedChunk.length < 10) continue;

            const dateMatch = trimmedChunk.match(/^(\d{2}\/\d{2}\/\d{4})/);
            if (!dateMatch) continue;
            
            const currentDate = dateMatch[1];
            addLog(`Processando bloco para a data: ${currentDate}`);
            
            // Remove a data do início e mescla o resto do bloco em uma única linha, limpando espaços extras.
            const content = trimmedChunk.substring(currentDate.length).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            
            // Regex para encontrar um padrão de [Descrição] [Valor Monetário] [Saldo Monetário].
            // A chave é exigir a vírgula e dois decimais para garantir que estamos pegando valores, não outros números.
            const transRegex = /(.*?)\s+([\d.,]+,\d{2})\s+([\d.,]+,\d{2})/g;
            let match;

            while ((match = transRegex.exec(content)) !== null) {
                let [_, description, valueStr, balanceStr] = match;
                
                // Limpa o saldo da transação anterior que pode ter sido pego no início da descrição.
                description = description.trim().replace(/^[\d.,]+\s+/, '');

                // Filtra matches curtos ou que são claramente de cabeçalho/rodapé.
                if (description.length < 4 || description.match(/^(SALDO ANTERIOR|Total|COD. LANC.)/i)) {
                    addLog(`Ignorando linha de descrição: '${description}'`);
                    continue;
                }
                
                addLog(`Candidato encontrado: D='${description}', V='${valueStr}'`);

                const amount = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'));
                if (isNaN(amount) || amount === 0) continue;

                // A heurística para determinar o tipo da transação é a melhor aposta aqui.
                const isCredit = /crédito|rem:|transf saldo|dep/i.test(description);
                const type = isCredit ? 'income' : 'expense';

                // Limpeza do 'sender' para torná-lo mais legível.
                let sender = description
                    .replace(/REM:|DES:/i, '')
                    .replace(/PIX QR CODE ESTATICO|PIX QR CODE DINAMICO/i, '')
                    .replace(/TRANSFERENCIA PIX/i, '')
                    .replace(/\d{2}\/\d{2}/, '')       // Remove datas parciais (ex: 13/12)
                    .replace(/\s+\d{6,}\s*/, '')   // Remove números de documento
                    .trim();
                
                results.push(createTransaction(currentDate, description, sender, amount, type));
            }
        }
        addLog(`Parser Bradesco v11.0 finalizado. Itens: ${results.length}`);
        return results;
    };

  // --- PARSER GENERICO 5.0 (Adaptado do Nubank Parser) ---
  const parseGenericScanner = (text: string, bank: BankType) => {
      addLog(`Iniciando Scanner Genérico 5.0 para ${bank}... (Adaptado do Nubank)`);
      const results: ImportedTransaction[] = [];
      const lines = text.split('\n');
      
      let currentDate = '';
      let descriptionBuffer: string[] = [];

      const dateRegex = /((\d{2}[\/\-]\d{2}[\/\-]\d{2,4})|(\d{2}\s(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)(?:\s\d{4})?)|(\d{1,2} de \w+ de \d{4}))/i;
      const valueOnlyRegex = /^(-)?\s?(?:R\$\s)?([\d.,]+,\d{2})$/;
      const junkRegex = /saldo|total|lançamento|anterior|fatura|fale com a gente|sac:|ouvidoria:|cpf:|agência:|conta:|data\/hora|descrição das|movimentações|extrato gerado/i;

      const processBuffer = (amount: number, isNegative: boolean) => {
          if (descriptionBuffer.length > 0 && currentDate) {
              const description = descriptionBuffer.join(' ').trim();
              
              let type: 'income' | 'expense' = isNegative ? 'expense' : 'income';
              if (description.toLowerCase().match(/(recebid|cr[ée]dito|entrada)/)) type = 'income';
              else if (description.toLowerCase().match(/(pagamento|enviad|d[ée]bito|saída|compra)/)) type = 'expense';

              addLog(`Salvando transação genérica: ${currentDate} | ${description} | ${amount}`);
              results.push(createTransaction(currentDate, description, description, amount, type));
          }
          descriptionBuffer = [];
      };

      for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.length < 2 || junkRegex.test(trimmedLine)) continue;

          const dateMatch = trimmedLine.match(dateRegex);
          if (dateMatch && !trimmedLine.match(valueOnlyRegex)) {
              processBuffer(0, false); // Processa buffer anterior antes de mudar a data
              
              let dateStr = '';
              if (dateMatch[2]) { /* DD/MM/YYYY */
                  const parts = dateMatch[2].split(/[\/\-]/);
                  dateStr = `${parts[0]}/${parts[1]}/${parts[2].length === 2 ? '20' + parts[2] : parts[2]}`;
              } else if (dateMatch[3]) { /* DD MÊS YYYY */
                  const parts = dateMatch[3].split(' ');
                  dateStr = `${parts[0]}/${MONTH_MAP[parts[1].toUpperCase()]}/${parts[2] || new Date().getFullYear()}`;
              } else if (dateMatch[4]) { /* DD de Mês de YYYY */
                  const parts = dateMatch[4].split(' de ');
                  const month = MONTH_MAP[parts[1].toUpperCase()] || MONTH_MAP[parts[1].toUpperCase().substring(0,3)];
                  if(month) dateStr = `${parts[0].padStart(2, '0')}/${month}/${parts[2]}`;
              }
              
              if(dateStr) currentDate = dateStr;
              
              const descPart = trimmedLine.replace(dateMatch[0], "").trim();
              if (descPart.length > 2) descriptionBuffer.push(descPart);
              
              continue;
          }

          const valueMatch = trimmedLine.match(valueOnlyRegex);
          if (valueMatch) {
              const amount = parseFloat(valueMatch[2].replace(/\./g, '').replace(',', '.'));
              const isNegative = valueMatch[1] === '-';
              processBuffer(amount, isNegative);
              continue;
          }
          
          descriptionBuffer.push(trimmedLine);
      }
      processBuffer(0, false); // Processa o último buffer

      addLog(`Scanner Genérico v5.0 finalizado. Itens: ${results.length}`);
      return results;
  };
    
      // --- PARSER MERCADO PAGO 5.0 (State Machine) ---
      const parseMercadoPago = (text: string): ImportedTransaction[] => {
          addLog(">>> Iniciando Parser MercadoPago 5.0 (Máquina de Estados)");
          const results: ImportedTransaction[] = [];
          const lines = text.split('\n');
  
          let buffer: { date: string; description: string[]; value: string; } | null = null;
  
          const processBuffer = () => {
              if (buffer && buffer.date && buffer.description.length > 0 && buffer.value) {
                  const fullDescription = buffer.description.join(' ');
                  const amount = parseFloat(buffer.value.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
                  const absAmount = Math.abs(amount);
                  const type = amount < 0 ? 'expense' : 'income';
  
                  let sender = 'Mercado Pago';
                  if (fullDescription.includes('Transferência Pix recebida')) {
                      sender = fullDescription.replace('Transferência Pix recebida', '').trim();
                  } else if (fullDescription.includes('Transferência Pix enviada')) {
                      sender = fullDescription.replace('Transferência Pix enviada', '').trim();
                  } else if (fullDescription.startsWith('Compra de')) {
                      sender = fullDescription.replace('Compra de', '').trim();
                  } else if (fullDescription.startsWith('Pagamento ')) {
                      sender = fullDescription.replace('Pagamento ', '').trim();
                  } else if (fullDescription.startsWith('Rendimentos')) {
                      sender = 'Mercado Pago';
                  } else {
                      sender = fullDescription;
                  }
                  
                  addLog(`Salvando transação: ${buffer.date} | ${sender} | ${amount}`);
                  results.push(createTransaction(buffer.date.replace(/-/g, '/'), fullDescription, sender, absAmount, type));
              }
              buffer = null;
          };
  
          const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
          const valueRegex = /^R\$\s-?[\d.,]+$/;
          const idRegex = /^\d{10,}$/;
  
          for (const line of lines) {
              const trimmedLine = line.trim();
  
              if (dateRegex.test(trimmedLine)) {
                  processBuffer(); // Processa o buffer anterior antes de começar um novo
                  buffer = { date: trimmedLine, description: [], value: '' };
                  continue;
              }
  
              if (buffer) {
                  if (!buffer.value && valueRegex.test(trimmedLine)) {
                      buffer.value = trimmedLine;
                      // Encontrar o valor geralmente significa o fim de uma transação no extrato do MP.
                      // Poderíamos processar o buffer aqui, mas esperar pela próxima data é mais seguro.
                  } else if (!idRegex.test(trimmedLine) && trimmedLine.length > 2 && !trimmedLine.startsWith('DETALHE DOS MOVIMENTOS')) {
                      // Adiciona à descrição se não for um ID, não for muito curto e não for um cabeçalho.
                      buffer.description.push(trimmedLine);
                  }
              }
          }
          processBuffer(); // Processa o último item no buffer
  
          addLog(`Parser MercadoPago v5.0 finalizado. Itens: ${results.length}`);
          return results;
      };
    // --- PARSER NUBANK 4.0 (State Machine) ---
    const parseNubank = (text: string): ImportedTransaction[] => {
        addLog(">>> Iniciando Parser Nubank 4.0 (Máquina de Estados)");
        const results: ImportedTransaction[] = [];
        const lines = text.split('\n');
        
        let currentDate = '';
        let currentSection: 'income' | 'expense' | null = null;
        let descriptionBuffer: string[] = [];

        const dateRegex = /(\d{2})\s(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s(\d{4})/;
        const valueOnlyRegex = /^([\d.]*,\d{2})$/;
        const totalRegex = /^\+\s|Total de/;

        const processBuffer = (amount: number) => {
            if (descriptionBuffer.length > 0 && currentDate && currentSection) {
                const description = descriptionBuffer.join(' ');
                let sender = description; // Por padrão, o sender é a descrição completa

                if (sender.includes('pelo Pix')) {
                    sender = sender.split('pelo Pix')[1].trim().split(' - ')[0];
                } else if (sender.includes('Pagamento de fatura')) {
                    sender = 'Fatura Nubank';
                }

                addLog(`Salvando transação: ${currentDate} | ${sender} | ${amount}`);
                results.push(createTransaction(currentDate, description, sender, amount, currentSection));
            }
            descriptionBuffer = [];
        };

        for (const line of lines) {
            const trimmedLine = line.trim();

            const dateMatch = trimmedLine.match(dateRegex);
            if (dateMatch) {
                processBuffer(0); // Processa buffer anterior antes de mudar a data
                const month = MONTH_MAP[dateMatch[2]];
                currentDate = `${dateMatch[1]}/${month}/${dateMatch[3]}`;
                addLog(`Data atualizada para: ${currentDate}`);
                continue;
            }

            if (trimmedLine.toLowerCase().startsWith('total de entradas')) {
                processBuffer(0);
                currentSection = 'income';
                continue;
            }
            if (trimmedLine.toLowerCase().startsWith('total de saídas')) {
                processBuffer(0);
                currentSection = 'expense';
                continue;
            }

            const valueMatch = trimmedLine.match(valueOnlyRegex);
            if (valueMatch) {
                const amount = parseFloat(valueMatch[1].replace(/\./g, '').replace(',', '.'));
                processBuffer(amount); // Encontramos um valor, processamos o buffer anterior com ele
                continue;
            }
            
            // Se chegamos aqui, a linha é parte de uma descrição
            if (currentDate && currentSection && trimmedLine.length > 2 && !totalRegex.test(trimmedLine)) {
                descriptionBuffer.push(trimmedLine);
            }
        }
        processBuffer(0); // Processa qualquer sobra no buffer no final do arquivo

        addLog(`Parser Nubank v4.0 finalizado. Itens: ${results.length}`);
        return results;
    };
    
      // --- PARSER PICPAY 4.0 (State Machine) ---
      const parsePicPay = (text: string): ImportedTransaction[] => {
          addLog(">>> Iniciando Parser PicPay 4.0 (Máquina de Estados)");
          const results: ImportedTransaction[] = [];
          const lines = text.split('\n');
  
          let buffer: { date: string; time: string; description: string[]; value: string; } | null = null;
  
          const processBuffer = () => {
              if (buffer && buffer.date && buffer.time && buffer.description.length > 0 && buffer.value) {
                  const fullDescription = buffer.description.join(' ');
                  const hasMinusSign = buffer.value.includes('-');
                  const amount = parseFloat(buffer.value.replace(/-? R\$\s?/, '').replace(/\./g, '').replace(',', '.'));
                  if (isNaN(amount) || amount === 0) return;
  
                  const type = hasMinusSign ? 'expense' : 'income';
                  let sender = fullDescription;
  
                  if (fullDescription.startsWith('Pagamento de boleto')) sender = 'Pagamento Boleto';
                  else if (fullDescription.startsWith('Recarga em carteira')) sender = 'Recarga PicPay';
                  
                  addLog(`Salvando transação: ${buffer.date} | ${sender} | ${amount}`);
                  results.push(createTransaction(buffer.date, fullDescription, sender, amount, type));
              }
              buffer = null;
          };
  
          const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
          const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
          const valueRegex = /^-? R\$\s[\d.,]+$/;
  
          for (const line of lines) {
              const trimmedLine = line.trim();
  
              if (dateRegex.test(trimmedLine)) {
                  processBuffer();
                  buffer = { date: trimmedLine, time: '', description: [], value: '' };
                  continue;
              }
  
              if (buffer) {
                  if (!buffer.time && timeRegex.test(trimmedLine)) {
                      buffer.time = trimmedLine;
                  } else if (buffer.time && !buffer.value && valueRegex.test(trimmedLine)) {
                      buffer.value = trimmedLine;
                  } else if (buffer.time && trimmedLine.length > 2 && !valueRegex.test(trimmedLine)) {
                      // Adiciona à descrição se já tivermos a hora e a linha não for um valor
                      buffer.description.push(trimmedLine);
                  }
              }
          }
          processBuffer(); // Processa o último item
  
          addLog(`Parser PicPay v4.0 finalizado. Itens: ${results.length}`);
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

      // Verifica duplicatas
      let duplicateCount = 0;
      const foundWithDuplicates = found.map(item => {
        const fingerprint = createTransactionFingerprint(item);
        const isDuplicate = existingTxFingerprints.has(fingerprint);
        if (isDuplicate) duplicateCount++;
        return { ...item, isDuplicate };
      });
      
      if(duplicateCount > 0) addLog(`${duplicateCount} duplicatas encontradas e marcadas.`);

      setParsed(foundWithDuplicates);
      
      if (found.length > 0) toast.success(`${found.length} itens encontrados! (${duplicateCount} já existem)`);
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
              txt += c.items.map((it:any)=>it.str).join('\n') + '\n'; 
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
              if (field === 'category' && updated.sender) {
                  learnCategory(updated.sender, value as string, updated.amount, false);
              }
              return updated;
          }
          return p;
      }));
  };

  const removeItem = (id: string) => setParsed(prev => prev.filter(p => p.id !== id));

  const handleConfirm = () => {
      const newTransactions = parsed.filter(t => !t.isDuplicate);
      if (newTransactions.length === 0) {
          toast.info("Nenhuma transação nova para salvar.");
          onFinish();
          return;
      }
      addBatchedTransactions(newTransactions);
      toast.success(`${newTransactions.length} nova(s) transação(ões) salva(s)!`);
      onFinish();
  };

  const filteredList = parsed.filter(t => 
      (showDuplicates || !t.isDuplicate) &&
      (t.sender?.toLowerCase().includes(filterText.toLowerCase()) || 
      t.description.toLowerCase().includes(filterText.toLowerCase()))
  );

  const totalIn = filteredList.filter(t=>t.type==='income').reduce((a,b)=>a+b.amount, 0);
  const totalOut = filteredList.filter(t=>t.type==='expense').reduce((a,b)=>a+b.amount, 0);

  return (
      <div className="space-y-6 pb-24">
          <div className="p-4 rounded-md bg-red-50 border border-red-200">
              <div className="flex flex-col items-center text-center md:flex-row md:text-left md:items-start">
                  <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="mt-3 md:mt-0 md:ml-3">
                      <h3 className="text-sm font-medium text-red-800">Atenção</h3>
                      <div className="mt-2 text-sm text-red-700">
                          <p>A análise de extratos é um processo automático e pode não ser 100% precisa. Sempre revise os valores e categorias cuidadosamente antes de confirmar.</p>
                      </div>
                  </div>
              </div>
          </div>
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
                      <Label htmlFor="pdf" className="cursor-pointer flex flex-col items-center justify-center p-4 md:p-6 bg-white border rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
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
                                      <tr key={t.id} title={t.isDuplicate ? "Esta transação parece já existir no seu planejamento." : ""} className={`group hover:bg-slate-50 transition-colors ${t.isDuplicate ? 'bg-slate-100 text-slate-400 opacity-70' : (t.type === 'income' ? 'bg-emerald-50/30' : 'bg-red-50/20')}`}>
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
                                          <td className="p-2 text-right"><div className={`font-bold ${t.isDuplicate ? '' : (t.type==='income'?'text-emerald-600':'text-red-600')}`}>{t.type==='income' ? '+' : '-'} {formatCurrencyBRL(t.amount)}</div></td>
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