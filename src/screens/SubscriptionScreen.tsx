import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/SupabaseClient';

type SubscriptionPlan = 'free' | 'daily' | 'monthly' | 'yearly';

interface PlanCardProps {
  title: string;
  price: string;
  period?: string;
  features: string[];
  isPopular?: boolean;
  onSelect: () => void;
  selected: boolean;
  colors: any;
}

const PlanCard: React.FC<PlanCardProps> = ({ 
  title, 
  price, 
  period, 
  features, 
  isPopular, 
  onSelect, 
  selected,
  colors 
}) => (
  <TouchableOpacity
    style={[
      styles.planCard,
      { 
        backgroundColor: colors.surface,
        borderColor: selected ? colors.primary : colors.border,
        borderWidth: selected ? 2 : 1,
      },
      isPopular && { borderColor: colors.primary, borderWidth: 2 }
    ]}
    onPress={onSelect}
    activeOpacity={0.7}
  >
    {isPopular && (
      <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
        <Text style={styles.popularText}>MOST POPULAR</Text>
      </View>
    )}
    
    <View style={styles.planHeader}>
      <Text style={[styles.planTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.priceContainer}>
        <Text style={[styles.planPrice, { color: colors.text }]}>{price}</Text>
        {period && <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>/{period}</Text>}
      </View>
    </View>

    <View style={styles.featuresContainer}>
      {features.map((feature, index) => (
        <View key={index} style={styles.featureRow}>
          <Ionicons 
            name="checkmark-circle" 
            size={20} 
            color={colors.success || colors.primary} 
            style={styles.featureIcon}
          />
          <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature}</Text>
        </View>
      ))}
    </View>

    <TouchableOpacity
      style={[
        styles.selectButton,
        { 
          backgroundColor: selected ? colors.primary : 'transparent',
          borderColor: colors.primary,
          borderWidth: 1,
        }
      ]}
      onPress={onSelect}
    >
      <Text style={[
        styles.selectButtonText,
        { color: selected ? '#fff' : colors.primary }
      ]}>
        {selected ? 'Selected' : 'Select Plan'}
      </Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

export default function SubscriptionScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('free');
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    // Check if this is a new user
    if (user?.user_metadata?.is_new_user === true) {
      setIsNewUser(true);
    }
  }, [user]);

  const handleClose = () => {
    if (isNewUser) {
      // For new users, clear the flag and navigate to dashboard
      clearNewUserFlag();
    } else {
      navigation.goBack();
    }
  };

  const clearNewUserFlag = async () => {
    try {
      await supabase.auth.updateUser({
        data: { is_new_user: false }
      });
      // Navigate to main app
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' as never }],
      });
    } catch (error) {
      console.error('Error clearing new user flag:', error);
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' as never }],
      });
    }
  };

  const handleSubscribe = () => {
    if (selectedPlan === 'free') {
      Alert.alert(
        'Free Trial',
        'You are already on the free trial. Enjoy all basic features!',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!user?.email) {
      Alert.alert('Error', 'Please log in to subscribe');
      return;
    }

    // Get plan details
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) {
      Alert.alert('Error', 'Plan not found');
      return;
    }

    // Convert price to KES (Kenyan Shillings) - assuming $1 = 130 KES
    const priceInUSD = parseFloat(plan.price.replace('$', ''));
    const priceInKES = priceInUSD * 130; // Convert to KES
    const amountInCents = Math.round(priceInKES * 100); // Convert to cents

    // Navigate to payment method selection
    navigation.navigate('PaymentMethod' as never, {
      plan: selectedPlan,
      amount: amountInCents,
      planTitle: plan.title,
    } as never);
  };

  const plans = [
    {
      id: 'free' as SubscriptionPlan,
      title: 'Free Trial',
      price: '$0',
      period: undefined,
      features: [
        'Track unlimited transactions',
        'Basic reports and analytics',
        'Category management',
        'Manual transaction entry',
        'Email support',
      ],
      isPopular: false,
    },
    {
      id: 'daily' as SubscriptionPlan,
      title: 'Daily Plan',
      price: '$0.50',
      period: 'day',
      features: [
        'Everything in Free Trial',
        'SMS auto-import',
        'Real-time updates',
        'Advanced analytics',
        'Priority support',
        'Perfect for testing premium features',
      ],
      isPopular: true,
    },
    {
      id: 'monthly' as SubscriptionPlan,
      title: 'Monthly Plan',
      price: '$1',
      period: 'month',
      features: [
        'Everything in Daily Plan',
        'AI-powered insights',
        'Export data',
        'Custom categories',
        'Save 33% vs daily',
        'Best value for regular users',
      ],
      isPopular: false,
    },
    {
      id: 'yearly' as SubscriptionPlan,
      title: 'Yearly Plan',
      price: '$10',
      period: 'year',
      features: [
        'Everything in Monthly Plan',
        'Save 17% per year',
        'Early access to new features',
        'Data backup & sync',
        'Premium support',
        'Lifetime updates',
      ],
      isPopular: false,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header with Close Button */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {isNewUser ? 'Welcome! Choose Your Plan' : 'Subscription Plans'}
        </Text>
        <TouchableOpacity
          onPress={handleClose}
          style={[styles.closeButton, { backgroundColor: colors.surface }]}
        >
          <Ionicons name={isNewUser ? 'arrow-forward' : 'close'} size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isNewUser 
            ? 'Start with a 2-week free trial, then choose the plan that works best for you'
            : 'Choose the plan that works best for you'}
        </Text>

        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            title={plan.title}
            price={plan.price}
            period={plan.period}
            features={plan.features}
            isPopular={plan.isPopular}
            onSelect={() => setSelectedPlan(plan.id)}
            selected={selectedPlan === plan.id}
            colors={colors}
          />
        ))}

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.subscribeButton, 
              { backgroundColor: colors.primary }
            ]}
            onPress={handleSubscribe}
          >
            <Text style={styles.subscribeButtonText}>
              {selectedPlan === 'free' ? 'Continue with Free Trial' : 'Subscribe Now'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.footerNote, { color: colors.textMuted }]}>
            Cancel anytime. No hidden fees.
          </Text>
        </View>
      </ScrollView>
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
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  subtitle: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  planCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  popularText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  planHeader: {
    marginBottom: spacing.md,
  },
  planTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  planPeriod: {
    fontSize: fontSize.md,
    marginLeft: 4,
  },
  featuresContainer: {
    marginBottom: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  featureIcon: {
    marginRight: spacing.sm,
  },
  featureText: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  selectButton: {
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  footer: {
    marginTop: spacing.lg,
  },
  subscribeButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  footerNote: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
});
