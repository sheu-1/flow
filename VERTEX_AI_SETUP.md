# Vertex AI M-Pesa Message Parser Setup Guide

This guide explains how to set up and use the Vertex AI integration for automatic M-Pesa SMS message parsing.

## 🎯 Overview

The Vertex AI M-Pesa Parser uses Google Cloud's Gemini 1.5 Flash model to:
- Parse M-Pesa SMS messages using natural language processing
- Extract transaction details (amount, recipient, fees, etc.)
- Handle Fuliza messages intelligently to avoid duplicates
- Return structured JSON ready for Supabase insertion

## 📋 Prerequisites

1. **Google Cloud Platform Account**
   - Sign up at https://cloud.google.com
   - Free tier includes $300 credit for new users

2. **Node.js Backend**
   - This integration runs on the backend (not in React Native)
   - Requires Node.js environment with GCP credentials

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```bash
cd flow
npm install @google-cloud/vertexai
```

### Step 2: Create GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Note your **Project ID** (e.g., `my-mpesa-parser-123`)

### Step 3: Enable Vertex AI API

1. Go to [Vertex AI API](https://console.cloud.google.com/apis/library/aiplatform.googleapis.com)
2. Click **Enable**
3. Wait for the API to be enabled (takes ~1 minute)

### Step 4: Set Up Authentication

**Option A: Service Account (Recommended for Production)**

1. Go to [Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Click **Create Service Account**
3. Name it `mpesa-parser` and click **Create**
4. Grant role: **Vertex AI User**
5. Click **Done**
6. Click on the service account → **Keys** → **Add Key** → **Create New Key**
7. Choose **JSON** and download the key file
8. Save it securely (e.g., `gcp-service-account.json`)

**Option B: Application Default Credentials (Development)**

```bash
gcloud auth application-default login
```

### Step 5: Configure Environment Variables

Add to your `.env` file:

```bash
# Google Cloud Platform - Vertex AI
EXPO_PUBLIC_GCP_PROJECT_ID=your-project-id-here
EXPO_PUBLIC_GCP_LOCATION=us-central1

# If using service account, set this path
GOOGLE_APPLICATION_CREDENTIALS=/path/to/gcp-service-account.json
```

### Step 6: Test the Integration

Create a test file `test-vertex.js`:

```javascript
const { analyzeMpesaMessage } = require('./src/services/VertexAIMpesaParser');

async function test() {
  const message = 'MPESA confirmed. Ksh2,300.00 sent to John Doe 0712345678 on 13/10/25. Transaction cost Ksh23.00.';
  
  const result = await analyzeMpesaMessage(message);
  console.log('Parsed transaction:', result);
}

test();
```

Run it:

```bash
node test-vertex.js
```

Expected output:

```json
{
  "type": "money_out",
  "amount": 2300,
  "fee": 23,
  "recipient": "John Doe",
  "category": "Transfer",
  "timestamp": "2025-10-13T00:00:00Z",
  "raw_message": "MPESA confirmed. Ksh2,300.00..."
}
```

## 💻 Usage Examples

### Example 1: Parse Single Message

```typescript
import { analyzeMpesaMessage } from './src/services/VertexAIMpesaParser';

const message = 'MPESA confirmed. Ksh2,300.00 sent to John Doe...';
const parsed = await analyzeMpesaMessage(message);

console.log(parsed);
// {
//   type: "money_out",
//   amount: 2300,
//   fee: 23,
//   recipient: "John Doe",
//   category: "Transfer"
// }
```

### Example 2: Batch Processing

```typescript
import { batchAnalyzeMpesaMessages } from './src/services/VertexAIMpesaParser';

const messages = [
  'MPESA confirmed. Ksh2,300.00 sent to John Doe...',
  'MPESA confirmed. You have received Ksh5,000.00 from Jane Smith...',
  'MPESA confirmed. Ksh150.00 paid to Safaricom...',
];

const results = await batchAnalyzeMpesaMessages(messages);
console.log(`Parsed ${results.length} transactions`);
```

### Example 3: Integration with Supabase

```typescript
import { processMpesaMessage } from './src/services/MpesaVertexIntegration';

// Parse and insert into Supabase
const transaction = await processMpesaMessage(
  'MPESA confirmed. Ksh2,300.00 sent to John Doe...',
  'user-uuid-123'
);

if (transaction) {
  console.log('Transaction inserted:', transaction.id);
}
```

### Example 4: Handling Fuliza Messages

```typescript
// Fuliza messages are automatically handled
const fulizaMessage = 'MPESA Fuliza: You have used Ksh500.00 Fuliza M-PESA. Transaction cost Ksh15.00.';

const parsed = await analyzeMpesaMessage(fulizaMessage);
console.log(parsed);
// {
//   type: "fee_only",
//   amount: 15,  // Only the fee, not the loan amount
//   category: "Fuliza fee"
// }
```

## 🏗️ Architecture

```
┌─────────────────┐
│  M-Pesa SMS     │
│  Message        │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  VertexAIMpesaParser    │
│  - analyzeMpesaMessage  │
│  - Gemini 1.5 Flash     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Parsed JSON            │
│  {                      │
│    type: "money_out",   │
│    amount: 2300,        │
│    fee: 23,             │
│    recipient: "John"    │
│  }                      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  MpesaVertexIntegration │
│  - processMpesaMessage  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Supabase Database      │
│  transactions table     │
└─────────────────────────┘
```

## 🔧 Configuration Options

### Model Selection

By default, we use `gemini-1.5-flash` (free tier friendly). You can change this in `VertexAIMpesaParser.ts`:

```typescript
const MODEL_NAME = 'gemini-1.5-flash'; // or 'gemini-1.5-pro'
```

### Region Selection

Default region is `us-central1`. Change via environment variable:

```bash
EXPO_PUBLIC_GCP_LOCATION=europe-west1
```

Available regions:
- `us-central1` (default)
- `us-east4`
- `europe-west1`
- `asia-southeast1`

## 💰 Pricing

**Gemini 1.5 Flash (Recommended)**
- Input: $0.075 per 1M characters
- Output: $0.30 per 1M characters
- Free tier: First 1M characters/month

**Example Cost Calculation:**
- Average M-Pesa SMS: ~200 characters
- 1,000 messages = 200,000 characters
- Cost: ~$0.015 (1.5 cents)

**Free Tier Coverage:**
- ~5,000 messages per month free

## 🐛 Troubleshooting

### Error: "GCP_PROJECT_ID is not set"

**Solution:** Add `EXPO_PUBLIC_GCP_PROJECT_ID` to your `.env` file.

### Error: "Permission denied"

**Solution:** Ensure your service account has the **Vertex AI User** role.

### Error: "API not enabled"

**Solution:** Enable Vertex AI API at https://console.cloud.google.com/apis/library/aiplatform.googleapis.com

### Error: "Could not load credentials"

**Solution:** Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

### Messages not parsing correctly

**Solution:** Check the prompt in `buildParsingPrompt()` function. You can customize it for your specific M-Pesa message format.

## 📊 Monitoring

Monitor your Vertex AI usage:

1. Go to [Vertex AI Dashboard](https://console.cloud.google.com/vertex-ai)
2. Click **Model Garden** → **Gemini**
3. View usage metrics and costs

## 🔐 Security Best Practices

1. **Never commit service account keys to Git**
   - Add `*.json` to `.gitignore`
   - Use environment variables

2. **Use least privilege**
   - Only grant **Vertex AI User** role
   - Don't use owner/editor roles

3. **Rotate keys regularly**
   - Create new service account keys every 90 days
   - Delete old keys

4. **Monitor usage**
   - Set up billing alerts
   - Review logs regularly

## 🚀 Production Deployment

### Backend Service

Create a Node.js backend service:

```javascript
// server.js
const express = require('express');
const { processMpesaMessage } = require('./src/services/MpesaVertexIntegration');

const app = express();
app.use(express.json());

app.post('/api/parse-mpesa', async (req, res) => {
  const { message, userId } = req.body;
  
  const transaction = await processMpesaMessage(message, userId);
  
  if (transaction) {
    res.json({ success: true, transaction });
  } else {
    res.status(400).json({ success: false, error: 'Failed to parse message' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

### Environment Variables (Production)

```bash
# Production .env
EXPO_PUBLIC_GCP_PROJECT_ID=prod-mpesa-parser
EXPO_PUBLIC_GCP_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/app/secrets/gcp-service-account.json
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 📚 Additional Resources

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Gemini API Reference](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini)
- [Google Cloud Pricing](https://cloud.google.com/vertex-ai/pricing)
- [Supabase Documentation](https://supabase.com/docs)

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review GCP logs: https://console.cloud.google.com/logs
3. Check Supabase logs: https://supabase.com/dashboard/project/your-project/logs

## 📝 License

This integration is part of the Cash Flow Tracker app.
