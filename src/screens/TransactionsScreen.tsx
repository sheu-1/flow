import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity,
  FlatList 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TransactionCard } from '../components/TransactionCard';
import { AddTransactionModal } from '../components/AddTransactionModal';
import { spacing, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
// import { mockTransactions } from '../data/mockData';
import { Transaction } from '../types';
import { saveToSQLite } from '../services/SyncService';
import { getAllTransactions } from '../services/Database';
import { EventBus, EVENTS } from '../services/EventBus';

export default function TransactionsScreen() {
  const colors = useThemeColors();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Load transactions from SQLite on mount
  React.useEffect(() => {
    (async () => {
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
        // Sort newest first
        mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(mapped);
      } catch (e) {
        // If DB not ready, keep empty; UI still works for add flow
      }
    })();
  }, []);

  const handleAddTransaction = (newTransaction: {
    amount: number;
    description: string;
    category: string;
    type: 'income' | 'expense';
  }) => {
    const transaction: Transaction = {
      id: Date.now().toString(),
      amount: newTransaction.type === 'expense' ? -newTransaction.amount : newTransaction.amount,
      description: newTransaction.description,
      category: newTransaction.category,
      type: newTransaction.type,
      date: new Date(),
    };

    setTransactions(prev => [transaction, ...prev]);

    // Save offline-first in SQLite (fire-and-forget)
    saveToSQLite({
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      type: transaction.type,
      date: transaction.date,
    }).then(() => {
      // Notify listeners (e.g., Dashboard) to refresh from DB
      EventBus.emit(EVENTS.TRANSACTIONS_UPDATED);
    }).catch(() => {
      // swallow errors to avoid blocking UI, SQLite will retry later
    });
  };

  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TransactionCard transaction={item} />
  );

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

      {sortedTransactions.length > 0 ? (
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
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
    paddingBottom: spacing.lg,
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
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
});
