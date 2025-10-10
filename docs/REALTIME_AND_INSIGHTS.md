# Realtime, Reports, Smart Insights, and Transaction Health

This document explains how the app now connects to Supabase in real time, how reports and dashboards update, how Smart Insights are produced, and how the Transaction Health metric is calculated.

## Realtime Database Connectivity
- Implementation: `src/hooks/useRealtimeTransactions.ts` uses `supabase.channel()` with a `postgres_changes` subscription to the `transactions` table.
- Scope: Events are filtered by `user_id=eq.<auth user id>` to ensure RLS safety and user isolation.
- Usage:
  - `DashboardScreen`, `ReportsScreen`, and `TransactionsScreen` import `useRealtimeTransactions()`.
  - On any INSERT/UPDATE/DELETE, we call `invalidateUserCaches(userId)` from `TransactionService` and then re-run the relevant loaders (`refresh()` / `loadData(false)`).
- Caching: `TransactionService` caches aggregates and breakdowns. Realtime events invalidate these caches, ensuring UI reflects current data without manual refresh.

## Reports Page Visualization
- Data source: Directly from Supabase via `TransactionService` methods (`getAggregatesByPeriod`, `getCategoriesBreakdown`).
- UI: `src/screens/ReportsScreen.tsx` displays:
  - Period aggregates (income vs. expense) as a simple bar visualization.
  - Category breakdown lists with proportional bars.
  - A pie summary via `SimplePieChart`.
- Auto-refresh: Realtime subscription triggers `loadData(false)` and cache invalidation.

## Dashboard Smart Insights
- Source: `AnalyticsService.getFinancialInsights(userId)`.
- Method: Local pattern analysis on live Supabase transactions (last 90 days):
  - Month-over-month expense trend (increase/decrease percent and severity).
  - Current-month savings rate estimate.
  - Category dominance over the last 30 days.
- Display: `src/components/SmartInsights.tsx` combines local UI insights with `AnalyticsService` results, showing top insights and an optional mini chart.
- Extensibility: If you enable an LLM provider later, you can append an LLM-generated summary using the same data. No API keys are required for the current logic.

## Transaction Health Metric
- Component: `src/components/FinancialHealthScore.tsx`.
- Inputs: The dashboard computes totals from currently loaded transactions: `totalIncome`, `totalExpense`, `savingsRate`, and `transactionCount`.
- Scoring: Weighted factors (Savings Rate, Spending Control, Activity, Income Stability) produce a 0–100 score with labels and color coding.
- Realtime: Any transaction change triggers dashboard `refresh()`, updating the inputs and the score immediately.

## Editable Categories (Inline)
- Component: `src/components/CategoryDropdown.tsx` with a modal list of categories.
- Flow: In `TransactionsScreen`, tap the category text (caret appears). Selecting a new category calls `updateTransaction()` to Supabase, invalidates caches, and re-renders via realtime.

## Global Currency Support
- Provider: `src/services/CurrencyProvider.tsx`.
- Default formatting is **neutral** (no symbol). Use:
  - `formatCurrency(value)` ➜ `1,234.56`.
  - `formatCurrency(value, { showSymbol: true })` ➜ localized symbol.
  - `formatCurrency(value, { showCode: true })` ➜ `USD 1,234.56`.
- No hardcoded symbols remain in UI. SMS parsers may still detect currency text for parsing purposes.

## Security & Performance
- All queries are scoped with `user_id` and protected by Supabase RLS.
- Realtime events are narrowly filtered by user to minimize bandwidth.
- Cache invalidation ensures correctness without disabling caching.

## Files Touched
- Hooks: `src/hooks/useRealtimeTransactions.ts`
- Services: `src/services/TransactionService.ts` (invalidateUserCaches), `src/services/AnalyticsService.ts` (live insights), `src/services/CurrencyProvider.tsx` (neutral currency)
- Components: `src/components/CategoryDropdown.tsx`, `src/components/TransactionCard.tsx` (editable category)
- Screens: `src/screens/DashboardScreen.tsx`, `src/screens/ReportsScreen.tsx`, `src/screens/TransactionsScreen.tsx`
