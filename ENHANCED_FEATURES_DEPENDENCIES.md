# Enhanced Features Dependencies

This document lists the additional dependencies needed for the new enhanced features.

## Required Expo/React Native Packages

### Voice Input Features
```bash
npx expo install expo-av expo-speech
```
- `expo-av`: Audio recording and playback
- `expo-speech`: Text-to-speech functionality

### Photo Receipt Scanning
```bash
npx expo install expo-image-picker expo-file-system
```
- `expo-image-picker`: Camera and gallery access
- `expo-file-system`: File operations for image processing

### Storage & Persistence
```bash
npm install @react-native-async-storage/async-storage
```
- `@react-native-async-storage/async-storage`: Local storage for favorites and settings

### Animations (Already Installed)
- `react-native-reanimated`: Advanced animations and gestures
- `react-native-safe-area-context`: Safe area handling

## Database Schema Updates

### New Supabase Tables

#### 1. Favorite Merchants Table
```sql
CREATE TABLE favorite_merchants (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  average_amount DECIMAL(10,2) NOT NULL,
  frequency INTEGER DEFAULT 1,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_favorite_merchants_user_id ON favorite_merchants(user_id);
CREATE INDEX idx_favorite_merchants_frequency ON favorite_merchants(user_id, frequency DESC);
```

#### 2. User Milestones Table
```sql
CREATE TABLE user_milestones (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL, -- 'savings', 'transactions', 'budget', 'streak', 'category'
  target INTEGER NOT NULL,
  current INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  reward TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_milestones_user_id ON user_milestones(user_id);
CREATE INDEX idx_user_milestones_completed ON user_milestones(user_id, completed);
```

#### 3. User Achievements Table
```sql
CREATE TABLE user_achievements (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  icon TEXT NOT NULL,
  color TEXT NOT NULL
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_unlocked ON user_achievements(user_id, unlocked_at DESC);
```

#### 4. Savings Goals Table
```sql
CREATE TABLE savings_goals (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  target_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) DEFAULT 0,
  target_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  monthly_target DECIMAL(10,2)
);

CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX idx_savings_goals_completed ON savings_goals(user_id, completed);
```

#### 5. Feedback Table (Already exists, but included for completeness)
```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
```

## Optional Third-Party Services

### OCR Services (Choose one)
1. **Google Cloud Vision API** (Recommended)
   - Most accurate OCR
   - Good receipt parsing
   - Requires API key and billing setup

2. **AWS Textract**
   - Good for structured documents
   - Requires AWS account

3. **Azure Computer Vision**
   - Microsoft's OCR service
   - Good accuracy

4. **Tesseract.js** (Client-side)
   - Free, runs on device
   - Lower accuracy but no API costs

### Speech-to-Text Services (Choose one)
1. **Google Cloud Speech-to-Text** (Recommended)
   - High accuracy
   - Real-time streaming
   - Requires API key

2. **AWS Transcribe**
   - Good accuracy
   - Supports multiple languages

3. **Azure Speech Services**
   - Microsoft's speech recognition

## Implementation Notes

### Voice Input
- The `VoiceService` currently uses mock data for demonstration
- Replace the `simulateSpeechToText()` function with actual speech-to-text API calls
- Add proper error handling for network issues

### Receipt Scanning
- The `ReceiptScanService` uses mock OCR results
- Replace `simulateOCRProcessing()` with actual OCR service calls
- Consider image preprocessing for better OCR accuracy

### Permissions
- Voice input requires microphone permissions
- Receipt scanning requires camera and photo library permissions
- Handle permission denials gracefully

### Performance Considerations
- Cache favorite merchants locally for quick access
- Implement pagination for large milestone/achievement lists
- Optimize confetti animations for lower-end devices

### Security
- Store API keys securely (use environment variables)
- Validate all user inputs on the server side
- Implement rate limiting for API calls

## Usage Examples

### Integrating Enhanced Transaction Modal
```typescript
import { EnhancedAddTransactionModal } from './src/components/EnhancedAddTransactionModal';

// In your component
<EnhancedAddTransactionModal
  visible={showAddTransaction}
  onClose={() => setShowAddTransaction(false)}
  onTransactionAdded={handleTransactionAdded}
  userId={user.id}
  currentBalance={balance}
  totalTransactions={transactions.length}
/>
```

### Adding Savings Goals Widget
```typescript
import { SavingsGoalsWidget } from './src/components/SavingsGoalsWidget';

// In your dashboard
<SavingsGoalsWidget
  userId={user.id}
  monthlyIncome={monthlyIncome}
  monthlyExpenses={monthlyExpenses}
  currentSavings={currentBalance}
/>
```

### Milestone Celebrations
```typescript
import { MilestoneCelebrationModal } from './src/components/MilestoneCelebrationModal';

// Show when milestone is completed
<MilestoneCelebrationModal
  visible={showCelebration}
  milestone={completedMilestone}
  onClose={() => setShowCelebration(false)}
/>
```

## Testing Checklist

- [ ] Voice input permissions work on both iOS and Android
- [ ] Camera permissions work correctly
- [ ] Confetti animations perform well on different devices
- [ ] Milestone progress updates correctly
- [ ] Savings goals calculations are accurate
- [ ] Favorite merchants persist across app restarts
- [ ] Quick expense buttons work as expected
- [ ] Receipt scanning handles various image qualities
- [ ] Voice parsing handles different speech patterns
- [ ] Database operations complete successfully

## Future Enhancements

1. **Smart Categorization**: Use machine learning to improve automatic categorization
2. **Spending Insights**: Add AI-powered spending pattern analysis
3. **Social Features**: Allow sharing goals with friends/family
4. **Gamification**: Add more achievement types and rewards
5. **Widgets**: Create home screen widgets for quick expense entry
6. **Wearable Support**: Add Apple Watch/WearOS support for quick transactions
