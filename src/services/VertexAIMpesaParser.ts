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

IMPORTANT RULES:
1. If the message contains "Fuliza" (overdraft/loan fee), ONLY return the transaction cost as a "fee_only" entry. Do NOT include the main transaction amount.
2. For regular transactions, extract both the transaction amount and any fees.
3. Always return valid JSON matching the exact schema below.
4. If you cannot parse the message, return a fee_only entry with amount 0.

OUTPUT SCHEMA:
{
  "type": "money_in" | "money_out" | "fee_only",
  "amount": <number>,
  "fee": <number or omit if none>,
  "recipient": "<name or omit if none>",
  "category": "<Transfer|Payment|Withdrawal|Deposit|Fuliza fee|Other>",
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
    // Initialize Vertex AI
    const vertexAI = initializeVertexAI();
    const generativeModel = vertexAI.getGenerativeModel({
      model: MODEL_NAME,
    });

    // Build prompt
    const prompt = buildParsingPrompt(messageText);

    // Generate content
    console.log('[VertexAI] Analyzing M-Pesa message...');
    const result = await generativeModel.generateContent(prompt);
    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('[VertexAI] Raw response:', text);

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from model response');
    }

    const parsed: ParsedMpesaTransaction = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.type || typeof parsed.amount !== 'number') {
      throw new Error('Invalid response structure from model');
    }

    // Add raw message for debugging
    parsed.raw_message = messageText;

    console.log('[VertexAI] Successfully parsed transaction:', parsed);
    return parsed;
  } catch (error) {
    console.error('[VertexAI] Error parsing M-Pesa message:', error);
    
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
