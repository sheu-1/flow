import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../hooks/useAuth';
// API key management removed; keys are now sourced from .env
// Removed delete functionality for now
import { readRecentSms, startSmsListener, stopSmsListener, processSmsAndSave } from '../services/SmsService';
import { PermissionService } from '../services/PermissionService';

const SettingsScreen: React.FC = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { theme, colors, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { user, signOut } = useAuth();
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsBusy, setSmsBusy] = useState(false);
  const smsSubRef = useRef<{ remove: () => void } | undefined>(undefined);

  useEffect(() => {
    (async () => {
      // Load SMS settings using new PermissionService
      const smsStatus = await PermissionService.getSmsStatus();
      setSmsEnabled(smsStatus.importEnabled);
      
      // Start SMS listener if enabled and permission granted
      if (smsStatus.canImport) {
        smsSubRef.current = await startSmsListener();
      }
    })();
  }, []);

  // API key management removed; keys are loaded from environment variables

  async function handleToggleSms(value: boolean) {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available on iOS', 'SMS import is only available on Android devices.');
      return;
    }

    // Optimistically update UI so the switch moves immediately
    const previous = smsEnabled;
    setSmsEnabled(value);
    setSmsBusy(true);
    try {
      if (value) {
        // Ask for user consent first
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
          // Revert UI if user cancels
          setSmsEnabled(previous);
          return;
        }
        
        // Use PermissionService to handle permission and settings
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
            console.warn('[Settings][SMS] Initial ingestion failed', e);
          }
          
          // Start real-time listener
          smsSubRef.current = await startSmsListener();
          
          Alert.alert(
            'SMS Import Enabled',
            'SMS import has been enabled. The app will now automatically detect transaction messages.'
          );
        } else {
          setSmsEnabled(false);
          // Permission denied, revert visual state
          setSmsEnabled(previous);
        }
      } else {
        // Disable SMS import
        await PermissionService.handleSmsImportToggle(false);
        setSmsEnabled(false);
        
        // Stop listener
        stopSmsListener();
        smsSubRef.current?.remove?.();
        smsSubRef.current = undefined;
        
        Alert.alert(
          'SMS Import Disabled',
          'SMS import has been disabled. You can re-enable it anytime in settings.'
        );
      }
    } catch (e) {
      console.error('[Settings][SMS] Toggle failed', e);
      Alert.alert('Error', 'Failed to update SMS import settings. Please try again.');
      // Revert on unexpected error
      setSmsEnabled(previous);
    } finally {
      setSmsBusy(false);
    }
  }

  // Deletion flow temporarily removed

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      
      <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>Enable Notifications</Text>
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          trackColor={{ false: '#767577', true: '#4CAF50' }}
          thumbColor={notificationsEnabled ? '#ffffff' : '#f4f3f4'}
        />
      </View>

      <View style={[styles.settingItem, { backgroundColor: colors.surface }]}>
        <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Theme</Text>
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          trackColor={{ false: '#767577', true: colors.primary }}
          thumbColor={'#ffffff'}
        />
      </View>

      {/* Android-only: SMS Import */}
      <View style={[styles.section, { borderColor: colors.border }]}> 
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SMS Import (Android only)</Text>
        {Platform.OS !== 'android' ? (
          <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={{ color: colors.text }}>SMS import is available only on Android devices.</Text>
          </View>
        ) : null}
        <View style={[styles.settingItem, { backgroundColor: colors.surface }]}> 
          <Text style={[styles.settingLabel, { color: colors.text }]}>Enable SMS transaction import</Text>
          <Switch
            value={smsEnabled}
            onValueChange={handleToggleSms}
            trackColor={{ false: '#767577', true: '#007AFF' }}
            thumbColor={'#ffffff'}
            disabled={smsBusy}
          />
        </View>
        <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={{ color: colors.text }}>
            Privacy: SMS permission is used only to detect transaction alerts and store structured transaction data. Raw SMS text will not be sent off the device.
          </Text>
        </View>
        {/* Clear imported transactions button removed for now */}
      </View>

      <View style={[styles.section, { borderColor: colors.border }]}> 
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
        <View style={[styles.settingItem, { backgroundColor: colors.surface }]}> 
          <Text style={[styles.settingLabel, { color: colors.text }]}> 
            Signed in as {user?.email ?? 'Guest'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={signOut}
          style={[styles.signOutButton, { backgroundColor: colors.danger }]}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
    paddingBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  settingLabel: {
    fontSize: 16,
  },
  placeholderCard: {
    margin: 16,
    padding: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  placeholderText: {
    fontSize: 16,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  signOutButton: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginHorizontal: 0,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  apiInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  removeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
  },
  helper: {
    marginTop: 8,
    fontSize: 12,
  },
  banner: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
});

export default SettingsScreen;
