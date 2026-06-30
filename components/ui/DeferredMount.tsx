import type { ReactNode } from 'react';

type DeferredMountProps = {
  when: boolean;
  children: ReactNode;
};

/** Monta filhos apenas quando `when` é true — evita custo de modais/sheets fechados. */
export function DeferredMount({ when, children }: DeferredMountProps) {
  if (!when) return null;
  return <>{children}</>;
}
