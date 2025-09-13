import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../hooks/useAuth';
import { getApiKey, saveApiKey, deleteApiKey } from '../services/SecureStore';

const SettingsScreen: React.FC = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { theme, colors, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { user, signOut } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const orgKeyPresent = !!process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;

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
