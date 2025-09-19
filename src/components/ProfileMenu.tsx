import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useThemeColors } from '../theme/ThemeProvider';
import { useAuth } from '../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

export const ProfileMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const colors = useThemeColors();
  const { user, signOut } = useAuth();

  return (
    <>
      {isOpen && (
        <TouchableOpacity
          style={styles.fullScreenOverlay}
          onPress={() => setIsOpen(false)}
          activeOpacity={1}
        />
      )}
      <View style={styles.container}>
      <TouchableOpacity 
        onPress={() => setIsOpen(!isOpen)}
        style={styles.profileButton}
      >
        <Ionicons name="person-circle" size={32} color={colors.primary} />
      </TouchableOpacity>

      {isOpen && (
        <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.profileInfo, { borderBottomColor: colors.border }]}>
            <Text style={[styles.loggedInText, { color: colors.textSecondary }]}>Logged in as</Text>
            <Text style={[styles.email, { color: colors.text }]}>{user?.user_metadata?.username || user?.email?.split('@')[0] || 'Guest'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={signOut}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} style={styles.icon} />
            <Text style={[styles.menuText, { color: colors.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}
      
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  profileButton: {
    padding: 8,
  },
  dropdown: {
    position: 'absolute',
    top: 50,
    right: 0,
    width: 200,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  profileInfo: {
    padding: 16,
    borderBottomWidth: 1,
  },
  loggedInText: {
    fontSize: 12,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    fontWeight: '600',
  },
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 999,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  icon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 14,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
});
