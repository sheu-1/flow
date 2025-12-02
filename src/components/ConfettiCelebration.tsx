/**
 * ConfettiCelebration Component
 * 
 * Animated confetti celebration for milestone achievements
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  Easing,
  SharedValue,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  velocity: { x: number; y: number };
}

interface ConfettiCelebrationProps {
  visible: boolean;
  onComplete: () => void;
  duration?: number;
  colors?: string[];
}

const CONFETTI_COLORS = [
  '#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', 
  '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE'
];

export const ConfettiCelebration: React.FC<ConfettiCelebrationProps> = ({
  visible,
  onComplete,
  duration = 3000,
  colors = CONFETTI_COLORS,
}) => {
  const confettiPieces = useRef<ConfettiPiece[]>([]);
  const animationProgress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Generate confetti pieces
      confettiPieces.current = generateConfetti(colors);
      
      // Start animation
      animationProgress.value = 0;
      animationProgress.value = withTiming(1, {
        duration,
        easing: Easing.out(Easing.quad),
      }, (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      });
    }
  }, [visible, duration, colors, onComplete]);

  const generateConfetti = (colors: string[]): ConfettiPiece[] => {
    const pieces: ConfettiPiece[] = [];
    const numPieces = 50;

    for (let i = 0; i < numPieces; i++) {
      pieces.push({
        id: i,
        x: Math.random() * SCREEN_WIDTH,
        y: -20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        velocity: {
          x: (Math.random() - 0.5) * 200,
          y: Math.random() * 100 + 100,
        },
      });
    }

    return pieces;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      pointerEvents="none"
    >
      <View style={styles.container}>
        {confettiPieces.current.map((piece) => (
          <ConfettiPieceComponent
            key={piece.id}
            piece={piece}
            progress={animationProgress}
          />
        ))}
      </View>
    </Modal>
  );
};

interface ConfettiPieceComponentProps {
  piece: ConfettiPiece;
  progress: SharedValue<number>;
}

const ConfettiPieceComponent: React.FC<ConfettiPieceComponentProps> = ({
  piece,
  progress,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value;
    
    // Physics simulation
    const gravity = 500;
    const time = t * 3; // 3 seconds of physics
    
    const x = piece.x + piece.velocity.x * time;
    const y = piece.y + piece.velocity.y * time + 0.5 * gravity * time * time;
    
    // Rotation animation
    const rotation = piece.rotation + (360 * time * 2);
    
    // Fade out near the end
    const opacity = t < 0.8 ? 1 : (1 - (t - 0.8) / 0.2);
    
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rotation}deg` },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          backgroundColor: piece.color,
          width: piece.size,
          height: piece.size,
        },
        animatedStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  confettiPiece: {
    position: 'absolute',
    borderRadius: 2,
  },
});

// Additional celebration effects
export const CelebrationBurst: React.FC<{
  visible: boolean;
  onComplete: () => void;
  centerX?: number;
  centerY?: number;
}> = ({
  visible,
  onComplete,
  centerX = SCREEN_WIDTH / 2,
  centerY = SCREEN_HEIGHT / 2,
}) => {
  const burstPieces = useRef<ConfettiPiece[]>([]);
  const burstProgress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Generate burst pieces
      burstPieces.current = generateBurstPieces(centerX, centerY);
      
      burstProgress.value = 0;
      burstProgress.value = withTiming(1, {
        duration: 1500,
        easing: Easing.out(Easing.quad),
      }, (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      });
    }
  }, [visible, centerX, centerY, onComplete]);

  const generateBurstPieces = (cx: number, cy: number): ConfettiPiece[] => {
    const pieces: ConfettiPiece[] = [];
    const numPieces = 20;

    for (let i = 0; i < numPieces; i++) {
      const angle = (i / numPieces) * 2 * Math.PI;
      const speed = Math.random() * 150 + 100;
      
      pieces.push({
        id: i,
        x: cx,
        y: cy,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: Math.random() * 6 + 3,
        rotation: Math.random() * 360,
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
      });
    }

    return pieces;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      pointerEvents="none"
    >
      <View style={styles.container}>
        {burstPieces.current.map((piece) => (
          <BurstPieceComponent
            key={piece.id}
            piece={piece}
            progress={burstProgress}
          />
        ))}
      </View>
    </Modal>
  );
};

const BurstPieceComponent: React.FC<ConfettiPieceComponentProps> = ({
  piece,
  progress,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value;
    
    // Burst outward then fall
    const time = t * 1.5;
    const x = piece.x + piece.velocity.x * time;
    const y = piece.y + piece.velocity.y * time + 200 * time * time; // Gravity effect
    
    const rotation = piece.rotation + (720 * time);
    const scale = 1 - t * 0.3; // Shrink over time
    const opacity = 1 - t;
    
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rotation}deg` },
        { scale },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          backgroundColor: piece.color,
          width: piece.size,
          height: piece.size,
          borderRadius: piece.size / 2,
        },
        animatedStyle,
      ]}
    />
  );
};
