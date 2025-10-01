import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useThemeColors } from '../theme/ThemeProvider';
import { getTransactions, getAggregatesByPeriod } from '../services/TransactionService';
import { notificationService } from '../services/NotificationService';
import { Transaction, AggregatePeriod } from '../types';
import { MoneyCard } from '../components/MoneyCard';
import { PieChart } from '../components/PieChart';
import { PeriodSelector } from '../components/PeriodSelector';
import { ProfileMenu } from '../components/ProfileMenu';
import NotificationPanel from '../components/NotificationPanel';
import { TransactionCard } from '../components/TransactionCard';
import { spacing, fontSize } from '../theme/colors';
import { useCurrency } from '../services/CurrencyProvider';

export default function DashboardScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [refreshing, setRefreshing] = useState(false);
  const colors = useThemeColors();
  const { user } = useAuth();
  const { currency, availableCurrencies, setCurrency } = useCurrency();
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async (showRefreshing = false) => {
    if (!user?.id) return;
    if (showRefreshing) setRefreshing(true);
    try {
      const rows = await getTransactions(user.id, { limit: 500 });
      const mapped: Transaction[] = rows.map((r) => ({
        ...r,
        date: new Date(r.date),
        description: (r as any).description || (r as any).sender || r.category || '',
        category: r.category || 'Other',
        type: (r.type === 'income' || r.type === 'expense') ? r.type : (r.amount >= 0 ? 'income' : 'expense'),
      }));
      mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(mapped);
      
      // Check for spending notifications
      await notificationService.checkWeeklySpending(user.id);
    } catch (e) {
      // ignore
    } finally {
      if (showRefreshing) setRefreshing(false);
    }
  }, [user]);

  // Listen for notification updates
  useEffect(() => {
    const unsubscribe = notificationService.addListener((notifications) => {
      setUnreadCount(notificationService.getUnreadCount());
    });
    setUnreadCount(notificationService.getUnreadCount());
    return unsubscribe;
  }, []);

  // Initial load
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onRefresh = useCallback(() => {
    refresh(true);
  }, [refresh]);

  const calculatePeriodStats = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;

    switch (selectedPeriod) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 1);
        periodLabel = 'Today';
        break;
      case 'weekly':
        // Week starts on Sunday. If you prefer Monday, change offset to: ((now.getDay() + 6) % 7)
        const offset = now.getDay();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        weekStart.setDate(weekStart.getDate() - offset);
        startDate = weekStart;
        endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 7);
        periodLabel = 'This Week';
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
        periodLabel = 'This Month';
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
        periodLabel = 'This Year';
        break;
    }

    // Fallback for typescript narrowing (endDate is always set in switch above)
    endDate = endDate || now;

    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate < endDate;
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

  const displayName = user?.user_metadata?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        stickyHeaderIndices={[1]} // Make the period selector (index 1) sticky
      >
        {/* Scrollable Header */}
        <View style={[styles.header, { backgroundColor: colors.background }]}>
          <View style={styles.headerTopRow}>
            <Text style={[styles.greeting, { color: colors.text }]}>Hello, {displayName}</Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconButton} onPress={() => setShowNotifications(true)}>
                <Ionicons name="notifications-outline" size={24} color={colors.text} />
                {unreadCount > 0 && (
                  <View style={[styles.notificationBadge, { backgroundColor: colors.danger }]}> 
                    <Text style={[styles.notificationBadgeText, { color: colors.background }]}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              <ProfileMenu />
            </View>
          </View>
          
          <View style={styles.dateCurrencyRow}>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>{new Date().toLocaleDateString()}</Text>
            <View style={styles.currencyRight}>
              <TouchableOpacity
                style={[styles.currencyButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => setCurrencyOpen((open) => !open)}
              >
                <Text style={[styles.currencyButtonText, { color: colors.text }]} numberOfLines={1}>{currency}</Text>
                <Ionicons name={currencyOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text} />
              </TouchableOpacity>
              {currencyOpen && (
                <View style={[styles.currencyMenu, { borderColor: colors.border, backgroundColor: colors.card }]}> 
                  <ScrollView style={{ maxHeight: 160 }}>
                    {availableCurrencies.map((c) => (
                      <TouchableOpacity key={c} style={styles.currencyMenuItem} onPress={() => { setCurrency(c); setCurrencyOpen(false); }}>
                        <Text style={{ color: c === currency ? colors.primary : colors.text, fontWeight: '600' }}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </View>
        
        {/* Sticky Period Selector */}
        <View style={[styles.stickyPeriodSelector, { backgroundColor: colors.background }]}>
          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        </View>
        
        {/* Main Content */}
        <View>
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
        </View>
      </ScrollView>
      
      {/* Notification Panel */}
      <NotificationPanel 
        visible={showNotifications} 
        onClose={() => setShowNotifications(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  stickyPeriodSelector: {
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  greetingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 4,
    paddingHorizontal: spacing.md,
  },
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 14,
    marginTop: 0,
  },
  dateCurrencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: 4,
  },
  currencyRight: {
    flexShrink: 1,
    maxWidth: '40%',
  },
  currencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: 8,
  },
  currencyButtonText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    marginRight: spacing.xs,
  },
  currencyMenu: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  currencyMenuItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  currencySelectorRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  currencyChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
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
