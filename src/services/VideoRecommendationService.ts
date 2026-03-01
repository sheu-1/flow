import { getTransactions } from './TransactionService';
import { cacheService } from './CacheService';
import { Transaction } from '../types';
import { exploreVideos, ExploreVideo } from '../data/exploreVideos';

// ── Types ────────────────────────────────────────────────

export interface SpendingSignals {
    /** total expenses ÷ total income (0 – ∞, >0.9 is high) */
    expenseRatio: number;
    /** top 3 expense categories by amount */
    topCategories: string[];
    /** user has Fuliza / loan-related transactions */
    hasDebt: boolean;
    /** income − expense (monthly average) */
    savingsPotential: number;
    /** income is growing month-over-month */
    incomeGrowing: boolean;
    /** total number of transactions analysed */
    transactionCount: number;
    /** short human-readable insight sentence */
    insightText: string;
}

export interface RecommendedVideo extends ExploreVideo {
    /** how many of the video's tags matched the user's signals */
    relevanceScore: number;
}

// ── Signal → Tag mapping ─────────────────────────────────

const DEBT_CATEGORIES = ['fuliza repayment', 'fuliza fee', 'loan'];

function signalsToTags(signals: SpendingSignals): string[] {
    const tags: string[] = [];

    // High expense ratio → user needs budgeting / discipline help
    if (signals.expenseRatio > 0.9) {
        tags.push('budgeting', 'saving', 'financial-discipline', 'spending-awareness');
    } else if (signals.expenseRatio > 0.7) {
        tags.push('budgeting', 'spending-awareness');
    }

    // Debt indicators → debt management content
    if (signals.hasDebt) {
        tags.push('debt-freedom', 'financial-literacy', 'financial-discipline');
    }

    // Good savings potential → investing & growth content
    if (signals.savingsPotential > 0 && signals.expenseRatio < 0.7) {
        tags.push('investing-basics', 'compound-interest', 'wealth-building', 'passive-income');
    }

    // Income growing → encourage investment & scale
    if (signals.incomeGrowing) {
        tags.push('wealth-building', 'investing-basics', 'side-hustle', 'income-growth');
    }

    // High airtime / data spend
    const airtimeCategory = signals.topCategories.find(
        (c) => c.toLowerCase().includes('airtime') || c.toLowerCase().includes('data'),
    );
    if (airtimeCategory) {
        tags.push('spending-awareness', 'budgeting');
    }

    // Everyone benefits from mindset content
    tags.push('mindset');

    // If very few signals matched, add general financial literacy
    if (tags.length <= 2) {
        tags.push('financial-literacy', 'budgeting', 'saving');
    }

    // Deduplicate
    return [...new Set(tags)];
}

function buildInsight(signals: SpendingSignals): string {
    if (signals.transactionCount === 0) return '';

    if (signals.hasDebt && signals.expenseRatio > 0.9) {
        return 'You have active debt and high spending - start with budgeting & debt tips.';
    }
    if (signals.expenseRatio > 0.9) {
        return 'Your spending is close to your income - saving strategies can help.';
    }
    if (signals.hasDebt) {
        return 'You have active debt - learn how to pay it off faster.';
    }
    if (signals.savingsPotential > 0 && signals.expenseRatio < 0.5) {
        return 'You are saving well - time to explore investing & passive income.';
    }
    if (signals.incomeGrowing) {
        return 'Your income is growing - learn how to make it work harder for you.';
    }
    return 'Here are picks based on your financial profile.';
}

// ── Core analysis ────────────────────────────────────────

export async function analyseSpending(userId: string): Promise<SpendingSignals> {
    const cacheKey = `spending_signals_${userId}`;
    const cached = await cacheService.get<SpendingSignals>(cacheKey);
    if (cached) return cached;

    // Fetch last 90 days of transactions
    const now = new Date();
    const ninetyDaysAgo = new Date(now);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const txns = await getTransactions(userId, {
        from: ninetyDaysAgo,
        to: now,
        limit: 10000,
        offset: 0,
    });

    if (txns.length === 0) {
        const empty: SpendingSignals = {
            expenseRatio: 0,
            topCategories: [],
            hasDebt: false,
            savingsPotential: 0,
            incomeGrowing: false,
            transactionCount: 0,
            insightText: '',
        };
        return empty;
    }

    const totalIncome = txns
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + Math.abs(t.amount), 0);

    const totalExpense = txns
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + Math.abs(t.amount), 0);

    const expenseRatio = totalIncome > 0 ? totalExpense / totalIncome : 1;

    // Category breakdown (expense only)
    const catMap: Record<string, number> = {};
    txns
        .filter((t) => t.type === 'expense')
        .forEach((t) => {
            const key = t.category || 'Other';
            catMap[key] = (catMap[key] || 0) + Math.abs(t.amount);
        });

    const topCategories = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat);

    // Debt detection
    const hasDebt = txns.some((t) => {
        const cat = (t.category || '').toLowerCase();
        const desc = ((t as any).description || '').toLowerCase();
        return DEBT_CATEGORIES.some((d) => cat.includes(d) || desc.includes(d));
    });

    // Income trend (this month vs last month)
    const thisMonth = now.getMonth();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const thisMonthIncome = txns
        .filter((t) => t.type === 'income' && new Date(t.date).getMonth() === thisMonth)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
    const lastMonthIncome = txns
        .filter((t) => t.type === 'income' && new Date(t.date).getMonth() === lastMonth)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
    const incomeGrowing = lastMonthIncome > 0 && thisMonthIncome > lastMonthIncome;

    // Monthly savings potential (average)
    const months = Math.max(1, Math.ceil((now.getTime() - ninetyDaysAgo.getTime()) / (30 * 24 * 60 * 60 * 1000)));
    const savingsPotential = (totalIncome - totalExpense) / months;

    const signals: SpendingSignals = {
        expenseRatio,
        topCategories,
        hasDebt,
        savingsPotential,
        incomeGrowing,
        transactionCount: txns.length,
        insightText: '',
    };
    signals.insightText = buildInsight(signals);

    // Cache for 1 hour
    await cacheService.set(cacheKey, signals, 60 * 60 * 1000);
    return signals;
}

// ── Recommendation engine ────────────────────────────────

export async function getRecommendedVideos(userId: string): Promise<{
    videos: RecommendedVideo[];
    insight: string;
}> {
    const signals = await analyseSpending(userId);

    if (signals.transactionCount === 0) {
        return { videos: [], insight: '' };
    }

    const relevantTags = signalsToTags(signals);

    // Score each video by how many of its tags match
    const scored: RecommendedVideo[] = exploreVideos.map((v) => {
        const matchCount = v.tags.filter((t) => relevantTags.includes(t)).length;
        return { ...v, relevanceScore: matchCount };
    });

    // Sort by relevance, then shuffle ties for variety
    scored.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
        return Math.random() - 0.5;
    });

    // Return top 6
    const top = scored.filter((v) => v.relevanceScore > 0).slice(0, 6);

    return {
        videos: top,
        insight: signals.insightText,
    };
}
