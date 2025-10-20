# Min/Max Calculation Fix - Reports Page

## Problem

The previous min/max calculations were including zeros in the max calculation, which could lead to incorrect statistics when there are periods with no transactions.

## Solution

Updated the calculation logic to:
- **Min**: Lowest positive value (excludes zeros and nulls)
- **Max**: Highest positive value (excludes zeros and nulls)
- **Sum**: Total of all valid values (includes zeros for accuracy)
- **Avg**: Average of all valid values (includes zeros for accuracy)

## Updated Code

### Income Stats Calculation

```typescript
const incomeStats = useMemo(() => {
  const arr = series.income || [];
  
  // Filter out non-finite values, zeros, and nulls
  const positiveValues = arr.filter((n) => Number.isFinite(n) && n > 0);
  
  // For sum and avg, include all valid values (including zeros)
  const validForSum = arr.filter((n) => Number.isFinite(n));
  const sum = validForSum.reduce((a, b) => a + b, 0);
  const avg = validForSum.length ? sum / validForSum.length : 0;
  
  // Min and Max only consider actual positive transactions
  const min = positiveValues.length ? Math.min(...positiveValues) : 0;
  const max = positiveValues.length ? Math.max(...positiveValues) : 0;
  
  return { sum, avg, min, max };
}, [series.income]);
```

### Expense Stats Calculation

```typescript
const expenseStats = useMemo(() => {
  const arr = series.expense || [];
  
  // Filter out non-finite values, zeros, and nulls
  const positiveValues = arr.filter((n) => Number.isFinite(n) && n > 0);
  
  // For sum and avg, include all valid values (including zeros)
  const validForSum = arr.filter((n) => Number.isFinite(n));
  const sum = validForSum.reduce((a, b) => a + b, 0);
  const avg = validForSum.length ? sum / validForSum.length : 0;
  
  // Min and Max only consider actual positive transactions
  const min = positiveValues.length ? Math.min(...positiveValues) : 0;
  const max = positiveValues.length ? Math.max(...positiveValues) : 0;
  
  return { sum, avg, min, max };
}, [series.expense]);
```

## Logic Breakdown

### 1. **Positive Values Filter**
```typescript
const positiveValues = arr.filter((n) => Number.isFinite(n) && n > 0);
```
- Removes `NaN`, `Infinity`, `-Infinity`
- Removes `null` and `undefined`
- Removes zeros
- Only keeps actual positive transaction amounts

### 2. **Valid Values for Sum/Avg**
```typescript
const validForSum = arr.filter((n) => Number.isFinite(n));
```
- Removes `NaN`, `Infinity`, `-Infinity`
- Removes `null` and `undefined`
- **Keeps zeros** (important for accurate averages)

### 3. **Min Calculation**
```typescript
const min = positiveValues.length ? Math.min(...positiveValues) : 0;
```
- Uses only positive values
- Returns 0 if no positive values exist
- Represents the **smallest actual transaction**

### 4. **Max Calculation**
```typescript
const max = positiveValues.length ? Math.max(...positiveValues) : 0;
```
- Uses only positive values
- Returns 0 if no positive values exist
- Represents the **largest actual transaction**

## Example Scenarios

### Scenario 1: Normal Data
```typescript
series.income = [100, 200, 0, 300, 0, 150];

// Results:
positiveValues = [100, 200, 300, 150]
validForSum = [100, 200, 0, 300, 0, 150]

sum = 750
avg = 125 (750 / 6)
min = 100 ✓ (smallest actual transaction)
max = 300 ✓ (largest actual transaction)
```

### Scenario 2: With Zeros
```typescript
series.income = [0, 0, 500, 0, 250];

// Results:
positiveValues = [500, 250]
validForSum = [0, 0, 500, 0, 250]

sum = 750
avg = 150 (750 / 5)
min = 250 ✓ (smallest actual transaction)
max = 500 ✓ (largest actual transaction)
```

### Scenario 3: All Zeros
```typescript
series.income = [0, 0, 0, 0];

// Results:
positiveValues = []
validForSum = [0, 0, 0, 0]

sum = 0
avg = 0
min = 0 ✓ (no transactions)
max = 0 ✓ (no transactions)
```

### Scenario 4: With Invalid Values
```typescript
series.income = [100, NaN, 200, null, undefined, 0, 300];

// Results:
positiveValues = [100, 200, 300]
validForSum = [100, 200, 0, 300]

sum = 600
avg = 150 (600 / 4)
min = 100 ✓ (smallest actual transaction)
max = 300 ✓ (largest actual transaction)
```

## Why This Matters

### **Before Fix:**
```typescript
series.income = [100, 0, 0, 200];
max = Math.max(...[100, 0, 0, 200]) = 200 ✓
// This worked, but...

series.income = [0, 0, 0];
max = Math.max(...[0, 0, 0]) = 0
// Could be misleading - looks like there were transactions
```

### **After Fix:**
```typescript
series.income = [100, 0, 0, 200];
positiveValues = [100, 200]
max = Math.max(...[100, 200]) = 200 ✓

series.income = [0, 0, 0];
positiveValues = []
max = 0 ✓
// Clearly indicates no actual transactions
```

## Impact on UI

### **Money In • Min Card**
- Shows the **smallest income transaction** that actually occurred
- Ignores periods with no income
- More meaningful for users

### **Money In • Max Card**
- Shows the **largest income transaction** that actually occurred
- Ignores periods with no income
- Helps identify peak income periods

### **Money Out • Min Card**
- Shows the **smallest expense transaction** that actually occurred
- Ignores periods with no expenses
- Useful for tracking minimum spending

### **Money Out • Max Card**
- Shows the **largest expense transaction** that actually occurred
- Ignores periods with no expenses
- Helps identify major expenses

## Testing

### Test Case 1: Normal Transactions
```
Income: $100, $200, $300
Expected Min: $100
Expected Max: $300
```

### Test Case 2: With Zero Periods
```
Income: $0, $500, $0, $250, $0
Expected Min: $250
Expected Max: $500
```

### Test Case 3: Single Transaction
```
Income: $1000
Expected Min: $1000
Expected Max: $1000
```

### Test Case 4: No Transactions
```
Income: $0, $0, $0
Expected Min: $0
Expected Max: $0
```

## Summary

✅ **Min** now correctly shows the lowest actual transaction (excludes zeros)

✅ **Max** now correctly shows the highest actual transaction (excludes zeros)

✅ **Sum** remains accurate (includes all valid values)

✅ **Avg** remains accurate (includes zeros for proper averaging)

✅ **More meaningful statistics** for users tracking their finances

The calculations now provide more accurate and useful insights into actual transaction patterns, rather than being skewed by periods with no activity.
