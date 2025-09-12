import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { MoneyCard } from '../components/MoneyCard';
import { PeriodSelector } from '../components/PeriodSelector';
import { PieChart } from '../components/PieChart';
import { TransactionCard } from '../components/TransactionCard';
import { spacing, fontSize } from '../theme/colors';
// import { mockTransactions } from '../data/mockData';
import { Transaction } from '../types';
import { getAllTransactions } from '../services/Database';
import { Ionicons } from '@expo/vector-icons';
import { EventBus, EVENTS } from '../services/EventBus';
import { useFocusEffect } from '@react-navigation/native';
import { useThemeColors } from '../theme/ThemeProvider';

export default function DashboardScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const colors = useThemeColors();

  const loadFromDB = useCallback(async () => {
    try {
      const rows = await getAllTransactions();
      const mapped: Transaction[] = rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        description: (r as any).description ?? '',
        category: r.category ?? 'Other',
        type: (r.type === 'income' || r.type === 'expense') ? r.type : (r.amount >= 0 ? 'income' : 'expense'),
        date: new Date(r.date),
      }));
      mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(mapped);
    } catch (e) {
      // ignore
    }
  }, []);

  // Initial load
  React.useEffect(() => {
    loadFromDB();
    const unsubscribe = EventBus.on(EVENTS.TRANSACTIONS_UPDATED, loadFromDB);
    return unsubscribe;
  }, [loadFromDB]);

  // Also refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      loadFromDB();
    }, [loadFromDB])
  );

  const calculatePeriodStats = () => {
    const now = new Date();
    let startDate: Date;
    let periodLabel: string;

    switch (selectedPeriod) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodLabel = 'Today';
        break;
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        startDate = weekStart;
        periodLabel = 'This Week';
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = 'This Month';
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        periodLabel = 'This Year';
        break;
    }

    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate;
    });

    const moneyIn = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const moneyOut = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const netBalance = moneyIn - moneyOut;

    return { moneyIn, moneyOut, netBalance, periodLabel };
  };

  const { moneyIn, moneyOut, netBalance, periodLabel } = calculatePeriodStats();
  const recentTransactions = transactions.slice(0, 5);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning! 🌅';
    if (hour < 17) return 'Good afternoon! ☀️';
    return 'Good evening! 🌙';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.text }]}>{getGreeting()}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Profile"
            onPress={() => { /* TODO: Navigate to profile/settings */ }}
            style={styles.profileButton}
          >
            <Ionicons name="person-circle-outline" size={34} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        <PeriodSelector
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />

        <View style={styles.cardsRow}>
          <MoneyCard
            title="Money In"
            amount={moneyIn}
            type="in"
            period={periodLabel}
            icon="trending-up-outline"
          />
          <MoneyCard
            title="Money Out"
            amount={moneyOut}
            type="out"
            period={periodLabel}
            icon="trending-down-outline"
          />
        </View>

        <View style={styles.netBalanceContainer}>
          <MoneyCard
            title="Net Balance"
            amount={netBalance}
            type="net"
            period={periodLabel}
            icon="analytics-outline"
          />
        </View>

        <PieChart moneyIn={moneyIn} moneyOut={moneyOut} />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => (
              <TransactionCard key={transaction.id} transaction={transaction} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transactions yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>Add your first transaction to get started</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    // margin handled by header container
  },
  profileButton: {
    padding: spacing.xs,
    borderRadius: 999,
  },
  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  netBalanceContainer: {
    paddingHorizontal: spacing.md,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
  },
});
