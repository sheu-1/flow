import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';

interface AnimatedLogoProps {
  size?: number;
  color?: string;
}

export default function AnimatedLogo({ size = 120, color = '#4ADE80' }: AnimatedLogoProps) {
  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <G transform="translate(15, 60)">
          {/* Line connecting all points */}
          <Path
            d="M 5 25 L 25 15 L 45 5 L 65 0"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Point 1: Bottom left */}
          <Circle cx="5" cy="25" r="7" fill={color} />

          {/* Point 2: Middle */}
          <Circle cx="25" cy="15" r="7" fill={color} />

          {/* Point 3: Top middle */}
          <Circle cx="45" cy="5" r="7" fill={color} />

          {/* Point 4: Top right */}
          <Circle cx="65" cy="0" r="7" fill={color} />
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
