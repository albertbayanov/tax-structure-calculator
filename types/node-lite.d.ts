declare module 'node:assert/strict' {
  interface Assert {
    equal(actual: unknown, expected: unknown, message?: string): void;
    throws(block: () => void, error?: RegExp): void;
  }
  const assert: Assert;
  export default assert;
}

declare module 'node:test' {
  export interface TestFunction {
    (name: string, fn: () => void | Promise<void>): void;
    each?: unknown;
  }
  export const describe: TestFunction;
  export const it: TestFunction;
}

declare module 'node:fs/promises' {
  export interface Dirent {
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  }
  export function mkdir(path: string | URL, options?: { recursive?: boolean }): Promise<void>;
  export function readdir(path: string | URL, options: { withFileTypes: true }): Promise<Dirent[]>;
  export function readFile(path: string | URL, encoding: 'utf8'): Promise<string>;
  export function rm(path: string | URL, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  export function writeFile(path: string | URL, data: string): Promise<void>;
}

declare module 'node:path' {
  export function join(...paths: string[]): string;
}

declare module 'vite' {
  export function defineConfig(config: unknown): unknown;
}

declare const process: {
  cwd(): string;
  exit(code?: number): never;
};

declare const console: {
  error(message?: unknown): void;
};
