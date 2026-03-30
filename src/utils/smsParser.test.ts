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
      if (expected.length !== result.length) {
        ok = false;
      } else {
        for (let i = 0; i < expected.length; i++) {
          const exp = expected[i];
          const res = result[i];
          if (exp.amount !== undefined && !approxEqual(res.amount, exp.amount as number)) ok = false;
          if (exp.type !== undefined && res.type !== exp.type) ok = false;
          if (exp.sender !== undefined && res.sender !== exp.sender) ok = false;
          if (exp.reference !== undefined && res.reference !== exp.reference) ok = false;
        }
      }
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
