import { useEffect } from 'react';

import { useProfile } from '@/hooks/queries/useProfile';
import { useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { getLocaleForCountry, normalizeCountryCode } from '@/lib/preferences/locale.data';
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
      locale: getLocaleForCountry(normalizeCountryCode(preferences?.region ?? 'PT')),
    });
  }, [profile?.currency, preferences?.region]);

  return children;
}
