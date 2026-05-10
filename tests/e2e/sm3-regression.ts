import { Verifier } from '../../src/services/Verifier';
import { Orchestrator } from '../../src/core/orchestrator';

/**
 * SM-3 Hallucination Interception Regression
 * traces: SM-3, FR-10, FR-11
 */
async function runSM3Regression() {
  console.log('--- SM-3: Verifier Interception Regression ---');

  // Test 1: PoT Oracle with syntax error
  console.log('\n[Oracle Test] PoT Syntax Error');
  const badCode = 'console.log("Hello"'; // Missing closing paren
  const potVerdict = await Verifier.potOracle(badCode);
  console.log(`Verdict: ${potVerdict.verdict} | Output: ${potVerdict.oracleOutput}`);
  if (potVerdict.verdict === 'FAIL') console.log('PASS: Intercepted syntax error.');

  // Test 2: Math Oracle with invalid expression
  console.log('\n[Oracle Test] Math Invalid Expression');
  const badMath = '5 + * 3';
  const mathVerdict = Verifier.symbolicOracle(badMath);
  console.log(`Verdict: ${mathVerdict.verdict} | Output: ${mathVerdict.oracleOutput}`);
  if (mathVerdict.verdict === 'FAIL') console.log('PASS: Intercepted math error.');

  // Test 3: Orchestrator Revision Flow
  // We simulate a failing PoT check by passing a query that will produce code,
  // but we won't actually "inject" a failure here, we'll just verify the logic exists.
  // Actually, to truly test SM-3, we need to assert the interception rate.
  
  const scenarios = [
    { name: 'Syntax Error JS', code: 'const x = ;', expected: 'FAIL' },
    { name: 'Reference Error JS', code: 'console.log(nonExistentVar);', expected: 'FAIL' },
    { name: 'Timeout Error JS', code: 'while(true);', expected: 'FAIL' },
    { name: 'Math Syntax Error', code: '2 + * 2', expected: 'FAIL' },
    { name: 'Math Function Error', code: 'nonExistentFunc(5)', expected: 'FAIL' },
    { name: 'Valid JS', code: 'console.log(1+1);', expected: 'PASS' },
    { name: 'Valid Math', code: '5 * 5 + 10', expected: 'PASS' }
  ];

  let intercepted = 0;
  for (const s of scenarios) {
    let v;
    if (s.name.includes('JS')) v = await Verifier.potOracle(s.code);
    else v = Verifier.symbolicOracle(s.code);

    if (v.verdict === s.expected) {
      intercepted++;
      console.log(`[PASS] ${s.name} matched expected ${s.expected}`);
    } else {
      console.log(`[FAIL] ${s.name} expected ${s.expected} but got ${v.verdict}`);
    }
  }

  const rate = (intercepted / scenarios.length) * 100;
  console.log(`\nInterception Rate: ${rate}%`);
  
  if (rate >= 95 || (intercepted === scenarios.length)) {
    console.log('RESULT: PASS (SM-3 Satisfied)');
  } else {
    console.log('RESULT: FAIL (SM-3 Breach)');
  }
}

runSM3Regression().catch(console.error);
