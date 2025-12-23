import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text, Animated } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { verifyPaystackPayment } from '../services/PaystackService';
import { useThemeColors } from '../theme/ThemeProvider';
import { spacing } from '../theme/colors';

type PaymentWebViewRouteParams = {
  PaymentWebView: {
    url: string;
    reference: string;
    plan: string;
    amount: number;
  };
};

type PaymentWebViewRouteProp = RouteProp<PaymentWebViewRouteParams, 'PaymentWebView'>;

export default function PaymentWebViewScreen() {
  const navigation = useNavigation();
  const route = useRoute<PaymentWebViewRouteProp>();
  const colors = useThemeColors();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const { url, reference, plan, amount } = route.params;

  // Soft pulsing animation to draw attention to the confirm button
  useEffect(() => {
    if (verifying) {
      scaleAnim.stopAnimation();
      scaleAnim.setValue(1);
      return;
    }

    const pulse = () => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && !verifying) {
          pulse();
        }
      });
    };

    pulse();

    return () => {
      scaleAnim.stopAnimation();
      scaleAnim.setValue(1);
    };
  }, [verifying, scaleAnim]);

  const verifyAndComplete = async (maybeUrl?: string) => {
    if (verifying) return;
    setVerifying(true);

    try {
      let paymentReference = reference;

      // Optionally extract reference from URL if provided
      if (maybeUrl && maybeUrl.includes('reference=')) {
        try {
          const urlParams = new URLSearchParams(maybeUrl.split('?')[1] || '');
          paymentReference = urlParams.get('reference') || reference;
        } catch {
          paymentReference = reference;
        }
      }

      console.log('Verifying payment with reference:', paymentReference);

      // Verify payment with Paystack
      const result = await verifyPaystackPayment(paymentReference, plan);

      if (result.success) {
        Alert.alert(
          'Payment Successful! 🎉',
          `Your ${plan} subscription has been activated successfully.`,
          [
            {
              text: 'Continue',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' as never }],
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Payment Verification Failed',
          result.message || 'Unable to verify your payment. Please contact support.',
          [
            {
              text: 'Try Again',
              onPress: () => navigation.goBack(),
            },
            {
              text: 'Cancel',
              onPress: () => navigation.goBack(),
              style: 'cancel',
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      Alert.alert(
        'Verification Error',
        'Failed to verify payment. Please contact support if money was deducted.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleNavigationStateChange = async (navState: any) => {
    const currentUrl: string = navState?.url || '';
    console.log('Navigation state changed:', currentUrl);

    // Check if redirected to callback URL or a success URL from Paystack
    const isCallbackUrl =
      currentUrl.includes('cashflowtracker://payment/callback') ||
      currentUrl.includes('status=success') ||
      currentUrl.includes('payment/success') ||
      // Paystack usually appends ?reference=... on successful completion
      currentUrl.includes('reference=');

    if (isCallbackUrl) {
      await verifyAndComplete(currentUrl);
    }
  };

  const handleClose = () => {
    Alert.alert(
      'Cancel Payment?',
      'Are you sure you want to cancel this payment?',
      [
        {
          text: 'Continue Payment',
          style: 'cancel',
        },
        {
          text: 'Cancel',
          onPress: () => navigation.goBack(),
          style: 'destructive',
        },
      ]
    );
  };

  if (verifying) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.verifyingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.verifyingText, { color: colors.text }]}>
            Verifying your payment...
          </Text>
          <Text style={[styles.verifyingSubtext, { color: colors.textSecondary }]}>
            Please wait while we confirm your subscription
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Complete Payment</Text>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              { backgroundColor: colors.primary, opacity: verifying ? 0.6 : 1 },
            ]}
            onPress={() => verifyAndComplete()}
            disabled={verifying}
          >
            <Text style={styles.confirmButtonText}>I've Paid - Confirm</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Payment Amount Info */}
      <View style={[styles.paymentInfo, { backgroundColor: colors.surface }]}>
        <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>
          Subscribing to {plan} plan
        </Text>
        <Text style={[styles.paymentAmount, { color: colors.primary }]}>
          KES {(amount / 100).toFixed(2)}
        </Text>
      </View>

      {/* WebView */}
      <View style={styles.webViewContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading payment page...
            </Text>
          </View>
        )}
        
        <WebView
          source={{ uri: url }}
          onNavigationStateChange={handleNavigationStateChange}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          startInLoadingState={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={styles.webView}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
        />
      </View>
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
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32, // Same width as close button for centering
  },
  paymentInfo: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  confirmButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    zIndex: 1,
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: 16,
  },
  verifyingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  verifyingText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  verifyingSubtext: {
    fontSize: 14,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
