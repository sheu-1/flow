import { SAMPLE_SMS_CASES, parseTransactionFromSms } from './SMSParser';

// Simple ad-hoc test runner (no Jest setup required)
function approxEqual(a: number | undefined, b: number | undefined) {
  if (a == null || b == null) return a === (b as any);
  return Math.abs((a as number) - (b as number)) < 1e-6;
}

export function runSmsParserTests() {
  let passed = 0;
  let failed = 0;
  for (const [idx, c] of SAMPLE_SMS_CASES.entries()) {
    const result = parseTransactionFromSms(c.text);
    const expected = c.expect;
    let ok = true;
    if (expected === null) {
      ok = result === null;
    } else if (!result) {
      ok = false;
    } else {
      if (expected.amount !== undefined && !approxEqual(result.amount, expected.amount as number)) ok = false;
      if (expected.type !== undefined && result.type !== expected.type) ok = false;
      if (expected.sender !== undefined && result.sender !== expected.sender) ok = false;
      if (expected.reference !== undefined && result.reference !== expected.reference) ok = false;
    }
    if (ok) {
      passed++;
      console.log(`[SMSParser][PASS] Case ${idx + 1}`);
    } else {
      failed++;
      console.warn(`[SMSParser][FAIL] Case ${idx + 1}`, { input: c.text, result, expected });
    }
  }
  console.log(`[SMSParser] Summary: passed=${passed}, failed=${failed}, total=${passed + failed}`);
}

// If executed directly (e.g., ts-node), run tests
if (typeof require !== 'undefined' && require.main === module) {
  runSmsParserTests();
}
