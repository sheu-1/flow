import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeProvider';
import { useCurrency } from '../services/CurrencyProvider';

interface Props {
  totalIncome: number;
  totalExpense: number;
  savingsRate: number;
  transactionCount: number;
  onPress?: () => void;
}

interface HealthFactor {
  name: string;
  score: number;
  weight: number;
  icon: string;
  description: string;
}

export const FinancialHealthScore: React.FC<Props> = ({
  totalIncome,
  totalExpense,
  savingsRate,
  transactionCount,
  onPress,
}) => {
  const colors = useThemeColors();
  const { formatCurrency } = useCurrency();
  const [showDetails, setShowDetails] = useState(false);
  
  const scoreProgress = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  // Calculate health factors
  const healthFactors: HealthFactor[] = [
    {
      name: 'Savings Rate',
      score: Math.min(100, Math.max(0, savingsRate * 5)), // 20% savings = 100 score
      weight: 0.3,
      icon: 'trending-up',
      description: savingsRate > 20 ? 'Excellent savings!' : savingsRate > 10 ? 'Good savings rate' : 'Try to save more',
    },
    {
      name: 'Spending Control',
      score: totalIncome > 0 ? Math.min(100, (1 - (totalExpense / totalIncome)) * 100 + 50) : 50,
      weight: 0.25,
      icon: 'shield-checkmark',
      description: totalExpense < totalIncome * 0.8 ? 'Great control!' : 'Watch your spending',
    },
    {
      name: 'Transaction Activity',
      score: Math.min(100, transactionCount * 2), // 50 transactions = 100 score
      weight: 0.2,
      icon: 'pulse',
      description: transactionCount > 30 ? 'Very active' : transactionCount > 10 ? 'Moderate activity' : 'Low activity',
    },
    {
      name: 'Income Stability',
      score: totalIncome > 0 ? 85 : 20, // Simplified - would need historical data
      weight: 0.25,
      icon: 'bar-chart',
      description: 'Based on income patterns',
    },
  ];

  // Calculate overall score
  const overallScore = healthFactors.reduce((total, factor) => 
    total + (factor.score * factor.weight), 0
  );

  const getScoreColor = (score: number) => {
    // Good (>=60): green; Fair (40-59): orange; Poor (<40): red
    if (score >= 60) return colors.success;
    if (score >= 40) return colors.warning;
    return colors.danger;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Work';
  };

  useEffect(() => {
    scoreProgress.value = withTiming(overallScore / 100, { duration: 1500 });
    
    // Subtle pulse based on band: Excellent/Good/Fair
    let target = 1;
    if (overallScore >= 80) target = 1.05; // Excellent
    else if (overallScore >= 60) target = 1.03; // Good
    else if (overallScore >= 40) target = 1.01; // Fair

    if (target > 1) {
      pulseScale.value = withSpring(target, {}, () => {
        pulseScale.value = withSpring(1);
      });
    }
  }, [overallScore]);

  const animatedCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${scoreProgress.value * 360}deg` }],
  }));

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={() => {
        setShowDetails(!showDetails);
        onPress?.();
      }}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Financial Health</Text>
        <Ionicons 
          name={showDetails ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color={colors.textSecondary} 
        />
      </View>

      <View style={styles.scoreContainer}>
        <Animated.View style={[styles.circleContainer, animatedCircleStyle]}>
          {/* Background Circle */}
          <View style={[styles.backgroundCircle, { borderColor: colors.border }]} />
          
          {/* Progress Circle */}
          <Animated.View 
            style={[
              styles.progressCircle, 
              { borderTopColor: getScoreColor(overallScore) },
              animatedProgressStyle
            ]} 
          />
          
          <View style={styles.scoreContent}>
            <Text style={[styles.scoreNumber, { color: getScoreColor(overallScore) }]}>
              {Math.round(overallScore)}
            </Text>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
              {getScoreLabel(overallScore)}
            </Text>
          </View>
        </Animated.View>

        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(totalIncome)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Income</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.danger }]}>
              {formatCurrency(totalExpense)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Expenses</Text>
          </View>
        </View>
      </View>

      {showDetails && (
        <Animated.View 
          style={styles.detailsContainer}
          entering={FadeInUp.springify()}
        >
          {healthFactors.map((factor, index) => (
            <View key={factor.name} style={styles.factorRow}>
              <View style={styles.factorInfo}>
                <Ionicons 
                  name={factor.icon as any} 
                  size={16} 
                  color={getScoreColor(factor.score)} 
                />
                <Text style={[styles.factorName, { color: colors.text }]}>
                  {factor.name}
                </Text>
              </View>
              <View style={styles.factorScore}>
                <Text style={[styles.factorValue, { color: getScoreColor(factor.score) }]}>
                  {Math.round(factor.score)}
                </Text>
                <View style={[styles.factorBar, { backgroundColor: colors.border }]}>
                  <View 
                    style={[
                      styles.factorProgress, 
                      { 
                        backgroundColor: getScoreColor(factor.score),
                        width: `${factor.score}%`,
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
          ))}
          
          <View style={[styles.tip, { backgroundColor: colors.primary + '10' }]}>
            <Ionicons name="bulb" size={16} color={colors.primary} />
            <Text style={[styles.tipText, { color: colors.primary }]}>
              {overallScore >= 80 
                ? "You're doing great! Keep up the excellent financial habits."
                : overallScore >= 60
                ? "Good progress! Try to increase your savings rate for better health."
                : "Focus on reducing expenses and building an emergency fund."}
            </Text>
          </View>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  backgroundCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: '#E5E5E5',
  },
  progressCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: 'transparent',
    borderTopColor: '#4ECDC4',
  },
  scoreContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  quickStats: {
    flex: 1,
    marginLeft: 20,
  },
  statItem: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  detailsContainer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  factorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  factorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  factorName: {
    fontSize: 14,
    marginLeft: 8,
  },
  factorScore: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  factorValue: {
    fontSize: 12,
    fontWeight: '600',
    width: 30,
    textAlign: 'right',
  },
  factorBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginLeft: 8,
    overflow: 'hidden',
  },
  factorProgress: {
    height: '100%',
    borderRadius: 2,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  tipText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});
