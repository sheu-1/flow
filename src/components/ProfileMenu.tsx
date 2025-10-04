import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { ProfileDrawer } from './ProfileDrawer';

export const ProfileMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={() => setIsOpen(true)}
        style={styles.profileButton}
      >
        <Ionicons name="person-circle" size={32} color={colors.primary} />
      </TouchableOpacity>

      <ProfileDrawer 
        visible={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
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
});
