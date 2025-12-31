import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, HelpCircle } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal = ({ onClose }: HelpModalProps) => {
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-50">
      <Card onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-white shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <CardHeader className="flex flex-row justify-between items-center pb-2 sticky top-0 bg-white z-10 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="text-blue-600" />
            Manual do Aplicativo
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}><X /></Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-6 text-sm text-slate-700 overflow-y-auto">
          <h3 className="font-bold text-base text-slate-800">Bem-vindo ao seu Controle Financeiro!</h3>
          <p>Este aplicativo foi projetado para simplificar a gestão das suas finanças pessoais, organizando suas contas em torno dos seus dias de pagamento (salário e vale/adiantamento).</p>
          
          <div className="pt-4">
            <h4 className="font-bold text-slate-800 border-b pb-1 mb-2">Principais Conceitos</h4>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Ciclos de Pagamento:</strong> Sua vida financeira é dividida em dois ciclos, baseados nos dias de salário e vale que você define nas <strong>Configurações</strong>. Cada despesa é alocada ao ciclo de pagamento mais próximo, ajudando a visualizar o que você precisa pagar com cada entrada de dinheiro.</li>
              <li><strong>Mês Atual vs. Projeção:</strong> A aba <strong>Mês Atual</strong> mostra suas finanças para o período corrente. A aba <strong>Projeção</strong> oferece uma visão futura, calculando saldos para os próximos 12 meses com base nas suas rendas e despesas marcadas como "Fixa" ou "Parcelada".</li>
            </ul>
          </div>

          <div className="pt-4">
            <h4 className="font-bold text-slate-800 border-b pb-1 mb-2">Como Usar</h4>
            <dl className="space-y-3">
              <div>
                <dt className="font-semibold text-slate-800">1. Configure seus Ciclos</dt>
                <dd className="pl-4 text-xs text-slate-600">Clique no ícone de engrenagem (⚙️) no canto superior direito. Informe o dia que recebe seu salário e, se aplicável, o dia do vale e ative a opção "Recebe Vale?".</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">2. Adicione Categorias</dt>
                <dd className="pl-4 text-xs text-slate-600">Nas configurações, você pode criar categorias para suas despesas (Ex: Mercado, Lazer, Transporte) e atribuir cores a elas para fácil visualização nos gráficos.</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">3. Lance suas Rendas e Despesas</dt>
                <dd className="pl-4 text-xs text-slate-600">Use a seção "Novo Lançamento". Preencha os campos para adicionar suas receitas (salários, bônus) e suas saídas de dinheiro. Você pode marcar uma despesa como <strong>Fixa</strong> (ex: Aluguel, que se repete todo mês) ou <strong>Parcelada</strong>.</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-800">4. Analise o Resumo</dt>
                <dd className="pl-4 text-xs text-slate-600">Abaixo dos lançamentos, o card "Resumo Geral do Mês" te dá uma visão completa. Clique em "Total de Receitas" ou "Total de Dívidas" para ver a lista detalhada de cada item e fazer edições rápidas.</dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
