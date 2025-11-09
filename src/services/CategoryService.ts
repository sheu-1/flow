import { supabase } from './SupabaseClient';

/**
 * Get appropriate icon for category based on type
 */
export function getCategoryIcon(categoryName: string, type: 'income' | 'expense'): string {
  const name = categoryName.toLowerCase();
  
  if (type === 'income') {
    if (name.includes('salary')) return 'card';
    if (name.includes('mobile') || name.includes('mpesa')) return 'phone-portrait';
    return 'arrow-up-circle'; // Money In icon
  }

  // Expense icons
  if (name.includes('food') || name.includes('dining')) return 'restaurant';
  if (name.includes('transport')) return 'car';
  if (name.includes('shop')) return 'bag';
  if (name.includes('airtime') || name.includes('data')) return 'phone-portrait';
  if (name.includes('cash') || name.includes('withdraw')) return 'cash';
  if (name.includes('bill') || name.includes('utilities')) return 'receipt';
  if (name.includes('medical') || name.includes('health')) return 'medical';
  if (name.includes('mobile') || name.includes('mpesa')) return 'phone-portrait';
  
  return 'arrow-down-circle'; // Money Out icon
}

/**
 * Get appropriate color for category based on type
 */
export function getCategoryColor(categoryName: string, type: 'income' | 'expense'): string {
  const name = categoryName.toLowerCase();
  
  if (type === 'income') {
    return '#10B981'; // Green for Money In
  }

  // Red for Money Out
  return '#EF4444';
}

/**
 * Update category color and icon when type changes
 */
export async function updateCategoryTypeAndVisuals(
  categoryId: string,
  newType: 'income' | 'expense',
  categoryName: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const newIcon = getCategoryIcon(categoryName, newType);
    const newColor = getCategoryColor(categoryName, newType);

    const { error } = await supabase
      .from('categories')
      .update({
        type: newType,
        icon: newIcon,
        color: newColor,
      })
      .eq('id', categoryId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating category:', error);
    return { success: false, error };
  }
}
