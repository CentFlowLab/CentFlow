import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type AnalisesTabIconContextValue = {
  replayToken: number;
  requestReplay: () => void;
};

const AnalisesTabIconContext = createContext<AnalisesTabIconContextValue | null>(null);

export function AnalisesTabIconProvider({ children }: { children: ReactNode }) {
  const [replayToken, setReplayToken] = useState(0);

  const requestReplay = useCallback(() => {
    setReplayToken((value) => value + 1);
  }, []);

  const value = useMemo(
    () => ({ replayToken, requestReplay }),
    [replayToken, requestReplay],
  );

  return (
    <AnalisesTabIconContext.Provider value={value}>{children}</AnalisesTabIconContext.Provider>
  );
}

export function useAnalisesTabIconReplay(): AnalisesTabIconContextValue {
  const ctx = useContext(AnalisesTabIconContext);
  if (!ctx) {
    throw new Error('useAnalisesTabIconReplay must be used within AnalisesTabIconProvider');
  }
  return ctx;
}
