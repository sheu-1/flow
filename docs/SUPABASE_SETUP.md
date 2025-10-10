# Supabase Setup Guide

## Quick Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose organization and fill project details
   - Wait for project to be ready (~2 minutes)

2. **Get Your Credentials**
   - Go to Project Settings → API
   - Copy your `Project URL` and `anon/public key`

3. **Configure Environment Variables**
   - Copy `.env.example` to `.env`
   - Replace the placeholder values:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

4. **Set Up Database Schema**
   - Go to SQL Editor in your Supabase dashboard
   - Run the migration script from `supabase_enhanced_migration.sql`

## Troubleshooting Connectivity Issues

### "health check reachable = false"

This error means the app can't connect to Supabase. Try these solutions:

1. **Check Environment Variables**
   ```bash
   # Verify your .env file exists and has correct values
   cat .env
   ```

2. **Test Supabase URL Manually**
   - Open your browser
   - Go to: `https://your-project-id.supabase.co/auth/v1/health`
   - Should return: `{"date":"...","description":"GoTrue is ready."}`

3. **Network Issues**
   - Check your internet connection
   - Try disabling VPN/firewall temporarily
   - Some corporate networks block Supabase

4. **Restart Development Server**
   ```bash
   # Stop current server (Ctrl+C)
   npx expo start --clear
   ```

### Common Mistakes

- **Wrong URL format**: Should be `https://project-id.supabase.co` (no trailing slash)
- **Wrong key**: Use the `anon/public` key, not the `service_role` key
- **Missing EXPO_PUBLIC_ prefix**: Environment variables must start with `EXPO_PUBLIC_`

### Offline Development

If you can't connect to Supabase right now, the app will run in offline mode:
- Authentication will be disabled
- Local SQLite database will still work
- You can add manual transactions and test the UI

## Database Schema

The app expects these tables in Supabase:
- `transactions` - User transaction data
- `user_profiles` - Extended user information

Run the SQL migration script to create these tables with proper Row Level Security (RLS) policies.
