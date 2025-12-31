import React, { useState, useMemo, useEffect } from 'react';
import { useFinancials } from '@/context/FinancialContext';
import { Transaction, Debt } from '@/types';
import { MONTHS_FULL } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrencyBRL, parseMoney, formatMoney } from '@/lib/utils';
import { Trash2, Settings, X, Pencil, Plus, Minus, RefreshCw, Maximize2, Minimize2, ChevronDown, ChevronUp, HelpCircle, ChevronLeft, ChevronRight, TriangleAlert, Flame, Check, AlertTriangle, Upload, Download, RotateCcw, Eye, EyeOff, Square } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UniversalImporter } from '@/components/UniversalImporter';
import { EditDebtModal } from '@/components/modals/EditDebtModal';
import { isOverdue } from '@/lib/dateUtils';

// Funções de máscara de valor
const handleAmountChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
        setter('');
        return;
    }
    const numericValue = parseInt(rawValue, 10);
    const formattedValue = (numericValue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setter(formattedValue);
};

const parseAmount = (formattedAmount: string): number => {
    if (!formattedAmount) return 0;
    const numericString = formattedAmount.replace(/\./g, '').replace(',', '.');
    return parseFloat(numericString) || 0;
};

// --- COMPONENTE CICLO (Card de Estatísticas) ---
const CycleSection = ({ title, stats, items, incomes, colorClass, hasAdvance, onEditDebt, onEditInc, onDeleteDebt, onDeleteInc, onMove, categories, isProjection, onToggleDebt, onToggleInc }: any) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [drillCategory, setDrillCategory] = useState<string | null>(null);
    const [minimizeIncomes, setMinimizeIncomes] = useState(false);
    const [minimizeExpenses, setMinimizeExpenses] = useState(false);

    const toggleExpand = () => setIsExpanded(!isExpanded);
    
    const handleChartClick = (entry: any) => {
        if (!isExpanded) setIsExpanded(true);
        else setDrillCategory(entry.name === drillCategory ? null : entry.name);
    };

    const handleMinimize = (section: 'incomes' | 'expenses') => {
        if (section === 'incomes') {
            setMinimizeIncomes(!minimizeIncomes);
            if (!minimizeIncomes) setMinimizeExpenses(false); // Open the other
        } else {
            setMinimizeExpenses(!minimizeExpenses);
            if (!minimizeExpenses) setMinimizeIncomes(false);
        }
    };

    const getCatColor = (catName: string) => categories.find((c: any) => c.name === catName)?.color || '#94a3b8';

    // Filtra itens se houver categoria selecionada no gráfico
    const filteredItems = useMemo(() => {
        let list = items || [];
        if (drillCategory) list = list.filter((it: any) => (it.category || 'Outros') === drillCategory);
        // Ordena por data
        return list.sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [items, drillCategory]);

    const activeSlice = stats.chartData.find((d: any) => d.name === drillCategory);

    // Calculate Overdue Count
    const overdueCount = useMemo(() => {
        return filteredItems.filter((it: any) => isOverdue(it.dueDate, it.isPaid)).length;
    }, [filteredItems]);

    // PAID Checkbox Component
    const PaidCheckbox = ({ checked, onClick }: { checked: boolean, onClick: () => void }) => {
        if (checked) {
            return (
                <div onClick={onClick} className="cursor-pointer bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 flex items-center gap-1 hover:bg-green-200 transition-colors">
                    PAGO <Check className="h-3 w-3"/>
                </div>
            );
        }
        return (
            <Square onClick={onClick} className="h-5 w-5 text-slate-300 cursor-pointer hover:text-slate-500 hover:fill-slate-100 transition-colors" />
        );
    };

    return (
        <div className={`rounded-xl border p-4 ${colorClass} transition-all duration-500 ease-in-out relative flex flex-col ${isExpanded ? 'h-auto min-h-[500px] shadow-lg ring-1 ring-black/5' : 'h-48 hover:shadow-md'}`}>
            <div className="flex justify-between items-start mb-2 shrink-0">
                <div className="z-10">
                    <h3 className="text-xs font-black uppercase opacity-70 tracking-widest">{title}</h3>
                    <div className={`text-2xl font-bold mt-1 ${stats.bal >= 0 ? 'text-slate-800' : 'text-red-600'}`}>{formatCurrencyBRL(stats.bal)}</div>
                    <div className="flex flex-col gap-1 mt-1">
                        <div className="flex gap-2 text-xs opacity-80">
                            <span className="text-green-700 font-bold">+{formatCurrencyBRL(stats.inc)}</span>
                            <span className="text-red-600 font-bold">-{formatCurrencyBRL(stats.exp)}</span>
                        </div>
                        {overdueCount > 0 && !isProjection && (
                            <div className="flex items-center gap-1 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full w-fit font-bold border border-red-200 animate-in fade-in slide-in-from-left-2">
                                <AlertTriangle className="h-3 w-3" /> {overdueCount} contas vencidas
                            </div>
                        )}
                    </div>
                </div>
                <button onClick={toggleExpand} className="absolute top-3 right-3 p-1 rounded-full bg-white/50 hover:bg-white text-slate-500 z-20">
                    {isExpanded ? <Minimize2 className="h-4 w-4"/> : <Maximize2 className="h-4 w-4"/>}
                </button>
                
                {/* GRÁFICO */}
                <div className={`transition-all duration-500 ${isExpanded ? 'mt-4 h-64 w-full relative' : 'absolute right-2 top-6 h-24 w-24 opacity-90'}`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie 
                                data={stats.chartData} 
                                innerRadius={isExpanded ? 60 : 25}
                                outerRadius={isExpanded ? 100 : 40}
                                dataKey="value" 
                                paddingAngle={4} 
                                onClick={handleChartClick} 
                                cursor="pointer"
                            >
                                {stats.chartData.map((e: any, i: number) => <Cell key={i} fill={getCatColor(e.name)} stroke="none" />)}
                            </Pie>
                            {isExpanded && <Tooltip formatter={(v: number) => formatCurrencyBRL(v)} contentStyle={{borderRadius:'8px', fontSize:'12px'}} />}
                            {isExpanded && <Legend verticalAlign="bottom" layout="horizontal" iconSize={8} wrapperStyle={{fontSize:'10px', paddingTop: '10px'}}/>}
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {!isExpanded && <div className="absolute bottom-3 left-4 text-[10px] text-slate-400 italic">Clique para detalhes...</div>}

            {/* ÁREA EXPANDIDA (DETALHES) */}
            {isExpanded && (
                <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 mt-4">
                    
                    {/* INFO DA CATEGORIA SELECIONADA */}
                    {drillCategory && activeSlice && (
                        <div className="bg-white/80 p-3 rounded-lg mb-3 text-xs border border-slate-200 shadow-sm flex justify-between items-center">
                            <div>
                                <span className="block text-[10px] text-slate-500 uppercase">Categoria Selecionada</span>
                                <span className="font-bold text-base" style={{color: getCatColor(drillCategory)}}>{drillCategory}</span>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-slate-700">{formatCurrencyBRL(activeSlice.value)}</span>
                                <span className="text-[10px] text-slate-400">{((activeSlice.value / stats.exp) * 100).toFixed(1)}% do total</span>
                            </div>
                            <X className="h-4 w-4 cursor-pointer text-slate-400 hover:text-red-500 ml-2" onClick={() => setDrillCategory(null)} />
                        </div>
                    )}

                    {/* LISTA DE RENDAS */}
                    {incomes && incomes.length > 0 && !drillCategory && (
                        <div className="mb-4 transition-all">
                            <div className="flex justify-between items-center border-b border-green-100 pb-1 mb-2">
                                <h4 className="text-[10px] font-bold text-green-700 uppercase">Entradas</h4>
                                <button onClick={() => handleMinimize('incomes')} className="text-slate-400 hover:text-blue-500">
                                    {minimizeIncomes ? <EyeOff className="h-3 w-3"/> : <Eye className="h-3 w-3"/>}
                                </button>
                            </div>

                            {!minimizeIncomes && (
                                <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                                    {incomes.map((inc: any) => (
                                        <div key={inc.id} className={`flex justify-between items-center bg-green-50/50 p-2 rounded border border-green-100/50 text-xs ${inc.isPaid ? 'opacity-60' : ''}`}>
                                            <div className="flex items-center gap-2">
                                                {!isProjection && (
                                                     <div onClick={() => onToggleInc(inc.id)} className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-colors ${inc.isPaid ? 'bg-green-600 border-green-600' : 'bg-white border-green-300'}`}>
                                                         {inc.isPaid && <Check className="h-3 w-3 text-white" />}
                                                     </div>
                                                )}
                                                {inc.needsReview && <TriangleAlert className="h-3 w-3 text-yellow-500" />}
                                                <span className={`font-medium text-green-900 ${inc.isPaid ? 'line-through decoration-green-900/50' : ''}`}>{inc.description}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-green-700">{formatCurrencyBRL(inc.amount)}</span>
                                                {!isProjection && (
                                                    <div className="flex gap-1">
                                                        <Pencil className="h-3 w-3 text-blue-400 cursor-pointer" onClick={() => onEditInc(inc)} />
                                                        <Trash2 className="h-3 w-3 text-red-400 cursor-pointer" onClick={() => onDeleteInc(inc.id)} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* LISTA DE DÍVIDAS */}
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        <div className="flex justify-between items-center border-b pb-1 mb-2 sticky top-0 bg-inherit z-10">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase">Saídas {drillCategory ? `(${drillCategory})` : ''}</h4>
                            <button onClick={() => handleMinimize('expenses')} className="text-slate-400 hover:text-blue-500">
                                {minimizeExpenses ? <EyeOff className="h-3 w-3"/> : <Eye className="h-3 w-3"/>}
                            </button>
                        </div>

                        {!minimizeExpenses && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                {filteredItems.map((it: any) => {
                                    const overdue = isOverdue(it.dueDate, it.isPaid);
                                    const itemClass = it.isPaid
                                        ? 'bg-green-50 border-green-200 opacity-60'
                                        : overdue
                                            ? 'bg-white border-red-300 ring-1 ring-red-100'
                                            : 'bg-white border-slate-100';

                                    return (
                                    <div key={it.id} className={`${itemClass} p-2.5 rounded-lg shadow-sm border text-xs hover:border-slate-300 transition-all flex justify-between items-start`}>
                                        <div className="flex items-start gap-3 flex-1">
                                            {!isProjection && (
                                                <div className="mt-0.5">
                                                    <PaidCheckbox checked={!!it.isPaid} onClick={() => onToggleDebt(it.id)} />
                                                </div>
                                            )}
                                            <div>
                                                <div className="flex items-center gap-1 font-bold text-slate-700">
                                                    {it.needsReview && <TriangleAlert className="h-3 w-3 text-yellow-500" />}
                                                    <span className={it.isPaid ? 'line-through opacity-50' : ''}>{it.name}</span>
                                                    {it.currentDisplay && <span className="text-[10px] font-normal text-slate-400">({it.currentDisplay}/{it.totalInstallments})</span>}
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5 flex gap-2 items-center flex-wrap">
                                                    <span className={`flex items-center gap-1 ${overdue && !it.isPaid ? 'text-red-600 font-bold' : ''}`}>
                                                        Venc: {it.dueDate}
                                                        {overdue && !it.isPaid && <Flame className="h-3 w-3 fill-red-500 text-red-600 animate-pulse" />}
                                                    </span>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: getCatColor(it.category || 'Outros') }}>{it.category || 'Outros'}</span>
                                                    {it.needsReview && <span className="flex items-center gap-1 text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200"><AlertTriangle className="h-3 w-3"/> Revisar</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right pl-2">
                                            <div className={`font-bold ${it.isPaid ? 'text-green-700 line-through decoration-green-700/50' : 'text-red-600'}`}>-{formatCurrencyBRL(it.displayVal || it.installmentAmount)}</div>
                                            {!isProjection && (
                                                <div className="flex gap-2 mt-1 justify-end items-center">
                                                    <Pencil className="h-3.5 w-3.5 text-slate-400 hover:text-blue-500 cursor-pointer" onClick={() => onEditDebt(it)} />
                                                    <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500 cursor-pointer" onClick={() => onDeleteDebt(it.id)} />
                                                    {hasAdvance && <RefreshCw className="h-3.5 w-3.5 text-slate-400 hover:text-orange-500 cursor-pointer" onClick={() => onMove(it.id)} />}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )})}
                                {filteredItems.length === 0 && <div className="text-center text-xs text-slate-400 py-4">Nenhuma conta encontrada.</div>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const PlanningScreen = () => {
    const { state, updateSettings, addCategory, removeCategory, addTransaction, updateTransaction, deleteTransaction, addDebt, deleteDebt, updateDebt, switchCycle, clearDatabase, setViewDate, getCyclesForMonth, toggleDebtStatus, toggleTransactionStatus, addBatchedTransactions } = useFinancials();

    const [activeTab, setActiveTab] = useState<'current' | 'projection'>('current');
    const [showSettings, setShowSettings] = useState(false);
    const [showImporter, setShowImporter] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [expandedMonthIndex, setExpandedMonthIndex] = useState<number | null>(null);
    const [expandedSummary, setExpandedSummary] = useState<'incomes' | 'debts' | null>(null);
    const [categoryPlaceholder, setCategoryPlaceholder] = useState('Nome Categoria');

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Transaction | Debt | null>(null);
    const [editType, setEditType] = useState<'debt' | 'income'>('debt');

    // Forms Inputs
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

    const [newCatName, setNewCatName] = useState('');
    const [newCatColor, setNewCatColor] = useState('#000000');
    const [confSal, setConfSal] = useState(state.settings.salaryDay);
    const [confAdv, setConfAdv] = useState(state.settings.advanceDay);
    const [hasAdv, setHasAdv] = useState(state.settings.hasAdvance);

    const [quickDesc, setQuickDesc] = useState('');
    const [quickVal, setQuickVal] = useState('');
    const [quickCycle, setQuickCycle] = useState<'day_05' | 'day_20'>('day_05');
    const [quickType, setQuickType] = useState<'expense' | 'income'>('expense');

    // Navigation handlers
    const changeMonth = (direction: 'prev' | 'next') => {
        const [year, month] = state.viewDate.split('-').map(Number);
        const currentDate = new Date(year, month - 1, 1);
        if (direction === 'prev') {
            currentDate.setMonth(currentDate.getMonth() - 1);
        } else {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        const newMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        setViewDate(newMonthStr);
    };

    const resetToToday = () => {
        const today = new Date();
        const todayMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        setViewDate(todayMonthStr);
    };

    const currentMonthLabel = useMemo(() => {
        if (!state.viewDate) return '';
        const [year, month] = state.viewDate.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        return format(date, 'MMMM yyyy', { locale: ptBR });
    }, [state.viewDate]);


    // Auto-cálculo parcelas
    useEffect(() => {
        if (isInstallment && instVal && instCount) {
            const val = parseMoney(instVal);
            const count = parseInt(instCount);
            if (val > 0 && count > 0) {
                const total = val * count;
                setDebtAmount(formatMoney(total.toFixed(2)));
            }
        }
    }, [instVal, instCount, isInstallment]);
    
    // Efeito para placeholder dinâmico da categoria
    useEffect(() => {
        if (showSettings) {
            const categoryNames = state.categories.filter(c => c.type === 'expense').map(c => c.name);
            if (categoryNames.length > 0) {
                const randomIndex = Math.floor(Math.random() * categoryNames.length);
                setCategoryPlaceholder(`Ex: ${categoryNames[randomIndex]}`);
            } else {
                setCategoryPlaceholder('Ex: Alimentação'); // Fallback
            }
        }
    }, [showSettings, state.categories]);

    // Efeito para fechar modais com botão voltar do navegador/celular
    useEffect(() => {
        const handleBackPress = () => {
            if (showSettings) setShowSettings(false);
            if (showImporter) setShowImporter(false);
            if (showHelpModal) setShowHelpModal(false);
        };

        window.addEventListener('popstate', handleBackPress);

        return () => {
            window.removeEventListener('popstate', handleBackPress);
        };
    }, [showSettings, showImporter, showHelpModal]);

    // Backup & Restore
    const handleExportBackup = () => {
        const dataStr = JSON.stringify(state);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `backup-financeiro-${new Date().toISOString().split('T')[0]}.json`;
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (event.target.files && event.target.files.length > 0) {
            fileReader.readAsText(event.target.files[0], "UTF-8");
            fileReader.onload = (e) => {
                if (e.target?.result) {
                    try {
                        const parsed = JSON.parse(e.target.result as string);
                        if (parsed.cycles && parsed.categories && parsed.settings) {
                            localStorage.setItem('finance_db_v7', JSON.stringify(parsed));
                            window.location.reload();
                        } else {
                            toast.error("Arquivo de backup inválido.");
                        }
                    } catch (error) {
                        toast.error("Erro ao ler arquivo.");
                    }
                }
            };
        }
    };

    // Helpers
    const getCycleStats = (debts: Debt[], transactions: any[]) => {
        const activeDebts = debts.filter(d => d.currentInstallment >= 1);
        const inc = transactions.reduce((a, b) => a + b.amount, 0);
        const exp = activeDebts.reduce((a, b) => a + b.installmentAmount, 0);
        const cats: any = {};
        activeDebts.forEach(d => { const c = d.category || 'Outros'; cats[c] = (cats[c] || 0) + d.installmentAmount; });
        const chartData = Object.entries(cats).map(([name, value]) => ({ name, value: Number(value) }));
        return { inc, exp, bal: inc - exp, chartData };
    };

    const currentMonthCycles = useMemo(() => {
        return getCyclesForMonth(state.viewDate);
    }, [state.viewDate, state.cycles, getCyclesForMonth]);

    const currentMonthStats = useMemo(() => {
        const c1Data = currentMonthCycles[0] || { debts: [], transactions: [] };
        const c2Data = currentMonthCycles[1] || { debts: [], transactions: [] };

        const c1 = getCycleStats(c1Data.debts, c1Data.transactions);
        const c2 = getCycleStats(c2Data.debts, c2Data.transactions);
        return { c1, c2 };
    }, [currentMonthCycles]);

    const totalMonthStats = useMemo(() => {
        const totalIncomes = (currentMonthStats.c1.inc || 0) + (currentMonthStats.c2.inc || 0);
        const totalExpenses = (currentMonthStats.c1.exp || 0) + (currentMonthStats.c2.exp || 0);
        const balance = totalIncomes - totalExpenses;
        return { totalIncomes, totalExpenses, balance };
    }, [currentMonthStats]);

    const monthItems = useMemo(() => {
        const c1Data = currentMonthCycles[0] || { debts: [], transactions: [] };
        const c2Data = currentMonthCycles[1] || { debts: [], transactions: [] };

        const incomes = [...c1Data.transactions, ...c2Data.transactions];
        const debts = [...c1Data.debts, ...c2Data.debts].filter(d => d.currentInstallment >= 1);
        return { incomes, debts };
    }, [currentMonthCycles]);

    const projectionData = useMemo(() => {
        if (!state.cycles) return [];
        const arr = [];
        const [viewYear, viewMonth] = state.viewDate.split('-').map(Number);
        const viewDate = new Date(viewYear, viewMonth - 1, 1);

        const allDebts = state.cycles.flatMap(c => c.debts);
        const allIncomes = state.cycles.flatMap(c => c.transactions);
        const fixedIncomes = allIncomes.filter(t => t.isFixed);

        for (let i = 0; i < 6; i++) {
            const fDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + i, 1);
            const mLabel = `${MONTHS_FULL[fDate.getMonth()]} ${fDate.getFullYear()}`;
            const cycle1Debts: any[] = [];
            const cycle2Debts: any[] = [];
            
            const monthStr = `${fDate.getFullYear()}-${String(fDate.getMonth() + 1).padStart(2, '0')}`;

            allDebts.forEach(d => {
                let active = false;
                let val = d.installmentAmount;
                let curr = 0;

                if (d.isFixed) {
                    active = true;
                    curr = 0;
                } else if(d.purchaseDate){
                    const debtStartDate = new Date(d.purchaseDate);
                    const monthDiff = (fDate.getFullYear() - debtStartDate.getFullYear()) * 12 + (fDate.getMonth() - debtStartDate.getMonth());
                    const projectedInstallment = monthDiff + 1;

                    if (projectedInstallment >= 1 && projectedInstallment <= d.totalInstallments) {
                        active = true;
                        curr = projectedInstallment;
                    }
                }

                if (active) {
                    const item = { ...d, currentDisplay: curr, displayVal: val };
                    if (d.cycle === 'day_05') cycle1Debts.push(item);
                    else cycle2Debts.push(item);
                }
            });

            const c1Incomes = fixedIncomes.filter(t => t.cycle === 'day_05');
            const c2Incomes = fixedIncomes.filter(t => t.cycle === 'day_20');
            
            const c1 = getCycleStats(cycle1Debts, c1Incomes);
            const c2 = getCycleStats(cycle2Debts, c2Incomes);

            arr.push({ label: mLabel, date: fDate, cycle1: { items: cycle1Debts, ...c1, incomes: c1Incomes }, cycle2: { items: cycle2Debts, ...c2, incomes: c2Incomes }, totalBal: c1.bal + c2.bal });
        }
        return arr;
    }, [state.cycles, state.viewDate]);


    // Actions
    const saveConfig = () => {
        updateSettings({ salaryDay: Number(confSal), hasAdvance: hasAdv, advanceDay: Number(confAdv) });
        setShowSettings(false);
        toast.success("Configurações salvas!");
    }

    const addInc = () => {
        const val = parseAmount(incomeAmount);
        if (!incomeName || val <= 0) return toast.error("Preencha campos corretamente.");
        
        const [year, month] = state.viewDate.split('-').map(Number);
        let targetDate = new Date(year, month - 1, 10);

        addTransaction({ description: incomeName, amount: val, type: 'income', category: 'Salário', date: targetDate.toISOString(), isFixed: isIncomeFixed, cycle: state.settings.hasAdvance ? incomeCycle : 'day_05' });
        setIncomeName(''); setIncomeAmount(''); toast.success("Renda adicionada");
    }

    const addExp = () => {
        const total = parseAmount(debtAmount);
        if (!debtName || !debtCat || total <= 0) return toast.error("Preencha Nome, Categoria e Valor corretamente.");
        let finalInst = total;
        let finalTotal = 1;
        let fName = debtName;
        if (isInstallment && !isFixed) {
            const iVal = parseAmount(instVal);
            const count = parseInt(instCount);
            if (iVal <= 0 || !count) return toast.error("Parcelamento inválido");
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

    const handleDeleteData = (range: 'all' | '2months' | '6months') => {
        if (confirm("Tem certeza?")) { clearDatabase(range); toast.success("Dados apagados"); }
    }

    const openEditDebt = (d: Debt) => { setEditingItem({ ...d }); setEditType('debt'); setIsEditModalOpen(true); }
    const openEditInc = (t: Transaction) => { setEditingItem({ ...t }); setEditType('income'); setIsEditModalOpen(true); }

    const saveEdit = (updated: any) => {
        if (updated && 'id' in updated) {
             if (editType === 'debt') {
                updateDebt(updated.id, updated);
            } else {
                updateTransaction(updated.id, updated);
            }
        }
        setIsEditModalOpen(false); 
        setEditingItem(null); 
        toast.success("Salvo");
    }

    const quickAddProj = (monthIdx: number, dateObj: Date) => {
        const val = parseAmount(quickVal);
        if (!quickDesc || val <= 0) return;

        if (quickType === 'expense') {
            addDebt({
                name: quickDesc, totalAmount: val, installmentAmount: val,
                dueDate: 'Previsto', purchaseDate: dateObj.toISOString(),
                currentInstallment: 1,
                totalInstallments: 1, isFixed: false,
                billingMonth: MONTHS_FULL[dateObj.getMonth()], category: 'Outros', cycle: quickCycle,
                needsReview: true
            });
            toast.success("Saída prevista adicionada");
        } else {
             addTransaction({ 
                description: quickDesc, amount: val, type: 'income', category: 'Outros', 
                date: dateObj.toISOString(), isFixed: false, cycle: quickCycle,
                needsReview: true
            });
            toast.success("Entrada prevista adicionada");
        }
        
        setQuickDesc(''); setQuickVal(''); 
    }

    return (
        <div className="space-y-6 pb-24 relative">
            {/* Header / Tabs */}
            <div className="flex flex-col items-center gap-4 mb-6">
                 <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border">
                    <Button variant="ghost" size="icon" onClick={() => changeMonth('prev')}><ChevronLeft className="h-5 w-5 text-slate-600" /></Button>
                    <button onClick={resetToToday} className="text-center w-40 font-bold text-lg capitalize text-slate-700 hover:text-blue-600 transition-colors">
                        {currentMonthLabel}
                    </button>
                    <Button variant="ghost" size="icon" onClick={() => changeMonth('next')}><ChevronRight className="h-5 w-5 text-slate-600" /></Button>
                 </div>

                <div className="w-full flex justify-center items-center relative">
                    <div className="flex-1"></div>
                    <div className="flex-1 flex justify-center">
                        <div className="bg-slate-200 p-1 rounded-full flex gap-1 shadow-inner">
                            <button onClick={() => setActiveTab('current')} className={`px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'current' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Mês Atual</button>
                            <button onClick={() => setActiveTab('projection')} className={`px-4 md:px-6 py-2 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'projection' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}>Projeção</button>
                        </div>
                    </div>
                    <div className="flex-1 flex justify-end">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:bg-slate-100" onClick={() => setShowHelpModal(true)}><HelpCircle className="h-5 w-5" /></Button>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:bg-slate-100" onClick={() => setShowSettings(!showSettings)}><Settings className="h-5 w-5" /></Button>
                    </div>
                </div>
            </div>

            {/* Importer Modal */}
            {showImporter && <UniversalImporter onImport={(items) => { addBatchedTransactions(items); toast.success(`${items.length} itens importados!`); }} onClose={() => setShowImporter(false)} />}

            {/* Configurações Modal */}
            {showSettings && (
                <div onClick={() => setShowSettings(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-50">
                    <Card onClick={(e) => e.stopPropagation()} className="w-full max-w-lg bg-white shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <CardHeader className="flex flex-row justify-between items-center pb-2 sticky top-0 bg-white z-10 border-b">
                            <CardTitle>Configurações</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}><X /></Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* BACKUP SECTION */}
                            <div className="border-b pb-4">
                                <Label className="mb-2 block">Backup & Segurança</Label>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={handleExportBackup} className="flex-1 text-slate-700">
                                        <Download className="h-4 w-4 mr-2"/> Exportar Backup
                                    </Button>
                                    <div className="flex-1 relative">
                                        <input type="file" accept=".json" onChange={handleImportBackup} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <Button variant="outline" size="sm" className="w-full text-slate-700">
                                            <RotateCcw className="h-4 w-4 mr-2"/> Restaurar Backup
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-4">
                                <div><Label>Dia Salário</Label><Input type="number" value={confSal} onChange={e => setConfSal(Number(e.target.value))} /></div>
                                {hasAdv && <div><Label>Dia Vale</Label><Input type="number" value={confAdv} onChange={e => setConfAdv(Number(e.target.value))} /></div>}
                                <div className="flex items-center gap-2 pt-6"><input type="checkbox" checked={hasAdv} onChange={e => setHasAdv(e.target.checked)} className="w-5 h-5 accent-blue-600" /><Label>Recebe Vale?</Label></div>
                            </div>
                            <div className="border-t pt-4">
                                <Label className="mb-2 block">Categorias & Cores</Label>
                                <div className="flex gap-2 mb-3 items-center">
                                    <label>
                                        <div className="w-12 h-10 p-1 border rounded-md cursor-pointer" style={{ backgroundColor: newCatColor }}></div>
                                        <Input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} className="w-0 h-0 opacity-0 absolute" />
                                    </label>
                                    <Input placeholder="#Hex" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} className="w-24" />
                                    <Input placeholder={categoryPlaceholder} value={newCatName} onChange={e => setNewCatName(e.target.value)} className="flex-1" />
                                    <Button onClick={() => { if (newCatName) { addCategory(newCatName, 'expense', newCatColor); setNewCatName(''); } }}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {state.categories.map(c => (
                                        <span key={c.id} className="text-xs px-2 py-1 bg-slate-100 rounded-full flex items-center gap-1 border">
                                            <div className="w-3 h-3 rounded-full border border-black/10 cursor-pointer" style={{ background: c.color }} title={c.color}></div>
                                            {c.name}
                                            <X className="h-3 w-3 cursor-pointer text-slate-400 hover:text-red-500" onClick={() => removeCategory(c.id)} />
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-between items-center border-t pt-4">
                                <Button variant="outline" size="sm" onClick={() => handleDeleteData('all')} className="text-red-600 border-red-200">Reset Total</Button>
                                <Button className="bg-blue-600" onClick={saveConfig}>Salvar Tudo</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Edit Modal (Replaces inline modal) */}
            <EditDebtModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} item={editingItem} type={editType} onSave={saveEdit} />

            {/* TAB: MÊS ATUAL */}
            {activeTab === 'current' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className={`grid grid-cols-1 ${state.settings.hasAdvance ? 'md:grid-cols-2' : ''} gap-4`}>
                        <CycleSection
                            title={`Ciclo ${state.settings.salaryDay}`} stats={currentMonthStats.c1} items={currentMonthCycles[0]?.debts || []} incomes={currentMonthCycles[0]?.transactions || []}
                            colorClass="bg-blue-50 border-blue-100" cycleType="day_05" hasAdvance={state.settings.hasAdvance} categories={state.categories}
                            onEditDebt={openEditDebt} onEditInc={openEditInc} onDeleteDebt={deleteDebt} onDeleteInc={deleteTransaction} onMove={switchCycle}
                            onToggleDebt={toggleDebtStatus} onToggleInc={toggleTransactionStatus}
                        />
                        {state.settings.hasAdvance && <CycleSection
                            title={`Ciclo ${state.settings.advanceDay}`} stats={currentMonthStats.c2} items={currentMonthCycles[1]?.debts || []} incomes={currentMonthCycles[1]?.transactions || []}
                            colorClass="bg-emerald-50 border-emerald-100" cycleType="day_20" hasAdvance={state.settings.hasAdvance} categories={state.categories}
                            onEditDebt={openEditDebt} onEditInc={openEditInc} onDeleteDebt={deleteDebt} onDeleteInc={deleteTransaction} onMove={switchCycle}
                            onToggleDebt={toggleDebtStatus} onToggleInc={toggleTransactionStatus}
                        />}
                    </div>

                    <Card className="border-t-4 border-t-slate-800 shadow-sm">
                        <CardHeader className="pb-2"><CardTitle className="text-base uppercase tracking-wide text-slate-600">Novo Lançamento</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            {/* BOTÃO DE IMPORTAÇÃO ESTRATÉGICO */}
                            <div className="flex justify-center -mt-2 mb-2">
                                <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full md:w-auto" onClick={() => setShowImporter(true)}>
                                    <Upload className="h-4 w-4 mr-2"/> Importação Massiva
                                </Button>
                            </div>

                            <div className="p-4 bg-green-50 rounded-lg border border-green-100 transition-all hover:shadow-sm">
                                <div className="flex flex-col md:flex-row gap-3 items-end">
                                    <div className="w-full"><Label className="text-xs text-green-800 font-bold mb-1 block">DESCRIÇÃO RENDA</Label><Input placeholder="Ex: Salário" value={incomeName} onChange={e => setIncomeName(e.target.value)} className="bg-white border-green-200 focus:border-green-500" /></div>
                                    <div className="w-full md:w-40"><Label className="text-xs text-green-800 font-bold mb-1 block">VALOR</Label><Input type="text" inputMode="decimal" placeholder="0,00" value={incomeAmount} onChange={handleAmountChange(setIncomeAmount)} className="bg-white border-green-200 text-green-700 font-bold" /></div>
                                    <Button className="w-full md:w-auto bg-green-600 hover:bg-green-700" onClick={addInc}><Plus className="h-4 w-4" /></Button>
                                </div>
                                <div className="mt-2 flex items-center gap-4"><label className="flex items-center gap-2 text-xs font-medium text-green-800"><input type="checkbox" checked={isIncomeFixed} onChange={e => setIsIncomeFixed(e.target.checked)} className="accent-green-600" /> Fixa?</label>{state.settings.hasAdvance && <select className="text-xs bg-transparent" value={incomeCycle} onChange={(e: any) => setIncomeCycle(e.target.value)}><option value="day_05">Dia {state.settings.salaryDay}</option><option value="day_20">Dia {state.settings.advanceDay}</option></select>}</div>
                            </div>

                            <div className="p-4 bg-red-50 rounded-lg border border-red-100 transition-all hover:shadow-sm">
                                <div className="grid grid-cols-12 gap-3 items-end">
                                    <div className="col-span-12 md:col-span-4"><Label className="text-[10px] text-red-800 font-bold mb-1 block">NOME CONTA</Label><Input placeholder="Ex: Luz" value={debtName} onChange={e => setDebtName(e.target.value)} className="bg-white border-red-200" /></div>
                                    <div className="col-span-6 md:col-span-3"><Label className="text-[10px] text-red-800 font-bold mb-1 block">TOTAL</Label><Input type="text" inputMode="decimal" placeholder="0,00" value={debtAmount} onChange={handleAmountChange(setDebtAmount)} className="bg-white border-red-200 font-bold text-red-700" /></div>
                                    <div className="col-span-6 md:col-span-3"><Label className="text-[10px] text-red-800 font-bold mb-1 block">{isFixed ? 'VENCIMENTO' : 'DATA COMPRA'}</Label><Input type="date" value={debtDate} onChange={e => setDebtDate(e.target.value)} className="bg-white border-red-200 text-xs" /></div>
                                    <div className="col-span-12 md:col-span-2"><Label className="text-[10px] text-red-800 font-bold mb-1 block">CAT (Obrigatório)</Label><select className="w-full h-10 border rounded bg-white px-1 text-xs border-red-200" value={debtCat} onChange={e => setDebtCat(e.target.value)}><option value="">-</option>{state.categories.filter(c => c.type === 'expense').map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 mt-3 bg-white p-2 rounded border border-red-100">
                                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer"><input type="checkbox" checked={isFixed} onChange={e => { setIsFixed(e.target.checked); setIsInstallment(false) }} className="w-4 h-4 accent-red-600" /> Fixa?</label>
                                    <div className="w-px h-4 bg-slate-200"></div>
                                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer"><input type="checkbox" checked={isInstallment} onChange={e => { setIsInstallment(e.target.checked); setIsFixed(false) }} className="w-4 h-4 accent-red-600" /> Parcelada?</label>
                                    <div className="w-px h-4 bg-slate-200"></div>
                                    <select className="text-xs border-none bg-transparent font-medium text-slate-600 focus:ring-0 cursor-pointer" value={debtMethod} onChange={e => setDebtMethod(e.target.value)}><option value="">Forma Pagto</option><option value="Cartão">Cartão</option><option value="Pix">Pix</option><option value="Boleto">Boleto</option></select>
                                    {state.settings.hasAdvance && (<><div className="w-px h-4 bg-slate-200"></div><select className="text-xs border-none bg-transparent font-medium text-slate-600 focus:ring-0 cursor-pointer" value={debtCycle} onChange={(e: any) => setDebtCycle(e.target.value)}><option value="day_05">Pagar dia {state.settings.salaryDay}</option><option value="day_20">Pagar dia {state.settings.advanceDay}</option></select></>)}
                                </div>
                                {isInstallment && <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 animate-in slide-in-from-top-2"><div><Label className="text-[10px] text-red-400 font-bold">QTD PARC.</Label><Input type="number" placeholder="10" value={instCount} onChange={e => setInstCount(e.target.value)} className="h-8 text-xs" /></div><div><Label className="text-[10px] text-red-400 font-bold">VALOR PARC.</Label><Input type="text" inputMode="decimal" placeholder="0,00" value={instVal} onChange={handleAmountChange(setInstVal)} className="h-8 text-xs" /></div><div><Label className="text-[10px] text-red-400 font-bold">1ª FATURA</Label><select className="h-8 w-full text-xs border rounded bg-white px-1" value={billingMonth} onChange={e => setBillingMonth(e.target.value)}>{MONTHS_FULL.map(m => <option key={m} value={m}>{m}</option>)}</select></div></div>}
                                <Button className="w-full bg-red-600 hover:bg-red-700 mt-2" onClick={addExp}><Minus className="h-4 w-4 mr-2" /> Lançar Saída</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="mt-8 border-t-4 border-slate-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base text-slate-700">Resumo Geral do Mês</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Seção de Receitas */}
                            <div className="p-3 bg-green-50 rounded-lg border border-green-100 cursor-pointer transition-all hover:bg-green-100/60" onClick={() => setExpandedSummary(prev => prev === 'incomes' ? null : 'incomes')}>
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-green-800">Total de Receitas</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg text-green-600">{formatCurrencyBRL(totalMonthStats.totalIncomes)}</span>
                                        {expandedSummary === 'incomes' ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                                    </div>
                                </div>
                            </div>
                            {expandedSummary === 'incomes' && (
                                <div className="animate-in fade-in-50 pt-2 pl-4 pr-2 pb-2 space-y-2 max-h-60 overflow-y-auto rounded-b-lg bg-green-50/50 border-x border-b border-green-100">
                                    {monthItems.incomes.map((inc) => (
                                        <div key={inc.id} className="flex justify-between items-center bg-white/50 p-2 rounded text-xs">
                                            <span className="font-medium text-green-900">{inc.description}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold text-green-700">{formatCurrencyBRL(inc.amount)}</span>
                                                <div className="flex gap-1.5">
                                                    <Pencil className="h-3.5 w-3.5 text-blue-400 cursor-pointer" onClick={(e) => { e.stopPropagation(); openEditInc(inc); }} />
                                                    <Trash2 className="h-3.5 w-3.5 text-red-400 cursor-pointer" onClick={(e) => { e.stopPropagation(); deleteTransaction(inc.id); }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {monthItems.incomes.length === 0 && <p className="text-center text-xs text-slate-400 py-2">Nenhuma entrada este mês.</p>}
                                </div>
                            )}

                            {/* Seção de Dívidas */}
                            <div className="p-3 bg-red-50 rounded-lg border border-red-100 cursor-pointer transition-all hover:bg-red-100/60" onClick={() => setExpandedSummary(prev => prev === 'debts' ? null : 'debts')}>
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-red-800">Total de Dívidas</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg text-red-600">-{formatCurrencyBRL(totalMonthStats.totalExpenses)}</span>
                                        {expandedSummary === 'debts' ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                                    </div>
                                </div>
                            </div>
                            {expandedSummary === 'debts' && (
                                <div className="animate-in fade-in-50 pt-2 pl-4 pr-2 pb-2 space-y-2 max-h-60 overflow-y-auto rounded-b-lg bg-red-50/50 border-x border-b border-red-100">
                                    {monthItems.debts.map((debt) => (
                                         <div key={debt.id} className="flex justify-between items-center bg-white/50 p-2 rounded text-xs">
                                             <div className="flex-1">
                                                 <span className="font-medium text-red-900">{debt.name}</span>
                                                 <span className="text-[10px] text-slate-400 ml-2">({debt.category || 'Outros'})</span>
                                             </div>
                                             <div className="flex items-center gap-3">
                                                 <span className="font-bold text-red-700">-{formatCurrencyBRL(debt.installmentAmount)}</span>
                                                 <div className="flex gap-1.5">
                                                     <Pencil className="h-3.5 w-3.5 text-blue-400 cursor-pointer" onClick={(e) => { e.stopPropagation(); openEditDebt(debt); }} />
                                                     <Trash2 className="h-3.5 w-3.5 text-red-400 cursor-pointer" onClick={(e) => { e.stopPropagation(); deleteDebt(debt.id); }} />
                                                 </div>
                                             </div>
                                         </div>
                                    ))}
                                    {monthItems.debts.length === 0 && <p className="text-center text-xs text-slate-400 py-2">Nenhuma saída este mês.</p>}
                                </div>
                            )}

                            {/* Seção de Balanço */}
                            <div className="flex justify-between items-center p-4 bg-slate-100 rounded-lg mt-2 border-t-2">
                                <span className="font-bold text-slate-800">Balanço do Mês</span>
                                <span className={`font-bold text-xl ${totalMonthStats.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{formatCurrencyBRL(totalMonthStats.balance)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* TAB: PROJEÇÃO */}
            {activeTab === 'projection' && (
                <div className="flex flex-col gap-6 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {projectionData.map((m, idx) => (
                            <Card key={idx} className={`transition-all duration-300 border-t-4 ${m.totalBal >= 0 ? 'border-t-green-500' : 'border-t-red-500'} ${expandedMonthIndex === idx ? 'md:col-span-2 xl:col-span-3 ring-4 ring-blue-100 shadow-2xl z-10' : 'hover:shadow-lg bg-slate-50/50'}`}>
                                <CardHeader className="bg-white pb-4 cursor-pointer rounded-t-xl" onClick={() => setExpandedMonthIndex(expandedMonthIndex === idx ? null : idx)}>
                                    <div className="flex justify-between items-center">
                                        <div><CardTitle className="text-lg font-black text-slate-700 uppercase tracking-tight">{m.label}</CardTitle><p className="text-xs text-slate-400 mt-1">{m.cycle1.items.length + m.cycle2.items.length} contas previstas</p></div>
                                        <div className="text-right">
                                            <span className={`block text-2xl font-bold ${m.totalBal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrencyBRL(m.totalBal)}</span>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Saldo Previsto</span>
                                        </div>
                                        <div className="text-slate-400">{expandedMonthIndex === idx ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</div>
                                    </div>
                                </CardHeader>
                                {expandedMonthIndex === idx && (
                                    <CardContent className="pt-4 bg-white rounded-b-xl">
                                        <div className={`grid grid-cols-1 ${state.settings.hasAdvance ? 'md:grid-cols-2' : ''} gap-6`}>
                                            <CycleSection 
                                                title={`Ciclo ${state.settings.salaryDay}`} stats={m.cycle1} items={m.cycle1.items} incomes={m.cycle1.incomes} 
                                                colorClass="bg-blue-50/50" cycleType="day_05" hasAdvance={state.settings.hasAdvance} categories={state.categories} 
                                                onEditDebt={openEditDebt} onEditInc={openEditInc} onDeleteDebt={deleteDebt} onDeleteInc={deleteTransaction} onMove={switchCycle} 
                                                isProjection onToggleDebt={toggleDebtStatus} onToggleInc={toggleTransactionStatus}
                                            />
                                            {state.settings.hasAdvance && <CycleSection 
                                                title={`Ciclo ${state.settings.advanceDay}`} stats={m.cycle2} items={m.cycle2.items} incomes={m.cycle2.incomes} 
                                                colorClass="bg-emerald-50/50" cycleType="day_20" hasAdvance={state.settings.hasAdvance} categories={state.categories} 
                                                onEditDebt={openEditDebt} onEditInc={openEditInc} onDeleteDebt={deleteDebt} onDeleteInc={deleteTransaction} onMove={switchCycle} 
                                                isProjection onToggleDebt={toggleDebtStatus} onToggleInc={toggleTransactionStatus}
                                            />}
                                        </div>
                                        {/* QUICK ADD ENHANCED */}
                                        <div className="mt-4 pt-3 border-t bg-slate-50 p-2 rounded-lg flex flex-col gap-2">
                                            <div className="flex justify-center gap-4 mb-1">
                                                <button onClick={() => setQuickType('expense')} className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full transition-colors ${quickType === 'expense' ? 'bg-red-100 text-red-700' : 'text-slate-400 hover:bg-slate-100'}`}>Saída</button>
                                                <button onClick={() => setQuickType('income')} className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full transition-colors ${quickType === 'income' ? 'bg-green-100 text-green-700' : 'text-slate-400 hover:bg-slate-100'}`}>Entrada</button>
                                            </div>
                                            <div className="flex gap-2 items-center">
                                                <div className="flex gap-2 flex-1">
                                                    <Input placeholder={quickType === 'expense' ? "Nova Conta" : "Nova Renda"} value={quickDesc} onChange={e => setQuickDesc(e.target.value)} className="h-9 text-xs bg-white flex-1" />
                                                    <Input type="text" inputMode="decimal" placeholder="0,00" value={quickVal} onChange={handleAmountChange(setQuickVal)} className="h-9 text-xs bg-white w-24 font-bold" />
                                                    {state.settings.hasAdvance && <select className="h-9 text-xs border rounded px-1 bg-white" value={quickCycle} onChange={(e: any) => setQuickCycle(e.target.value)}><option value="day_05">Dia {state.settings.salaryDay}</option><option value="day_20">Dia {state.settings.advanceDay}</option></select>}
                                                    <Button size="sm" className={`h-9 ${quickType === 'expense' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`} onClick={() => quickAddProj(idx, m.date)}>
                                                        {quickType === 'expense' ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal de Ajuda */}
            {showHelpModal && (
                <div onClick={() => setShowHelpModal(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-50">
                    <Card onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-white shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                        <CardHeader className="flex flex-row justify-between items-center pb-2 sticky top-0 bg-white z-10 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <HelpCircle className="text-blue-600" />
                                Manual do Aplicativo
                            </CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setShowHelpModal(false)}><X /></Button>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6 text-sm text-slate-700 overflow-y-auto">
                            <h3 className="font-bold text-base text-slate-800">Bem-vindo ao seu Gerenciador Financeiro!</h3>
                            <p>Este manual te guiará pelas principais funcionalidades do aplicativo, projetado para simplificar e automatizar a gestão das suas finanças.</p>
                            
                            <div className="pt-4">
                                <h4 className="font-bold text-slate-800 border-b pb-1 mb-2">Visão Geral: Planejamento vs. Importar</h4>
                                <p className="text-xs text-slate-600">O app tem duas telas principais:</p>
                                <ul className="list-disc list-inside space-y-2 mt-2 text-xs">
                                    <li><strong>Planejamento:</strong> O coração do app, onde você gerencia suas finanças mês a mês, vê projeções e adiciona transações manualmente.</li>
                                    <li><strong>Importar:</strong> Uma ferramenta poderosa para ler extratos bancários (em PDF ou texto), categorizar transações automaticamente e importá-las em lote.</li>
                                </ul>
                            </div>

                            <div className="pt-4">
                                <h4 className="font-bold text-slate-800 border-b pb-1 mb-2">Tela de Planejamento</h4>
                                <dl className="space-y-3 text-xs">
                                    <div>
                                        <dt className="font-semibold text-slate-800">1. Ciclos de Pagamento</dt>
                                        <dd className="pl-4 text-slate-600">Suas finanças são divididas em dois ciclos, baseados nos dias de <strong>Salário</strong> e <strong>Vale</strong> que você define nas Configurações (⚙️). Cada despesa é alocada ao ciclo de pagamento mais próximo, ajudando a visualizar o que pagar com cada entrada de dinheiro.</dd>
                                    </div>
                                     <div>
                                        <dt className="font-semibold text-slate-800">2. Mês Atual vs. Projeção</dt>
                                        <dd className="pl-4 text-slate-600">Use os botões para alternar entre a visão do <strong>Mês Atual</strong> (com todos os detalhes) e a <strong>Projeção</strong> para os próximos 6 meses. A projeção calcula saldos futuros com base em todas as suas dívidas e rendas conhecidas.</dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-slate-800">3. Adicionar Rendas e Despesas</dt>
                                        <dd className="pl-4 text-slate-600">Use a seção "Novo Lançamento" para adicionar suas receitas e saídas. Você pode marcar uma despesa como <strong>Fixa</strong> (ex: Aluguel, que se repete todo mês na projeção) ou <strong>Parcelada</strong>.</dd>
                                    </div>
                                     <div>
                                        <dt className="font-semibold text-slate-800">4. Quick Add na Projeção</dt>
                                        <dd className="pl-4 text-slate-600">Dentro de um card de mês futuro na Projeção, você pode usar o mini-formulário para adicionar rapidamente uma renda ou despesa que ocorrerá naquele mês específico.</dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="pt-4">
                                <h4 className="font-bold text-slate-800 border-b pb-1 mb-2">Tela de Importação</h4>
                                <dl className="space-y-3 text-xs">
                                    <div>
                                        <dt className="font-semibold text-slate-800">1. Carregue seu Extrato</dt>
                                        <dd className="pl-4 text-slate-600">Você pode <strong>carregar um arquivo PDF</strong> do seu banco ou <strong>colar o texto</strong> do extrato diretamente na caixa de texto.</dd>
                                    </div>
                                     <div>
                                        <dt className="font-semibold text-slate-800">2. Transcreva e Revise</dt>
                                        <dd className="pl-4 text-slate-600">Clique em "Transcrever". O app irá ler o extrato, identificar as transações e tentar categorizá-las. Ele também <strong>detecta transações duplicadas</strong> que você já tenha no seu planejamento.</dd>
                                    </div>
                                    <div>
                                        <dt className="font-semibold text-slate-800">3. Edite e Confirme</dt>
                                        <dd className="pl-4 text-slate-600">Na tabela de revisão, você pode corrigir nomes e categorias. O app aprende com suas correções! Quando tudo estiver certo, clique em "Confirmar" para salvar tudo de uma vez.</dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="pt-4">
                                <h4 className="font-bold text-slate-800 border-b pb-1 mb-2">Configurações (⚙️)</h4>
                                <ul className="list-disc list-inside space-y-2 text-xs">
                                    <li>Defina os dias de Salário e Vale.</li>
                                    <li>Adicione, remova e personalize as cores das suas categorias de despesa.</li>
                                    <li>Faça <strong>Backup</strong> (exportar) ou <strong>Restaure</strong> (importar) todos os seus dados com um arquivo JSON.</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};
