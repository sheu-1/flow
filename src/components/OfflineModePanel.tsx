import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { OfflineAuthService, OfflineUser } from '../services/OfflineAuthService';

interface OfflineModePanelProps {
  onOfflineSignIn: (user: OfflineUser) => void;
}

export const OfflineModePanel: React.FC<OfflineModePanelProps> = ({ onOfflineSignIn }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const handleOfflineMode = async () => {
    setLoading(true);
    try {
      // Check if there's an existing offline user
      const existingUser = await OfflineAuthService.getOfflineUser();
      
      if (existingUser) {
        onOfflineSignIn(existingUser);
      } else {
        // Create a demo user
        const demoUser = await OfflineAuthService.createOfflineUser(
          'demo@example.com',
          'demo123',
          'Demo User'
        );
        onOfflineSignIn(demoUser);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to enter offline mode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Ionicons name="cloud-offline-outline" size={20} color={colors.warning} />
        <Text style={[styles.title, { color: colors.text }]}>Offline Mode Available</Text>
      </View>
      
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Can't connect to Supabase? Try the app in offline mode with demo data.
      </Text>

      <TouchableOpacity
        onPress={handleOfflineMode}
        disabled={loading}
        style={[styles.button, { backgroundColor: colors.warning }]}
      >
        <Ionicons name="play-outline" size={16} color="#fff" />
        <Text style={styles.buttonText}>
          {loading ? 'Loading...' : 'Continue Offline'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
});
