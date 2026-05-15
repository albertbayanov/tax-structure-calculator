import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

interface Matcher {
  toBe(expected: unknown): void;
  toBeNull(): void;
  toContain(expected: unknown): void;
  toHaveLength(expected: number): void;
  toThrow(expectedMessage?: string): void;
}

function createMatcher(actual: unknown): Matcher {
  return {
    toBe(expected: unknown): void {
      assert.equal(actual, expected);
    },
    toBeNull(): void {
      assert.equal(actual, null);
    },
    toContain(expected: unknown): void {
      if (typeof actual === 'string') {
        assert.equal(actual.includes(String(expected)), true);
        return;
      }

      assert.equal(Array.isArray(actual), true);
      assert.equal((actual as unknown[]).includes(expected), true);
    },
    toHaveLength(expected: number): void {
      assert.equal((actual as { length: number }).length, expected);
    },
    toThrow(expectedMessage?: string): void {
      assert.equal(typeof actual, 'function');
      assert.throws(actual as () => void, expectedMessage ? new RegExp(expectedMessage) : undefined);
    }
  };
}

function expect(actual: unknown): Matcher {
  return createMatcher(actual);
}

interface ItWithEach {
  (name: string, testFunction: () => void): void;
  each<T>(cases: readonly T[]): (name: string, testFunction: (value: T) => void) => void;
}

const vitestIt = it as ItWithEach;

vitestIt.each = function each<T>(cases: readonly T[]) {
  return (name: string, testFunction: (value: T) => void) => {
    cases.forEach((testCase) => {
      vitestIt(name.replace('%s', String(testCase)), () => testFunction(testCase));
    });
  };
};

export { describe, expect, vitestIt as it };
