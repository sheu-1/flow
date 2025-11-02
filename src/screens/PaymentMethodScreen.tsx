import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useThemeColors } from '../theme/ThemeProvider';
import { spacing, fontSize, borderRadius } from '../theme/colors';
import { useAuth } from '../hooks/useAuth';
import { initializePaystackPayment } from '../services/PaystackService';

type PaymentMethodRouteParams = {
  PaymentMethod: {
    plan: string;
    amount: number;
    planTitle: string;
  };
};

type PaymentMethodRouteProp = RouteProp<PaymentMethodRouteParams, 'PaymentMethod'>;

type PaymentMethod = 'card' | 'mpesa';

export default function PaymentMethodScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const route = useRoute<PaymentMethodRouteProp>();
  const { user } = useAuth();
  
  const { plan, amount, planTitle } = route.params;
  
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('card');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const formatPhoneNumber = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    
    // Format as Kenyan number (254XXXXXXXXX)
    if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.startsWith('+254')) {
      return cleaned.substring(1);
    }
    return cleaned;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Kenyan phone numbers: 254XXXXXXXXX (12 digits total)
    const cleaned = formatPhoneNumber(phone);
    return /^254[17]\d{8}$/.test(cleaned);
  };

  const handlePayment = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'Please log in to continue');
      return;
    }

    // Validate M-Pesa phone number if selected
    if (selectedMethod === 'mpesa') {
      if (!phoneNumber) {
        Alert.alert('Phone Number Required', 'Please enter your M-Pesa phone number');
        return;
      }
      
      if (!validatePhoneNumber(phoneNumber)) {
        Alert.alert(
          'Invalid Phone Number',
          'Please enter a valid Kenyan phone number (e.g., 0712345678 or 254712345678)'
        );
        return;
      }
    }

    setIsProcessing(true);

    try {
      const formattedPhone = selectedMethod === 'mpesa' ? formatPhoneNumber(phoneNumber) : undefined;

      const result = await initializePaystackPayment({
        email: user.email,
        amount,
        plan,
        userId: user.id,
        paymentMethod: selectedMethod === 'mpesa' ? 'mobile_money' : 'card',
        phoneNumber: formattedPhone,
      });

      if (result.success) {
        if (selectedMethod === 'mpesa') {
          // For M-Pesa, show instructions and navigate to verification
          Alert.alert(
            'M-Pesa Payment Initiated',
            `A payment prompt has been sent to ${phoneNumber}. Please enter your M-Pesa PIN to complete the payment.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate to payment verification screen
                  navigation.navigate('PaymentWebView' as never, {
                    url: result.authorization_url,
                    reference: result.reference,
                    plan,
                    amount,
                  } as never);
                },
              },
            ]
          );
        } else {
          // For card payments, navigate to WebView
          navigation.navigate('PaymentWebView' as never, {
            url: result.authorization_url,
            reference: result.reference,
            plan,
            amount,
          } as never);
        }
      } else {
        Alert.alert('Payment Failed', result.message || 'Please try again.');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to process payment. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Choose Payment Method</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Plan Info */}
        <View style={[styles.planInfo, { backgroundColor: colors.surface }]}>
          <Text style={[styles.planLabel, { color: colors.textSecondary }]}>Subscribing to</Text>
          <Text style={[styles.planTitle, { color: colors.text }]}>{planTitle}</Text>
          <Text style={[styles.planAmount, { color: colors.primary }]}>
            KES {(amount / 100).toFixed(2)}
          </Text>
        </View>

        {/* Payment Methods */}
        <View style={styles.methodsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Payment Method</Text>

          {/* Card Payment */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              {
                backgroundColor: colors.surface,
                borderColor: selectedMethod === 'card' ? colors.primary : colors.border,
                borderWidth: selectedMethod === 'card' ? 2 : 1,
              },
            ]}
            onPress={() => setSelectedMethod('card')}
            activeOpacity={0.7}
          >
            <View style={styles.methodHeader}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="card-outline" size={28} color={colors.primary} />
              </View>
              <View style={styles.methodInfo}>
                <Text style={[styles.methodTitle, { color: colors.text }]}>Card Payment</Text>
                <Text style={[styles.methodDescription, { color: colors.textSecondary }]}>
                  Pay with Visa, Mastercard, or Verve
                </Text>
              </View>
              {selectedMethod === 'card' && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </View>
          </TouchableOpacity>

          {/* M-Pesa Payment */}
          <TouchableOpacity
            style={[
              styles.methodCard,
              {
                backgroundColor: colors.surface,
                borderColor: selectedMethod === 'mpesa' ? colors.primary : colors.border,
                borderWidth: selectedMethod === 'mpesa' ? 2 : 1,
              },
            ]}
            onPress={() => setSelectedMethod('mpesa')}
            activeOpacity={0.7}
          >
            <View style={styles.methodHeader}>
              <View style={[styles.iconContainer, { backgroundColor: '#00A651' + '20' }]}>
                <Ionicons name="phone-portrait-outline" size={28} color="#00A651" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={[styles.methodTitle, { color: colors.text }]}>M-Pesa</Text>
                <Text style={[styles.methodDescription, { color: colors.textSecondary }]}>
                  Pay with your M-Pesa account
                </Text>
              </View>
              {selectedMethod === 'mpesa' && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </View>
          </TouchableOpacity>

          {/* M-Pesa Phone Number Input */}
          {selectedMethod === 'mpesa' && (
            <View style={[styles.phoneInputContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>M-Pesa Phone Number</Text>
              <View style={[styles.phoneInput, { borderColor: colors.border }]}>
                <Text style={[styles.countryCode, { color: colors.textSecondary }]}>+254</Text>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="712345678"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  maxLength={12}
                />
              </View>
              <Text style={[styles.inputHint, { color: colors.textMuted }]}>
                Enter your Safaricom number (e.g., 0712345678)
              </Text>
            </View>
          )}
        </View>

        {/* Payment Instructions */}
        <View style={[styles.instructionsContainer, { backgroundColor: colors.surface }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
            {selectedMethod === 'mpesa'
              ? 'You will receive an M-Pesa prompt on your phone. Enter your PIN to complete the payment.'
              : 'You will be redirected to a secure payment page to enter your card details.'}
          </Text>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          style={[
            styles.payButton,
            { backgroundColor: colors.primary },
            isProcessing && { opacity: 0.6 },
          ]}
          onPress={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color="#fff" style={styles.lockIcon} />
              <Text style={styles.payButtonText}>
                Pay KES {(amount / 100).toFixed(2)}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Security Note */}
        <Text style={[styles.securityNote, { color: colors.textMuted }]}>
          🔒 Secure payment powered by Paystack
        </Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  content: {
    padding: spacing.md,
  },
  planInfo: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  planLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  planTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  planAmount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  methodsContainer: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  methodCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: fontSize.sm,
  },
  phoneInputContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  countryCode: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    height: '100%',
  },
  inputHint: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  instructionsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  instructionsText: {
    flex: 1,
    fontSize: fontSize.sm,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  payButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  lockIcon: {
    marginRight: spacing.sm,
  },
  payButtonText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  securityNote: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
});
