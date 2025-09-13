import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TransactionCard } from '../components/TransactionCard';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { spacing, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { Transaction } from '../types';
import { useAuth } from '../hooks/useAuth';
import { getTransactions } from '../services/TransactionService';
import { supabase } from '../services/SupabaseClient';

export default function TransactionsScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const rows = await getTransactions(user.id, { limit: 200 });
      const mapped: Transaction[] = rows.map((r) => ({
        ...r,
        date: new Date(r.date),
        description: (r as any).description || (r as any).sender || r.category || '',
        category: r.category || 'Other',
        sender: r.sender || undefined,
      }));
      setTransactions(mapped);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleAddTransaction = async (newTransaction: {
    amount: number;
    description: string;
    category: string;
    type: 'income' | 'expense';
  }) => {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please sign in to add transactions');
      return;
    }
    try {
      const payload = {
        user_id: user.id,
        type: newTransaction.type, // Use 'income' or 'expense' directly
        amount: newTransaction.amount,
        category: newTransaction.category,
        sender: newTransaction.description,
        date: new Date().toISOString(),
      } as const;
      const { error } = await supabase.from('transactions').insert(payload);
      if (error) throw error;
      await refresh();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add transaction');
    }
  };

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime()
  );

  const renderTransaction = ({ item }: { item: Transaction }) => <TransactionCard transaction={item} />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : sortedTransactions.length > 0 ? (
        <FlatList
          data={sortedTransactions}
          renderItem={renderTransaction}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No transactions yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Tap the + button to add your first transaction
          </Text>
        </View>
      )}

      <AddTransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAddTransaction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { fontSize: fontSize.xl, fontWeight: 'bold' },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: { paddingBottom: spacing.lg },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.sm },
  emptySubtitle: { fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 },
});