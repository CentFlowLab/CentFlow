import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';

import {
  FormatSettingsProvider,
  getDeviceLanguageTags,
  i18n,
  resolveLanguage,
  type SupportedLanguage,
} from '@/i18n';
import { appStorage } from '@/lib/storage/key-value-store';

import {
  createPreferencesRepository,
  DEFAULT_PREFERENCES,
  type Preferences,
  type PreferencesRepository,
} from './preferences';

type PreferencesContextValue = {
  preferences: Preferences;
  isLoaded: boolean;
  /** Idioma efetivamente aplicado (resolve "system" para o idioma do dispositivo). */
  activeLanguage: SupportedLanguage;
  updatePreferences: (changes: Partial<Preferences>) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const defaultRepository = createPreferencesRepository(appStorage);

type Props = PropsWithChildren<{ repository?: PreferencesRepository }>;

export function PreferencesProvider({ children, repository = defaultRepository }: Props) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);
  const repositoryRef = useRef(repository);
  // Fonte síncrona do valor mais recente, para atualizações consecutivas antes do re-render.
  const preferencesRef = useRef<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    let cancelled = false;
    void repositoryRef.current.load().then((loaded) => {
      if (cancelled) return;
      preferencesRef.current = loaded;
      setPreferences(loaded);
      setIsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeLanguage =
    preferences.language === 'system'
      ? resolveLanguage(getDeviceLanguageTags())
      : preferences.language;

  useEffect(() => {
    if (i18n.language !== activeLanguage) void i18n.changeLanguage(activeLanguage);
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = activeLanguage;
    }
  }, [activeLanguage]);

  const updatePreferences = useCallback((changes: Partial<Preferences>) => {
    const next = { ...preferencesRef.current, ...changes };
    preferencesRef.current = next;
    setPreferences(next);
    repositoryRef.current.save(next).catch(() => {
      console.warn('Não foi possível guardar as preferências.');
    });
  }, []);

  const value = useMemo(
    () => ({ preferences, isLoaded, activeLanguage, updatePreferences }),
    [preferences, isLoaded, activeLanguage, updatePreferences],
  );

  const formatSettings = useMemo(
    () => ({
      formatRegion: preferences.formatRegion,
      discreetAmounts: preferences.discreetAmounts,
    }),
    [preferences.formatRegion, preferences.discreetAmounts],
  );

  return (
    <PreferencesContext.Provider value={value}>
      <FormatSettingsProvider value={formatSettings}>{children}</FormatSettingsProvider>
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used within PreferencesProvider');
  return context;
}
