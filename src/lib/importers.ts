import { ImportedTransaction } from '@/types';

const MONTH_MAP: Record<string, string> = {'JAN':'01','FEV':'02','MAR':'03','ABR':'04','MAI':'05','JUN':'06','JUL':'07','AGO':'08','SET':'09','OUT':'10','NOV':'11','DEZ':'12','JANEIRO':'01','FEVEREIRO':'02','MARÇO':'03','ABRIL':'04','MAIO':'05','JUNHO':'06','JULHO':'07','AGOSTO':'08','SETEMBRO':'09','OUTUBRO':'10','NOVEMBRO':'11','DEZEMBRO':'12'};

const CATEGORY_KEYWORDS: Record<string, string> = {
    'uber': 'Transporte', '99app': 'Transporte', 'posto': 'Transporte', 'shell': 'Transporte',
    'ifood': 'Alimentação', 'zema': 'Alimentação', 'mercado': 'Mercado', 'atacad': 'Mercado', 'carrefour': 'Mercado',
    'farmacia': 'Saúde', 'drogasil': 'Saúde', 'netflix': 'Lazer', 'amazon': 'Casa', 'shopee': 'Casa', 'magalu': 'Casa',
    'vivo': 'Casa', 'claro': 'Casa', 'tim': 'Casa', 'google': 'Serviços'
};

type BankType = 'Nubank' | 'Bradesco' | 'Mercado Pago' | 'PicPay' | 'Genérico';

export const detectBank = (text: string): BankType => {
    const lower = text.toLowerCase();
    if (lower.includes('nu pagamentos') || lower.includes('nubank')) return 'Nubank';
    if (lower.includes('bradesco')) return 'Bradesco';
    if (lower.includes('mercado pago') || lower.includes('mercadopago')) return 'Mercado Pago';
    if (lower.includes('picpay')) return 'PicPay';
    return 'Genérico';
};

const createTransaction = (date: string, description: string, sender: string, amount: number, type: 'income' | 'expense', categoryMappings?: Record<string, string>): ImportedTransaction => {
    let category = '';
    const cleanSender = sender.replace(/[\d.\-\/]{9,}/g, '')
                              .replace(/(\d{2}\/\d{2})/g, '')
                              .replace(/Docto\./g, '')
                              .trim().substring(0, 40);

    if (cleanSender && categoryMappings) {
        const specificKey = `${cleanSender.toLowerCase()}-${amount.toFixed(2)}`;
        const genericKey = cleanSender.toLowerCase();

        if (categoryMappings[specificKey]) {
            category = categoryMappings[specificKey];
        } else if (categoryMappings[genericKey]) {
            category = categoryMappings[genericKey];
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
        category: category || 'Outros',
        cycle: 'day_05', // Default cycle, can be changed later
        needsReview: true,
    };
};

export const parseBradesco = (text: string, categoryMappings?: Record<string, string>): ImportedTransaction[] => {
    const results: ImportedTransaction[] = [];
    const dateChunks = text.split(/(?=\d{2}\/\d{2}\/\d{4})/);

    for (const chunk of dateChunks) {
        const trimmedChunk = chunk.trim();
        if (trimmedChunk.length < 10) continue;

        const dateMatch = trimmedChunk.match(/^(\d{2}\/\d{2}\/\d{4})/);
        if (!dateMatch) continue;

        const currentDate = dateMatch[1];
        const content = trimmedChunk.substring(currentDate.length).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        const transRegex = /(.*?)  +([\d.,]+,\d{2})  +([\d.,]+,\d{2})/g;
        let match;

        while ((match = transRegex.exec(content)) !== null) {
            let [_, description, valueStr, balanceStr] = match;
            description = description.trim().replace(/^[\d.,]+  +/,'');

            if (description.length < 4 || description.match(/^(SALDO ANTERIOR|Total|COD. LANC.)/i)) continue;

            const amount = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'));
            if (isNaN(amount) || amount === 0) continue;

            const isCredit = /crédito|rem:|transf saldo|dep/i.test(description);
            const type = isCredit ? 'income' : 'expense';

            let sender = description
                .replace(/REM:|DES:/i, '')
                .replace(/PIX QR CODE ESTATICO|PIX QR CODE DINAMICO/i, '')
                .replace(/TRANSFERENCIA PIX/i, '')
                .replace(/\d{2}\/\d{2}/, '')
                .replace(/\s+\d{6,}\s*/, '')
                .trim();

            results.push(createTransaction(currentDate, description, sender, amount, type, categoryMappings));
        }
    }
    return results;
};

const excelDateToJSDate = (serial: number) => {
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);

    const fractional_day = serial - Math.floor(serial) + 0.0000001;

    let total_seconds = Math.floor(86400 * fractional_day);

    const seconds = total_seconds % 60;
    total_seconds -= seconds;

    const hours = Math.floor(total_seconds / (60 * 60));
    const minutes = Math.floor(total_seconds / 60) % 60;

    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

export const parseExcel = (json: any[][], categoryMappings?: Record<string, string>): ImportedTransaction[] => {
    const results: ImportedTransaction[] = [];
    
    for (let i = 1; i < json.length; i++) { // Start from 1 to skip header
        const row = json[i];
        if (row.length < 3) continue;

        const dateValue = row[0];
        const description = row[1];
        const value = row[2];
        
        if (!description || !value) continue;

        let date = '';
        if (typeof dateValue === 'number') {
            const jsDate = excelDateToJSDate(dateValue);
            date = `${jsDate.getDate().toString().padStart(2, '0')}/${(jsDate.getMonth() + 1).toString().padStart(2, '0')}/${jsDate.getFullYear()}`;
        } else if (typeof dateValue === 'string' && dateValue.match(/^\d{5}$/)) {
            const excelDate = parseInt(dateValue);
            const jsDate = excelDateToJSDate(excelDate);
            date = `${jsDate.getDate().toString().padStart(2, '0')}/${(jsDate.getMonth() + 1).toString().padStart(2, '0')}/${jsDate.getFullYear()}`;
        } else if (typeof dateValue === 'string') {
            date = dateValue;
        }

        const amountStr = String(value).replace(/[R$\s]/g, '').replace('.', '').replace(',', '.');
        const amount = parseFloat(amountStr);

        if (description && !isNaN(amount) && amount > 0) {
            const finalAmount = Math.abs(amount);
            const type = finalAmount > 0 ? 'expense' : 'income'; // Simple assumption for now
            const transaction = createTransaction(date, description, description, finalAmount, type, categoryMappings);
            results.push(transaction);
        }
    }
    return results;
}

export const parseGenericScanner = (text: string, categoryMappings?: Record<string, string>) => {
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

            results.push(createTransaction(currentDate, description, description, amount, type, categoryMappings));
        }
        descriptionBuffer = [];
    };

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.length < 2 || junkRegex.test(trimmedLine)) continue;

        const dateMatch = trimmedLine.match(dateRegex);
        if (dateMatch && !trimmedLine.match(valueOnlyRegex)) {
            processBuffer(0, false);

            let dateStr = '';
            if (dateMatch[2]) {
                const parts = dateMatch[2].split(/[\/\-]/);
                dateStr = `${parts[0]}/${parts[1]}/${parts[2].length === 2 ? '20' + parts[2] : parts[2]}`;
            } else if (dateMatch[3]) {
                const parts = dateMatch[3].split(' ');
                dateStr = `${parts[0]}/${MONTH_MAP[parts[1].toUpperCase()]}/${parts[2] || new Date().getFullYear()}`;
            } else if (dateMatch[4]) {
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
    processBuffer(0, false);
    return results;
};

export const parseMercadoPago = (text: string, categoryMappings?: Record<string, string>): ImportedTransaction[] => {
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

            results.push(createTransaction(buffer.date.replace(/-/g, '/'), fullDescription, sender, absAmount, type, categoryMappings));
        }
        buffer = null;
    };

    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    const valueRegex = /^R\$\s-?[\d.,]+$/;
    const idRegex = /^\d{10,}$/;

    for (const line of lines) {
        const trimmedLine = line.trim();

        if (dateRegex.test(trimmedLine)) {
            processBuffer();
            buffer = { date: trimmedLine, description: [], value: '' };
            continue;
        }

        if (buffer) {
            if (!buffer.value && valueRegex.test(trimmedLine)) {
                buffer.value = trimmedLine;
            } else if (!idRegex.test(trimmedLine) && trimmedLine.length > 2 && !trimmedLine.startsWith('DETALHE DOS MOVIMENTOS')) {
                buffer.description.push(trimmedLine);
            }
        }
    }
    processBuffer();
    return results;
};

export const parseNubank = (text: string, categoryMappings?: Record<string, string>): ImportedTransaction[] => {
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
            let sender = description;

            if (sender.includes('pelo Pix')) {
                sender = sender.split('pelo Pix')[1].trim().split(' - ')[0];
            } else if (sender.includes('Pagamento de fatura')) {
                sender = 'Fatura Nubank';
            }

            results.push(createTransaction(currentDate, description, sender, amount, currentSection, categoryMappings));
        }
        descriptionBuffer = [];
    };

    for (const line of lines) {
        const trimmedLine = line.trim();

        const dateMatch = trimmedLine.match(dateRegex);
        if (dateMatch) {
            processBuffer(0);
            const month = MONTH_MAP[dateMatch[2]];
            currentDate = `${dateMatch[1]}/${month}/${dateMatch[3]}`;
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
            processBuffer(amount);
            continue;
        }

        if (currentDate && currentSection && trimmedLine.length > 2 && !totalRegex.test(trimmedLine)) {
            descriptionBuffer.push(trimmedLine);
        }
    }
    processBuffer(0);
    return results;
};

export const parsePicPay = (text: string, categoryMappings?: Record<string, string>): ImportedTransaction[] => {
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

            results.push(createTransaction(buffer.date, fullDescription, sender, amount, type, categoryMappings));
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
                buffer.description.push(trimmedLine);
            }
        }
    }
    processBuffer();
    return results;
};
