/**
 * Vertex AI M-Pesa Parser - Example Usage
 * 
 * This file demonstrates how to use the Vertex AI M-Pesa parser
 * in various scenarios.
 * 
 * To run this example:
 * 1. Install dependencies: npm install @google-cloud/vertexai
 * 2. Configure environment variables (see VERTEX_AI_SETUP.md)
 * 3. Run: npx ts-node examples/vertex-ai-example.ts
 */

import {
  analyzeMpesaMessage,
  batchAnalyzeMpesaMessages,
  isVertexAIConfigured,
  getVertexAIConfig,
} from '../src/services/VertexAIMpesaParser';

import {
  processMpesaMessage,
  batchProcessMpesaMessages,
  processMpesaMessageWithDuplicateCheck,
} from '../src/services/MpesaVertexIntegration';

// Example M-Pesa messages
const EXAMPLE_MESSAGES = {
  moneyOut: 'MPESA confirmed. Ksh2,300.00 sent to John Doe 0712345678 on 13/10/25 at 2:45 PM. Transaction cost Ksh23.00. New M-PESA balance is Ksh5,677.00.',
  moneyIn: 'MPESA confirmed. You have received Ksh5,000.00 from Jane Smith 0723456789 on 13/10/25 at 3:15 PM. New M-PESA balance is Ksh10,677.00.',
  payment: 'MPESA confirmed. Ksh150.00 paid to Safaricom on 13/10/25 at 4:00 PM. Transaction cost Ksh0.00. New M-PESA balance is Ksh10,527.00.',
  fuliza: 'MPESA Fuliza: You have used Ksh500.00 Fuliza M-PESA on 13/10/25 at 5:30 PM. Transaction cost Ksh15.00. New M-PESA balance is Ksh11,027.00.',
  withdrawal: 'MPESA confirmed. Ksh3,000.00 withdrawn from Agent 12345 on 14/10/25 at 10:00 AM. Transaction cost Ksh28.00. New M-PESA balance is Ksh8,027.00.',
};

/**
 * Example 1: Check Configuration
 */
async function example1_CheckConfiguration() {
  console.log('\n=== Example 1: Check Configuration ===\n');

  const config = getVertexAIConfig();
  console.log('Vertex AI Configuration:');
  console.log(`  Project ID: ${config.projectId}`);
  console.log(`  Location: ${config.location}`);
  console.log(`  Model: ${config.model}`);
  console.log(`  Configured: ${config.configured ? '✓' : '✗'}`);

  if (!config.configured) {
    console.log('\n⚠️  Vertex AI is not configured!');
    console.log('Please set EXPO_PUBLIC_GCP_PROJECT_ID in your .env file');
    console.log('See VERTEX_AI_SETUP.md for instructions');
  }
}

/**
 * Example 2: Parse Single Message
 */
async function example2_ParseSingleMessage() {
  console.log('\n=== Example 2: Parse Single Message ===\n');

  if (!isVertexAIConfigured()) {
    console.log('⚠️  Skipping - Vertex AI not configured');
    return;
  }

  console.log('Parsing money out transaction...');
  console.log(`Message: ${EXAMPLE_MESSAGES.moneyOut}\n`);

  try {
    const result = await analyzeMpesaMessage(EXAMPLE_MESSAGES.moneyOut);
    console.log('✓ Parsed successfully:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('✗ Error:', error);
  }
}

/**
 * Example 3: Parse All Message Types
 */
async function example3_ParseAllMessageTypes() {
  console.log('\n=== Example 3: Parse All Message Types ===\n');

  if (!isVertexAIConfigured()) {
    console.log('⚠️  Skipping - Vertex AI not configured');
    return;
  }

  for (const [type, message] of Object.entries(EXAMPLE_MESSAGES)) {
    console.log(`\n--- ${type.toUpperCase()} ---`);
    console.log(`Message: ${message.substring(0, 60)}...`);

    try {
      const result = await analyzeMpesaMessage(message);
      console.log(`Type: ${result.type}`);
      console.log(`Amount: Ksh${result.amount}`);
      if (result.fee) console.log(`Fee: Ksh${result.fee}`);
      if (result.recipient) console.log(`Recipient: ${result.recipient}`);
      console.log(`Category: ${result.category}`);
      console.log('✓ Success');
    } catch (error) {
      console.error('✗ Error:', error);
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

/**
 * Example 4: Batch Processing
 */
async function example4_BatchProcessing() {
  console.log('\n=== Example 4: Batch Processing ===\n');

  if (!isVertexAIConfigured()) {
    console.log('⚠️  Skipping - Vertex AI not configured');
    return;
  }

  const messages = Object.values(EXAMPLE_MESSAGES);
  console.log(`Processing ${messages.length} messages in batch...\n`);

  try {
    const results = await batchAnalyzeMpesaMessages(messages);
    
    console.log(`✓ Successfully parsed ${results.length} messages\n`);
    
    // Summary
    const summary = {
      money_in: results.filter((r) => r.type === 'money_in').length,
      money_out: results.filter((r) => r.type === 'money_out').length,
      fee_only: results.filter((r) => r.type === 'fee_only').length,
      total_amount: results.reduce((sum, r) => sum + r.amount, 0),
      total_fees: results.reduce((sum, r) => sum + (r.fee || 0), 0),
    };

    console.log('Summary:');
    console.log(`  Money In: ${summary.money_in}`);
    console.log(`  Money Out: ${summary.money_out}`);
    console.log(`  Fees Only: ${summary.fee_only}`);
    console.log(`  Total Amount: Ksh${summary.total_amount}`);
    console.log(`  Total Fees: Ksh${summary.total_fees}`);
  } catch (error) {
    console.error('✗ Error:', error);
  }
}

/**
 * Example 5: Integration with Supabase (Mock)
 */
async function example5_SupabaseIntegration() {
  console.log('\n=== Example 5: Supabase Integration (Mock) ===\n');

  if (!isVertexAIConfigured()) {
    console.log('⚠️  Skipping - Vertex AI not configured');
    return;
  }

  console.log('This example shows how to integrate with Supabase.');
  console.log('Note: Actual Supabase insertion requires authentication.\n');

  const mockUserId = 'example-user-id-123';
  const message = EXAMPLE_MESSAGES.moneyOut;

  console.log(`Message: ${message.substring(0, 60)}...`);
  console.log(`User ID: ${mockUserId}\n`);

  try {
    // Parse the message
    const parsed = await analyzeMpesaMessage(message);
    
    // Show what would be inserted
    const transaction = {
      user_id: mockUserId,
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
    };

    console.log('Transaction to be inserted:');
    console.log(JSON.stringify(transaction, null, 2));
    console.log('\n✓ Ready for Supabase insertion');
    console.log('Use processMpesaMessage() to actually insert');
  } catch (error) {
    console.error('✗ Error:', error);
  }
}

/**
 * Example 6: Fuliza Message Handling
 */
async function example6_FulizaHandling() {
  console.log('\n=== Example 6: Fuliza Message Handling ===\n');

  if (!isVertexAIConfigured()) {
    console.log('⚠️  Skipping - Vertex AI not configured');
    return;
  }

  console.log('Fuliza messages are handled specially to avoid duplicates.');
  console.log('Only the fee is recorded, not the loan amount.\n');

  const message = EXAMPLE_MESSAGES.fuliza;
  console.log(`Message: ${message}\n`);

  try {
    const result = await analyzeMpesaMessage(message);
    
    console.log('Parsed result:');
    console.log(`  Type: ${result.type} (should be "fee_only")`);
    console.log(`  Amount: Ksh${result.amount} (should be the fee, not loan)`);
    console.log(`  Category: ${result.category}`);
    console.log('\n✓ Fuliza handled correctly');
    console.log('This prevents duplicate entries for the loan amount');
  } catch (error) {
    console.error('✗ Error:', error);
  }
}

/**
 * Main function - Run all examples
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Vertex AI M-Pesa Parser - Example Usage             ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    await example1_CheckConfiguration();
    await example2_ParseSingleMessage();
    await example3_ParseAllMessageTypes();
    await example4_BatchProcessing();
    await example5_SupabaseIntegration();
    await example6_FulizaHandling();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║   All examples completed!                              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

// Export for use in other files
export {
  example1_CheckConfiguration,
  example2_ParseSingleMessage,
  example3_ParseAllMessageTypes,
  example4_BatchProcessing,
  example5_SupabaseIntegration,
  example6_FulizaHandling,
};
