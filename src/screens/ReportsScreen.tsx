import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme/colors';
import { mockTransactions } from '../data/mockData';
import { useThemeColors } from '../theme/ThemeProvider';

export default function ReportsScreen() {
  const colors = useThemeColors();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');

  const calculateStats = () => {
    const now = new Date();
    let startDate: Date;

    switch (selectedPeriod) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const filteredTransactions = mockTransactions.filter(t => new Date(t.date) >= startDate);
    
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const netIncome = totalIncome - totalExpenses;

    const categoryExpenses = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>);

    return { totalIncome, totalExpenses, netIncome, categoryExpenses };
  };

  const { totalIncome, totalExpenses, netIncome, categoryExpenses } = calculateStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const StatCard = ({ title, amount, color, icon }: {
    title: string;
    amount: number;
    color: string;
    icon: any;
  }) => (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
      </View>
      <Text style={[styles.statAmount, { color }]}>{formatCurrency(amount)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Reports</Text>

        <View style={[styles.periodSelector, { backgroundColor: colors.surface }]}>
          {(['week', 'month', 'year'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && { backgroundColor: colors.primary },
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  { color: colors.textSecondary },
                  selectedPeriod === period && { color: colors.text },
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Income"
            amount={totalIncome}
            color={colors.success}
            icon="trending-up-outline"
          />
          <StatCard
            title="Expenses"
            amount={totalExpenses}
            color={colors.danger}
            icon="trending-down-outline"
          />
          <StatCard
            title="Net Income"
            amount={netIncome}
            color={netIncome >= 0 ? colors.success : colors.danger}
            icon="analytics-outline"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Expenses by Category</Text>
          {Object.entries(categoryExpenses).length > 0 ? (
            Object.entries(categoryExpenses)
              .sort(([,a], [,b]) => b - a)
              .map(([category, amount]) => (
                <View key={category} style={[styles.categoryItem, { backgroundColor: colors.card }]}>
                  <View style={styles.categoryInfo}>
                    <Text style={[styles.categoryName, { color: colors.text }]}>{category}</Text>
                    <Text style={[styles.categoryAmount, { color: colors.danger }]}>{formatCurrency(amount)}</Text>
                  </View>
                  <View style={[styles.categoryBar, { backgroundColor: colors.surface }]}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        {
                          width: `${(amount / Math.max(...Object.values(categoryExpenses))) * 100}%`,
                          backgroundColor: colors.danger,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No expenses in this period</Text>
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
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    margin: spacing.md,
    marginTop: spacing.lg,
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  periodButtonText: {
    fontWeight: '600',
  },
  statsGrid: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statTitle: {
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
  },
  statAmount: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  section: {
    marginHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  categoryItem: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  categoryAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  categoryBar: {
    height: 4,
    borderRadius: 2,
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
  },
});
