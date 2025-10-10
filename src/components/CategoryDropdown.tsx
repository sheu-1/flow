import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useThemeColors } from '../theme/ThemeProvider';
import { spacing, borderRadius, fontSize } from '../theme/colors';

interface Props {
  visible: boolean;
  categories: string[];
  selected?: string | null;
  onSelect: (category: string) => void;
  onClose: () => void;
  title?: string;
}

export const DEFAULT_CATEGORIES: string[] = [
  'Salary',
  'Freelance',
  'Housing',
  'Food',
  'Transportation',
  'Utilities',
  'Entertainment',
  'Shopping',
  'Health',
  'Education',
  'Transfers',
  'Savings',
  'Other',
];

export const CategoryDropdown: React.FC<Props> = ({ visible, categories, selected, onSelect, onClose, title }) => {
  const colors = useThemeColors();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={[styles.backdrop]} activeOpacity={1} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: colors.card }]}
          // Stop propagation
          onStartShouldSetResponder={() => true}
        >
          <Text style={[styles.title, { color: colors.text }]}>{title || 'Select Category'}</Text>
          <FlatList
            data={categories}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.item, { backgroundColor: item === selected ? colors.surface : 'transparent' }]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text style={[styles.itemText, { color: colors.text }]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  container: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    maxHeight: 400,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  item: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  itemText: {
    fontSize: fontSize.md,
  },
});

export default CategoryDropdown;
