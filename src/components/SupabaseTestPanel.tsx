import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { supabase, pingSupabase } from '../services/SupabaseClient';

export const SupabaseTestPanel: React.FC = () => {
  const { colors } = useTheme();
  const [testing, setTesting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const testConnection = async () => {
    setTesting(true);
    setLastResult(null);

    try {
      console.log('🔍 Testing Supabase connection...');
      
      // Test 1: Environment variables
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!url || !key) {
        setLastResult('❌ Environment variables missing');
        Alert.alert('Environment Error', 'EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY not set');
        return;
      }

      console.log('✅ Environment variables found');
      console.log('URL:', url.substring(0, 30) + '...');
      console.log('Key:', key.substring(0, 20) + '...');

      // Test 2: Health check
      console.log('🏥 Testing health endpoint...');
      const healthOk = await pingSupabase(5000);
      
      if (!healthOk) {
        setLastResult('❌ Health check failed');
        Alert.alert('Connection Error', 
          `Cannot reach Supabase at ${url}\n\nCheck:\n• Internet connection\n• URL is correct\n• No firewall blocking`);
        return;
      }

      console.log('✅ Health check passed');

      // Test 3: Basic auth test
      console.log('🔐 Testing auth endpoint...');
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.warn('Auth test warning:', error.message);
        setLastResult('⚠️ Auth accessible but no session');
      } else {
        console.log('✅ Auth endpoint working');
        setLastResult('✅ All tests passed!');
        Alert.alert('Success!', 'Supabase connection is working correctly');
      }

    } catch (error: any) {
      console.error('Connection test failed:', error);
      setLastResult('❌ Connection failed');
      Alert.alert('Test Failed', error.message || 'Unknown error occurred');
    } finally {
      setTesting(false);
    }
  };

  const showEnvHelp = () => {
    Alert.alert(
      'Environment Setup',
      'Create a .env file in your project root with:\n\n' +
      'EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n\n' +
      'Get these from your Supabase project dashboard.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Ionicons name="server-outline" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Supabase Connection Test</Text>
      </View>

      <TouchableOpacity
        onPress={testConnection}
        disabled={testing}
        style={[styles.button, { backgroundColor: colors.primary }]}
      >
        <Ionicons 
          name={testing ? "hourglass-outline" : "play-circle-outline"} 
          size={16} 
          color="#fff" 
        />
        <Text style={styles.buttonText}>
          {testing ? 'Testing...' : 'Test Connection'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={showEnvHelp}
        style={[styles.helpButton, { borderColor: colors.border }]}
      >
        <Ionicons name="help-circle-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          Environment Setup Help
        </Text>
      </TouchableOpacity>

      {lastResult && (
        <View style={[styles.result, { backgroundColor: colors.card }]}>
          <Text style={[styles.resultText, { color: colors.text }]}>{lastResult}</Text>
        </View>
      )}
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
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    marginLeft: 4,
  },
  result: {
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  resultText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
