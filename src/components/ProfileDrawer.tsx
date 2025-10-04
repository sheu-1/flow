import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Animated, 
  Dimensions, 
  Switch,
  Platform,
  Alert,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../hooks/useAuth';
import { readRecentSms, startSmsListener, stopSmsListener, processSmsAndSave } from '../services/SmsService';
import { PermissionService } from '../services/PermissionService';

interface ProfileDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85;

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ visible, onClose }) => {
  const { theme, colors, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const [slideAnim] = useState(new Animated.Value(DRAWER_WIDTH));
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsBusy, setSmsBusy] = useState(false);

  const isDark = theme === 'dark';

  // Get user info with fallbacks
  const username = user?.user_metadata?.username || user?.user_metadata?.full_name || 'User';
  const email = user?.email || 'No email';
  const phoneNumber = user?.user_metadata?.phone_number || 'Not provided';
  const country = user?.user_metadata?.country || 'Not specified';

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: DRAWER_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    (async () => {
      // Load SMS settings
      const smsStatus = await PermissionService.getSmsStatus();
      setSmsEnabled(smsStatus.importEnabled);
    })();
  }, []);

  const handleToggleSms = async (value: boolean) => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available on iOS', 'SMS import is only available on Android devices.');
      return;
    }

    const previous = smsEnabled;
    setSmsEnabled(value);
    setSmsBusy(true);
    
    try {
      if (value) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Enable SMS Import',
            'Allow Cashflow Tracker to read SMS messages to automatically track M-Pesa and bank transactions? Raw SMS text will not be sent off the device; only structured transaction data is stored.',
            [
              { text: "Don't Allow", style: 'cancel', onPress: () => resolve(false) },
              { text: 'Allow', style: 'default', onPress: () => resolve(true) },
            ]
          );
        });
        
        if (!proceed) {
          setSmsEnabled(previous);
          return;
        }
        
        const success = await PermissionService.handleSmsImportToggle(true);
        
        if (success) {
          setSmsEnabled(true);
          
          // Initial ingestion of recent messages
          try {
            const list = await readRecentSms(50);
            for (const raw of list) {
              await processSmsAndSave(raw);
            }
          } catch (e) {
            console.warn('[ProfileDrawer][SMS] Initial ingestion failed', e);
          }
          
          Alert.alert(
            'SMS Import Enabled',
            'SMS import has been enabled. The app will now automatically detect transaction messages.'
          );
        } else {
          setSmsEnabled(previous);
        }
      } else {
        await PermissionService.handleSmsImportToggle(false);
        setSmsEnabled(false);
        
        Alert.alert(
          'SMS Import Disabled',
          'SMS import has been disabled. You can re-enable it anytime in settings.'
        );
      }
    } catch (e) {
      console.error('[ProfileDrawer][SMS] Toggle failed', e);
      Alert.alert('Error', 'Failed to update SMS import settings. Please try again.');
      setSmsEnabled(previous);
    } finally {
      setSmsBusy(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => {
            onClose();
            signOut();
          }
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          onPress={onClose}
          activeOpacity={1}
        />
        <Animated.View 
          style={[
            styles.drawer, 
            { 
              backgroundColor: colors.background,
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
            </View>

            {/* User Info Section */}
            <View style={[styles.section, { borderBottomColor: colors.border }]}>
              <View style={[styles.profileIcon, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="person" size={32} color={colors.primary} />
              </View>
              
              <View style={styles.userInfo}>
                <Text style={[styles.username, { color: colors.text }]}>{username}</Text>
                <Text style={[styles.email, { color: colors.textSecondary }]}>{email}</Text>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Country</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{country}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Phone</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{phoneNumber}</Text>
                </View>
              </View>
            </View>

            {/* Settings Section */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Settings</Text>
              
              {/* Notifications */}
              <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
                <View style={styles.settingLeft}>
                  <Ionicons name="notifications-outline" size={20} color={colors.text} />
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Notifications</Text>
                </View>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: colors.inactive, true: colors.primary }}
                  thumbColor={colors.background}
                />
              </View>

              {/* Dark Theme */}
              <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
                <View style={styles.settingLeft}>
                  <Ionicons name="moon-outline" size={20} color={colors.text} />
                  <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Theme</Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.inactive, true: colors.primary }}
                  thumbColor={colors.background}
                />
              </View>

              {/* SMS Import (Android only) */}
              {Platform.OS === 'android' && (
                <>
                  <Text style={[styles.subsectionTitle, { color: colors.textSecondary }]}>SMS Import</Text>
                  <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
                    <View style={styles.settingLeft}>
                      <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
                      <Text style={[styles.settingLabel, { color: colors.text }]}>Auto-detect transactions</Text>
                    </View>
                    <Switch
                      value={smsEnabled}
                      onValueChange={handleToggleSms}
                      trackColor={{ false: colors.inactive, true: colors.primary }}
                      thumbColor={colors.background}
                      disabled={smsBusy}
                    />
                  </View>
                  <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
                    Automatically detect M-Pesa and bank transactions from SMS. Raw messages stay on your device.
                  </Text>
                </>
              )}
            </View>

            {/* Sign Out */}
            <View style={styles.section}>
              <TouchableOpacity
                onPress={handleSignOut}
                style={[styles.signOutButton, { backgroundColor: colors.danger }]}
              >
                <Ionicons name="log-out-outline" size={20} color="#fff" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  profileIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
