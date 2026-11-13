import * as Linking from 'expo-linking';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import {
  Card,
  Chip,
  ChipGroup,
  Divider,
  FormScreen,
  ListItem,
  Text,
  TextField,
} from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { useAuth } from '../account/AuthProvider';
import { closeModal } from '../finance/navigation';
import {
  listBanks,
  startBankLink,
  type BankClientError,
  type BankOption,
} from './open-banking-client';

/** Países do Espaço Económico Europeu com PSD2; Portugal primeiro. */
export const BANK_COUNTRIES = [
  'PT',
  'ES',
  'FR',
  'DE',
  'IT',
  'NL',
  'BE',
  'IE',
  'LU',
  'AT',
  'FI',
  'SE',
  'DK',
  'NO',
  'PL',
  'CZ',
  'SK',
  'SI',
  'HR',
  'HU',
  'RO',
  'BG',
  'GR',
  'CY',
  'MT',
  'EE',
  'LV',
  'LT',
  'IS',
  'LI',
] as const;

/** Nome do país na língua da app; o código, onde o Intl não tiver nomes de regiões. */
function countryName(code: string, language: string): string {
  try {
    const names = new Intl.DisplayNames([language], { type: 'region' });
    return names.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Normaliza para pesquisar sem acentos nem maiúsculas ("credito" encontra "Crédito"). */
const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase();

export function BankLinkScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { client } = useAuth();
  const [country, setCountry] = useState<string>('PT');
  const [banks, setBanks] = useState<{ country: string; list: BankOption[] } | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<BankClientError | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    let alive = true;
    void listBanks(client, country).then((result) => {
      if (!alive) return;
      if (result.ok) {
        setBanks({ country, list: result.value.banks ?? [] });
        setError(null);
      } else {
        setBanks({ country, list: [] });
        setError(result.error);
      }
    });
    return () => {
      alive = false;
    };
  }, [client, country]);

  const visible = useMemo(() => {
    const needle = fold(query.trim());
    const list = banks?.country === country ? banks.list : [];
    return needle ? list.filter((bank) => fold(bank.name).includes(needle)) : list;
  }, [banks, country, query]);

  const choose = async (bank: BankOption) => {
    if (!client || opening) return;
    setOpening(bank.name);
    setError(null);
    const result = await startBankLink(client, bank, Platform.OS === 'web');
    if (!result.ok) {
      setOpening(null);
      setError(result.error);
      return;
    }
    // A autorização acontece no site ou na app do banco; o regresso traz-nos a /bank-callback.
    if (Platform.OS === 'web') window.location.assign(result.value.url);
    else {
      await Linking.openURL(result.value.url);
      setOpening(null);
    }
  };

  const loading = banks?.country !== country;

  return (
    <FormScreen
      title={t('banking.link.title')}
      closeLabel={t('common.close')}
      onClose={() => closeModal('/integrations/banks')}>
      <View style={styles.body}>
        <Text variant="callout" tone="secondary">
          {t('banking.link.hint')}
        </Text>
        <ChipGroup label={t('banking.link.country')}>
          {BANK_COUNTRIES.map((code) => (
            <Chip
              key={code}
              label={countryName(code, i18n.language)}
              selected={country === code}
              onPress={() => {
                setCountry(code);
                setQuery('');
              }}
            />
          ))}
        </ChipGroup>
        <TextField
          label={t('banking.link.search')}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {error ? (
          <Text variant="footnote" tone="negative" accessibilityLiveRegion="polite">
            {t(`banking.errors.${error}`)}
          </Text>
        ) : null}
        {opening ? (
          <Text variant="footnote" tone="secondary" accessibilityLiveRegion="polite">
            {t('banking.link.opening')}
          </Text>
        ) : null}
        {loading ? (
          <ActivityIndicator color={colors.primary} accessibilityLabel={t('common.loading')} />
        ) : visible.length === 0 ? (
          error ? null : (
            <Text variant="body" tone="secondary">
              {t('banking.link.noResults')}
            </Text>
          )
        ) : (
          <Card padding="xs">
            {visible.map((bank, index) => (
              <View key={`${bank.country}-${bank.name}`}>
                {index > 0 ? <Divider inset={spacing.lg} /> : null}
                <ListItem
                  icon="business-outline"
                  iconColor="textSecondary"
                  iconBackground="surfaceMuted"
                  title={bank.name}
                  onPress={() => void choose(bank)}
                />
              </View>
            ))}
          </Card>
        )}
        <Text variant="footnote" tone="tertiary">
          {t('banking.provider')}
        </Text>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg },
});
