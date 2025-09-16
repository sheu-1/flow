export type ParsedSms = {
  transaction_type: 'income' | 'expense' | null;
  amount: number | null;
  service_provider: 'M-Pesa' | 'Airtel' | 'Bank' | 'Other' | null;
  time: Date | null;
  reference_id: string | null;
  raw_message: string;
};

const incomeKeywords = /(received|credited|deposit|\bin\b)/i;
const expenseKeywords = /(sent|paid|purchased|debited|withdrawn)/i;

// Matches currency and amount: e.g., KES 1,200.50 or 1,200.50 KES
const amountRegex = /(?:(USD|KES|KSH|UGX|TZS|ZAR|NGN|GHS)\s?([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s?(USD|KES|KSH|UGX|TZS|ZAR|NGN|GHS))/i;

// Reference patterns: Ref XYZ123 or Transaction ID: ABC999
const refRegex = /(Ref\s*[:#-]?\s*([A-Z0-9-]{4,})|Transaction\s*ID\s*[:#-]?\s*([A-Z0-9-]{4,}))/i;

export function detectProvider(text: string): ParsedSms['service_provider'] {
  const t = text.toLowerCase();
  if (t.includes('mpesa') || t.includes('m-pesa') || t.includes('m pesa')) return 'M-Pesa';
  if (t.includes('airtel')) return 'Airtel';
  if (t.includes('bank')) return 'Bank';
  return 'Other';
}

export function parseAmount(text: string): number | null {
  const m = text.match(amountRegex);
  if (!m) return null;
  const amountStr = (m[2] || m[3])?.replace(/,/g, '');
  const val = amountStr ? parseFloat(amountStr) : NaN;
  return Number.isFinite(val) ? val : null;
}

export function parseReference(text: string): string | null {
  const m = text.match(refRegex);
  if (!m) return null;
  return (m[2] || m[3]) || null;
}

export function classifyType(text: string): 'income' | 'expense' | null {
  const isIncome = incomeKeywords.test(text);
  const isExpense = expenseKeywords.test(text);
  if (isIncome && !isExpense) return 'income';
  if (isExpense && !isIncome) return 'expense';
  return null;
}

export function parseSms(raw: { body: string; date?: number | string }): ParsedSms {
  const body = raw.body || '';
  const time = raw.date ? new Date(raw.date) : new Date();
  return {
    transaction_type: classifyType(body),
    amount: parseAmount(body),
    service_provider: detectProvider(body),
    time,
    reference_id: parseReference(body),
    raw_message: body,
  };
}
