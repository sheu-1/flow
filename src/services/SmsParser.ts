export type ParsedSms = {
  transaction_type: 'income' | 'expense' | null;
  amount: number | null;
  service_provider: 'M-Pesa' | 'Airtel' | 'Bank' | 'Equity' | 'KCB' | 'Cooperative' | 'NCBA' | 'Absa' | 'Standard' | 'DTB' | 'Family' | 'I&M' | 'Other' | null;
  time: Date | null;
  reference_id: string | null;
  raw_message: string;
  category?: string;
};

// Enhanced keyword patterns for better accuracy
const incomeKeywords = /(received|credited|deposit|\bin\b|income|salary|refund|cashback|bonus|dividend|interest)/i;
const expenseKeywords = /(sent|paid|purchased|debited|withdrawn|expense|bill|fee|charge|subscription|transfer|access fee|airtime|data bundle)/i;

// Patterns to exclude from parsing (avoid double entries)
const excludePatterns = /(outstanding amount|total.*outstanding|balance.*due|amount due)/i;

// Enhanced currency and amount matching with more formats
const amountRegex = /(?:(USD|KES|KSH|UGX|TZS|ZAR|NGN|GHS|EUR|GBP)\s?([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s?(USD|KES|KSH|UGX|TZS|ZAR|NGN|GHS|EUR|GBP)|([\d,]+(?:\.\d{1,2})?))/i;

// Enhanced reference patterns
const refRegex = /(Ref\s*[:#-]?\s*([A-Z0-9-]{4,})|Transaction\s*ID\s*[:#-]?\s*([A-Z0-9-]{4,})|Code\s*[:#-]?\s*([A-Z0-9-]{4,})|Receipt\s*[:#-]?\s*([A-Z0-9-]{4,}))/i;

// Enhanced provider detection patterns
const providerPatterns = {
  'M-Pesa': /(mpesa|m-pesa|m pesa|safaricom)/i,
  'Airtel': /(airtel|airtel money)/i,
  'Bank': /(bank|atm|pos|card)/i,
  'Equity': /(equity|eazzy)/i,
  'KCB': /(kcb|kenya commercial)/i,
  'Cooperative': /(cooperative|co-op)/i,
  'NCBA': /(ncba)/i,
  'Absa': /(absa|barclays)/i,
  'Standard': /(standard chartered|stanchart)/i,
  'DTB': /(diamond trust|dtb)/i,
  'Family': /(family bank)/i,
  'I&M': /(i&m|i & m)/i,
};

export function detectProvider(text: string): ParsedSms['service_provider'] {
  const t = text.toLowerCase();
  
  // Check specific providers first (more specific matches)
  for (const [provider, pattern] of Object.entries(providerPatterns)) {
    if (pattern.test(t)) {
      return provider as ParsedSms['service_provider'];
    }
  }
  
  return 'Other';
}

export function parseAmount(text: string): number | null {
  // Check if this is a Fuliza message with outstanding amount
  if (/fuliza/i.test(text)) {
    // For Fuliza, only extract "Access Fee charged" amount, not outstanding
    const accessFeeMatch = text.match(/access fee charged.*?(KES|Ksh|KSH)?\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (accessFeeMatch) {
      const amountStr = accessFeeMatch[2].replace(/,/g, '');
      const val = parseFloat(amountStr);
      return Number.isFinite(val) && val > 0 ? val : null;
    }
    return null; // Don't parse other amounts from Fuliza messages
  }
  
  // Check if this contains excluded patterns (outstanding amounts)
  if (excludePatterns.test(text)) {
    // Try to find the actual transaction amount before the excluded part
    const beforeExcluded = text.split(/outstanding|balance.*due|amount due/i)[0];
    if (beforeExcluded) {
      const m = beforeExcluded.match(amountRegex);
      if (m) {
        const amountStr = (m[2] || m[3] || m[5])?.replace(/,/g, '');
        if (amountStr) {
          const val = parseFloat(amountStr);
          return Number.isFinite(val) && val > 0 ? val : null;
        }
      }
    }
  }
  
  const m = text.match(amountRegex);
  if (!m) return null;
  
  // Try different capture groups for amount
  const amountStr = (m[2] || m[3] || m[5])?.replace(/,/g, '');
  if (!amountStr) return null;
  
  const val = parseFloat(amountStr);
  return Number.isFinite(val) && val > 0 ? val : null;
}

export function parseReference(text: string): string | null {
  const m = text.match(refRegex);
  if (!m) return null;
  return (m[2] || m[3] || m[4] || m[5]) || null;
}

export function classifyType(text: string): 'income' | 'expense' | null {
  const t = text.toLowerCase();
  
  // Fuliza, airtime, and data are always expenses
  if (/(fuliza|access fee|airtime|data bundle|data purchased)/i.test(t)) {
    return 'expense';
  }
  
  // Check for explicit income/expense indicators
  const isIncome = incomeKeywords.test(t);
  const isExpense = expenseKeywords.test(t);
  
  // Additional context-based classification
  const incomeContext = /(from|sender|source)/i.test(t);
  const expenseContext = /(to|recipient|merchant|shop|store)/i.test(t);
  
  if (isIncome && !isExpense) return 'income';
  if (isExpense && !isIncome) return 'expense';
  if (incomeContext && !expenseContext) return 'income';
  if (expenseContext && !incomeContext) return 'expense';
  
  return null;
}

// Enhanced category detection
export function detectCategory(text: string, type: 'income' | 'expense' | null): string {
  const t = text.toLowerCase();
  
  if (type === 'expense') {
    // Specific categories for common expenses
    if (/(fuliza|access fee|loan fee)/i.test(t)) return 'Fees & Charges';
    if (/(airtime|data bundle|data purchased|bundles)/i.test(t)) return 'Airtime & Data';
    if (/(food|restaurant|cafe|dining|meal|lunch|dinner|breakfast)/i.test(t)) return 'Food & Dining';
    if (/(transport|taxi|uber|bus|fuel|petrol|parking)/i.test(t)) return 'Transportation';
    if (/(shop|store|market|supermarket|mall)/i.test(t)) return 'Shopping';
    if (/(bill|electricity|water|internet|phone|utilities)/i.test(t)) return 'Bills & Utilities';
    if (/(medical|hospital|pharmacy|doctor|health)/i.test(t)) return 'Healthcare';
    if (/(entertainment|movie|game|music|netflix)/i.test(t)) return 'Entertainment';
    if (/(education|school|course|book|tuition)/i.test(t)) return 'Education';
  } else if (type === 'income') {
    if (/(salary|wage|payroll)/i.test(t)) return 'Salary';
    if (/(business|freelance|contract)/i.test(t)) return 'Business';
    if (/(investment|dividend|interest)/i.test(t)) return 'Investment';
    if (/(gift|bonus|reward)/i.test(t)) return 'Other Income';
  }
  
  return 'Other';
}

export function parseSms(raw: { body: string; date?: number | string }): ParsedSms & { category?: string } {
  const body = raw.body || '';
  const time = raw.date ? new Date(raw.date) : new Date();
  const transactionType = classifyType(body);
  
  return {
    transaction_type: transactionType,
    amount: parseAmount(body),
    service_provider: detectProvider(body),
    time,
    reference_id: parseReference(body),
    raw_message: body,
    category: detectCategory(body, transactionType),
  };
}
