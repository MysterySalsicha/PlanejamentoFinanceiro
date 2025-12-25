import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Combina classes CSS usando clsx e tailwind-merge para evitar conflitos e otimizar.
 * Utilizado principalmente em projetos com Tailwind CSS e shadcn/ui.
 * @param inputs Classes CSS a serem combinadas.
 * @returns Uma string com as classes CSS combinadas e limpas.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata um valor numérico como moeda brasileira (BRL).
 * @param amount O valor numérico a ser formatado.
 * @returns Uma string representando o valor formatado em BRL (ex: "R$ 1.234,56").
 */
export function formatCurrencyBRL(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Converte uma string de moeda formatada (ex: "R$ 1.234,56") para um número.
 * @param value A string de moeda a ser convertida.
 * @returns O valor numérico.
 */
export function parseMoney(value: string | number): number {
  if (typeof value === 'number') return value;
  const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Formata um número para uma string de moeda (ex: "1.234,56").
 * Útil para inputs, sem o símbolo "R$".
 * @param value O valor numérico a ser formatado.
 * @returns Uma string representando o valor formatado.
 */
export function formatMoney(value: string | number): string {
  if (value === null || value === undefined || value === '') return '';
  const num = typeof value === 'string' ? parseMoney(value) : value;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Formata uma string de data para um formato legível em português do Brasil.
 * @param dateString A string da data a ser formatada (preferencialmente em formato ISO 8601).
 * @param dateFormat O formato desejado para a data (padrão: 'dd/MM/yyyy').
 * @returns Uma string com a data formatada ou 'Data Inválida' em caso de erro.
 */
export function formatDate(dateString: string, dateFormat = 'dd/MM/yyyy'): string {
  try {
    const date = parseISO(dateString);
    return format(date, dateFormat, { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data Inválida';
  }
}

