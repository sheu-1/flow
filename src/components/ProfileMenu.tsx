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
            <Text style={[styles.email, { color: colors.text }]}>{user?.email ?? 'Guest'}</Text>
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
      
      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          onPress={() => setIsOpen(false)}
          activeOpacity={1}
        />
      )}
    </View>
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
  email: {
    fontSize: 14,
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
