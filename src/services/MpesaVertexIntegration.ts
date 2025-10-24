/**
 * M-Pesa + Vertex AI + Supabase Integration
 * 
 * This module demonstrates how to integrate Vertex AI M-Pesa parsing
 * with Supabase database insertion for automated transaction tracking.
 * 
 * Usage:
 * 1. Parse incoming M-Pesa SMS messages using Vertex AI
 * 2. Insert parsed transactions into Supabase
 * 3. Handle duplicates and errors gracefully
 */

import { supabase } from './SupabaseClient';
import {
  analyzeMpesaMessage,
  batchAnalyzeMpesaMessages,
  ParsedMpesaTransaction,
} from './VertexAIMpesaParser';

/**
 * Process a single M-Pesa message and insert into Supabase
 * 
 * @param messageText Raw M-Pesa SMS message
 * @param userId User ID for the transaction
 * @returns Inserted transaction record or null if failed
 * 
 * @example
 * const transaction = await processMpesaMessage(
 *   "MPESA confirmed. Ksh2,300.00 sent to John Doe...",
 *   "user-uuid-123"
 * );
 */
export async function processMpesaMessage(
  messageText: string,
  userId: string
): Promise<any | null> {
  try {
    console.log('[MpesaIntegration] Processing M-Pesa message...');

    // Step 1: Detect message type
    const isFulizaRepayment = /pay.*fuliza|repay.*fuliza|used to.*pay.*outstanding.*fuliza/i.test(messageText);
    const isFulizaIssuance = /fuliza.*amount is|access fee charged/i.test(messageText);
    const isAirtimeOrData = /airtime|minutes|data|bundles|MB|GB/i.test(messageText);
    
    console.log('[MpesaIntegration] Message type:', {
      fulizaRepayment: isFulizaRepayment,
      fulizaIssuance: isFulizaIssuance,
      airtimeOrData: isAirtimeOrData
    });

    // Step 2: Parse message using Vertex AI
    const parsed = await analyzeMpesaMessage(messageText);

    // Step 3: Skip if parsing failed
    if (parsed.type === 'fee_only' && parsed.amount === 0 && !parsed.fee) {
      console.warn('[MpesaIntegration] Failed to parse message, skipping insertion');
      return null;
    }

    // Step 4: Handle special cases
    let finalAmount = parsed.amount;
    let finalType = parsed.type;
    let finalCategory = parsed.category;
    let finalDescription = parsed.recipient ? `${parsed.category} - ${parsed.recipient}` : parsed.category;

    // Fuliza Repayment: User is paying back the loan (money out)
    if (isFulizaRepayment) {
      console.log('[MpesaIntegration] Fuliza repayment detected');
      finalType = 'money_out';
      finalCategory = 'Fuliza Repayment';
      finalDescription = 'Fuliza Loan Repayment';
      // Amount should already be correct from AI parsing
    }
    // Fuliza Issuance: Only log the access fee, not the borrowed amount
    else if (isFulizaIssuance) {
      console.log('[MpesaIntegration] Fuliza issuance detected - logging fee only');
      finalAmount = parsed.fee || 0;
      finalType = 'money_out';
      finalCategory = 'Fuliza Fee';
      finalDescription = 'Fuliza Access Fee';
      delete parsed.recipient;
    }
    // Airtime/Data: Always money out
    else if (isAirtimeOrData) {
      console.log('[MpesaIntegration] Airtime/Data purchase detected');
      finalType = 'money_out';
      if (/data|bundles|MB|GB/i.test(messageText)) {
        finalCategory = 'Data';
        finalDescription = 'Data Bundle Purchase';
      } else {
        finalCategory = 'Airtime';
        finalDescription = 'Airtime Purchase';
      }
    }

    // Step 5: Map to Supabase transaction format
    const transaction = {
      user_id: userId,
      type: finalType === 'money_in' ? 'income' : 'expense',
      amount: Math.abs(finalAmount),
      category: finalCategory,
      description: finalDescription,
      date: parsed.timestamp || new Date().toISOString(),
      source: 'mpesa_sms',
      metadata: {
        fee: parsed.fee,
        recipient: parsed.recipient,
        raw_message: parsed.raw_message,
        parsed_by: 'vertex_ai',
        is_fuliza_repayment: isFulizaRepayment,
        is_fuliza_issuance: isFulizaIssuance,
        is_airtime_or_data: isAirtimeOrData,
      },
    };

    // Step 6: Insert into Supabase
    const { data, error } = await supabase
      .from('transactions')
      .insert(transaction)
      .select()
      .single();

    if (error) {
      console.error('[MpesaIntegration] Supabase insertion error:', error);
      return null;
    }

    console.log('[MpesaIntegration] Transaction inserted successfully:', data);
    return data;
  } catch (error) {
    console.error('[MpesaIntegration] Error processing M-Pesa message:', error);
    return null;
  }
}

/**
 * Batch process multiple M-Pesa messages and insert into Supabase
 * 
 * @param messages Array of M-Pesa SMS messages
 * @param userId User ID for the transactions
 * @returns Array of inserted transaction records
 * 
 * @example
 * const messages = [msg1, msg2, msg3];
 * const transactions = await batchProcessMpesaMessages(messages, "user-uuid-123");
 * console.log(`Inserted ${transactions.length} transactions`);
 */
export async function batchProcessMpesaMessages(
  messages: string[],
  userId: string
): Promise<any[]> {
  console.log(`[MpesaIntegration] Batch processing ${messages.length} messages...`);

  try {
    // Step 1: Parse all messages using Vertex AI
    const parsedTransactions = await batchAnalyzeMpesaMessages(messages);

    // Step 2: Filter out failed parses
    const validTransactions = parsedTransactions.filter(
      (parsed) => !(parsed.type === 'fee_only' && parsed.amount === 0)
    );

    console.log(
      `[MpesaIntegration] ${validTransactions.length}/${messages.length} messages parsed successfully`
    );

    // Step 3: Map to Supabase format
    const transactions = validTransactions.map((parsed) => ({
      user_id: userId,
      type: parsed.type === 'money_in' ? 'income' : 'expense',
      amount: Math.abs(parsed.amount),
      category: parsed.category,
      description: parsed.recipient
        ? `${parsed.category} - ${parsed.recipient}`
        : parsed.category,
      date: parsed.timestamp || new Date().toISOString(),
      source: 'mpesa_sms',
      metadata: {
        fee: parsed.fee,
        recipient: parsed.recipient,
        raw_message: parsed.raw_message,
        parsed_by: 'vertex_ai',
      },
    }));

    // Step 4: Batch insert into Supabase
    const { data, error } = await supabase
      .from('transactions')
      .insert(transactions)
      .select();

    if (error) {
      console.error('[MpesaIntegration] Batch insertion error:', error);
      return [];
    }

    console.log(
      `[MpesaIntegration] Successfully inserted ${data?.length || 0} transactions`
    );
    return data || [];
  } catch (error) {
    console.error('[MpesaIntegration] Batch processing error:', error);
    return [];
  }
}

/**
 * Process M-Pesa message with duplicate detection
 * 
 * @param messageText Raw M-Pesa SMS message
 * @param userId User ID for the transaction
 * @returns Inserted transaction or null if duplicate/failed
 * 
 * @example
 * const transaction = await processMpesaMessageWithDuplicateCheck(
 *   "MPESA confirmed. Ksh2,300.00...",
 *   "user-uuid-123"
 * );
 */
export async function processMpesaMessageWithDuplicateCheck(
  messageText: string,
  userId: string
): Promise<any | null> {
  try {
    // Check if message already exists
    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('source', 'mpesa_sms')
      .contains('metadata', { raw_message: messageText })
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('[MpesaIntegration] Duplicate message detected, skipping');
      return null;
    }

    // Process as normal
    return await processMpesaMessage(messageText, userId);
  } catch (error) {
    console.error('[MpesaIntegration] Duplicate check error:', error);
    return null;
  }
}

/**
 * Example usage demonstration
 */
export async function exampleUsage() {
  console.log('=== Vertex AI M-Pesa Parser Example ===\n');

  // Example M-Pesa messages
  const messages = [
    'MPESA confirmed. Ksh2,300.00 sent to John Doe 0712345678 on 13/10/25 at 2:45 PM. Transaction cost Ksh23.00. New M-PESA balance is Ksh5,677.00.',
    'MPESA confirmed. You have received Ksh5,000.00 from Jane Smith 0723456789 on 13/10/25 at 3:15 PM. New M-PESA balance is Ksh10,677.00.',
    'MPESA confirmed. Ksh150.00 paid to Safaricom on 13/10/25. Transaction cost Ksh0.00. New M-PESA balance is Ksh10,527.00.',
    'MPESA Fuliza: You have used Ksh500.00 Fuliza M-PESA. Transaction cost Ksh15.00. New M-PESA balance is Ksh11,027.00.',
  ];

  // Example user ID (replace with actual authenticated user ID)
  const userId = 'example-user-id';

  console.log('Processing messages individually:\n');
  for (const message of messages) {
    console.log(`Message: ${message.substring(0, 50)}...`);
    const result = await processMpesaMessage(message, userId);
    if (result) {
      console.log(`✓ Inserted: ${result.category} - Ksh${result.amount}`);
    } else {
      console.log('✗ Failed to process');
    }
    console.log('');
  }

  console.log('\n=== Batch Processing Example ===\n');
  const batchResults = await batchProcessMpesaMessages(messages, userId);
  console.log(`Batch inserted ${batchResults.length} transactions`);
}
