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
  export function readFileSync(path: string): Uint8Array<ArrayBuffer>;
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readdirSync(path: string): string[];
}

declare module 'node:process' {
  export function cwd(): string;
}

declare module 'node:worker_threads' {
  export class Worker {
    constructor(filename: string);
    postMessage(message: unknown): void;
    on(event: 'message', listener: (message: never) => void): this;
    once(event: 'message' | 'error', listener: (value: never) => void): this;
    terminate(): Promise<number>;
  }
}

declare module 'node:os' {
  export function tmpdir(): string;
}

declare module 'node:path' {
  export function join(...paths: string[]): string;
}

declare module 'node:crypto' {
  export function randomUUID(): string;
}

declare module 'node:https' {
  type IncomingMessage = {
    statusCode?: number;
    statusMessage?: string;
    headers: Record<string, string | string[] | undefined>;
    on(event: 'data', listener: (chunk: Uint8Array) => void): void;
    on(event: 'end', listener: () => void): void;
  };
  type ClientRequest = {
    on(event: 'error', listener: (error: Error) => void): void;
    write(body: string): void;
    end(): void;
  };
  const https: {
    request(
      url: URL,
      options: { method: string; headers: Record<string, string> },
      callback: (response: IncomingMessage) => void,
    ): ClientRequest;
  };
  export default https;
}
