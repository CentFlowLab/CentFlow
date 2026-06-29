import { useEffect, useRef, useState } from 'react';
import { Text as RNText } from 'react-native';

type AnimatedCurrencyProps = {
  value: number;
  formatter: (value: number) => string;
  style?: object;
  duration?: number;
};

function sanitizeAmount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value;
}

function formatAmount(raw: number, formatter: (value: number) => string): string {
  try {
    const rounded = Math.round(sanitizeAmount(raw) * 100) / 100;
    return formatter(rounded);
  } catch {
    return '—';
  }
}

/** Animação de valor monetário só em JS (requestAnimationFrame) — evita crash Reanimated no arranque. */
export function AnimatedCurrency({
  value,
  formatter,
  style,
  duration = 600,
}: AnimatedCurrencyProps) {
  const safeValue = sanitizeAmount(value);
  const [display, setDisplay] = useState(() => formatAmount(safeValue, formatter));
  const rafRef = useRef<number | null>(null);
  const currentValueRef = useRef(safeValue);

  useEffect(() => {
    const from = currentValueRef.current;
    const to = safeValue;
    currentValueRef.current = to;

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (from === to) {
      setDisplay(formatAmount(to, formatter));
      return;
    }

    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const current = from + (to - from) * eased;
      setDisplay(formatAmount(current, formatter));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [safeValue, duration, formatter]);

  return <RNText style={style}>{display}</RNText>;
}
