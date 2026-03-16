import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp, FadeInDown, useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../theme/ThemeProvider';
import { spacing, fontSize, borderRadius } from '../theme/colors';
import { useCurrency } from '../services/CurrencyProvider';
import { useAuth } from '../hooks/useAuth';
import { getChargeSummary, getTimeframeDates, ChargeSummary } from '../services/TransactionChargesService';

type Timeframe = 'today' | 'week' | 'month' | 'year';

const TIMEFRAME_LABELS: { key: Timeframe; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
];

export default function TransactionChargesCard() {
    const colors = useThemeColors();
    const { formatCurrency } = useCurrency();
    const { user } = useAuth();
    const [timeframe, setTimeframe] = useState<Timeframe>('month');
    const [summary, setSummary] = useState<ChargeSummary | null>(null);
    const [loading, setLoading] = useState(false);

    // Animated values
    const grandTotalAnimated = useSharedValue(0);
    const txCostAnimated = useSharedValue(0);
    const accessFeeAnimated = useSharedValue(0);
    const cardScale = useSharedValue(0.95);
    const cardOpacity = useSharedValue(0);

    const loadCharges = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const { from, to } = getTimeframeDates(timeframe);
            const result = await getChargeSummary(user.id, from, to);
            setSummary(result);

            // Animate numbers
            grandTotalAnimated.value = withSpring(result.grandTotal, { damping: 15, stiffness: 80 });
            txCostAnimated.value = withDelay(150, withSpring(result.totalTransactionCosts, { damping: 15, stiffness: 80 }));
            accessFeeAnimated.value = withDelay(300, withSpring(result.totalAccessFees, { damping: 15, stiffness: 80 }));
        } catch (e) {
            console.warn('[TransactionChargesCard] Error loading charges:', e);
        } finally {
            setLoading(false);
        }
    }, [user?.id, timeframe]);

    useEffect(() => {
        // Reset animated values on timeframe change
        grandTotalAnimated.value = 0;
        txCostAnimated.value = 0;
        accessFeeAnimated.value = 0;
        loadCharges();
    }, [loadCharges]);

    // Card entry animation
    useEffect(() => {
        cardScale.value = withSpring(1, { damping: 12, stiffness: 100 });
        cardOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    }, []);

    const cardAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: cardScale.value }],
        opacity: cardOpacity.value,
    }));

    return (
        <Animated.View
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardAnimatedStyle]}
            entering={FadeInUp.delay(200).springify()}
        >
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.warning + '20' }]}>
                        <Ionicons name="receipt-outline" size={20} color={colors.warning} />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>Transaction Charges</Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.countText, { color: colors.primary }]}>
                        {summary?.count ?? 0} charges
                    </Text>
                </View>
            </View>

            {/* Timeframe Selector */}
            <View style={[styles.timeframeRow, { backgroundColor: colors.card }]}>
                {TIMEFRAME_LABELS.map(({ key, label }) => {
                    const isActive = timeframe === key;
                    return (
                        <TouchableOpacity
                            key={key}
                            style={[
                                styles.timeframePill,
                                isActive && { backgroundColor: colors.primary },
                            ]}
                            onPress={() => setTimeframe(key)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.timeframePillText,
                                    { color: isActive ? '#FFFFFF' : colors.textSecondary },
                                    isActive && styles.timeframePillTextActive,
                                ]}
                            >
                                {label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            ) : (
                <View style={styles.content}>
                    {/* Grand Total */}
                    <Animated.View
                        style={[styles.grandTotalRow, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '30' }]}
                        entering={FadeInDown.delay(100).springify()}
                    >
                        <View style={styles.grandTotalLeft}>
                            <Ionicons name="wallet-outline" size={24} color={colors.warning} />
                            <View style={styles.grandTotalTextContainer}>
                                <Text style={[styles.grandTotalLabel, { color: colors.textSecondary }]}>Total Charges</Text>
                                <Text style={[styles.grandTotalAmount, { color: colors.warning }]}>
                                    {formatCurrency(summary?.grandTotal ?? 0)}
                                </Text>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Breakdown Row */}
                    <View style={styles.breakdownRow}>
                        {/* Transaction Costs */}
                        <Animated.View
                            style={[styles.breakdownCard, { backgroundColor: colors.card, borderLeftColor: colors.danger }]}
                            entering={FadeInDown.delay(250).springify()}
                        >
                            <Ionicons name="swap-horizontal-outline" size={18} color={colors.danger} />
                            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Transaction Costs</Text>
                            <Text style={[styles.breakdownAmount, { color: colors.danger }]}>
                                {formatCurrency(summary?.totalTransactionCosts ?? 0)}
                            </Text>
                        </Animated.View>

                        {/* Access Fees */}
                        <Animated.View
                            style={[styles.breakdownCard, { backgroundColor: colors.card, borderLeftColor: '#A855F7' }]}
                            entering={FadeInDown.delay(400).springify()}
                        >
                            <Ionicons name="flash-outline" size={18} color="#A855F7" />
                            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>Fuliza Fees</Text>
                            <Text style={[styles.breakdownAmount, { color: '#A855F7' }]}>
                                {formatCurrency(summary?.totalAccessFees ?? 0)}
                            </Text>
                        </Animated.View>
                    </View>

                    {/* Insight Tip */}
                    {(summary?.grandTotal ?? 0) > 0 && (
                        <Animated.View
                            style={[styles.insightRow, { backgroundColor: colors.primary + '10' }]}
                            entering={FadeInDown.delay(550).springify()}
                        >
                            <Ionicons name="bulb-outline" size={16} color={colors.primary} />
                            <Text style={[styles.insightText, { color: colors.primary }]}>
                                {summary && summary.totalTransactionCosts > summary.totalAccessFees
                                    ? `Transaction costs make up ${((summary.totalTransactionCosts / summary.grandTotal) * 100).toFixed(0)}% of your charges. Consider fewer, larger transactions to reduce fees.`
                                    : `Fuliza fees make up ${summary ? ((summary.totalAccessFees / summary.grandTotal) * 100).toFixed(0) : 0}% of your charges. Try to reduce Fuliza usage to save money.`}
                            </Text>
                        </Animated.View>
                    )}
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginHorizontal: spacing.md,
        marginTop: spacing.lg,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: fontSize.lg,
        fontWeight: '700',
    },
    countBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    countText: {
        fontSize: fontSize.xs,
        fontWeight: '600',
    },
    timeframeRow: {
        flexDirection: 'row',
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        borderRadius: borderRadius.sm,
        padding: 3,
    },
    timeframePill: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: borderRadius.sm - 2,
    },
    timeframePillText: {
        fontSize: 11,
        fontWeight: '500',
    },
    timeframePillTextActive: {
        fontWeight: '700',
    },
    loadingContainer: {
        paddingVertical: spacing.xl,
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
    },
    grandTotalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        marginBottom: spacing.sm,
    },
    grandTotalLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    grandTotalTextContainer: {},
    grandTotalLabel: {
        fontSize: fontSize.xs,
        fontWeight: '500',
    },
    grandTotalAmount: {
        fontSize: fontSize.xl,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    breakdownRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    breakdownCard: {
        flex: 1,
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        borderLeftWidth: 3,
        gap: 4,
    },
    breakdownLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    breakdownAmount: {
        fontSize: fontSize.md,
        fontWeight: '700',
    },
    insightRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        padding: spacing.sm,
        borderRadius: borderRadius.sm,
    },
    insightText: {
        flex: 1,
        fontSize: 11,
        fontWeight: '500',
        lineHeight: 16,
    },
});
