# Setup Instructions

## ⚠️ Important: Supabase Configuration Required

The app requires Supabase credentials to work. Follow these steps:

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in the details:
   - **Name**: Cashflow Tracker
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to you
5. Wait for the project to be created (~2 minutes)

### 2. Get Your Credentials

1. Go to your project dashboard
2. Click on **Settings** (gear icon) in the left sidebar
3. Click on **API** under Project Settings
4. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

### 3. Configure the App

#### Option A: Using .env file (Recommended)

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and replace the placeholder values:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
   ```

#### Option B: Using app.json

Add the credentials to `app.json` under the `extra` section:

```json
{
  "expo": {
    "extra": {
      "SUPABASE_URL": "https://your-project-id.supabase.co",
      "SUPABASE_ANON_KEY": "your-anon-key-here",
      "eas": {
        "projectId": "f4131c54-ecdb-410a-824b-3bada9994b38"
      }
    }
  }
}
```

### 4. Set Up Database Tables

Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor):

```sql
-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL,
  category TEXT,
  description TEXT,
  sender TEXT,
  metadata JSONB,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
```

### 5. Enable Email Authentication

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Make sure **Email** is enabled
3. Configure email settings:
   - **Enable email confirmations**: OFF (for testing) or ON (for production)
   - **Enable email change confirmations**: ON
   - **Secure email change**: ON

### 6. Start the App

```bash
# Clear cache and start
npx expo start -c

# Or just start normally
npx expo start
```

### 7. Test Account Creation

1. Open the app
2. Tap "Don't have an account? Sign up"
3. Fill in the form:
   - Username: Test User
   - Country: United States
   - Phone: +1234567890
   - Email: test@example.com
   - Password: test1234
4. Tap "Create Account"
5. You should see "Account created successfully!"
6. Tap "Go to Login" and sign in

---

## Troubleshooting

### Issue: "Supabase env vars are missing"

**Solution**: Make sure you've created a `.env` file with your credentials or added them to `app.json`.

### Issue: "Failed to create account"

**Possible causes**:
1. **Email already exists**: Try a different email
2. **Weak password**: Use at least 6 characters
3. **Supabase not configured**: Check your credentials
4. **Database tables not created**: Run the SQL script above

### Issue: Validation not working

**Solution**: The validation is now working correctly:
- Email must be valid format (contains @ and domain)
- Password must be at least 6 characters
- Username must be at least 2 characters (signup only)

### Issue: Debug panel still showing

**Solution**: The OfflineModePanel has been removed. If you still see it, clear the cache:
```bash
npx expo start -c
```

### Issue: Can't see console logs

**Solution**: 
- Press `j` in the Expo terminal to open the debugger
- Or check the Metro bundler terminal output

---

## Features Implemented

✅ **Authentication Flow**
- Sign up with validation
- Sign in with success message
- Auto-redirect to dashboard
- Field-specific error messages

✅ **Transaction Management**
- Create, read, update, delete transactions
- Real-time sync across devices
- Category management
- Instant visual updates

✅ **Subscription Page**
- Three pricing tiers
- Professional card layout
- Navigation from Profile tab

✅ **Removed**
- Debug/Offline mode panel
- Unnecessary console logs

---

## Next Steps

1. **Test the app thoroughly** using the TESTING_GUIDE.md
2. **Add more transactions** to see the dashboard populate
3. **Try category changes** to see real-time updates
4. **Explore the subscription page** from the Profile tab

---

## Support

If you encounter issues:
1. Check the console logs for errors
2. Verify Supabase credentials are correct
3. Make sure database tables are created
4. Try clearing the cache: `npx expo start -c`
5. Check the TESTING_GUIDE.md for common issues
