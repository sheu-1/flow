/**
 * MilestoneCelebrationModal Component
 * 
 * Celebrates milestone achievements with confetti and animations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useThemeColors } from '../theme/ThemeProvider';
import { Milestone, MilestoneService } from '../services/MilestoneService';
import { ConfettiCelebration, CelebrationBurst } from './ConfettiCelebration';
import { spacing, fontSize, borderRadius } from '../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MilestoneCelebrationModalProps {
  visible: boolean;
  milestone: Milestone | null;
  onClose: () => void;
}

export const MilestoneCelebrationModal: React.FC<MilestoneCelebrationModalProps> = ({
  visible,
  milestone,
  onClose,
}) => {
  const colors = useThemeColors();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');

  // Animation values
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const iconRotation = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(50);
  const messageOpacity = useSharedValue(0);
  const messageTranslateY = useSharedValue(30);
  const buttonOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(0.8);

  useEffect(() => {
    if (visible && milestone) {
      setCelebrationMessage(MilestoneService.getCelebrationMessage(milestone));
      startCelebrationAnimation();
    } else {
      resetAnimations();
    }
  }, [visible, milestone]);

  const startCelebrationAnimation = () => {
    // Start confetti immediately
    setShowConfetti(true);
    
    // Start burst after a short delay
    setTimeout(() => setShowBurst(true), 500);

    // Animate modal entrance
    scale.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.back(1.2)),
    });

    opacity.value = withTiming(1, { duration: 400 });

    // Animate icon
    iconScale.value = withDelay(
      200,
      withSequence(
        withTiming(1.3, { duration: 400, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200 })
      )
    );

    iconRotation.value = withDelay(
      200,
      withTiming(360, { duration: 800, easing: Easing.out(Easing.quad) })
    );

    // Animate title
    titleOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    titleTranslateY.value = withDelay(
      400,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) })
    );

    // Animate message
    messageOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    messageTranslateY.value = withDelay(
      600,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) })
    );

    // Animate button
    buttonOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
    buttonScale.value = withDelay(
      800,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.1)) })
    );
  };

  const resetAnimations = () => {
    scale.value = 0;
    opacity.value = 0;
    iconScale.value = 0;
    iconRotation.value = 0;
    titleOpacity.value = 0;
    titleTranslateY.value = 50;
    messageOpacity.value = 0;
    messageTranslateY.value = 30;
    buttonOpacity.value = 0;
    buttonScale.value = 0.8;
  };

  const handleClose = () => {
    // Animate out
    scale.value = withTiming(0.8, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  };

  const handleConfettiComplete = () => {
    setShowConfetti(false);
  };

  const handleBurstComplete = () => {
    setShowBurst(false);
  };

  // Animated styles
  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotation.value}deg` },
    ],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const messageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
    transform: [{ translateY: messageTranslateY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));

  if (!visible || !milestone) return null;

  return (
    <>
      {/* Confetti Effects */}
      <ConfettiCelebration
        visible={showConfetti}
        onComplete={handleConfettiComplete}
        duration={4000}
      />
      
      <CelebrationBurst
        visible={showBurst}
        onComplete={handleBurstComplete}
        centerX={SCREEN_WIDTH / 2}
        centerY={SCREEN_HEIGHT / 2}
      />

      {/* Modal */}
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.modalContainer,
              { backgroundColor: colors.surface },
              modalAnimatedStyle,
            ]}
          >
            {/* Icon */}
            <Animated.View
              style={[
                styles.iconContainer,
                { backgroundColor: milestone.color + '20' },
                iconAnimatedStyle,
              ]}
            >
              <Ionicons
                name={milestone.icon as any}
                size={60}
                color={milestone.color}
              />
            </Animated.View>

            {/* Title */}
            <Animated.Text
              style={[
                styles.title,
                { color: colors.text },
                titleAnimatedStyle,
              ]}
            >
              {milestone.title}
            </Animated.Text>

            {/* Description */}
            <Animated.Text
              style={[
                styles.description,
                { color: colors.textSecondary },
                titleAnimatedStyle,
              ]}
            >
              {milestone.description}
            </Animated.Text>

            {/* Celebration Message */}
            <Animated.Text
              style={[
                styles.celebrationMessage,
                { color: milestone.color },
                messageAnimatedStyle,
              ]}
            >
              {celebrationMessage}
            </Animated.Text>

            {/* Progress Indicator */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: milestone.color,
                      width: '100%',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: milestone.color }]}>
                {milestone.target} / {milestone.target} ✓
              </Text>
            </View>

            {/* Reward */}
            {milestone.reward && (
              <Animated.View
                style={[
                  styles.rewardContainer,
                  { backgroundColor: colors.background },
                  messageAnimatedStyle,
                ]}
              >
                <Ionicons name="gift-outline" size={20} color={colors.primary} />
                <Text style={[styles.rewardText, { color: colors.text }]}>
                  {milestone.reward}
                </Text>
              </Animated.View>
            )}

            {/* Action Button */}
            <Animated.View style={buttonAnimatedStyle}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: milestone.color },
                ]}
                onPress={handleClose}
              >
                <Text style={[styles.actionButtonText, { color: '#fff' }]}>
                  Awesome! 🎉
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 350,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  celebrationMessage: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 26,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  rewardText: {
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
    fontStyle: 'italic',
  },
  actionButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    minWidth: 150,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
});
