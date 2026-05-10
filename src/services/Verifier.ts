import vm from 'vm';
import * as math from 'mathjs';
import { ZodSchema } from 'zod';

/**
 * Verifier Verdict Schema
 * traces: FR-10, ADR-011
 */
export interface VerifierVerdict {
  verdict: 'PASS' | 'FAIL' | 'UNCERTAIN';
  oracleType: 'POT_EXECUTION' | 'ZOD_SCHEMA' | 'SYMBOLIC_EVAL' | 'LLM_ONLY';
  oracleOutput: string;
}

/**
 * Verifier Service
 * traces: FR-10, FR-11, ADR-011, PRD §7.2
 * Orchestrates extrinsic oracles to ground model outputs.
 */
export class Verifier {
  /**
   * Run Program-of-Thought oracle (JavaScript via vm)
   * traces: FR-10
   */
  public static async potOracle(code: string): Promise<VerifierVerdict> {
    const sandbox = { console: { log: (...args: any[]) => sandbox.stdout += args.join(' ') + '\n' }, stdout: '' };
    try {
      vm.runInNewContext(code, sandbox, { timeout: 1000 });
      return {
        verdict: 'PASS',
        oracleType: 'POT_EXECUTION',
        oracleOutput: sandbox.stdout || 'Execution finished without output.'
      };
    } catch (err: any) {
      return {
        verdict: 'FAIL',
        oracleType: 'POT_EXECUTION',
        oracleOutput: err.message
      };
    }
  }

  /**
   * Run Math oracle (Symbolic eval via mathjs)
   * traces: FR-10
   */
  public static symbolicOracle(expression: string): VerifierVerdict {
    try {
      const result = math.evaluate(expression);
      return {
        verdict: 'PASS',
        oracleType: 'SYMBOLIC_EVAL',
        oracleOutput: String(result)
      };
    } catch (err: any) {
      return {
        verdict: 'FAIL',
        oracleType: 'SYMBOLIC_EVAL',
        oracleOutput: err.message
      };
    }
  }

  /**
   * Run Schema oracle (Zod validation)
   * traces: FR-10
   */
  public static schemaOracle(data: any, schema: ZodSchema): VerifierVerdict {
    const result = schema.safeParse(data);
    if (result.success) {
      return {
        verdict: 'PASS',
        oracleType: 'ZOD_SCHEMA',
        oracleOutput: 'Schema validation passed.'
      };
    } else {
      return {
        verdict: 'FAIL',
        oracleType: 'ZOD_SCHEMA',
        oracleOutput: JSON.stringify(result.error.format())
      };
    }
  }
}
