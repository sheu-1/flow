import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useThemeColors } from '../theme/ThemeProvider';
import { useAuth } from '../hooks/useAuth';
import { createTransaction, getTransactions } from '../services/TransactionService';
import { supabase } from '../services/SupabaseClient';
import { spacing, fontSize } from '../theme/colors';

export const DatabaseTestPanel: React.FC = () => {
  const colors = useThemeColors();
  const { user } = useAuth();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearResults = () => {
    setResults([]);
  };

  const testDatabaseConnection = async () => {
    setTesting(true);
    addResult('Testing database connection...');
    
    try {
      const { data, error } = await supabase.from('transactions').select('count').limit(1);
      if (error) throw error;
      addResult('✅ Database connection successful');
    } catch (error: any) {
      addResult(`❌ Database connection failed: ${error.message}`);
    }
    
    setTesting(false);
  };

  const testUserAuth = async () => {
    setTesting(true);
    addResult('Testing user authentication...');
    
    try {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      if (authUser) {
        addResult(`✅ User authenticated: ${authUser.email} (ID: ${authUser.id})`);
      } else {
        addResult('❌ No authenticated user found');
      }
    } catch (error: any) {
      addResult(`❌ Auth check failed: ${error.message}`);
    }
    
    setTesting(false);
  };

  const testTransactionCreation = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    setTesting(true);
    addResult('Testing transaction creation...');
    
    try {
      const testTransaction = {
        type: 'expense' as const,
        amount: 100,
        category: 'Test Category',
        description: 'Test transaction from debug panel',
        date: new Date().toISOString(),
      };

      const result = await createTransaction(user.id, testTransaction);
      
      if (result.success) {
        addResult(`✅ Transaction created successfully: ID ${result.transaction?.id}`);
      } else {
        addResult(`❌ Transaction creation failed: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      addResult(`❌ Transaction creation error: ${error.message}`);
    }
    
    setTesting(false);
  };

  const testTransactionRetrieval = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    setTesting(true);
    addResult('Testing transaction retrieval...');
    
    try {
      const transactions = await getTransactions(user.id, { limit: 5 });
      addResult(`✅ Retrieved ${transactions.length} transactions`);
      
      if (transactions.length > 0) {
        const latest = transactions[0];
        addResult(`Latest: ${latest.type} of ${latest.amount} in ${latest.category}`);
      }
    } catch (error: any) {
      addResult(`❌ Transaction retrieval failed: ${error.message}`);
    }
    
    setTesting(false);
  };

  const testTableAccess = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    setTesting(true);
    addResult('Testing table access...');
    
    try {
      // Test transactions table
      const { data: txnData, error: txnError } = await supabase
        .from('transactions')
        .select('count')
        .eq('user_id', user.id);
      
      if (txnError) throw new Error(`Transactions table: ${txnError.message}`);
      addResult('✅ Transactions table accessible');

      // Test categories table
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('count')
        .eq('user_id', user.id);
      
      if (catError) throw new Error(`Categories table: ${catError.message}`);
      addResult('✅ Categories table accessible');

    } catch (error: any) {
      addResult(`❌ Table access failed: ${error.message}`);
    }
    
    setTesting(false);
  };

  const runAllTests = async () => {
    clearResults();
    addResult('🧪 Starting comprehensive database tests...');
    
    await testDatabaseConnection();
    await testUserAuth();
    await testTableAccess();
    await testTransactionRetrieval();
    await testTransactionCreation();
    
    addResult('🏁 All tests completed');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>Database Test Panel</Text>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={runAllTests}
          disabled={testing}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>
            {testing ? 'Testing...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.danger }]}
          onPress={clearResults}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.individualTests}>
        <TouchableOpacity
          style={[styles.smallButton, { backgroundColor: colors.surface }]}
          onPress={testDatabaseConnection}
          disabled={testing}
        >
          <Text style={[styles.smallButtonText, { color: colors.text }]}>DB Connection</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.smallButton, { backgroundColor: colors.surface }]}
          onPress={testUserAuth}
          disabled={testing}
        >
          <Text style={[styles.smallButtonText, { color: colors.text }]}>User Auth</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.smallButton, { backgroundColor: colors.surface }]}
          onPress={testTransactionCreation}
          disabled={testing}
        >
          <Text style={[styles.smallButtonText, { color: colors.text }]}>Create Txn</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.resultsContainer, { backgroundColor: colors.background }]}>
        {results.map((result, index) => (
          <Text key={index} style={[styles.resultText, { color: colors.textSecondary }]}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  button: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  individualTests: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  smallButton: {
    padding: spacing.sm,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  smallButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  resultsContainer: {
    maxHeight: 200,
    borderRadius: 4,
    padding: spacing.sm,
  },
  resultText: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
    fontFamily: 'monospace',
  },
});
