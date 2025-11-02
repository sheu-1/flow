import React, { useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, Text } from 'react-native';
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

  const { url, reference, plan, amount } = route.params;

  const handleNavigationStateChange = async (navState: any) => {
    console.log('Navigation state changed:', navState.url);

    // Check if redirected to callback URL or success page
    if (
      navState.url.includes('cashflowtracker://payment/callback') ||
      navState.url.includes('success') ||
      navState.url.includes('payment/success')
    ) {
      setVerifying(true);

      try {
        // Extract reference from URL if available
        let paymentReference = reference;
        if (navState.url.includes('reference=')) {
          const urlParams = new URLSearchParams(navState.url.split('?')[1]);
          paymentReference = urlParams.get('reference') || reference;
        }

        console.log('Verifying payment with reference:', paymentReference);

        // Verify payment with Paystack
        const result = await verifyPaystackPayment(paymentReference);

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
        <View style={styles.placeholder} />
      </View>

      {/* Payment Amount Info */}
      <View style={[styles.paymentInfo, { backgroundColor: colors.surface }]}>
        <Text style={[styles.paymentLabel, { color: colors.textSecondary }]}>
          Subscribing to {plan} plan
        </Text>
        <Text style={[styles.paymentAmount, { color: colors.primary }]}>
          ${(amount / 100).toFixed(2)}
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
