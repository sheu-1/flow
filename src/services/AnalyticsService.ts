import { supabase } from './SupabaseClient';
import { Transaction } from '../types';

export interface TimeSeriesData {
  period_start: string;
  period_end: string;
  income: number;
  expenses: number;
  net_savings: number;
  transaction_count: number;
}

export interface CategoryBreakdown {
  category: string;
  total_amount: number;
  transaction_count: number;
  avg_amount: number;
}

export interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable';
  change_percentage: number;
  prediction_next_period: number;
  confidence: number;
}

export class AnalyticsService {
  static async getSpendingTrends(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
    monthsBack: number = 12
  ): Promise<TimeSeriesData[]> {
    const { data, error } = await supabase.rpc('get_spending_trends', {
      p_user_id: userId,
      p_period: period,
      p_months_back: monthsBack
    });

    if (error) throw error;
    return data || [];
  }

  static async getCategoryBreakdown(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<CategoryBreakdown[]> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('get_monthly_spending_by_category', {
      p_user_id: userId,
      p_start_date: start,
      p_end_date: end
    });

    if (error) throw error;
    return data || [];
  }

  static async getSavingsStreak(userId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_savings_streak', {
      p_user_id: userId
    });

    if (error) throw error;
    return data || 0;
  }

  static analyzeTrend(data: TimeSeriesData[]): TrendAnalysis {
    if (data.length < 2) {
      return {
        trend: 'stable',
        change_percentage: 0,
        prediction_next_period: 0,
        confidence: 0
      };
    }

    const values = data.map(d => d.expenses);
    const n = values.length;
    
    // Simple linear regression for trend analysis
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const ssTotal = values.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const ssRes = values.reduce((sum, val, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    
    const rSquared = 1 - (ssRes / ssTotal);
    const confidence = Math.max(0, Math.min(1, rSquared));
    
    // Determine trend
    const changePercentage = (slope / yMean) * 100;
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    
    if (Math.abs(changePercentage) > 5) {
      trend = changePercentage > 0 ? 'increasing' : 'decreasing';
    }
    
    // Predict next period
    const predictionNextPeriod = slope * n + intercept;
    
    return {
      trend,
      change_percentage: changePercentage,
      prediction_next_period: Math.max(0, predictionNextPeriod),
      confidence
    };
  }

  static async getFinancialInsights(userId: string): Promise<any[]> {
    try {
      if (!userId) return [];

      // Pull last 90 days of transactions for live insights
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount, category, date')
        .eq('user_id', userId)
        .gte('date', since.toISOString())
        .order('date', { ascending: true });
      if (error) throw error;

      const txns: Transaction[] = (data || []).map((r: any) => ({
        id: '',
        type: r.type,
        amount: Number(r.amount),
        category: r.category || 'Other',
        date: r.date,
      }));

      const insights: any[] = [];

      // Month-over-month expense change (current vs previous month)
      const now = new Date();
      const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
      const byMonth = new Map<string, { income: number; expense: number }>();
      txns.forEach((t) => {
        const d = new Date(t.date);
        const key = monthKey(d);
        const curr = byMonth.get(key) || { income: 0, expense: 0 };
        if (t.type === 'income') curr.income += Math.abs(t.amount);
        else curr.expense += Math.abs(t.amount);
        byMonth.set(key, curr);
      });

      const thisMonthKey = monthKey(now);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthKey = monthKey(lastMonth);
      const thisMonth = byMonth.get(thisMonthKey) || { income: 0, expense: 0 };
      const prevMonth = byMonth.get(lastMonthKey) || { income: 0, expense: 0 };

      if (prevMonth.expense > 0) {
        const change = (thisMonth.expense - prevMonth.expense) / prevMonth.expense * 100;
        if (Math.abs(change) >= 10) {
          insights.push({
            type: change > 0 ? 'warning' : 'success',
            title: change > 0 ? 'Expenses Rising' : 'Expenses Down',
            description: `This month's expenses are ${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% versus last month`,
          });
        }
      }

      // Savings rate for current month
      const savingsRate = thisMonth.income > 0 ? ((thisMonth.income - thisMonth.expense) / thisMonth.income) * 100 : 0;
      insights.push({
        type: savingsRate >= 20 ? 'success' : savingsRate >= 10 ? 'info' : 'warning',
        title: 'Savings Rate',
        description: `Estimated savings rate this month: ${savingsRate.toFixed(1)}%`,
      });

      // Top category dominance (last 30 days)
      const since30 = new Date();
      since30.setDate(since30.getDate() - 30);
      const last30 = txns.filter((t) => new Date(t.date) >= since30);
      const categoryTotals: Record<string, number> = {};
      last30.filter(t => t.type === 'expense').forEach((t) => {
        const k = t.category || 'Other';
        categoryTotals[k] = (categoryTotals[k] || 0) + Math.abs(t.amount);
      });
      const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
      if (sortedCats.length > 0) {
        const total = sortedCats.reduce((sum, [, v]) => sum + v, 0) || 1;
        const [cat, amt] = sortedCats[0];
        const pct = (amt / total) * 100;
        if (pct >= 35) {
          insights.push({
            type: 'info',
            title: `${cat} dominates spending`,
            description: `${pct.toFixed(0)}% of the last 30 days' expenses are ${cat}`,
            amount: amt,
          });
        }
      }

      return insights;
    } catch (error) {
      console.error('AnalyticsService error:', error);
      return [];
    }
  }
}
