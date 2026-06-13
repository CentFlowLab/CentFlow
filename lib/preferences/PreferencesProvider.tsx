import { useEffect } from 'react';

import { useProfile } from '@/hooks/queries/useProfile';
import { useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { getLocaleForRegion } from '@/lib/preferences/config';
import { setFormatContext } from '@/lib/utils/format';

type PreferencesProviderProps = {
  children: React.ReactNode;
};

/**
 * Sincroniza moeda (perfil) e locale (região) com os utilitários de formatação globais.
 */
export function PreferencesProvider({ children }: PreferencesProviderProps) {
  const { data: profile } = useProfile();
  const { data: preferences } = useUserPreferences();

  useEffect(() => {
    setFormatContext({
      currency: profile?.currency ?? 'EUR',
      locale: getLocaleForRegion(preferences?.region ?? 'portugal'),
    });
  }, [profile?.currency, preferences?.region]);

  return children;
}
