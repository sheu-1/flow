import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../hooks/useAuth';
import { getApiKey, saveApiKey, deleteApiKey } from '../services/SecureStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearUserTransactions } from '../services/SupabaseService';
import { requestSmsPermission, readRecentSms, startSmsListener, stopSmsListener, processSmsAndSave } from '../services/SmsService';

const SettingsScreen: React.FC = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { theme, colors, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { user, signOut } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const orgKeyPresent = !!process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsBusy, setSmsBusy] = useState(false);
  const smsSubRef = useRef<{ remove: () => void } | undefined>();

  useEffect(() => {
    (async () => {
      const key = await getApiKey();
      if (key) {
        setHasKey(true);
        setApiKey(maskKey(key));
      } else {
        setHasKey(false);
        setApiKey('');
      }
      // Load SMS toggle
      const smsPref = await AsyncStorage.getItem('settings:sms_ingest_enabled');
      const enabled = smsPref === '1';
      setSmsEnabled(enabled);
      if (enabled && Platform.OS === 'android') {
        // try to start listener if permission is granted
        const granted = await requestSmsPermission();
        if (granted) {
          smsSubRef.current = await startSmsListener();
        }
      }
    })();
  }, []);

  function maskKey(k: string) {
    if (k.length <= 12) return '*'.repeat(k.length);
    return k.slice(0, 6) + '...' + k.slice(-4);
  }

  async function onSaveKey() {
    const val = apiKey.trim();
    if (!val) return;
    const ok = await saveApiKey(val);
    if (ok) {
      setHasKey(true);
      setApiKey(maskKey(val));
    }
  }

  async function onRemoveKey() {
    await deleteApiKey();
    setHasKey(false);
    setApiKey('');
  }

  async function handleToggleSms(value: boolean) {
    if (Platform.OS !== 'android') {
      Alert.alert('Not available on iOS', 'SMS import is Android-only due to platform restrictions.');
      return;
    }
    if (value) {
      // Ask for consent and permission
      const proceed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          'Enable SMS Import',
          'Allow Cashflow Tracker to read SMS messages to auto-import transaction alerts? Raw SMS text will not be sent off the device; only structured transaction data is stored.',
          [
            { text: "Don't allow", style: 'cancel', onPress: () => resolve(false) },
            { text: 'Allow', style: 'default', onPress: () => resolve(true) },
          ]
        );
      });
      if (!proceed) return;
      setSmsBusy(true);
      try {
        const granted = await requestSmsPermission();
        if (!granted) {
          Alert.alert('Permission denied', 'SMS permissions are required to import transactions.');
          return;
        }
        await AsyncStorage.setItem('settings:sms_ingest_enabled', '1');
        setSmsEnabled(true);
        // Initial ingestion of last 50 messages
        const list = await readRecentSms(50);
        for (const raw of list) {
          await processSmsAndSave(raw);
        }
        // Start real-time listener
        smsSubRef.current = await startSmsListener();
      } catch (e) {
        console.warn('[Settings][SMS] enable failed', e);
      } finally {
        setSmsBusy(false);
      }
    } else {
      setSmsBusy(true);
      try {
        await AsyncStorage.setItem('settings:sms_ingest_enabled', '0');
        setSmsEnabled(false);
        stopSmsListener();
        smsSubRef.current?.remove?.();
        smsSubRef.current = undefined;
      } finally {
        setSmsBusy(false);
      }
    }
  }

  async function handleClearTransactions() {
    if (!user?.id) return;
    const confirm = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Clear imported transactions',
        'This will delete all your transactions stored in the cloud for this account. This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });
    if (!confirm) return;
    const { success, error } = await clearUserTransactions(user.id);
    if (!success) {
      Alert.alert('Error', String(error?.message || error || 'Failed to clear transactions'));
    } else {
      Alert.alert('Cleared', 'Your transactions have been cleared.');
    }
  }

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
      
      <View style={[styles.placeholderCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>⚙️ Export data option</Text>
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
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor={'#ffffff'}
            disabled={smsBusy}
          />
        </View>
        <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={{ color: colors.text }}>
            Privacy: SMS permission is used only to detect transaction alerts and store structured transaction data. Raw SMS text will not be sent off the device.
          </Text>
        </View>
        {user?.id ? (
          <TouchableOpacity onPress={handleClearTransactions} style={[styles.removeBtn, { backgroundColor: colors.danger, marginHorizontal: 16, marginTop: 8 }]}> 
            <Text style={styles.saveText}>Clear imported transactions</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={[styles.section, { borderColor: colors.border }]}> 
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>AI Settings</Text>
        {orgKeyPresent && (
          <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={{ color: colors.text }}>
              An organization-wide API key is configured. Your device key input is disabled.
            </Text>
          </View>
        )}
        <Text style={[styles.settingLabel, { color: colors.text }]}>OpenRouter API Key</Text>
        <TextInput
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="Enter sk-or-v1-..."
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={hasKey === true}
          editable={!orgKeyPresent}
          style={[styles.apiInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
        />
        <View style={styles.row}>
          <TouchableOpacity onPress={onSaveKey} style={[styles.saveBtn, { backgroundColor: colors.primary }]} disabled={orgKeyPresent}>
            <Text style={styles.saveText}>{hasKey ? 'Update Key' : 'Save Key'}</Text>
          </TouchableOpacity>
          {hasKey && !orgKeyPresent ? (
            <TouchableOpacity onPress={onRemoveKey} style={[styles.removeBtn, { backgroundColor: colors.danger }]}>
              <Text style={styles.saveText}>Remove</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={[styles.helper, { color: colors.textSecondary }]}>
          {orgKeyPresent
            ? 'This app uses a secure organization key to access the AI accountant. Conversations are grounded only in your own account data.'
            : 'Your personal key is stored securely on this device and used to call the AI accountant via OpenRouter.'}
        </Text>
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
