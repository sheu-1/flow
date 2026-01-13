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
export const CREDIT_REGEX = /\b(received|credited|deposit|you have received|credited to your account|payment received|transfer from|bank transfer in|incoming bank transfer|account credited)\b/i;
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

export function parseTransactionFromSms(body: string, dateStr?: string): ParsedTransaction | null {
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

  // Filter 4: Ignore any M-Shwari related messages (never log these)
  if (/m\s*shwari|mshwari/i.test(body)) {
    return null;
  }

  // Filter 5: Ignore SMS cost/promotion-only messages (no real money transfer)
  if (/sms\s+costs\s*Ksh|sms\s+costs\s*KSh|sms\s+costs\s*KES|cost\s+of\s+sms/i.test(body)) {
    return null;
  }

  // Filter 6: Ignore mini-statement style messages that bundle multiple transactions
  // Example pattern: multiple square-bracketed segments with semicolon-delimited fields and a final
  // "Transaction cost" summary line.
  const bracketSegments = body.match(/\[[^\]]*\]/g);
  if (bracketSegments && bracketSegments.length >= 2 && /Transaction cost,?\s*Ksh/i.test(body)) {
    return null;
  }

  // Filter 7: Ignore promotional, marketing, and reward messages
  // These often contain amounts but are not real financial transactions
  if (/\b(offer|offers|reward|rewards|promo|promotion|win|bonus|free|gift|deal|sale)\b/i.test(body)) {
    return null;
  }

  // Filter 8: Ignore service expiry/renewal reminders
  // These mention amounts but are notifications, not transactions
  if (/\b(expire|expires|expiring|expiry|renew|renewal|plan will expire|days to go|remind|reminder)\b/i.test(body)) {
    return null;
  }

  // Filter 9: Ignore marketing calls-to-action
  // Messages asking users to dial, reply, click, or buy are usually promotional
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

  // Filter 4: Handle recharge/airtime purchases as debit (money out)
  if (/recharge.*successful|airtime.*successful|recharge of/i.test(body)) {
    const amount = parseAmount(body);
    if (amount && amount > 0) {
      return {
        amount,
        type: 'debit',
        sender: 'Airtime Recharge',
        reference: parseReference(body),
        message: body,
        dateISO: dateStr ? new Date(dateStr).toISOString() : undefined,
      };
    }
  }

  // Filter 5: Handle Fuliza - strictly only log the Access Fee, ignore outstanding/principal amounts
  if (/fuliza/i.test(body)) {
    // Enhanced patterns to match various Fuliza access fee formats:
    // - "Access Fee charged Ksh 0.10"
    // - "Access Fee of KES 0.10"
    // - "Access Fee is Ksh. 0.10"
    // - "Access fee Ksh0.10"
    // - "Fuliza M-PESA charge of Ksh X"
    // - "charged an access fee of Ksh X"

    // Try multiple patterns for better coverage
    const patterns = [
      /access\s*fee(?:\s*charged)?(?:\s*(?:is|of))?\s*(?:Ksh\.?|KES|KSH)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /(?:charged|charge)\s*(?:an\s*)?access\s*fee\s*(?:of\s*)?(?:Ksh\.?|KES|KSH)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /fuliza\s*(?:m-?pesa)?\s*(?:charge|fee)\s*(?:of\s*)?(?:Ksh\.?|KES|KSH)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
      /(?:Ksh\.?|KES|KSH)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:access\s*fee|fuliza\s*fee)/i,
    ];

    for (const pattern of patterns) {
      const feeMatch = body.match(pattern);
      if (feeMatch && feeMatch[1]) {
        const feeStr = feeMatch[1].replace(/,/g, '');
        const fee = parseFloat(feeStr);
        if (Number.isFinite(fee) && fee > 0) {
          console.log(`[SMS Parser] Fuliza access fee detected: ${fee}`);
          return {
            amount: fee,
            type: 'debit',
            sender: 'Fuliza Fee',
            reference: parseReference(body),
            message: body,
            dateISO: dateStr ? new Date(dateStr).toISOString() : undefined,
          };
        }
      }
    }

    // If it's a Fuliza message and we didn't find a valid Access Fee, skip creating any transaction
    console.log('[SMS Parser] Fuliza message detected but no access fee found, skipping');
    return null;
  }

  const amount = parseAmount(body);
  const type = parseType(body);
  const reference = parseReference(body);
  const sender = parseSender(body);

  // Strict validation: A real transaction must have:
  // 1. A valid amount
  // 2. A clear transaction type (credit or debit)
  // 3. Either a reference number OR a recognized sender (M-Pesa, bank, Airtel Money)
  if (amount == null || amount <= 0) {
    return null; // No valid amount = not a transaction
  }

  if (type == null) {
    return null; // Cannot determine if money in or out = not a transaction
  }

  // For messages from known financial services, we allow missing reference as they may be valid.
  // Many transactional messages don't include a "Ref" token, but can still be confirmed by keywords.
  const isFromKnownService =
    /mpesa|m-pesa/i.test(body) ||
    /airtel\s*money/i.test(body) ||
    /\bbank\b/i.test(body) ||
    (sender != null && (/mpesa|m-pesa/i.test(sender) || /bank/i.test(sender) || /airtel\s*money/i.test(sender)));

  // If not from a known service and no reference, it's likely promotional
  if (!reference && !isFromKnownService) {
    return null;
  }

  const dateISO = dateStr ? new Date(dateStr).toISOString() : undefined;
  return {
    amount,
    type,
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
