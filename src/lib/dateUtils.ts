import { parseISO, isBefore, startOfDay, isValid } from 'date-fns';

/**
 * Tenta fazer o parse de uma data que pode estar em formato ISO (YYYY-MM-DD)
 * ou formato brasileiro (DD/MM/YYYY).
 */
export const parseDateSafe = (dateStr: string): Date | null => {
    if (!dateStr) return null;

    // Tenta formato ISO (YYYY-MM-DD)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
        const d = parseISO(dateStr);
        if (isValid(d)) return d;
    }

    // Tenta formato BR (DD/MM/YYYY)
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        const parts = dateStr.split('/');
        // Mês no JS começa em 0
        const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        if (isValid(d)) return d;
    }

    // Tenta new Date direto como fallback
    const fallback = new Date(dateStr);
    if (isValid(fallback)) return fallback;

    return null;
};

/**
 * Verifica se uma conta está vencida.
 * Considera vencida se a data de vencimento for ANTERIOR a hoje (início do dia) e não estiver paga.
 */
export const isOverdue = (dueDate: string, isPaid?: boolean): boolean => {
    if (isPaid) return false;

    const due = parseDateSafe(dueDate);
    if (!due) return false;

    // Compara com o início de hoje para ser estrito (ontem já venceu)
    const today = startOfDay(new Date());
    const dueDay = startOfDay(due);

    // Se dueDay < today, está vencido.
    return isBefore(dueDay, today);
};
