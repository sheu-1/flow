/**
 * Vertex AI M-Pesa Message Parser
 * 
 * This service uses Google Cloud Vertex AI (Gemini 1.5 Flash) to parse M-Pesa SMS messages
 * and extract structured financial data for database insertion.
 * 
 * Features:
 * - Natural language parsing of M-Pesa messages
 * - Intelligent handling of Fuliza messages to avoid duplicates
 * - Structured JSON output ready for Supabase insertion
 * - Production-ready error handling
 * 
 * Setup:
 * 1. Install: npm install @google-cloud/vertexai
 * 2. Set environment variables:
 *    - GCP_PROJECT_ID: Your Google Cloud project ID
 *    - GCP_LOCATION: Region (default: us-central1)
 * 3. Ensure GCP credentials are configured (service account or ADC)
 */

import { VertexAI } from '@google-cloud/vertexai';

// Environment configuration
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || process.env.EXPO_PUBLIC_GCP_PROJECT_ID;
const GCP_LOCATION = process.env.GCP_LOCATION || process.env.EXPO_PUBLIC_GCP_LOCATION || 'us-central1';
const MODEL_NAME = 'gemini-1.5-flash';

// Type definitions for parsed M-Pesa data
export type TransactionType = 'money_in' | 'money_out' | 'fee_only';

export interface ParsedMpesaTransaction {
  type: TransactionType;
  amount: number;
  fee?: number;
  recipient?: string;
  category: string;
  timestamp?: string;
  raw_message?: string;
}

/**
 * Initialize Vertex AI client
 * @returns Configured Vertex AI instance
 */
function initializeVertexAI(): VertexAI {
  if (!GCP_PROJECT_ID) {
    throw new Error(
      'GCP_PROJECT_ID is not set. Please configure GCP_PROJECT_ID or EXPO_PUBLIC_GCP_PROJECT_ID in your environment.'
    );
  }

  return new VertexAI({
    project: GCP_PROJECT_ID,
    location: GCP_LOCATION,
  });
}

/**
 * Build the prompt for Gemini to parse M-Pesa messages
 * @param messageText Raw M-Pesa SMS text
 * @returns Structured prompt for the AI model
 */
function buildParsingPrompt(messageText: string): string {
  return `You are an expert M-Pesa transaction parser. Analyze the following M-Pesa SMS message and extract financial details.

IMPORTANT CATEGORIZATION RULES:

1. AIRTIME & DATA PURCHASES (Always Money Out):
   - Keywords: "airtime", "minutes", "data", "bundles", "MB", "GB"
   - These are ALWAYS expenses (money_out)
   - Category: "Airtime" or "Data"
   - Example: "You bought Ksh 50.00 of airtime" → money_out, amount: 50, category: "Airtime"

2. FULIZA REPAYMENTS (Money Out):
   - Keywords: "pay" + "Fuliza", "repay Fuliza", "used to pay your outstanding Fuliza"
   - These are loan repayments, so money_out
   - Category: "Fuliza Repayment"
   - Example: "Ksh 95.33 has been used to fully pay your outstanding Fuliza" → money_out, amount: 95.33

3. FULIZA OVERDRAFT ISSUANCE (Fee Only):
   - Keywords: "Fuliza M-PESA amount is", "Access Fee charged"
   - This is credit issuance, NOT an expense
   - ONLY log the Access Fee as money_out
   - Ignore the borrowed amount to prevent double entries
   - Category: "Fuliza Fee"
   - Example: "Fuliza M-PESA amount is Ksh 30.00. Access Fee charged Ksh 0.30" → money_out, amount: 0.30, category: "Fuliza Fee"

4. CHECK CHARGES & FEES:
   - Keywords: "transaction cost", "withdrawal fee", "check charges"
   - These are fees, not main transactions
   - Include as "fee" field, not main amount

5. REGULAR TRANSACTIONS:
   - Transfers, payments, withdrawals, deposits
   - Extract both amount and any fees separately

OUTPUT SCHEMA:
{
  "type": "money_in" | "money_out" | "fee_only",
  "amount": <number>,
  "fee": <number or omit if none>,
  "recipient": "<name or omit if none>",
  "category": "<Transfer|Payment|Withdrawal|Deposit|Airtime|Data|Fuliza Repayment|Fuliza Fee|Other>",
  "timestamp": "<ISO 8601 format or omit if not available>"
}

M-PESA MESSAGE:
${messageText}

PARSED JSON:`;
}

/**
 * Parse M-Pesa SMS message using Vertex AI
 * 
 * @param messageText Raw M-Pesa SMS message
 * @returns Parsed transaction data
 * 
 * @example
 * const result = await analyzeMpesaMessage(
 *   "MPESA confirmed. Ksh2,300.00 sent to John Doe 0712345678 on 13/10/25. Transaction cost Ksh23.00."
 * );
 * console.log(result);
 * // {
 * //   type: "money_out",
 * //   amount: 2300,
 * //   fee: 23,
 * //   recipient: "John Doe",
 * //   category: "Transfer",
 * //   timestamp: "2025-10-13T00:00:00Z"
 * // }
 */
export async function analyzeMpesaMessage(
  messageText: string
): Promise<ParsedMpesaTransaction> {
  try {
    console.log('='.repeat(60));
    console.log('[VertexAI] 🚀 Starting M-Pesa message analysis');
    console.log('[VertexAI] Configuration:', getVertexAIConfig());
    console.log('[VertexAI] Message:', messageText.substring(0, 100) + '...');
    console.log('[VertexAI] Timestamp:', new Date().toISOString());
    
    // Initialize Vertex AI
    const vertexAI = initializeVertexAI();
    console.log('[VertexAI] ✓ Vertex AI client initialized');
    
    const generativeModel = vertexAI.getGenerativeModel({
      model: MODEL_NAME,
    });
    console.log('[VertexAI] ✓ Generative model loaded:', MODEL_NAME);

    // Build prompt
    const prompt = buildParsingPrompt(messageText);
    console.log('[VertexAI] ✓ Prompt built, length:', prompt.length);

    // Generate content
    console.log('[VertexAI] 📡 Sending request to Vertex AI API...');
    console.log('[VertexAI] Endpoint: aiplatform.googleapis.com');
    const requestStartTime = Date.now();
    
    const result = await generativeModel.generateContent(prompt);
    const requestDuration = Date.now() - requestStartTime;
    
    console.log('[VertexAI] ✓ Response received in', requestDuration, 'ms');
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('[VertexAI] Raw response length:', text.length);
    console.log('[VertexAI] Raw response:', text);

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from model response');
    }

    const parsed: ParsedMpesaTransaction = JSON.parse(jsonMatch[0]);
    console.log('[VertexAI] ✓ JSON parsed successfully');

    // Validate required fields
    if (!parsed.type || typeof parsed.amount !== 'number') {
      console.error('[VertexAI] ✗ Validation failed: Invalid response structure');
      throw new Error('Invalid response structure from model');
    }
    console.log('[VertexAI] ✓ Validation passed');

    // Add raw message for debugging
    parsed.raw_message = messageText;

    console.log('[VertexAI] ✅ Successfully parsed transaction:', JSON.stringify(parsed, null, 2));
    console.log('='.repeat(60));
    return parsed;
  } catch (error) {
    console.error('[VertexAI] ❌ ERROR parsing M-Pesa message');
    console.error('[VertexAI] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[VertexAI] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[VertexAI] Error stack:', error instanceof Error ? error.stack : 'N/A');
    console.log('='.repeat(60));
    
    // Return a safe fallback
    return {
      type: 'fee_only',
      amount: 0,
      category: 'Parse Error',
      raw_message: messageText,
    };
  }
}

/**
 * Batch process multiple M-Pesa messages
 * 
 * @param messages Array of M-Pesa SMS messages
 * @returns Array of parsed transactions
 * 
 * @example
 * const messages = [msg1, msg2, msg3];
 * const results = await batchAnalyzeMpesaMessages(messages);
 * console.log(results);
 */
export async function batchAnalyzeMpesaMessages(
  messages: string[]
): Promise<ParsedMpesaTransaction[]> {
  console.log(`[VertexAI] Batch processing ${messages.length} messages...`);
  
  const results: ParsedMpesaTransaction[] = [];
  
  for (const message of messages) {
    try {
      const parsed = await analyzeMpesaMessage(message);
      results.push(parsed);
      
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error('[VertexAI] Failed to parse message:', message, error);
      results.push({
        type: 'fee_only',
        amount: 0,
        category: 'Parse Error',
        raw_message: message,
      });
    }
  }
  
  console.log(`[VertexAI] Batch processing complete. Parsed ${results.length} messages.`);
  return results;
}

/**
 * Check if Vertex AI is properly configured
 * @returns true if configured, false otherwise
 */
export function isVertexAIConfigured(): boolean {
  return !!GCP_PROJECT_ID;
}

/**
 * Get current Vertex AI configuration
 * @returns Configuration object
 */
export function getVertexAIConfig() {
  return {
    projectId: GCP_PROJECT_ID || 'NOT_SET',
    location: GCP_LOCATION,
    model: MODEL_NAME,
    configured: isVertexAIConfigured(),
  };
}
