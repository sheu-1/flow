import { getAggregatesByPeriod, getCategoryBreakdown, getTransactions } from './TransactionService';
import { AggregatePeriod } from '../types';

export async function buildFinancialContext(userId: string, period: AggregatePeriod) {
  // AI Accountant gets FULL APP VISIBILITY regardless of period filter
  // 1) Get comprehensive aggregates for multiple periods for better context
  const monthlyAggregates = await getAggregatesByPeriod(userId, 'monthly', 24); // 2 years of monthly data
  const weeklyAggregates = await getAggregatesByPeriod(userId, 'weekly', 12); // 3 months of weekly data
  const dailyAggregates = await getAggregatesByPeriod(userId, 'daily', 30); // 1 month of daily data

  // Determine full analysis window - go back much further for comprehensive view
  const to = new Date();
  const startFromAgg = new Date(to.getFullYear() - 2, 0, 1); // Go back 2 years for full context

  // 2) Category breakdown for the ENTIRE app history
  const categories = await getCategoryBreakdown(userId, startFromAgg, to);

  // 3) Get ALL transactions (increased limit for full visibility)
  const recent = await getTransactions(userId, { limit: 5000, offset: 0, from: startFromAgg, to });

  // Summaries
  const totalIncome = recent.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalExpense = recent.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (net / totalIncome) : 0;

  // Use monthly aggregates for current/previous comparison
  const lastIdx = monthlyAggregates.length - 1;
  const curr = lastIdx >= 0 ? monthlyAggregates[lastIdx] : undefined;
  const prev = lastIdx - 1 >= 0 ? monthlyAggregates[lastIdx - 1] : undefined;

  function fmt(n: number) { return n.toFixed(2); }
  function pct(currVal: number, prevVal: number) {
    if (prevVal === 0) return currVal === 0 ? '0%' : '∞%';
    return `${(((currVal - prevVal) / prevVal) * 100).toFixed(1)}%`;
  }

  // Lines - include ALL period types for comprehensive context
  const monthlyLines = monthlyAggregates.map((a: any) => `- ${a.periodLabel}: income=${fmt(a.income)}, expense=${fmt(a.expense)}`).join('\n');
  const weeklyLines = weeklyAggregates.slice(-4).map((a: any) => `- ${a.periodLabel}: income=${fmt(a.income)}, expense=${fmt(a.expense)}`).join('\n'); // Last 4 weeks
  const dailyLines = dailyAggregates.slice(-7).map((a: any) => `- ${a.periodLabel}: income=${fmt(a.income)}, expense=${fmt(a.expense)}`).join('\n'); // Last 7 days
  const catLines = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([k, v]) => `- ${k}: ${fmt(v)}`)
    .join('\n');
  const txnLines = recent
    .slice(0, 60) // cap lines for token budget
    .map(t => {
      const d = new Date(t.date);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM only
      const amount = Math.abs(t.amount).toFixed(2);
      const category = t.category || 'Other';
      // Redact sender and exact date to avoid PII leaks
      return `- ${ym} ${t.type} ${amount} ${category}`;
    })
    .join('\n');

  const comparison = curr && prev
    ? [
        `CURRENT PERIOD (${curr.periodLabel}) vs PREVIOUS (${prev.periodLabel})`,
        `- Income: ${fmt(curr.income)} (${pct(curr.income, prev.income)})`,
        `- Expense: ${fmt(curr.expense)} (${pct(curr.expense, prev.expense)})`,
      ].join('\n')
    : `CURRENT PERIOD: ${curr ? curr.periodLabel : 'N/A'}`;

  const overview = [
    `OVERVIEW (${startFromAgg.toISOString().slice(0,10)} → ${to.toISOString().slice(0,10)})`,
    `- Total income: ${fmt(totalIncome)}`,
    `- Total expense: ${fmt(totalExpense)}`,
    `- Net balance: ${fmt(net)}`,
    `- Savings rate: ${(savingsRate * 100).toFixed(1)}%`,
  ].join('\n');

  const context = [
    `AI ACCOUNTANT - FULL APP VISIBILITY (All Data Available)`,
    `PERIOD CONTEXT: User selected ${period} view, but AI has access to ALL data`,
    overview,
    comparison,
    `MONTHLY AGGREGATES (24 months):\n${monthlyLines}`,
    `RECENT WEEKLY AGGREGATES (4 weeks):\n${weeklyLines}`,
    `RECENT DAILY AGGREGATES (7 days):\n${dailyLines}`,
    `TOP CATEGORIES (${Object.keys(categories).length} total):\n${catLines}`,
    `RECENT TRANSACTIONS (redacted, up to 60 from full history):\n${txnLines}`,
    `\nNOTE: AI has complete visibility of user's financial data across all time periods, regardless of current filter selection.`,
  ].join('\n\n');

  return context;
}
