export type RawSms = {
  body: string;
  date?: number | string;
  originatingAddress?: string;
};

export type ParsedTransaction = {
  amount: number;
  type: 'credit' | 'debit';
  sender: string | null;
  reference?: string | null;
  message: string;
  dateISO?: string;
};

// Regex patterns
export const AMOUNT_REGEX = /\b(?:Ksh|KES|KSh|KES\s|Kes\s|USD|US\$|UGX|GHS)\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i;
export const CREDIT_REGEX = /\b(received|credited|deposit|you have received|credited to your account|payment received)\b/i;
export const DEBIT_REGEX = /\b(sent to|paid|withdrawn|debited|purchase at|payment of|spent)\b/i;
export const REF_REGEX = /(?:ref|refno|tranid|transaction id|trxid)[:\s]*([A-Za-z0-9\-]+)/i;
export const SENDER_REGEX = /(?:from|by|to)\s+([A-Za-z0-9 &\-\.]+)/i;

function parseAmount(body: string): number | null {
  const m = body.match(AMOUNT_REGEX);
  if (!m) return null;
  const amountStr = m[1]?.replace(/,/g, '');
  const n = amountStr ? parseFloat(amountStr) : NaN;
  return Number.isFinite(n) ? n : null;
}

function parseType(body: string): 'credit' | 'debit' | null {
  if (CREDIT_REGEX.test(body) && !DEBIT_REGEX.test(body)) return 'credit';
  if (DEBIT_REGEX.test(body) && !CREDIT_REGEX.test(body)) return 'debit';
  // If both or neither matched, try heuristics: words like "received" vs "sent"
  if (CREDIT_REGEX.test(body)) return 'credit';
  if (DEBIT_REGEX.test(body)) return 'debit';
  return null;
}

function parseReference(body: string): string | null {
  const m = body.match(REF_REGEX);
  return m ? m[1] ?? null : null;
}

function parseSender(body: string): string | null {
  const m = body.match(SENDER_REGEX);
  if (m && m[1]) {
    // Trim trailing punctuation
    return m[1].trim().replace(/[.,;]+$/, '');
  }
  // Fallback: try first 20 chars before amount or generic prefix
  return null;
}

export function parseTransactionFromSms(body: string, dateStr?: string): ParsedTransaction | null {
  // Filter 1: Ignore Okoa Jahazi messages
  if (/OKOA\s+JAHAZI/i.test(body)) {
    return null;
  }

  // Filter 2: Ignore data bundle messages
  if (/you have received.*MB.*data|data valid for the next hour|airtime reward/i.test(body)) {
    return null;
  }

  // Filter 3: Handle Fuliza - only log access fee
  const fulizaMatch = body.match(/Fuliza M-PESA.*Access Fee charged.*Ksh\s?([0-9,.]+)/i);
  if (fulizaMatch) {
    const feeStr = fulizaMatch[1]?.replace(/,/g, '');
    const fee = feeStr ? parseFloat(feeStr) : null;
    if (fee && fee > 0) {
      return {
        amount: fee,
        type: 'debit',
        sender: 'Fuliza Fee',
        reference: parseReference(body),
        message: body,
        dateISO: dateStr ? new Date(dateStr).toISOString() : undefined,
      };
    }
    return null; // Ignore if no valid fee
  }

  const amount = parseAmount(body);
  const type = parseType(body);
  if (amount == null && type == null) return null; // Not a transaction-like message
  const reference = parseReference(body);
  const sender = parseSender(body);
  const dateISO = dateStr ? new Date(dateStr).toISOString() : undefined;
  return {
    amount: amount ?? 0,
    type: (type ?? 'credit') as 'credit' | 'debit',
    sender: sender ?? null,
    reference: reference ?? null,
    message: body,
    dateISO,
  };
}

// Sample messages and expected outputs (unit-test style examples)
export const SAMPLE_SMS_CASES: Array<{
  text: string;
  expect: Partial<ParsedTransaction> | null;
}> = [
  {
    text: 'M-PESA: You have received KES 1,250.00 from John Doe Ref ABC123 on 12/09/2025',
    expect: { amount: 1250, type: 'credit', sender: 'John Doe', reference: 'ABC123' },
  },
  {
    text: 'Payment of KES 2,000 made to SUPERMARKET LTD Ref TRX-789',
    expect: { amount: 2000, type: 'debit', sender: 'SUPERMARKET LTD', reference: 'TRX-789' },
  },
  {
    text: 'Airtel Money: You have received USD 50.00 from Jane',
    expect: { amount: 50, type: 'credit', sender: 'Jane' },
  },
  {
    text: 'Your account was debited KES 3,450.25 Purchase at PHARMACY Ref NO123',
    expect: { amount: 3450.25, type: 'debit', sender: 'PHARMACY', reference: 'NO123' },
  },
  {
    text: 'You spent KES 500 at Cafe Latte',
    expect: { amount: 500, type: 'debit', sender: 'Cafe Latte' },
  },
  {
    text: 'Deposit: KES 10,000 credited to your account Ref 9XY7',
    expect: { amount: 10000, type: 'credit', reference: '9XY7' },
  },
  {
    text: 'USD 12.99 purchase at APPSTORE',
    expect: { amount: 12.99, type: 'debit', sender: 'APPSTORE' },
  },
  {
    text: 'Balance inquiry. No transaction.',
    expect: null,
  },
];
