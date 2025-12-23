"use client";
import React, { useState } from 'react';
import { FinancialProvider } from '@/context/FinancialContext';
import { PlanningScreen } from '@/components/screens/PlanningScreen';
import { AnalysisScreen } from '@/components/screens/AnalysisScreen';

export default function Home() {
  const [screen, setScreen] = useState<'planning'|'analysis'>('planning');
  return (
    <FinancialProvider>
      <main className="min-h-screen bg-slate-100/50 pb-10">
        <div className="bg-white shadow-sm border-b mb-6 sticky top-0 z-40">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <h1 className="text-lg font-black text-slate-800 tracking-tighter uppercase">Planejamento<span className="text-blue-600">Financeiro</span></h1>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={()=>setScreen('planning')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${screen==='planning'?'bg-white shadow text-slate-900':'text-slate-500 hover:text-slate-700'}`}>Planejamento</button>
                    <button onClick={()=>setScreen('analysis')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${screen==='analysis'?'bg-white shadow text-slate-900':'text-slate-500 hover:text-slate-700'}`}>Importar</button>
                </div>
            </div>
        </div>
        <div className="container mx-auto px-4 max-w-7xl">
            <div className="animate-in fade-in zoom-in-95 duration-300">
                {screen === 'planning' ? <PlanningScreen /> : <AnalysisScreen onFinish={()=>setScreen('planning')} />}
            </div>
        </div>
      </main>
    </FinancialProvider>
  );
}