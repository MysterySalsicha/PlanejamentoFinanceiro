import React, { useState, useMemo, useEffect } from 'react';
import { useFinancials, Debt, Transaction, MONTHS_FULL } from '@/context/FinancialContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrencyBRL } from '@/lib/utils';
import { Trash2, Settings, X, Pencil, Plus, Minus, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919', '#19AFFF'];
const formatMoney = (v: string) => { const n = v.replace(/\D/g, ''); return (Number(n)/100).toLocaleString('pt-BR', {style:'currency', currency:'BRL'}); };
const parseMoney = (v: string) => Number(v.replace(/\D/g, '')) / 100;

// COMPONENTE CICLO (Com suporte a edição de Renda e Dívida)
const CycleSection = ({ title, stats, items, incomes, colorClass, hasAdvance, onEditDebt, onEditInc, onDeleteDebt, onDeleteInc, onMove, categories }: any) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [drillCategory, setDrillCategory] = useState<string | null>(null);

    const toggleExpand = () => setIsExpanded(!isExpanded);
    const handleChartClick = (entry: any) => {
        if (!isExpanded) setIsExpanded(true);
        else setDrillCategory(entry.name === drillCategory ? null : entry.name);
    };

    // Função auxiliar para pegar a cor da categoria
    const getCatColor = (catName: string) => categories.find((c: any) => c.name === catName)?.color || '#94a3b8';

    return (
        <div className={`rounded-xl border p-4 ${colorClass} transition-all duration-500 ease-in-out relative flex flex-col ${isExpanded ? 'h-[600px] shadow-lg ring-1 ring-black/5' : 'h-48 hover:shadow-md'}`}>
            <div className="flex justify-between items-start mb-2 shrink-0">
                <div className="z-10">
                    <h3 className="text-xs font-black uppercase opacity-70 tracking-widest">{title}</h3>
                    <div className={`text-2xl font-bold mt-1 ${stats.bal >= 0 ? 'text-slate-800' : 'text-red-600'}`}>{formatCurrencyBRL(stats.bal)}</div>
                    <div className="flex gap-2 text-xs mt-1 opacity-80">
                        <span className="text-green-700 font-bold">+{formatCurrencyBRL(stats.inc)}</span>
                        <span className="text-red-600 font-bold">-{formatCurrencyBRL(stats.exp)}</span>
                    </div>
                </div>
                <button onClick={toggleExpand} className="absolute top-3 right-3 p-1 rounded-full bg-white/50 hover:bg-white text-slate-500 z-20">
                    {isExpanded ? <Minimize2 className="h-4 w-4"/> : <Maximize2 className="h-4 w-4"/>}
                </button>
                <div className={`absolute right-2 top-8 transition-all duration-500 ${isExpanded ? 'h-32 w-32' : 'h-24 w-24 opacity-90'}`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={stats.chartData} innerRadius={isExpanded ? 35 : 25} outerRadius={isExpanded ? 55 : 40} dataKey="value" paddingAngle={5} onClick={handleChartClick} cursor="pointer">
                                {stats.chartData.map((e:any,i:number)=><Cell key={i} fill={getCatColor(e.name)}/>)}
                            </Pie>
                            {isExpanded && <Tooltip formatter={(v: number)=>formatCurrencyBRL(v)} />}
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {!isExpanded && <div className="absolute bottom-3 left-4 text-[10px] text-slate-400 italic">Clique no gráfico...</div>}

            <div className={`flex-1 flex flex-col overflow-hidden transition-opacity duration-300 ${isExpanded ? 'opacity-100 mt-4' : 'opacity-0 h-0 pointer-events-none'}`}>
                {/* Lista de Rendas (Editável) */}
                {incomes && incomes.length > 0 && (
                    <div className="mb-3 bg-green-50/50 rounded p-2 text-xs border border-green-100">
                        <div className="font-bold text-green-800 mb-1 border-b border-green-200 pb-1">RENDAS</div>
                        {incomes.map((inc: any) => (
                            <div key={inc.id} className="flex justify-between items-center group py-1">
                                <span>{inc.description} <span className="text-[9px] bg-green-100 px-1 rounded">{inc.isFixed ? 'Fixa' : 'Avulsa'}</span></span>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-green-700">{formatCurrencyBRL(inc.amount)}</span>
                                                                    <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                                        <Pencil className="h-3 w-3 text-blue-400 cursor-pointer" onClick={()=>onEditInc(inc)}/>
                                                                        <Trash2 className="h-3 w-3 text-red-400 cursor-pointer" onClick={()=>onDeleteInc(inc.id)}/>
                                                                    </div>                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {drillCategory && (
                    <div className="bg-white/80 p-2 rounded mb-2 text-xs font-bold flex justify-between items-center shadow-sm">
                        <span>Filtro: {drillCategory}</span>
                        <X className="h-3 w-3 cursor-pointer text-red-500" onClick={()=>setDrillCategory(null)}/>
                    </div>
                )}
                
                <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                    {items.filter((it:any) => !drillCategory || (it.category||'Outros') === drillCategory).map((it:any) => (
                        <div key={it.id} className="bg-white p-2 rounded shadow-sm border border-slate-100 text-xs group hover:border-blue-200 transition-colors flex justify-between items-start">
                            <div className="flex-1">
                                <div className="font-bold text-slate-700 truncate">{it.name} {it.currentDisplay && `(${it.currentDisplay}/${it.totalInstallments})`}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5 flex gap-2">
                                    <span>Cmp: {it.purchaseDate ? it.purchaseDate.split('-').reverse().slice(0,2).join('/') : '-'}</span>
                                    <span>Venc: {it.dueDate}</span>
                                </div>
                                <div className="flex gap-1 mt-1">
                                    <span className="text-[9px] text-white px-2 py-0.5 rounded" style={{ backgroundColor: getCatColor(it.category || 'Outros') }}>{it.category || 'Outros'}</span>
                                    <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">{it.paymentMethod || 'Outros'}</span>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end pl-2">
                                <span className="font-bold text-red-600">-{formatCurrencyBRL(it.displayVal || it.installmentAmount)}</span>
                                <div className="flex gap-2 mt-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <Pencil className="h-4 w-4 text-blue-400 cursor-pointer" onClick={()=>onEditDebt(it)}/>
                                    <Trash2 className="h-4 w-4 text-red-400 cursor-pointer" onClick={()=>onDeleteDebt(it.id)}/>
                                    {hasAdvance && <div className="cursor-pointer bg-slate-100 rounded p-0.5 hover:bg-blue-100" title="Mover Ciclo" onClick={()=>onMove(it.id)}><RefreshCw className="h-4 w-4 text-slate-500"/></div>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && <div className="text-center text-xs text-slate-400 py-8 italic">Sem contas</div>}
                </div>
            </div>
        </div>
    );
};

export const PlanningScreen = () => {
  const { state, updateSettings, addCategory, removeCategory, addTransaction, updateTransaction, deleteTransaction, addDebt, deleteDebt, updateDebt, switchCycle, clearDatabase } = useFinancials();
  
  const [activeTab, setActiveTab] = useState<'current' | 'projection'>('current');
  const [showSettings, setShowSettings] = useState(false);
  const [expandedMonthIndex, setExpandedMonthIndex] = useState<number | null>(null);
  
  // Edit Modal State (Generic: Debt or Transaction)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editType, setEditType] = useState<'debt' | 'income'>('debt');

  // Forms
  const [incomeName, setIncomeName] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeCycle, setIncomeCycle] = useState<'day_05' | 'day_20'>('day_05');
  const [isIncomeFixed, setIsIncomeFixed] = useState(false);
  
  const [debtName, setDebtName] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtDate, setDebtDate] = useState(new Date().toISOString().split('T')[0]);
  const [debtCycle, setDebtCycle] = useState<'day_05' | 'day_20'>('day_05');
  const [debtCat, setDebtCat] = useState('');
  const [debtMethod, setDebtMethod] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [instCount, setInstCount] = useState('');
  const [instVal, setInstVal] = useState('');
  const [billingMonth, setBillingMonth] = useState(MONTHS_FULL[new Date().getMonth()]);
  
  // Category Config
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#000000');

  const [confSal, setConfSal] = useState(state.settings.salaryDay);
  const [confAdv, setConfAdv] = useState(state.settings.advanceDay);
  const [hasAdv, setHasAdv] = useState(state.settings.hasAdvance);

  const [quickDesc, setQuickDesc] = useState('');
  const [quickVal, setQuickVal] = useState('');
  const [quickCycle, setQuickCycle] = useState<'day_05' | 'day_20'>('day_05');

  // Lógica de Cálculo de Parcelas (O inverso: Valor Parc * Qtd = Total)
  useEffect(() => {
      if (isInstallment && instVal && instCount) {
          const val = parseMoney(instVal);
          const count = parseInt(instCount);
          if (val > 0 && count > 0) {
              const total = val * count;
              setDebtAmount(formatMoney(total.toFixed(2))); // Atualiza o Total Visualmente
          }
      }
  }, [instVal, instCount, isInstallment]);

  // --- Logic ---
  const getCycleStats = (debts: Debt[], transactions: any[]) => {
      const inc = transactions.reduce((a,b)=>a+b.amount,0);
      const exp = debts.reduce((a,b)=>a+b.installmentAmount,0);
      const cats: any = {};
      debts.forEach(d => { const c = d.category || 'Outros'; cats[c] = (cats[c]||0)+d.installmentAmount; });
      const chartData = Object.entries(cats).map(([name, value]) => ({name, value: Number(value)}));
      return { inc, exp, bal: inc - exp, chartData };
  };

  const currentMonthStats = useMemo(() => {
      const c1 = getCycleStats(state.cycles[0].debts, state.cycles[0].transactions);
      const c2 = getCycleStats(state.cycles[1].debts, state.cycles[1].transactions);
      return { c1, c2 };
  }, [state]);

  const projectionData = useMemo(() => {
      const arr = [];
      const today = new Date();
      const allDebts = [...state.cycles[0].debts, ...state.cycles[1].debts];
      const fixedIncomes = [...state.cycles[0].transactions.filter(t=>t.isFixed).map(t=>({...t, cycle: 'day_05'})), ...state.cycles[1].transactions.filter(t=>t.isFixed).map(t=>({...t, cycle: 'day_20'}))];

      for(let i=0; i<6; i++) {
          const fDate = new Date(today.getFullYear(), today.getMonth()+i, 1);
          const mLabel = MONTHS_FULL[fDate.getMonth()];
          const cycle1Debts: any[] = [];
          const cycle2Debts: any[] = [];

          allDebts.forEach(d => {
              let active = false;
              let val = d.installmentAmount;
              let curr = 0;
              if(d.isFixed) { active = true; }
              else {
                  const mIdx = MONTHS_FULL.indexOf(d.billingMonth || '');
                  if(mIdx !== -1) {
                      let diff = mIdx - new Date().getMonth();
                      if(diff < 0) diff += 12;
                      if(i >= diff) {
                          const relIdx = i - diff;
                          curr = d.currentInstallment + relIdx;
                          if(curr <= d.totalInstallments) active = true;
                      }
                  }
              }
              if(active) {
                  const item = { ...d, currentDisplay: curr, displayVal: val };
                  if(d.cycle === 'day_05') cycle1Debts.push(item);
                  else cycle2Debts.push(item);
              }
          });

          const c1Incomes = fixedIncomes.filter(t=>t.cycle === 'day_05').map(t=>({...t, amount: t.amount}));
          const c2Incomes = fixedIncomes.filter(t=>t.cycle === 'day_20').map(t=>({...t, amount: t.amount}));
          const c1 = getCycleStats(cycle1Debts, c1Incomes);
          const c2 = getCycleStats(cycle2Debts, c2Incomes);

          arr.push({ label: mLabel, date: fDate, cycle1: { items: cycle1Debts, ...c1, incomes: c1Incomes }, cycle2: { items: cycle2Debts, ...c2, incomes: c2Incomes }, totalBal: c1.bal + c2.bal });
      }
      return arr;
  }, [state]);

  // Actions
  const saveConfig = () => {
      updateSettings({ salaryDay: Number(confSal), hasAdvance: hasAdv, advanceDay: Number(confAdv) });
      setShowSettings(false);
      toast.success("Configurações salvas!");
  }

  const addInc = () => {
      const val = parseMoney(incomeAmount);
      if(!incomeName || val<=0) return toast.error("Preencha campos");
      addTransaction({ description: incomeName, amount: val, type: 'income', category: 'Salário', date: new Date().toISOString(), isFixed: isIncomeFixed, cycle: state.settings.hasAdvance ? incomeCycle : 'day_05' });
      setIncomeName(''); setIncomeAmount(''); toast.success("Renda adicionada");
  }

  const addExp = () => {
      const total = parseMoney(debtAmount);
      if(!debtName || !debtCat || total<=0) return toast.error("Preencha Nome, Categoria e Valor");
      let finalInst = total;
      let finalTotal = 1;
      let fName = debtName;
      if(isInstallment && !isFixed) {
          const iVal = parseMoney(instVal);
          const count = parseInt(instCount);
          if(iVal<=0 || !count) return toast.error("Parcelamento inválido");
          finalInst = iVal;
          finalTotal = count;
      }
      addDebt({
          name: fName, totalAmount: total, installmentAmount: finalInst,
          dueDate: isFixed ? 'Mensal' : (isInstallment ? `Fat. ${billingMonth}` : debtDate),
          purchaseDate: debtDate, currentInstallment: 1, totalInstallments: finalTotal,
          isFixed, billingMonth, category: debtCat, cycle: state.settings.hasAdvance ? debtCycle : 'day_05',
          paymentMethod: debtMethod || 'Outros'
      });
      setDebtName(''); setDebtAmount(''); setInstVal(''); toast.success("Dívida lançada");
  }

  const handleDeleteData = (range: 'all'|'2months'|'6months') => {
      if(confirm("Tem certeza?")) { clearDatabase(range); toast.success("Dados apagados"); }
  }

  const openEditDebt = (d: Debt) => { setEditingItem({...d}); setEditType('debt'); setIsEditModalOpen(true); }
  const openEditInc = (t: Transaction) => { setEditingItem({...t}); setEditType('income'); setIsEditModalOpen(true); }
  
  const saveEdit = () => {
      if(editingItem) {
          if (editType === 'debt') updateDebt(editingItem.id, editingItem);
          else updateTransaction(editingItem.id, editingItem);
          setIsEditModalOpen(false); setEditingItem(null); toast.success("Salvo");
      }
  }

  const quickAddProj = (monthIdx: number, dateObj: Date) => {
      const val = parseMoney(quickVal);
      if(!quickDesc || val <= 0) return;
      addDebt({
          name: quickDesc, totalAmount: val, installmentAmount: val,
          dueDate: 'Previsto', purchaseDate: dateObj.toISOString(),
          currentInstallment: 1, totalInstallments: 1, isFixed: false,
          billingMonth: MONTHS_FULL[dateObj.getMonth()], category: 'Outros', cycle: quickCycle
      });
      setQuickDesc(''); setQuickVal(''); toast.success("Previsão adicionada");
  }

  return (
    <div className="space-y-6 pb-24 relative">
      <div className="flex justify-center relative mb-6">
          <div className="bg-slate-200 p-1 rounded-full flex gap-1 shadow-inner">
              <button onClick={()=>setActiveTab('current')} className={`px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold transition-all ${activeTab==='current'?'bg-white shadow text-blue-700':'text-slate-500'}`}>Mês Atual</button>
              <button onClick={()=>setActiveTab('projection')} className={`px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold transition-all ${activeTab==='projection'?'bg-white shadow text-purple-700':'text-slate-500'}`}>Projeção</button>
          </div>
          <Button variant="ghost" size="icon" className="absolute right-0 top-0 text-slate-400 hover:bg-slate-100" onClick={()=>setShowSettings(!showSettings)}><Settings className="h-5 w-5"/></Button>
      </div>

      {/* Settings Modal (Agora com Cor) */}
      {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <Card className="w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                  <CardHeader className="flex flex-row justify-between pb-2"><CardTitle>Configurações</CardTitle><Button variant="ghost" size="sm" onClick={()=>setShowSettings(false)}><X/></Button></CardHeader>
                  <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
                          <div><Label>Dia Salário</Label><Input type="number" value={confSal} onChange={e=>setConfSal(Number(e.target.value))}/></div>
                          {hasAdv && <div><Label>Dia Vale</Label><Input type="number" value={confAdv} onChange={e=>setConfAdv(Number(e.target.value))}/></div>}
                          <div className="flex items-center gap-2 pt-6"><input type="checkbox" checked={hasAdv} onChange={e=>setHasAdv(e.target.checked)} className="w-5 h-5 accent-blue-600"/><Label>Recebe Vale?</Label></div>
                      </div>
                      
                      <div className="border-t pt-4">
                          <Label className="mb-2 block">Categorias & Cores</Label>
                          <div className="flex gap-2 mb-3 items-center">
                              <label>
                                <div className="w-12 h-10 p-1 border rounded-md cursor-pointer" style={{ backgroundColor: newCatColor }}></div>
                                <Input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} className="w-0 h-0 opacity-0 absolute"/>
                              </label>
                              <Input placeholder="#Hex" value={newCatColor} onChange={e=>setNewCatColor(e.target.value)} className="w-24"/>
                              <Input placeholder="Nome Categoria" value={newCatName} onChange={e=>setNewCatName(e.target.value)} className="flex-1"/>
                              <Button onClick={()=>{if(newCatName){addCategory(newCatName, 'expense', newCatColor); setNewCatName('');}}}>Add</Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                              {state.categories.map(c=>(
                                  <span key={c.id} className="text-xs px-2 py-1 bg-slate-100 rounded-full flex items-center gap-1 border">
                                      <div className="w-3 h-3 rounded-full border border-black/10 cursor-pointer" style={{background:c.color}} title={c.color}></div> 
                                      {c.name} 
                                      <X className="h-3 w-3 cursor-pointer text-slate-400 hover:text-red-500" onClick={()=>removeCategory(c.id)}/>
                                  </span>
                              ))}
                          </div>
                      </div>
                      <div className="flex justify-between items-center border-t pt-4">
                          <Button variant="outline" size="sm" onClick={()=>handleDeleteData('all')} className="text-red-600 border-red-200">Reset Total</Button>
                          <Button className="bg-blue-600" onClick={saveConfig}>Salvar Tudo</Button>
                      </div>
                  </CardContent>
              </Card>
          </div>
      )}

      {/* Edit Modal (Polimórfico: Dívida ou Renda) */}
      {isEditModalOpen && editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <Card className="w-full max-w-md bg-white shadow-2xl animate-in zoom-in-95">
                  <CardHeader className="flex flex-row justify-between pb-2">
                      <CardTitle>Editar {editType === 'debt' ? 'Conta' : 'Renda'}</CardTitle>
                      <Button variant="ghost" size="sm" onClick={()=>setIsEditModalOpen(false)}><X/></Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                      <Input value={editType === 'debt' ? editingItem.name : editingItem.description} onChange={e=>setEditingItem({...editingItem, [editType==='debt'?'name':'description']: e.target.value})} placeholder="Nome"/>
                      <div className="grid grid-cols-2 gap-2">
                          <Input type="number" value={editType === 'debt' ? editingItem.installmentAmount : editingItem.amount} onChange={e=>setEditingItem({...editingItem, [editType==='debt'?'installmentAmount':'amount']: Number(e.target.value)})}/>
                          {editType === 'debt' && <select className="border rounded px-2" value={editingItem.category} onChange={e=>setEditingItem({...editingItem, category: e.target.value})}>{state.categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select>}
                      </div>
                      
                      {editType === 'debt' ? (
                          <>
                              <div className="grid grid-cols-2 gap-2"><div><Label className="text-[10px]">Compra</Label><Input type="date" value={editingItem.purchaseDate} onChange={e=>setEditingItem({...editingItem, purchaseDate: e.target.value})}/></div><div><Label className="text-[10px]">Vencimento</Label><Input value={editingItem.dueDate} onChange={e=>setEditingItem({...editingItem, dueDate: e.target.value})}/></div></div>
                              <div className="grid grid-cols-2 gap-2"><div><Label className="text-[10px]">Ciclo</Label><select className="w-full border rounded px-2 h-10 text-sm" value={editingItem.cycle} onChange={e=>setEditingItem({...editingItem, cycle: e.target.value as any})}><option value="day_05">Dia {state.settings.salaryDay}</option>{state.settings.hasAdvance && <option value="day_20">Dia {state.settings.advanceDay}</option>}</select></div><div><Label className="text-[10px]">Método</Label><select className="w-full border rounded px-2 h-10 text-sm" value={editingItem.paymentMethod} onChange={e=>setEditingItem({...editingItem, paymentMethod: e.target.value})}><option value="Cartão">Cartão</option><option value="Pix">Pix</option><option value="Boleto">Boleto</option></select></div></div>
                          </>
                      ) : (
                          // Edit Renda
                          <div className="flex items-center gap-2 mt-2">
                              <input type="checkbox" checked={editingItem.isFixed} onChange={e=>setEditingItem({...editingItem, isFixed: e.target.checked})} className="accent-green-600"/> 
                              <span className="text-sm">Renda Fixa?</span>
                          </div>
                      )}
                      
                      <Button className="w-full bg-blue-600 mt-2" onClick={saveEdit}>Salvar Alterações</Button>
                  </CardContent>
              </Card>
          </div>
      )}

      {/* === MÊS ATUAL === */}
      {activeTab === 'current' && (
          <div className="space-y-6 animate-in fade-in">
              <div className={`grid grid-cols-1 ${state.settings.hasAdvance?'md:grid-cols-2':''} gap-4`}>
                  <CycleSection 
                      title={`Ciclo ${state.settings.salaryDay}`} stats={currentMonthStats.c1} items={state.cycles[0].debts} incomes={state.cycles[0].transactions}
                      colorClass="bg-blue-50 border-blue-100" cycleType="day_05" hasAdvance={state.settings.hasAdvance} categories={state.categories}
                      onEditDebt={openEditDebt} onEditInc={openEditInc} onDeleteDebt={deleteDebt} onDeleteInc={deleteTransaction} onMove={switchCycle} 
                  />
                  {state.settings.hasAdvance && <CycleSection 
                      title={`Ciclo ${state.settings.advanceDay}`} stats={currentMonthStats.c2} items={state.cycles[1].debts} incomes={state.cycles[1].transactions}
                      colorClass="bg-emerald-50 border-emerald-100" cycleType="day_20" hasAdvance={state.settings.hasAdvance} categories={state.categories}
                      onEditDebt={openEditDebt} onEditInc={openEditInc} onDeleteDebt={deleteDebt} onDeleteInc={deleteTransaction} onMove={switchCycle} 
                  />}
              </div>

              <Card className="border-t-4 border-t-slate-800 shadow-sm mt-8">
                  <CardHeader className="pb-2"><CardTitle className="text-base uppercase tracking-wide text-slate-600">Novo Lançamento</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                      <div className="p-4 bg-green-50 rounded-lg border border-green-100 transition-all hover:shadow-sm">
                          <div className="flex flex-col md:flex-row gap-3 items-end">
                              <div className="w-full"><Label className="text-xs text-green-800 font-bold mb-1 block">DESCRIÇÃO RENDA</Label><Input placeholder="Ex: Salário" value={incomeName} onChange={e=>setIncomeName(e.target.value)} className="bg-white border-green-200 focus:border-green-500"/></div>
                              <div className="w-full md:w-40"><Label className="text-xs text-green-800 font-bold mb-1 block">VALOR</Label><Input placeholder="R$ 0,00" value={incomeAmount} onChange={e=>setIncomeAmount(formatMoney(e.target.value))} className="bg-white border-green-200 text-green-700 font-bold"/></div>
                              <Button className="w-full md:w-auto bg-green-600 hover:bg-green-700" onClick={addInc}><Plus className="h-4 w-4"/></Button>
                          </div>
                          <div className="mt-2 flex items-center gap-4"><label className="flex items-center gap-2 text-xs font-medium text-green-800"><input type="checkbox" checked={isIncomeFixed} onChange={e=>setIsIncomeFixed(e.target.checked)} className="accent-green-600"/> Fixa?</label>{state.settings.hasAdvance && <select className="text-xs bg-transparent" value={incomeCycle} onChange={(e:any)=>setIncomeCycle(e.target.value)}><option value="day_05">Dia {state.settings.salaryDay}</option><option value="day_20">Dia {state.settings.advanceDay}</option></select>}</div>
                      </div>

                      <div className="p-4 bg-red-50 rounded-lg border border-red-100 transition-all hover:shadow-sm">
                          <div className="grid grid-cols-12 gap-3 items-end">
                              <div className="col-span-12 md:col-span-4"><Label className="text-[10px] text-red-800 font-bold mb-1 block">NOME CONTA</Label><Input placeholder="Ex: Luz" value={debtName} onChange={e=>setDebtName(e.target.value)} className="bg-white border-red-200"/></div>
                              <div className="col-span-6 md:col-span-3"><Label className="text-[10px] text-red-800 font-bold mb-1 block">TOTAL</Label><Input placeholder="R$ 0,00" value={debtAmount} onChange={e=>setDebtAmount(formatMoney(e.target.value))} className="bg-white border-red-200 font-bold text-red-700"/></div>
                              <div className="col-span-6 md:col-span-3"><Label className="text-[10px] text-red-800 font-bold mb-1 block">{isFixed ? 'VENCIMENTO' : 'DATA COMPRA'}</Label><Input type="date" value={debtDate} onChange={e=>setDebtDate(e.target.value)} className="bg-white border-red-200 text-xs"/></div>
                              <div className="col-span-12 md:col-span-2"><Label className="text-[10px] text-red-800 font-bold mb-1 block">CAT (Obrigatório)</Label><select className="w-full h-10 border rounded bg-white px-1 text-xs border-red-200" value={debtCat} onChange={e=>setDebtCat(e.target.value)}><option value="">-</option>{state.categories.filter(c=>c.type==='expense').map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 mt-3 bg-white p-2 rounded border border-red-100">
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer"><input type="checkbox" checked={isFixed} onChange={e=>{setIsFixed(e.target.checked); setIsInstallment(false)}} className="w-4 h-4 accent-red-600"/> Fixa?</label>
                              <div className="w-px h-4 bg-slate-200"></div>
                              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer"><input type="checkbox" checked={isInstallment} onChange={e=>{setIsInstallment(e.target.checked); setIsFixed(false)}} className="w-4 h-4 accent-red-600"/> Parcelada?</label>
                              <div className="w-px h-4 bg-slate-200"></div>
                              <select className="text-xs border-none bg-transparent font-medium text-slate-600 focus:ring-0 cursor-pointer" value={debtMethod} onChange={e=>setDebtMethod(e.target.value)}><option value="">Forma Pagto</option><option value="Cartão">Cartão</option><option value="Pix">Pix</option><option value="Boleto">Boleto</option></select>
                              {state.settings.hasAdvance && (<><div className="w-px h-4 bg-slate-200"></div><select className="text-xs border-none bg-transparent font-medium text-slate-600 focus:ring-0 cursor-pointer" value={debtCycle} onChange={(e:any)=>setDebtCycle(e.target.value)}><option value="day_05">Pagar dia {state.settings.salaryDay}</option><option value="day_20">Pagar dia {state.settings.advanceDay}</option></select></>)}
                          </div>
                          {isInstallment && <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 animate-in slide-in-from-top-2"><div><Label className="text-[10px] text-red-400 font-bold">QTD PARC.</Label><Input type="number" placeholder="10" value={instCount} onChange={e=>setInstCount(e.target.value)} className="h-8 text-xs"/></div><div><Label className="text-[10px] text-red-400 font-bold">VALOR PARC.</Label><Input placeholder="R$" value={instVal} onChange={e=>setInstVal(formatMoney(e.target.value))} className="h-8 text-xs"/></div><div><Label className="text-[10px] text-red-400 font-bold">1ª FATURA</Label><select className="h-8 w-full text-xs border rounded bg-white px-1" value={billingMonth} onChange={e=>setBillingMonth(e.target.value)}>{MONTHS_FULL.map(m=><option key={m} value={m}>{m}</option>)}</select></div></div>}
                          <Button className="w-full bg-red-600 hover:bg-red-700 mt-2" onClick={addExp}><Minus className="h-4 w-4 mr-2"/> Lançar Saída</Button>
                      </div>
                  </CardContent>
              </Card>
          </div>
      )}

      {/* === PROJEÇÃO FUTURA === */}
      {activeTab === 'projection' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in">
              {projectionData.map((m, idx) => (
                  <Card key={idx} className={`transition-all duration-300 border-t-4 ${m.totalBal >= 0 ? 'border-t-green-500' : 'border-t-red-500'} ${expandedMonthIndex===idx?'md:col-span-2 xl:col-span-3 ring-4 ring-slate-100 shadow-2xl z-10':'hover:shadow-lg'}`}>
                      <CardHeader className="bg-white pb-4 cursor-pointer" onClick={()=>setExpandedMonthIndex(expandedMonthIndex===idx?null:idx)}>
                          <div className="flex justify-between items-center">
                              <div><CardTitle className="text-lg font-black text-slate-700 uppercase tracking-tight">{m.label}</CardTitle><p className="text-xs text-slate-400 mt-1">{m.cycle1.items.length + m.cycle2.items.length} contas previstas</p></div>
                              <div className="text-right"><span className={`block text-2xl font-bold ${m.totalBal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrencyBRL(m.totalBal)}</span><span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Saldo Previsto</span></div>
                          </div>
                      </CardHeader>
                      {expandedMonthIndex===idx && (
                          <CardContent className="pt-4">
                              <div className={`grid grid-cols-1 ${state.settings.hasAdvance?'md:grid-cols-2':''} gap-6`}>
                                  <CycleSection title={`Ciclo ${state.settings.salaryDay}`} stats={m.cycle1} items={m.cycle1.items} incomes={m.cycle1.incomes} colorClass="bg-blue-50/50" cycleType="day_05" hasAdvance={state.settings.hasAdvance} categories={state.categories} onEditDebt={openEditDebt} onEditInc={openEditInc} onDeleteDebt={deleteDebt} onDeleteInc={deleteTransaction} onMove={switchCycle} isProjection />
                                  {state.settings.hasAdvance && <CycleSection title={`Ciclo ${state.settings.advanceDay}`} stats={m.cycle2} items={m.cycle2.items} incomes={m.cycle2.incomes} colorClass="bg-emerald-50/50" cycleType="day_20" hasAdvance={state.settings.hasAdvance} categories={state.categories} onEditDebt={openEditDebt} onEditInc={openEditInc} onDeleteDebt={deleteDebt} onDeleteInc={deleteTransaction} onMove={switchCycle} isProjection />}
                              </div>
                              <div className="mt-4 pt-3 border-t bg-slate-50 p-2 rounded-lg flex gap-2 items-center justify-between">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase hidden md:inline">Add Rápido:</span>
                                  <div className="flex gap-2 flex-1"><Input placeholder="Desc" value={quickDesc} onChange={e=>setQuickDesc(e.target.value)} className="h-8 text-xs bg-white flex-1"/><Input placeholder="$$" value={quickVal} onChange={e=>setQuickVal(formatMoney(e.target.value))} className="h-8 text-xs bg-white w-20"/>{state.settings.hasAdvance && <select className="h-8 text-xs border rounded px-1 bg-white" value={quickCycle} onChange={(e:any)=>setQuickCycle(e.target.value)}><option value="day_05">Dia {state.settings.salaryDay}</option><option value="day_20">Dia {state.settings.advanceDay}</option></select>}<Button size="sm" className="h-8 bg-slate-800" onClick={()=>quickAddProj(idx, m.date)}><Plus className="h-4 w-4"/></Button></div>
                              </div>
                          </CardContent>
                      )}
                  </Card>
              ))}
          </div>
      )}
    </div>
  );
};