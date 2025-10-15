import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';

export default function ProfileScreen() {
  const colors = useThemeColors();
  const { user, signOut } = useAuth();
  const navigation = useNavigation();

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
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>

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
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account Actions</Text>
          
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
            onPress={() => Alert.alert('Coming Soon', 'Profile editing will be available in a future update.')}
          >
            <Ionicons name="create-outline" size={20} color={colors.text} style={styles.actionIcon} />
            <Text style={[styles.actionText, { color: colors.text }]}>Edit Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionItem, { backgroundColor: colors.surface }]}
            onPress={() => Alert.alert('Coming Soon', 'Password change will be available in a future update.')}
          >
            <Ionicons name="key-outline" size={20} color={colors.text} style={styles.actionIcon} />
            <Text style={[styles.actionText, { color: colors.text }]}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionItem, { backgroundColor: colors.surface }]}
            onPress={() => Alert.alert('Coming Soon', 'Data export will be available in a future update.')}
          >
            <Ionicons name="download-outline" size={20} color={colors.text} style={styles.actionIcon} />
            <Text style={[styles.actionText, { color: colors.text }]}>Export Data</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    margin: spacing.md,
    marginTop: spacing.lg,
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
});
