import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { TransactionCard } from '../components/TransactionCard';
import CategoryDropdown, { DEFAULT_CATEGORIES } from '../components/CategoryDropdown';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { spacing, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { Transaction } from '../types';
import { useAuth } from '../hooks/useAuth';
import { getTransactions, createTransaction, updateTransaction, invalidateUserCaches } from '../services/TransactionService';
import { useRealtimeTransactions } from '../hooks/useRealtimeTransactions';

export default function TransactionsScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const refresh = useCallback(async (showLoading = true) => {
    if (!user?.id) return;
    if (showLoading) setLoading(true);
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
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime updates
  useRealtimeTransactions(user?.id, async () => {
    if (!user?.id) return;
    await invalidateUserCaches(user.id);
    refresh(false);
  });

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh(false);
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
      const result = await createTransaction(user.id, {
        type: newTransaction.type,
        amount: newTransaction.amount,
        category: newTransaction.category,
        description: newTransaction.description,
        date: new Date().toISOString(),
      });
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create transaction');
      }
      
      await refresh();
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add transaction');
    }
  };

  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime()
  );

  const onEditCategory = (tx: Transaction) => {
    setSelectedTxId(tx.id);
    setCategoryPickerVisible(true);
  };

  const handleSelectCategory = async (category: string) => {
    if (!user?.id || !selectedTxId) return;
    try {
      const result = await updateTransaction(user.id, selectedTxId, { category });
      if (!result.success) throw new Error(result.error?.message || 'Update failed');
      await invalidateUserCaches(user.id);
      await refresh(false);
    } catch (e: any) {
      Alert.alert('Update Failed', e?.message || 'Could not update category');
    } finally {
      setSelectedTxId(null);
      setCategoryPickerVisible(false);
    }
  };

  const renderTransaction = ({ item, index }: { item: Transaction; index: number }) => (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 20) * 20).springify()}>
      <TransactionCard transaction={item} onEditCategory={() => onEditCategory(item)} />
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
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

      {/* Category Picker */}
      <CategoryDropdown
        visible={categoryPickerVisible}
        categories={DEFAULT_CATEGORIES}
        selected={transactions.find(t => t.id === selectedTxId)?.category || undefined}
        onSelect={handleSelectCategory}
        onClose={() => { setCategoryPickerVisible(false); setSelectedTxId(null); }}
        title="Edit Category"
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: fontSize.xl, fontWeight: 'bold' },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: { paddingBottom: spacing.lg, paddingTop: spacing.sm },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', marginTop: spacing.md, marginBottom: spacing.sm },
  emptySubtitle: { fontSize: fontSize.md, textAlign: 'center', lineHeight: 22 },
});