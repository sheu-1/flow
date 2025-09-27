import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Modal } from 'react-native';
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

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setIsOpen(false)}
          activeOpacity={1}
        >
          <View style={styles.modalContent}>
            <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.profileInfo, { borderBottomColor: colors.border }]}>
                <Text style={[styles.loggedInText, { color: colors.textSecondary }]}>Logged in as</Text>
                <Text style={[styles.email, { color: colors.text }]}>{user?.user_metadata?.username || user?.email?.split('@')[0] || 'Guest'}</Text>
              </View>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setIsOpen(false);
                  signOut();
                }}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.danger} style={styles.icon} />
                <Text style={[styles.menuText, { color: colors.danger }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  profileButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100, // Adjust based on header height
    paddingRight: 20,
  },
  modalContent: {
    // Container for positioning the dropdown
  },
  dropdown: {
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
});
