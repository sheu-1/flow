import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { mockCategories } from '../data/mockData';
import { ReceiptScannerModal } from './ReceiptScannerModal';
import { ReceiptData } from '../services/ReceiptScanService';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (transaction: {
    amount: number;
    description: string;
    category: string;
    type: 'income' | 'expense';
  }) => void;
  initialValues?: {
    amount?: number;
    description?: string;
    category?: string;
    type?: 'income' | 'expense';
  } | null;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  onAdd,
  initialValues,
}) => {
  const colors = useThemeColors();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);

  React.useEffect(() => {
    if (visible && initialValues) {
      if (initialValues.amount) setAmount(initialValues.amount.toString());
      if (initialValues.description) setDescription(initialValues.description);
      if (initialValues.category) setSelectedCategory(initialValues.category);
      if (initialValues.type) setType(initialValues.type);
    } else if (visible && !initialValues) {
      // Reset if opening empty
      setAmount('');
      setDescription('');
      setSelectedCategory('');
      setType('income');
    }
  }, [visible, initialValues]);

  const handleSubmit = () => {
    if (!amount || !description || !selectedCategory) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    onAdd({
      amount: numAmount,
      description,
      category: selectedCategory,
      type,
    });

    // Reset form
    setAmount('');
    setDescription('');
    setSelectedCategory('');
    setType('income');
    onClose();
  };

  const handleReceiptScanned = (data: ReceiptData) => {
    setAmount(data.amount.toString());
    setDescription(data.merchant);
    setType('expense'); // Receipts are typically for expenses
    setSelectedCategory('Shopping'); // Simple categorization for all receipts
    setShowReceiptScanner(false);
  };

  const filteredCategories = mockCategories.filter(cat =>
    (type === 'income' && cat.color === colors.success) ||
    (type === 'expense' && cat.color === colors.danger)
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Add Transaction</Text>
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowReceiptScanner(true)}
          >
            <Ionicons name="camera" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Receipt Scan Indicator */}
          {amount && description && type === 'expense' && (
            <View style={[styles.receiptIndicator, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
              <Ionicons name="camera" size={16} color={colors.success} />
              <Text style={[styles.receiptIndicatorText, { color: colors.success }]}>
                Data auto-filled from receipt scan
              </Text>
            </View>
          )}

          <View style={[styles.typeSelector, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'income' && styles.typeButtonActive]}
              onPress={() => setType('income')}
            >
              <Text style={[styles.typeButtonText, { color: colors.textSecondary }, type === 'income' && styles.typeButtonTextActive, type === 'income' && { color: colors.text }]}>
                Money In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]}
              onPress={() => setType('expense')}
            >
              <Text style={[styles.typeButtonText, { color: colors.textSecondary }, type === 'expense' && styles.typeButtonTextActive, type === 'expense' && { color: colors.text }]}>
                Money Out
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
              value={amount.replace(/[^0-9.]/g, '')}
              onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ''))}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter description"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.categoryList}>
                {filteredCategories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryItem,
                      { backgroundColor: colors.surface },
                      selectedCategory === category.name && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setSelectedCategory(category.name)}
                  >
                    <Ionicons name={category.icon as any} size={20} color={category.color} />
                    <Text style={[styles.categoryText, { color: colors.text }]}>{category.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButtonBottom, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
          >
            <Text style={[styles.saveButtonBottomText, { color: '#fff' }]}>
              Save Transaction
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Receipt Scanner Modal */}
      <ReceiptScannerModal
        visible={showReceiptScanner}
        onClose={() => setShowReceiptScanner(false)}
        onReceiptScanned={handleReceiptScanned}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#fff',
  },
  scanButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    fontSize: fontSize.md,
    color: '#2563EB',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  receiptIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  receiptIndicatorText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    backgroundColor: '#222',
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  typeButtonActive: {
    backgroundColor: '#2563EB',
  },
  typeButtonText: {
    color: '#aaa',
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    color: '#aaa',
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: '#222',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: '#fff',
  },
  categoryList: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryItem: {
    backgroundColor: '#222',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 80,
  },
  categoryItemActive: {
    backgroundColor: '#2563EB',
  },
  categoryText: {
    fontSize: fontSize.xs,
    color: '#fff',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  saveButtonBottom: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  saveButtonBottomText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
});
