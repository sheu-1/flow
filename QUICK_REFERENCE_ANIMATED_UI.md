# Quick Reference: Animated UI Components

## AnimatedCircleMetric Component

### Basic Usage
```tsx
import { AnimatedCircleMetric } from '../components/AnimatedCircleMetric';

<AnimatedCircleMetric
  value={1500}
  label="Total"
  type="total"
  period="monthly"
  maxValue={5000}
  size={110}
  showCurrency={true}
/>
```

### Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | number | ✅ | - | Numeric value to display |
| `label` | string | ✅ | - | Text label for metric |
| `type` | MetricType | ✅ | - | 'total', 'average', 'count', 'max', 'min' |
| `period` | Period | ❌ | 'daily' | 'daily', 'weekly', 'monthly', 'yearly' |
| `maxValue` | number | ❌ | value | Max value for fill percentage |
| `size` | number | ❌ | 110 | Circle diameter in pixels |
| `showCurrency` | boolean | ❌ | true (false for count) | Format as currency |

### Metric Types & Colors
```tsx
'total'   → Teal    (#14B8A6) → cash-outline
'average' → Purple  (#A855F7) → speedometer-outline
'count'   → Amber   (#F59E0B) → receipt-outline
'max'     → Green   (#10B981) → trending-up-outline
'min'     → Red     (#EF4444) → trending-down-outline
```

---

## Reports Page Implementation

### Conditional Metrics Display
```tsx
{(period === 'daily' || period === 'weekly') ? (
  // Show: Min, Avg, Max
  <>
    <AnimatedCircleMetric value={min} label="Min" type="min" />
    <AnimatedCircleMetric value={avg} label="Avg" type="average" />
    <AnimatedCircleMetric value={max} label="Max" type="max" />
  </>
) : (
  // Show: Count, Avg, Max
  <>
    <AnimatedCircleMetric value={count} label="Count" type="count" showCurrency={false} />
    <AnimatedCircleMetric value={avg} label="Avg" type="average" />
    <AnimatedCircleMetric value={max} label="Max" type="max" />
  </>
)}
```

### Dynamic Period Total
```tsx
const periodTotal = useMemo(() => {
  return statsView === 'income' ? incomeStats.sum : expenseStats.sum;
}, [statsView, incomeStats, expenseStats]);

<Text>{formatCurrency(periodTotal)}</Text>
```

---

## Dashboard Page Implementation

### Three-Circle Layout
```tsx
<View style={styles.circularMetricsContainer}>
  {/* Money In */}
  <AnimatedCircleMetric
    value={moneyIn}
    label="Money In"
    type="total"
    period={selectedPeriod}
    maxValue={maxAmount}
  />
  
  {/* Transaction Count */}
  <AnimatedCircleMetric
    value={transactionCount}
    label="Count"
    type="count"
    period={selectedPeriod}
    showCurrency={false}
  />
  
  {/* Money Out */}
  <AnimatedCircleMetric
    value={moneyOut}
    label="Money Out"
    type="max"
    period={selectedPeriod}
    maxValue={maxAmount}
  />
</View>
```

### Net Balance Card
```tsx
<Animated.View entering={FadeInUp.delay(200).springify()}>
  <View style={styles.netBalanceCard}>
    <Ionicons 
      name="analytics-outline" 
      color={netBalance >= 0 ? colors.success : colors.danger} 
    />
    <Text>Net Balance • {periodLabel}</Text>
    <Text>{formatCurrency(netBalance)}</Text>
  </View>
</Animated.View>
```

---

## Transactions Page Pagination

### Floating Pagination
```tsx
{totalPages > 1 && (
  <Animated.View 
    entering={FadeIn.duration(300)}
    exiting={FadeOut.duration(300)}
    style={styles.floatingPagination}
  >
    <TouchableOpacity onPress={handlePrevPage} disabled={!hasPrevPage}>
      <Ionicons name="chevron-back" />
    </TouchableOpacity>
    
    <Text>{currentPage} / {totalPages}</Text>
    
    <TouchableOpacity onPress={handleNextPage} disabled={!hasNextPage}>
      <Ionicons name="chevron-forward" />
    </TouchableOpacity>
  </Animated.View>
)}
```

### Pagination Styles
```tsx
floatingPagination: {
  position: 'absolute',
  bottom: 20,
  right: 20,
  borderRadius: 30,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 8,
}
```

---

## Animation Patterns

### Staggered Entrance
```tsx
<Animated.View entering={FadeInUp.delay(50).springify()}>
  {/* First item */}
</Animated.View>

<Animated.View entering={FadeInUp.delay(100).springify()}>
  {/* Second item */}
</Animated.View>

<Animated.View entering={FadeInUp.delay(150).springify()}>
  {/* Third item */}
</Animated.View>
```

### Fade In/Out
```tsx
<Animated.View 
  entering={FadeIn.duration(300)}
  exiting={FadeOut.duration(300)}
>
  {/* Content */}
</Animated.View>
```

---

## Common Calculations

### Transaction Count
```tsx
const transactionCount = useMemo(() => {
  return filteredTransactions.length;
}, [filteredTransactions]);
```

### Period Total
```tsx
const periodTotal = useMemo(() => {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
}, [transactions]);
```

### Max Amount
```tsx
const maxAmount = Math.max(moneyIn, moneyOut);
```

### Average Transaction
```tsx
const avgTransaction = transactionCount > 0 
  ? (moneyIn + moneyOut) / transactionCount 
  : 0;
```

---

## Styling Tips

### Circular Container
```tsx
circularMetricsContainer: {
  flexDirection: 'row',
  justifyContent: 'space-around',
  alignItems: 'center',
  paddingVertical: spacing.lg,
  gap: spacing.sm,
}
```

### Shadow Effects
```tsx
shadowColor: '#000',
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.3,
shadowRadius: 8,
elevation: 8, // Android
```

### Disabled State
```tsx
disabled={!hasNextPage}
style={[
  styles.button,
  !hasNextPage && { opacity: 0.3 }
]}
```

---

## Performance Tips

1. **Use useMemo** for expensive calculations
2. **Use useCallback** for event handlers
3. **Limit animation complexity** for 60fps
4. **Batch state updates** when possible
5. **Lazy load** large datasets

---

## Troubleshooting

### Animations not working?
```bash
# Ensure reanimated is installed
npm install react-native-reanimated

# Add to babel.config.js
plugins: ['react-native-reanimated/plugin']

# Rebuild
npm start -- --reset-cache
```

### Colors not updating?
```tsx
// Ensure useThemeColors is called
const colors = useThemeColors();

// Use colors in styles
style={{ backgroundColor: colors.surface }}
```

### Pagination not showing?
```tsx
// Check totalTransactions is set
console.log('Total:', totalTransactions);

// Verify calculation
const totalPages = Math.ceil(totalTransactions / ITEMS_PER_PAGE);
console.log('Pages:', totalPages);
```

---

## File Locations

```
src/
├── components/
│   └── AnimatedCircleMetric.tsx     ← New component
├── screens/
│   ├── DashboardScreen.tsx          ← Updated
│   ├── ReportsScreen.tsx            ← Updated
│   └── TransactionsScreen.tsx       ← Updated
└── theme/
    └── colors.ts                     ← Color definitions
```

---

## Testing Commands

```bash
# Run app
npm start

# Clear cache
npm start -- --reset-cache

# Run on iOS
npm run ios

# Run on Android
npm run android
```
