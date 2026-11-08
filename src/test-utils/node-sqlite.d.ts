// Declarações mínimas dos módulos Node usados apenas nos testes (o projeto não inclui @types/node).

declare module 'node:sqlite' {
  type SQLInputValue = null | number | bigint | string | Uint8Array;

  export class StatementSync {
    run(...params: SQLInputValue[]): { changes: number | bigint; lastInsertRowid: number | bigint };
    all(...params: SQLInputValue[]): Record<string, unknown>[];
    get(...params: SQLInputValue[]): Record<string, unknown> | undefined;
  }

  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}

declare module 'node:fs' {
  export function mkdtempSync(prefix: string): string;
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
}

declare module 'node:os' {
  export function tmpdir(): string;
}

declare module 'node:path' {
  export function join(...paths: string[]): string;
}
