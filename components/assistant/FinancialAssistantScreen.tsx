import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Button, Card, LoadingSpinner, Text, TextField } from '@/components/ui';
import { useFinancialAssistantChat } from '@/hooks/useFinancialAssistantChat';
import { ASSISTANT_FAQ } from '@/lib/domain/financial/assistant-chat';
import { colors, radius, spacing } from '@/lib/theme';

function MessageBubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  const isUser = role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      <Card
        variant={isUser ? 'elevated' : 'outlined'}
        style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text variant="body" color={isUser ? 'textPrimary' : 'textSecondary'}>
          {content}
        </Text>
      </Card>
    </View>
  );
}

export function FinancialAssistantScreen() {
  const { messages, sendMessage, isSending, isReady, error, resetConversation } =
    useFinancialAssistantChat();
  const [draft, setDraft] = useState('');

  const showFaq = messages.length === 0;

  async function handleSend(text?: string) {
    const message = (text ?? draft).trim();
    if (!message || isSending) return;
    setDraft('');
    await sendMessage(message);
  }

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <LoadingSpinner message="A preparar dados financeiros..." />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}>
      <ScrollView contentContainerStyle={styles.messages} keyboardShouldPersistTaps="handled">
        <Card variant="outlined" style={styles.disclaimer}>
          <Text variant="caption" color="textMuted">
            Respostas baseadas nos teus dados reais — a IA só interpreta e formata, nunca inventa
            números.
          </Text>
        </Card>

        {showFaq ? (
          <View style={styles.faq}>
            <Text variant="label">Perguntas frequentes</Text>
            {ASSISTANT_FAQ.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => void handleSend(item.message)}
                style={styles.faqChip}>
                <Text variant="caption" color="textSecondary">
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {messages.map((message) => (
          <MessageBubble key={message.id} role={message.role} content={message.content} />
        ))}

        {isSending ? (
          <Text variant="caption" color="textMuted" style={styles.typing}>
            A analisar com o motor financeiro...
          </Text>
        ) : null}

        {error ? (
          <Text variant="caption" color="danger">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.composer}>
        {messages.length > 0 ? (
          <Pressable onPress={resetConversation} hitSlop={8} style={styles.newChat}>
            <SymbolView
              name={{ ios: 'plus.message', android: 'add_comment', web: 'add_comment' }}
              tintColor={colors.textMuted}
              size={18}
            />
            <Text variant="caption" color="textMuted">
              Nova conversa
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.inputRow}>
          <TextField
            label="Mensagem"
            value={draft}
            onChangeText={setDraft}
            placeholder="Pergunta sobre o teu orçamento..."
          />
          <Button
            label="Enviar"
            onPress={() => void handleSend()}
            loading={isSending}
            disabled={isSending || !draft.trim()}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  messages: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  disclaimer: {
    marginBottom: spacing.xs,
  },
  faq: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  faqChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  bubbleRow: {
    alignItems: 'flex-start',
  },
  bubbleRowUser: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '88%',
  },
  bubbleUser: {
    backgroundColor: colors.primaryMuted,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface,
  },
  typing: {
    marginTop: spacing.xs,
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  newChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
  },
});
