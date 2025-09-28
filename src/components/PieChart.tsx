import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Circle, G } from 'react-native-svg';
import { spacing, borderRadius, fontSize } from '../theme/colors';
import { useThemeColors } from '../theme/ThemeProvider';
import { useCurrency } from '../services/CurrencyProvider';

interface PieChartProps {
  moneyIn: number;
  moneyOut: number;
}

export const PieChart: React.FC<PieChartProps> = ({ moneyIn, moneyOut }) => {
  const colors = useThemeColors();
  const { formatCurrency } = useCurrency();
  const total = moneyIn + moneyOut;
  const moneyInPercentage = total > 0 ? (moneyIn / total) * 100 : 0;
  const moneyOutPercentage = total > 0 ? (moneyOut / total) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>Money Flow Distribution</Text>
      
      <View style={styles.chartContainer}>
        <Donut moneyIn={moneyIn} moneyOut={moneyOut} total={total} formatter={formatCurrency} />
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.success }]} />
          <View style={styles.legendText}>
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Money In</Text>
            <Text style={[styles.legendValue, { color: colors.text }]}>{formatCurrency(moneyIn)} ({moneyInPercentage.toFixed(1)}%)</Text>
          </View>
        </View>
        
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: colors.danger }]} />
          <View style={styles.legendText}>
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Money Out</Text>
            <Text style={[styles.legendValue, { color: colors.text }]}>{formatCurrency(moneyOut)} ({moneyOutPercentage.toFixed(1)}%)</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

function Donut({ moneyIn, moneyOut, total, formatter }: { moneyIn: number; moneyOut: number; total: number; formatter: (n: number) => string }) {
  const colors = useThemeColors();
  const size = 160;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const inFraction = total > 0 ? moneyIn / total : 0;
  const outFraction = total > 0 ? moneyOut / total : 0;

  const inDash = circumference * inFraction;
  const outDash = circumference * outFraction;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          {/* Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.divider}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* Money In arc (green) starts at 0deg */}
          {inDash > 0 && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.success}
              strokeWidth={strokeWidth}
              strokeDasharray={`${inDash} ${circumference - inDash}`}
              strokeLinecap="butt"
              fill="none"
            />
          )}

          {/* Money Out arc (red) starts after Money In arc */}
          {outDash > 0 && (
            <G rotation={(inFraction * 360)} originX={size / 2} originY={size / 2}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={colors.danger}
                strokeWidth={strokeWidth}
                strokeDasharray={`${outDash} ${circumference - outDash}`}
                strokeLinecap="butt"
                fill="none"
              />
            </G>
          )}
        </G>
      </Svg>

      {/* Center label */}
      <View style={[styles.centerCircle, { backgroundColor: colors.background }]}>
        <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total</Text>
        <Text style={[styles.totalAmount, { color: colors.text }]}>{formatter(total)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  centerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 35,
  },
  totalLabel: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  totalAmount: {
    fontSize: fontSize.sm,
    fontWeight: 'bold',
  },
  legend: {
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  legendValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
