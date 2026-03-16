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
  /** If set, this transaction represents a charge/fee rather than a user transaction */
  charge_type?: 'transaction_cost' | 'access_fee';
};

// Regex patterns
export const AMOUNT_REGEX = /\b(?:Ksh|KES|KSh|KES\s|Kes\s|USD|US\$|UGX|GHS)\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i;
export const CREDIT_REGEX = /\b(received|credited|deposit|you have received|credited to your account|payment received|transfer from|bank transfer in|incoming bank transfer|account credited|give\s+.*?cash\s+to)\b/i;
export const DEBIT_REGEX = /\b(sent to|paid|withdrawn|debited|purchase at|payment of|spent|transfer to|bank transfer|outgoing transfer|account debited)\b/i;
export const REF_REGEX = /(?:ref\.?|refno|reference(?:\s*number)?|tranid|transaction id|trxid)[:\s\-]*([A-Za-z0-9\-\/]+)/i;
export const SENDER_REGEX = /(?:from|by|to)\s+([A-Za-z0-9 &\-\.]+)/i;
// Bank names like "KCB Bank", "Equity Bank" etc. using the user's * bank pattern idea
export const BANK_NAME_REGEX = /\b([A-Za-z0-9 &]+?\s+bank)\b/i;
// Airtel Money specific keyword
export const AIRTEL_MONEY_REGEX = /\bairtel\s*money\b/i;

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

  if (m && m[1]) return m[1] ?? null;

  // Fallback: common M-Pesa format where the transaction code is the first token
  // e.g. "QAX8Y12ABC Confirmed. Ksh1,000.00 sent to ..."
  const mpesaCode = body.match(/^\s*([A-Z0-9]{8,15})\s+(?:Confirmed|confirmed)\b/);
  if (mpesaCode && mpesaCode[1]) return mpesaCode[1];

  return null;
}

function parseSender(body: string): string | null {
  const m = body.match(SENDER_REGEX);
  if (m && m[1]) {
    // Trim trailing punctuation
    return m[1].trim().replace(/[.,;]+$/, '');
  }
  // Fallback 1: Airtel Money
  if (AIRTEL_MONEY_REGEX.test(body)) {
    return 'Airtel Money';
  }

  // Fallback 2: generic bank name using "* bank" pattern
  const bankMatch = body.match(BANK_NAME_REGEX);
  if (bankMatch && bankMatch[1]) {
    return bankMatch[1].trim();
  }

  // Fallback: no reliable sender
  return null;
}

export function parseTransactionFromSms(body: string, dateStr?: string): ParsedTransaction[] | null {
  console.log('[SMS Parser] Parsing SMS:', body.substring(0, 100).replace(/\n/g, ' ') + '...');
  // Filter 1: Ignore failed transactions (insufficient funds, failed, etc.)
  if (/failed|insufficient funds|transaction failed|not successful|could not be completed/i.test(body)) {
    return null;
  }

  // Filter 2: Ignore Okoa Jahazi messages
  if (/OKOA\s+JAHAZI/i.test(body)) {
    return null;
  }

  // Filter 3: Ignore data bundle messages
  if (/you have received.*MB.*data|data valid for the next hour|airtime reward/i.test(body)) {
    return null;
  }

  // Filter 4: Ignore M-Shwari messages
  if (/m\s*shwari|mshwari/i.test(body)) {
    return null;
  }

  // Filter 5: Ignore SMS cost/promotion-only messages
  if (/sms\s+costs\s*Ksh|sms\s+costs\s*KSh|sms\s+costs\s*KES|cost\s+of\s+sms/i.test(body)) {
    return null;
  }

  // Filter 6: Ignore mini-statement style messages
  const bracketSegments = body.match(/\[[^\]]*\]/g);
  if (bracketSegments && bracketSegments.length >= 2 && /Transaction cost,?\s*Ksh/i.test(body)) {
    return null;
  }

  // Filter 7: Ignore promotional/reward messages
  if (/\b(offer|offers|reward|rewards|promo|promotion|win|bonus|free|gift|deal|sale)\b/i.test(body)) {
    return null;
  }

  // Filter 8: Ignore expiry/renewal reminders
  if (/\b(expire|expires|expiring|expiry|renew|renewal|plan will expire|days to go|remind|reminder)\b/i.test(body)) {
    return null;
  }

  // Filter 9: Ignore marketing calls-to-action
  if (/\b(dial|reply|click|buy|get|call|visit|download|install)\b.*\b(now|today|here|link|app)\b/i.test(body)) {
    const looksLikeTransaction =
      AMOUNT_REGEX.test(body) &&
      (CREDIT_REGEX.test(body) || DEBIT_REGEX.test(body) || /\bconfirmed\b/i.test(body));
    if (!looksLikeTransaction) {
      return null;
    }
  }

  // Filter 10: Ignore "STOP" opt-out messages
  if (/\bSTOP\s+TO\s+\d+/i.test(body)) {
    return null;
  }

  const results: ParsedTransaction[] = [];
  const dateISO = dateStr ? new Date(dateStr).toISOString() : undefined;

  // 1. Check for Fuliza — extract ONLY the access fee as a charge
  if (/fuliza/i.test(body)) {
    const accessFeePatterns = [
      /access\s*fee(?:\s*charged)?(?:\s*(?:is|of))?\s*(?:Ksh\.?|KES|KSH)\s*([\d,]+(?:\.\d{1,2})?)/i,
      /(?:charged|charge)\s*(?:an\s*)?access\s*fee\s*(?:of\s*)?\s*(?:Ksh\.?|KES|KSH)\s*([\d,]+(?:\.\d{1,2})?)/i,
    ];
    for (const pattern of accessFeePatterns) {
      const m = body.match(pattern);
      if (m && m[1]) {
        const fee = parseFloat(m[1].replace(/,/g, ''));
        if (Number.isFinite(fee) && fee > 0) {
          const ref = parseReference(body);
          results.push({
            amount: fee,
            type: 'debit',
            sender: 'Fuliza Access Fee',
            reference: ref,
            message: body,
            dateISO,
            charge_type: 'access_fee',
          });
          console.log(`[SMS Parser] Fuliza access fee extracted: ${fee}`);
          break;
        }
      }
    }
    // Only return the access fee for Fuliza messages; do NOT parse the principal amount
    return results.length > 0 ? results : null;
  }

  // 2. Main Transaction Parsing
  // Check for airtime recharge
  if (/recharge.*successful|airtime.*successful|recharge of/i.test(body)) {
    console.log('[SMS Parser] Detected airtime message');
    const amount = parseAmount(body);
    if (amount && amount > 0) {
      results.push({
        amount,
        type: 'debit',
        sender: 'Airtime Recharge',
        reference: parseReference(body),
        message: body,
        dateISO,
      });
      console.log('[SMS Parser] Parsed airtime recharge:', results);
      // Also extract transaction cost if present
      extractTransactionCost(body, parseReference(body), dateISO, results);
      return results.length > 0 ? results : null;
    }
  }

  const amount = parseAmount(body);
  const type = parseType(body);
  const reference = parseReference(body);
  const sender = parseSender(body);

  // Strict validation for Generic Transaction
  if (amount != null && amount > 0 && type != null) {
    // Check validation
    const isFromKnownService =
      /mpesa|m-pesa/i.test(body) ||
      /airtel\s*money/i.test(body) ||
      /\bbank\b/i.test(body) ||
      (sender != null && (/mpesa|m-pesa/i.test(sender) || /bank/i.test(sender) || /airtel\s*money/i.test(sender) || /equity/i.test(sender) || /disbursement/i.test(sender)));

    if (reference || isFromKnownService) {
      results.push({
        amount,
        type,
        sender: sender ?? null,
        reference: reference ?? null,
        message: body,
        dateISO,
      });
      console.log('[SMS Parser] Parsed generic transaction:', results);
    } else {
      console.log('[SMS Parser] Generic parsing skipped - validation failed:', { amount, type, reference, sender, isFromKnownService });
    }
  } else {
    console.log('[SMS Parser] Generic parsing skipped - field extracting failed:', { amount, type });
  }

  // 3. Extract transaction cost from standard M-PESA messages (separate from main amount)
  extractTransactionCost(body, reference, dateISO, results);

  return results.length > 0 ? results : null;
}

/**
 * Extract "Transaction cost, KshXX.XX" from M-PESA messages and push as a charge entry.
 * Only adds if cost > 0. Safe to call multiple times; it won't duplicate within the same results array.
 */
function extractTransactionCost(
  body: string,
  reference: string | null | undefined,
  dateISO: string | undefined,
  results: ParsedTransaction[]
): void {
  // Already has a transaction_cost entry? Skip.
  if (results.some(r => r.charge_type === 'transaction_cost')) return;

  const costMatch = body.match(
    /transaction\s+cost[,:]?\s*(?:Ksh\.?|KES|KSH)\s*([\d,]+(?:\.\d{1,2})?)/i
  );
  if (costMatch && costMatch[1]) {
    const cost = parseFloat(costMatch[1].replace(/,/g, ''));
    if (Number.isFinite(cost) && cost > 0) {
      results.push({
        amount: cost,
        type: 'debit',
        sender: 'M-PESA Transaction Cost',
        reference: reference ?? null,
        message: body,
        dateISO,
        charge_type: 'transaction_cost',
      });
      console.log(`[SMS Parser] Transaction cost extracted: ${cost}`);
    }
  }
}

// Sample messages and expected outputs (unit-test style examples)
export const SAMPLE_SMS_CASES: Array<{
  text: string;
  expect: Partial<ParsedTransaction>[] | null;
}> = [
    // User's provided sample: main transaction (airtime)
    {
      text: `TLQ0K25M9C confirmed.You bought Ksh30.00 of airtime on 26/12/25 at 10:15 AM.New M-PESA balance is Ksh0.00, Transaction cost, Ksh0.00.Amount you can transact within the day is 499,960.00. Start Investing today with Ziidii MMF & earn daily. Dial *334#.`,
      expect: [{ amount: 30, type: 'debit' }],
    },
    {
      text: `TLQ0K25M9C Confirmed. Fuliza M-Pesa amount is Ksh 30.00. Access Fee charged Ksh 0.30. Total Fuliza M-Pesa outstanding amount is Ksh222.51 due on 22/01/26. To check daily charges, Dial *234*0#OK Select Query Charges`,
      expect: [{ amount: 0.3, type: 'debit', sender: 'Fuliza Fee' }],
    },
    // User provided example
    {
      text: `TK4OK9BABX Confirmed. Fuliza M-PESA amount is Ksh 10.00. Access Fee charged Ksh 0.10. Total Fuliza M-PESA outstanding amount is Ksh 202.71 due on 27/11/25. To check daily charges, Dial *334#OK Select Fuliza M-PESA to Query Charges.`,
      expect: [{ amount: 0.10, type: 'debit', sender: 'Fuliza Fee' }],
    },

    {
      text: 'M-PESA: You have received KES 1,250.00 from John Doe Ref ABC123 on 12/09/2025',
      expect: [{ amount: 1250, type: 'credit', sender: 'John Doe', reference: 'ABC123' }],
    },
    {
      text: 'Payment of KES 2,000 made to SUPERMARKET LTD Ref TRX-789',
      expect: [{ amount: 2000, type: 'debit', sender: 'SUPERMARKET LTD', reference: 'TRX-789' }],
    },
    {
      text: 'Airtel Money: You have received USD 50.00 from Jane',
      expect: [{ amount: 50, type: 'credit', sender: 'Jane' }],
    },
    {
      text: 'Your account was debited KES 3,450.25 Purchase at PHARMACY Ref NO123',
      expect: [{ amount: 3450.25, type: 'debit', sender: 'PHARMACY', reference: 'NO123' }],
    },
    {
      text: 'You spent KES 500 at Cafe Latte',
      expect: [{ amount: 500, type: 'debit', sender: 'Cafe Latte' }],
    },
    {
      text: 'Deposit: KES 10,000 credited to your account Ref 9XY7',
      expect: [{ amount: 10000, type: 'credit', reference: '9XY7' }],
    },
    {
      text: 'USD 12.99 purchase at APPSTORE',
      expect: [{ amount: 12.99, type: 'debit', sender: 'APPSTORE' }],
    },
    {
      text: 'Balance inquiry. No transaction.',
      expect: null,
    },
  ];

// New test cases from user feedback
export const NEW_USER_CASES = [
  {
    text: `63I8YSCXS8W. You have received Ksh 2,000 from Equity Disbursement on 29/01/26 06:51 AM. Bal: Ksh 2016.0.`,
    expect: [{ amount: 2000, type: 'credit', sender: 'Equity Disbursement', reference: '63I8YSCXS8W' }]
  },
  {
    text: `UASOK55S49 Confirmed. On 28/1/26 at 12:17 PM Give Ksh500.00 cash to Equity Bank Donholm New M-PESA balance is Ksh958.05. You can now access M-PESA via *334#`,
    expect: [{ amount: 500, type: 'credit', sender: 'Equity Bank Donholm', reference: 'UASOK55S49' }]
  }
];
