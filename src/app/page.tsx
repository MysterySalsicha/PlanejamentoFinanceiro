"use client";
import React, { useState } from 'react';
import { FinancialProvider } from '@/context/FinancialContext';
import { PlanningScreen } from '@/components/screens/PlanningScreen';
import { AnalysisScreen } from '@/components/screens/AnalysisScreen';

export default function Home() {
  const [screen, setScreen] = useState<'planning'|'analysis'>('planning');

  const scrollToTop = () => {
    // Find the main scrolling element and scroll it to the top
    const mainContent = document.querySelector('main');
    if (mainContent) {
        mainContent.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <FinancialProvider>
      <div className="h-screen flex flex-col bg-slate-100/50">
        {/* Header Estático */}
        <header className="bg-white shadow-sm border-b">
            <div className="container mx-auto px-4 px-safe py-3 pt-8 flex flex-col items-center justify-center">
                <h1 onClick={scrollToTop} className="cursor-pointer text-lg font-black text-slate-800 tracking-tighter uppercase mb-2">Planejamento<span className="text-blue-600">Financeiro</span></h1>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={()=>setScreen('planning')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${screen==='planning'?'bg-white shadow text-slate-900':'text-slate-500 hover:text-slate-700'}`}>Planejamento</button>
                    <button onClick={()=>setScreen('analysis')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${screen==='analysis'?'bg-white shadow text-slate-900':'text-slate-500 hover:text-slate-700'}`}>Importar</button>
                </div>
            </div>
        </header>

        {/* Conteúdo Rolável */}
        <main className="flex-grow overflow-y-auto">
            <div className="container mx-auto px-4 px-safe max-w-7xl pt-6">
                <div className="animate-in fade-in zoom-in-95 duration-300">
                    {screen === 'planning' ? <PlanningScreen /> : <AnalysisScreen onFinish={()=>setScreen('planning')} />}
                </div>
            </div>
        </main>
      </div>
    </FinancialProvider>
  );
}