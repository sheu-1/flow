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
import Animated, { FadeInUp, FadeIn, FadeOut, useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { TransactionCard } from '../components/TransactionCard';
import CategoryDropdown, { DEFAULT_CATEGORIES } from '../components/CategoryDropdown';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { spacing, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { Transaction } from '../types';
import { useAuth } from '../hooks/useAuth';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, invalidateUserCaches } from '../services/TransactionService';
import { useRealtimeTransactions } from '../hooks/useRealtimeTransactions';
import ExportDataModal from '../components/ExportDataModal';
import { useDateFilterContext } from '../contexts/DateFilterContext';

const ITEMS_PER_PAGE = 100;

function TransactionsScreen() {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [showPagination, setShowPagination] = useState(true);
  const paginationOpacity = useSharedValue(1);
  const [showExport, setShowExport] = useState(false);

  // Use globally filtered transactions for CSV export (respects custom date filters)
  const { transactions: filteredTransactionsForExport } = useDateFilterContext();

  const refresh = useCallback(async (showLoading = true, page = currentPage) => {
    if (!user?.id) return;
    if (showLoading) setLoading(true);
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const rows = await getTransactions(user.id, { limit: ITEMS_PER_PAGE, offset });
      const mapped: Transaction[] = rows.map((r) => ({
        ...r,
        date: new Date(r.date),
        description: (r as any).description || (r as any).sender || r.category || '',
        category: r.category || 'Other',
        sender: r.sender || undefined,
      }));
      setTransactions(mapped);
      
      // Get total count for pagination (approximate)
      if (page === 1) {
        // Fetch a larger set to estimate total
        const allRows = await getTransactions(user.id, { limit: 1000 });
        setTotalTransactions(allRows.length);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load transactions');
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, currentPage]);

  React.useEffect(() => {
    refresh(true, currentPage);
  }, [currentPage]);

  React.useEffect(() => {
    if (currentPage === 1) {
      refresh();
    }
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

  const totalPages = Math.ceil(totalTransactions / ITEMS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  };

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

  const handleDeleteTransaction = (tx: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete this transaction?\n\n${tx.description}\n${tx.type === 'income' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            try {
              const result = await deleteTransaction(user.id, tx.id);
              if (!result.success) throw new Error(result.error?.message || 'Delete failed');
              await invalidateUserCaches(user.id);
              await refresh(false);
            } catch (e: any) {
              Alert.alert('Delete Failed', e?.message || 'Could not delete transaction');
            }
          },
        },
      ]
    );
  };

  const renderTransaction = ({ item, index }: { item: Transaction; index: number }) => (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 20) * 20).springify()}>
      <TransactionCard 
        transaction={item} 
        onEditCategory={() => onEditCategory(item)}
        onDelete={() => handleDeleteTransaction(item)}
      />
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.surface, marginRight: 8 }]}
            onPress={() => setShowExport(true)}
          >
            <Ionicons name="download-outline" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : sortedTransactions.length > 0 ? (
        <>
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
        </>
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

      {/* Export Data Modal - uses globally filtered transactions */}
      <ExportDataModal
        visible={showExport}
        onClose={() => setShowExport(false)}
        transactions={filteredTransactionsForExport}
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
      
      {/* Floating Pagination Controls */}
      {totalPages > 1 && (
        <Animated.View 
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={[styles.floatingPagination, { backgroundColor: colors.surface }]}
        >
          <TouchableOpacity
            onPress={handlePrevPage}
            disabled={!hasPrevPage}
            style={[
              styles.floatingArrow,
              !hasPrevPage && styles.floatingArrowDisabled,
            ]}
          >
            <Ionicons 
              name="chevron-back" 
              size={24} 
              color={hasPrevPage ? colors.primary : colors.textMuted} 
            />
          </TouchableOpacity>
          
          <View style={styles.floatingPageInfo}>
            <Text style={[styles.floatingPageText, { color: colors.text }]}>
              {currentPage}
            </Text>
            <Text style={[styles.floatingPageDivider, { color: colors.textSecondary }]}>/</Text>
            <Text style={[styles.floatingPageText, { color: colors.textSecondary }]}>
              {totalPages}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={handleNextPage}
            disabled={!hasNextPage}
            style={[
              styles.floatingArrow,
              !hasNextPage && styles.floatingArrowDisabled,
            ]}
          >
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color={hasNextPage ? colors.primary : colors.textMuted} 
            />
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  floatingPagination: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 30,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: spacing.sm,
  },
  floatingArrow: {
    padding: spacing.xs,
    borderRadius: 20,
  },
  floatingArrowDisabled: {
    opacity: 0.3,
  },
  floatingPageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
  },
  floatingPageText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  floatingPageDivider: {
    fontSize: fontSize.md,
    fontWeight: '400',
  },
});

export default TransactionsScreen;