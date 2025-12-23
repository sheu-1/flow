import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert, Switch, Platform, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme/colors';
import { useThemeColors, useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';
import { PermissionService } from '../services/PermissionService';
import { requestSmsPermission } from '../services/SmsService';
import EditProfileModal from '../components/EditProfileModal';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ExportDataModal from '../components/ExportDataModal';
import { supabase } from '../services/SupabaseClient';
import { submitFeedback } from '../services/FeedbackService';
import { Transaction } from '../types';
import { getSubscriptionStatus, SubscriptionStatus } from '../services/SubscriptionManager';

export default function ProfileScreen() {
  const colors = useThemeColors();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showExportData, setShowExportData] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Check SMS permission status and load transactions on mount
  useEffect(() => {
    checkSmsPermission();
    loadTransactions();
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [user?.id]);

  const loadSubscription = async () => {
    if (!user?.id) {
      setSubscriptionStatus(null);
      return;
    }
    setLoadingSubscription(true);
    try {
      const status = await getSubscriptionStatus(user.id);
      setSubscriptionStatus(status);
    } catch (e) {
      console.warn('Error loading subscription status:', e);
      setSubscriptionStatus(null);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const formatPlanLabel = (plan: string) => {
    const p = (plan || '').toLowerCase();
    if (p === 'daily') return 'Daily';
    if (p === 'weekly') return 'Weekly';
    if (p === 'monthly') return 'Monthly';
    if (p === 'yearly' || p === 'annual') return 'Yearly';
    if (p === 'free_trial') return 'Free Trial';
    if (!p) return 'Unknown';
    return plan;
  };

  const getSubscriptionLine1 = () => {
    if (loadingSubscription) return 'Loading...';
    if (!subscriptionStatus) return 'Unknown';

    if (subscriptionStatus.isTrial) {
      if (subscriptionStatus.trialEnded) return 'Trial ended';
      return 'Free trial active';
    }

    if (subscriptionStatus.isActive) {
      return `Active (${formatPlanLabel(subscriptionStatus.plan)})`;
    }

    return 'Inactive';
  };

  const getSubscriptionLine2 = () => {
    if (loadingSubscription) return null;
    if (!subscriptionStatus) return null;

    if (subscriptionStatus.isTrial) {
      if (!subscriptionStatus.trialEnded) {
        return `${subscriptionStatus.daysRemaining} day(s) remaining`;
      }
      return null;
    }

    if (subscriptionStatus.expiresAt) {
      return `Expires: ${subscriptionStatus.expiresAt.toLocaleDateString()}`;
    }

    return null;
  };

  const loadTransactions = async () => {
    if (!user) return;
    
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleFeedback = async () => {
    if (!user?.id) {
      Alert.alert('Not signed in', 'Please sign in to send feedback.');
      return;
    }
    setFeedbackText('');
    setFeedbackVisible(true);
  };

  const submitFeedbackNow = async () => {
    if (!user?.id) return;
    const message = feedbackText.trim();
    if (!message) {
      setFeedbackVisible(false);
      return;
    }
    setSubmittingFeedback(true);
    const res = await submitFeedback(user.id, message);
    setSubmittingFeedback(false);
    setFeedbackVisible(false);
    if (res.success) {
      Alert.alert('Thanks!', 'Your feedback has been submitted.');
    } else {
      Alert.alert('Error', res.error?.message || 'Failed to submit feedback.');
    }
  };

  const checkSmsPermission = async () => {
    if (Platform.OS !== 'android') {
      setCheckingPermission(false);
      return;
    }
    try {
      const status = await PermissionService.getSmsStatus();
      setSmsEnabled(status.canImport);
    } catch (error) {
      console.warn('Error checking SMS permission:', error);
    } finally {
      setCheckingPermission(false);
    }
  };

  const handleSmsToggle = async (value: boolean) => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available', 'SMS permissions are only available on Android devices.');
      return;
    }

    if (value) {
      // Request permission
      const granted = await requestSmsPermission();
      if (granted) {
        setSmsEnabled(true);
        Alert.alert('Success', 'SMS permissions granted. The app will now automatically import transactions.');
      } else {
        setSmsEnabled(false);
        Alert.alert('Permission Denied', 'SMS permission is required to automatically import transactions.');
      }
    } else {
      // Don't change state immediately - wait for user confirmation
      Alert.alert(
        'Disable SMS Import?',
        'You can re-enable this in Settings or by toggling this switch again.',
        [
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => {
              // Keep toggle enabled
              setSmsEnabled(true);
            }
          },
          {
            text: 'Disable',
            onPress: () => setSmsEnabled(false),
          },
        ]
      );
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const displayName = user?.user_metadata?.full_name || user?.email || 'User';
  const email = user?.email || 'No email';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Profile Info Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle" size={80} color={colors.primary} />
          </View>
          <Text style={[styles.displayName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{email}</Text>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account Information</Text>
          
          <View style={[styles.infoItem, { backgroundColor: colors.surface }]}>
            <View style={styles.infoContent}>
              <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.infoIcon} />
              <View>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{email}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.infoItem, { backgroundColor: colors.surface }]}>
            <View style={styles.infoContent}>
              <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} style={styles.infoIcon} />
              <View>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Member Since</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.infoItem, { backgroundColor: colors.surface }]}>
            <View style={styles.infoContent}>
              <Ionicons name="card-outline" size={20} color={colors.textSecondary} style={styles.infoIcon} />
              <View>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Subscription</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{getSubscriptionLine1()}</Text>
                {getSubscriptionLine2() ? (
                  <Text style={[styles.infoSubValue, { color: colors.textSecondary }]}>{getSubscriptionLine2()}</Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account Actions</Text>
          
          {/* SMS Permission Toggle */}
          {Platform.OS === 'android' && (
            <View style={[styles.actionItem, { backgroundColor: colors.surface }]}>
              <Ionicons 
                name="chatbox-ellipses-outline" 
                size={20} 
                color={colors.primary} 
                style={styles.actionIcon} 
              />
              <View style={styles.toggleContent}>
                <Text style={[styles.actionText, { color: colors.text }]}>Auto-Import SMS</Text>
                <Text style={[styles.toggleSubtext, { color: colors.textSecondary }]}>Automatically log transactions from SMS</Text>
              </View>
              <Switch
                value={smsEnabled}
                onValueChange={handleSmsToggle}
                disabled={checkingPermission}
                trackColor={{ false: colors.border, true: '#3B82F6' }}
                thumbColor={smsEnabled ? '#FFFFFF' : '#F3F4F6'}
                ios_backgroundColor={colors.border}
              />
            </View>
          )}

          <TouchableOpacity 
            style={[styles.actionItem, { backgroundColor: colors.surface }]}
            onPress={toggleTheme}
          >
            <Ionicons 
              name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'} 
              size={20} 
              color={colors.primary} 
              style={styles.actionIcon} 
            />
            <Text style={[styles.actionText, { color: colors.text }]}>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionItem, { backgroundColor: colors.surface }]}
            onPress={() => (navigation as any).navigate('Subscription')}
          >
            <Ionicons name="card-outline" size={20} color={colors.primary} style={styles.actionIcon} />
            <Text style={[styles.actionText, { color: colors.text }]}>Subscription Plans</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionItem, { backgroundColor: colors.surface }]}
            onPress={() => setShowEditProfile(true)}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} style={styles.actionIcon} />
            <Text style={[styles.actionText, { color: colors.text }]}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionItem, { backgroundColor: colors.surface }]}
            onPress={() => setShowChangePassword(true)}
          >
            <Ionicons name="key-outline" size={20} color={colors.primary} style={styles.actionIcon} />
            <Text style={[styles.actionText, { color: colors.text }]}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionItem, { backgroundColor: colors.surface }]}
            onPress={() => setShowExportData(true)}
            disabled={loadingTransactions}
          >
            <Ionicons name="download-outline" size={20} color={colors.primary} style={styles.actionIcon} />
            <Text style={[styles.actionText, { color: colors.text }]}>Export Data</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionItem, { backgroundColor: colors.surface }]}
            onPress={handleFeedback}
          >
            <Ionicons name="chatbox-outline" size={20} color={colors.primary} style={styles.actionIcon} />
            <Text style={[styles.actionText, { color: colors.text }]}>Send Feedback</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={handleSignOut}
            style={[styles.signOutButton, { backgroundColor: colors.danger }]}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" style={styles.signOutIcon} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <EditProfileModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        currentName={user?.user_metadata?.full_name || ''}
        currentEmail={user?.email || ''}
        currentPhone={user?.user_metadata?.phone_number || ''}
        onSuccess={() => {
          // Refresh user data
          // The user object will update automatically via auth state change
        }}
      />

      <ChangePasswordModal
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        userEmail={user?.email || ''}
      />

      <ExportDataModal
        visible={showExportData}
        onClose={() => setShowExportData(false)}
        transactions={transactions}
      />

      {/* Feedback Modal */}
      <Modal
        visible={feedbackVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }] }>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Send Feedback</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Tell us what you think. Your feedback helps improve the app.</Text>
            <TextInput
              value={feedbackText}
              onChangeText={setFeedbackText}
              multiline
              placeholder="Type your feedback here"
              placeholderTextColor={colors.textSecondary}
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.border }]} onPress={() => setFeedbackVisible(false)} disabled={submittingFeedback}>
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={submitFeedbackNow} disabled={submittingFeedback}>
                {submittingFeedback ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  profileCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  displayName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  email: {
    fontSize: fontSize.md,
  },
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoItem: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: spacing.md,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  infoSubValue: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  actionIcon: {
    marginRight: spacing.md,
  },
  actionText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '500',
    marginLeft: spacing.sm,
  },
  toggleContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  toggleSubtext: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  signOutIcon: {
    marginRight: spacing.sm,
  },
  signOutText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
