import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeProvider';
// import { BlurView } from 'expo-blur'; // Removed - not available in current setup

interface Props {
  onAddTransaction: (type: 'income' | 'expense') => void;
  onScanReceipt: () => void;
  onVoiceInput: () => void;
  onQuickTransfer: () => void;
  onAIChat: () => void;
}

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  action: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const QuickActionsMenu: React.FC<Props> = ({
  onAddTransaction,
  onScanReceipt,
  onVoiceInput,
  onQuickTransfer,
  onAIChat,
}) => {
  const colors = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);
  
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  const quickActions: QuickAction[] = [
    {
      id: 'income',
      title: 'Add Money In',
      icon: 'trending-up',
      color: colors.success,
      action: () => onAddTransaction('income'),
    },
    {
      id: 'expense',
      title: 'Add Money Out',
      icon: 'trending-down',
      color: colors.danger,
      action: () => onAddTransaction('expense'),
    },
    {
      id: 'scan',
      title: 'Scan Receipt',
      icon: 'camera',
      color: colors.primary,
      action: onScanReceipt,
    },
    {
      id: 'voice',
      title: 'Voice Input',
      icon: 'mic',
      color: colors.warning,
      action: onVoiceInput,
    },
    {
      id: 'transfer',
      title: 'Quick Transfer',
      icon: 'swap-horizontal',
      color: colors.primary,
      action: onQuickTransfer,
    },
    {
      id: 'ai',
      title: 'Ask AI',
      icon: 'chatbubble-ellipses',
      color: '#9B59B6',
      action: onAIChat,
    },
  ];

  const toggleMenu = () => {
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);

    if (newIsOpen) {
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      rotation.value = withSpring(1);
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withSpring(0, { damping: 15, stiffness: 150 });
      rotation.value = withSpring(0);
      opacity.value = withTiming(0, { duration: 200 });
    }
  };

  const handleActionPress = (action: QuickAction) => {
    // Close menu first
    toggleMenu();
    
    // Delay action execution for smooth animation
    setTimeout(() => {
      action.action();
    }, 200);
  };

  const mainButtonStyle = useAnimatedStyle(() => {
    const rotationDegrees = interpolate(rotation.value, [0, 1], [0, 45]);
    
    return {
      transform: [
        { rotate: `${rotationDegrees}deg` },
        { scale: withSpring(isOpen ? 1.1 : 1) },
      ],
    };
  });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    pointerEvents: isOpen ? 'auto' : 'none',
  }));

  const ActionButton = ({ action, index }: { action: QuickAction; index: number }) => {
    const buttonScale = useSharedValue(0);
    const buttonOpacity = useSharedValue(0);

    React.useEffect(() => {
      if (isOpen) {
        setTimeout(() => {
          buttonScale.value = withSpring(1, { 
            damping: 15, 
            stiffness: 150,
          });
        }, index * 50);
        setTimeout(() => {
          buttonOpacity.value = withTiming(1, { 
            duration: 200,
          });
        }, index * 50);
      } else {
        buttonScale.value = withSpring(0, { damping: 15, stiffness: 150 });
        buttonOpacity.value = withTiming(0, { duration: 100 });
      }
    }, [isOpen, index]);

    const buttonStyle = useAnimatedStyle(() => ({
      transform: [{ scale: buttonScale.value }],
      opacity: buttonOpacity.value,
    }));

    // Calculate position in a circle
    const angle = (index * 60) - 90; // Start from top, 60 degrees apart
    const radius = 120;
    const x = Math.cos((angle * Math.PI) / 180) * radius;
    const y = Math.sin((angle * Math.PI) / 180) * radius;

    return (
      <Animated.View
        style={[
          styles.actionButton,
          {
            backgroundColor: action.color,
            transform: [
              { translateX: x },
              { translateY: y },
            ],
          },
          buttonStyle,
        ]}
      >
        <TouchableOpacity
          style={styles.actionButtonInner}
          onPress={() => handleActionPress(action)}
          activeOpacity={0.8}
        >
          <Ionicons name={action.icon as any} size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={[styles.actionLabel, { backgroundColor: colors.surface }]}>
          <Text style={[styles.actionLabelText, { color: colors.text }]}>
            {action.title}
          </Text>
        </View>
      </Animated.View>
    );
  };

  return (
    <>
      {/* Overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          onPress={toggleMenu}
          activeOpacity={0.3}
        />
      </Animated.View>

      {/* Action Buttons */}
      {isOpen && (
        <View style={styles.actionsContainer}>
          {quickActions.map((action, index) => (
            <ActionButton key={action.id} action={action} index={index} />
          ))}
        </View>
      )}

      {/* Main FAB */}
      <Animated.View style={[styles.fab, { backgroundColor: colors.primary }, mainButtonStyle]}>
        <TouchableOpacity
          style={styles.fabInner}
          onPress={toggleMenu}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={isOpen ? "close" : "add"} 
            size={28} 
            color={colors.background} 
          />
        </TouchableOpacity>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 998,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 100,
    right: 30,
    zIndex: 999,
  },
  actionButton: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  actionLabel: {
    position: 'absolute',
    right: 70,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionLabelText: {
    fontSize: 12,
    fontWeight: '600',
    // whiteSpace: 'nowrap', // Not supported in React Native
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 1000,
  },
  fabInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 32,
  },
});
