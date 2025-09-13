import { getAggregatesByPeriod, getCategoryBreakdown, getTransactions } from './TransactionService';
import { AggregatePeriod } from '../types';

export async function buildFinancialContext(userId: string, period: AggregatePeriod) {
  // 1) Aggregates for 12 buckets (or default logic from Reports)
  const rangeCount = period === 'daily' ? 30 : period === 'weekly' ? 12 : period === 'monthly' ? 12 : 5;
  const aggregates = await getAggregatesByPeriod(userId, period, rangeCount);

  // Determine analysis window from aggregates
  const to = new Date();
  const startFromAgg = aggregates[0]?.start ? new Date(aggregates[0].start) : new Date(to.getFullYear(), to.getMonth() - 11, 1);

  // 2) Category breakdown for the full analysis window
  const categories = await getCategoryBreakdown(userId, startFromAgg, to);

  // 3) Transactions within analysis window (wider sample)
  const recent = await getTransactions(userId, { limit: 1000, offset: 0, from: startFromAgg, to });

  // Summaries
  const totalIncome = recent.filter(t => t.type === 'income').reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalExpense = recent.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
  const net = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (net / totalIncome) : 0;

  const lastIdx = aggregates.length - 1;
  const curr = lastIdx >= 0 ? aggregates[lastIdx] : undefined;
  const prev = lastIdx - 1 >= 0 ? aggregates[lastIdx - 1] : undefined;

  function fmt(n: number) { return n.toFixed(2); }
  function pct(currVal: number, prevVal: number) {
    if (prevVal === 0) return currVal === 0 ? '0%' : '∞%';
    return `${(((currVal - prevVal) / prevVal) * 100).toFixed(1)}%`;
  }

  // Lines
  const aggLines = aggregates.map(a => `- ${a.periodLabel}: income=${fmt(a.income)}, expense=${fmt(a.expense)}`).join('\n');
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
    `PERIOD SELECTED: ${period}`,
    overview,
    comparison,
    `AGGREGATES (most recent last):\n${aggLines}`,
    `TOP CATEGORIES (${Object.keys(categories).length} total):\n${catLines}`,
    `RECENT TRANSACTIONS (redacted, up to 60):\n${txnLines}`,
  ].join('\n\n');

  return context;
}
