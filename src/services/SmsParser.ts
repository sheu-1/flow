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
const expenseKeywords = /(sent|paid|purchased|debited|withdrawn|expense|bill|fee|charge|subscription|transfer)/i;

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
