import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../services/AuthService';

const SettingsScreen: React.FC = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { theme, colors, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const { user, signOut } = useAuth();

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
});

export default SettingsScreen;
