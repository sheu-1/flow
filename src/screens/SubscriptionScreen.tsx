import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { initializePaystackPayment } from '../services/PaystackService';

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
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClose = () => {
    navigation.goBack();
  };

  const handleSubscribe = async () => {
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

    setIsProcessing(true);

    try {
      // Get plan details
      const plan = plans.find(p => p.id === selectedPlan);
      if (!plan) throw new Error('Plan not found');

      // Convert price to kobo (Paystack uses smallest currency unit)
      const amountInKobo = parseFloat(plan.price.replace('$', '')) * 100;

      // Initialize Paystack payment
      const result = await initializePaystackPayment({
        email: user.email,
        amount: amountInKobo,
        plan: selectedPlan,
        userId: user.id,
      });

      if (result.success) {
        Alert.alert(
          'Payment Successful!',
          `You have successfully subscribed to the ${plan.title}.`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Payment Failed', result.message || 'Please try again.');
      }
    } catch (error: any) {
      console.error('Subscription error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to process payment. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
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
        <Text style={[styles.title, { color: colors.text }]}>Subscription Plans</Text>
        <TouchableOpacity
          onPress={handleClose}
          style={[styles.closeButton, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Choose the plan that works best for you
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
              { backgroundColor: colors.primary },
              isProcessing && { opacity: 0.6 }
            ]}
            onPress={handleSubscribe}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.subscribeButtonText}>
                {selectedPlan === 'free' ? 'Continue with Free Trial' : 'Subscribe Now'}
              </Text>
            )}
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
