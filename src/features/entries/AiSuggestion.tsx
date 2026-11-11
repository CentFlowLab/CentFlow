import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  MAX_SUGGESTION_TEXT,
  normalizeSuggestionText,
  type EntrySuggestion,
} from '@/core/ai/suggest-entry';
import type { Category } from '@/core/finance';
import { Button, Text, TextField } from '@/ui/components';
import { spacing } from '@/ui/theme';

import { useAuth } from '../account/AuthProvider';

type Props = {
  today: string;
  categories: readonly Category[];
  onApply: (suggestion: EntrySuggestion) => void;
};

type Status = 'idle' | 'loading' | 'applied' | 'notConfigured' | 'notUnderstood' | 'failed';

/**
 * Registo por linguagem natural. Só preenche o formulário; o utilizador revê e confirma com
 * "Guardar". Só aparece com sessão iniciada, porque a chamada passa pela Edge Function.
 */
/**
 * O registo por texto só aparece com `EXPO_PUBLIC_AI_ENTRY_ENABLED=true`, depois de configurar
 * `ANTHROPIC_API_KEY` (e limites) no servidor. Sem isso, a área ficaria visível sem funcionar
 * (App Store, diretriz 2.1).
 */
export function aiEntryEnabled(): boolean {
  return process.env.EXPO_PUBLIC_AI_ENTRY_ENABLED === 'true';
}

export function AiSuggestion({ today, categories, onApply }: Props) {
  const { t } = useTranslation();
  const { state, client } = useAuth();
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  if (!aiEntryEnabled() || state.status !== 'signedIn' || !client) return null;

  async function suggest() {
    const normalized = normalizeSuggestionText(text);
    if (!normalized || !client) return;
    setStatus('loading');
    const { data, error } = await client.functions.invoke<{ suggestion?: EntrySuggestion }>(
      'suggest-entry',
      {
        method: 'POST',
        body: {
          text: normalized,
          context: {
            today,
            categories: categories
              .filter((category) => category.type === 'expense' || category.type === 'income')
              .map((category) => ({ name: category.name, type: category.type })),
          },
        },
      },
    );
    if (error || !data?.suggestion) {
      const code = (error as { context?: { status?: number } } | null)?.context?.status;
      setStatus(code === 503 ? 'notConfigured' : code === 422 ? 'notUnderstood' : 'failed');
      return;
    }
    onApply(data.suggestion);
    setStatus('applied');
  }

  return (
    <View style={styles.container}>
      <TextField
        label={t('entryForm.ai.label')}
        value={text}
        onChangeText={(value) => {
          setText(value);
          setStatus('idle');
        }}
        placeholder={t('entryForm.ai.placeholder')}
        maxLength={MAX_SUGGESTION_TEXT}
        returnKeyType="send"
        onSubmitEditing={() => void suggest()}
      />
      <Button
        label={t('entryForm.ai.action')}
        icon="sparkles-outline"
        variant="secondary"
        loading={status === 'loading'}
        disabled={status === 'loading' || normalizeSuggestionText(text) === null}
        onPress={() => void suggest()}
      />
      <Text
        variant="caption"
        tone={status === 'applied' ? 'positive' : status === 'idle' ? 'tertiary' : 'negative'}
        accessibilityLiveRegion="polite">
        {t(`entryForm.ai.status.${status}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
});
