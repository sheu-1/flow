# Supabase Email Configuration Quick Guide

## Current Issue

Users signing up cannot immediately log in because Supabase requires email confirmation by default.

## Quick Fix Options

### Option 1: Disable Email Confirmation (Testing Only)

**⚠️ Use only for development/testing**

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to: **Authentication** → **Providers** → **Email**
4. Scroll to **"Confirm email"**
5. **Toggle OFF**
6. Click **Save**

**Result:** Users can sign in immediately without email confirmation.

---

### Option 2: Keep Email Confirmation (Production - Recommended)

**✅ Better security, validates real emails**

The app now handles this properly with:
- Success screen after signup
- Clear instructions to check email
- Resend confirmation email button
- Helpful error messages

**Required Setup:**

#### 1. Configure Email Templates

```
Dashboard → Authentication → Email Templates → Confirm Signup
```

**Customize:**
- **Subject:** "Confirm your Cashflow Tracker account"
- **Body:** Add your branding and clear call-to-action
- **Redirect URL:** `cashflowtracker://auth/callback` (for mobile app)

#### 2. Set Up Custom SMTP (Production)

Default Supabase emails often go to spam. Use custom SMTP:

```
Dashboard → Project Settings → Auth → SMTP Settings
```

**Recommended Providers:**
- **SendGrid** (Free tier: 100 emails/day)
- **AWS SES** (Very cheap, reliable)
- **Mailgun** (Good free tier)
- **Postmark** (Excellent deliverability)

**Example SendGrid Setup:**
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: <your-sendgrid-api-key>
Sender Email: noreply@yourdomain.com
Sender Name: Cashflow Tracker
```

#### 3. Configure Rate Limits

```
Dashboard → Authentication → Rate Limits
```

**Recommended Settings:**
- Email sends per hour: 10 (up from default 4)
- Signup rate limit: 30 per hour per IP

#### 4. Test Email Delivery

```bash
# In Supabase Dashboard SQL Editor:
SELECT * FROM auth.users WHERE email = 'test@example.com';
```

Check:
- ✅ User created
- ✅ `confirmed_at` is NULL (before confirmation)
- ✅ `confirmed_at` has timestamp (after confirmation)

---

## Email Template Example

### Confirmation Email Template:

```html
<h2>Welcome to Cashflow Tracker! 🎉</h2>

<p>Hi there,</p>

<p>Thanks for signing up! Please confirm your email address to get started.</p>

<p style="text-align: center; margin: 30px 0;">
  <a href="{{ .ConfirmationURL }}" 
     style="background-color: #2563EB; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 8px;
            display: inline-block;">
    Confirm Email Address
  </a>
</p>

<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>This link will expire in 24 hours.</p>

<p>If you didn't create an account, you can safely ignore this email.</p>

<p>Happy tracking!<br>
The Cashflow Tracker Team</p>
```

---

## Redirect URL Configuration

### For Mobile App (Expo):

```
Dashboard → Authentication → URL Configuration
```

**Site URL:** `cashflowtracker://`

**Redirect URLs (add all):**
```
cashflowtracker://auth/callback
cashflowtracker://redirect
exp://localhost:8081
http://localhost:8081
```

### For Web (if applicable):

```
https://yourdomain.com/auth/callback
http://localhost:3000/auth/callback
```

---

## Testing Checklist

### Test Email Confirmation Flow:

- [ ] Sign up with new email
- [ ] See success screen with instructions
- [ ] Receive confirmation email (check spam)
- [ ] Click confirmation link
- [ ] Return to app and sign in successfully

### Test Error Scenarios:

- [ ] Try to sign in before confirming email
  - Should see: "Please verify your email first"
- [ ] Try to sign up with existing email
  - Should see: "Email already registered"
- [ ] Click "Resend Email" button
  - Should receive new confirmation email

### Test Email Delivery:

- [ ] Gmail account
- [ ] Outlook/Hotmail account
- [ ] Custom domain email
- [ ] Check spam folders
- [ ] Verify email arrives within 1 minute

---

## Common Issues & Solutions

### Issue: Emails Going to Spam

**Solution:**
1. Set up custom SMTP with verified domain
2. Configure SPF and DKIM records
3. Use reputable email service (SendGrid, SES)
4. Warm up your sending domain

### Issue: Emails Not Arriving

**Solution:**
1. Check Supabase logs for email send events
2. Verify SMTP credentials
3. Check email rate limits
4. Test with different email providers

### Issue: Confirmation Link Not Working

**Solution:**
1. Verify redirect URLs in Supabase settings
2. Check app scheme matches (`cashflowtracker://`)
3. Ensure deep linking is configured in `app.json`
4. Test link in browser first

### Issue: Users Confused About Email Verification

**Solution:**
✅ Already fixed! The new success screen provides:
- Clear instructions
- Email resend option
- Step-by-step guidance
- Helpful error messages

---

## Monitoring & Analytics

### Check Auth Logs:

```
Dashboard → Logs → Auth Logs
```

**Filter by:**
- `user_created` - New signups
- `user_confirmed` - Email confirmations
- `signin_failed` - Failed login attempts

### Key Metrics to Track:

1. **Signup → Confirmation Rate:**
   ```
   (Confirmed Users / Total Signups) × 100
   ```
   Target: >80%

2. **Email Delivery Rate:**
   Check SMTP provider dashboard
   Target: >95%

3. **Time to Confirmation:**
   Average time between signup and email confirmation
   Target: <5 minutes

---

## Production Checklist

Before launching:

- [ ] Custom SMTP configured
- [ ] Email templates customized with branding
- [ ] Redirect URLs properly set
- [ ] SPF/DKIM records configured
- [ ] Rate limits adjusted for production
- [ ] Email delivery tested with multiple providers
- [ ] Error messages are user-friendly
- [ ] Success screen tested on mobile devices
- [ ] Resend email functionality working
- [ ] Monitoring and logging enabled

---

## Quick Commands

### Check User Confirmation Status (SQL):

```sql
SELECT 
  email, 
  created_at, 
  confirmed_at,
  CASE 
    WHEN confirmed_at IS NULL THEN 'Unconfirmed'
    ELSE 'Confirmed'
  END as status
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
```

### Manually Confirm User (Emergency Only):

```sql
UPDATE auth.users 
SET confirmed_at = NOW() 
WHERE email = 'user@example.com';
```

**⚠️ Use only for testing/emergency support**

---

## Support Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Email Templates Guide](https://supabase.com/docs/guides/auth/auth-email-templates)
- [SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [Deep Linking in Expo](https://docs.expo.dev/guides/linking/)

---

## Summary

**For Development:** Disable email confirmation temporarily

**For Production:** Keep email confirmation enabled and:
1. Set up custom SMTP
2. Customize email templates
3. Configure redirect URLs
4. Test thoroughly

The app now provides excellent UX for email confirmation with clear guidance and error messages.
