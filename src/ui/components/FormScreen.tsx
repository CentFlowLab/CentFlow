import {
  useCallback,
  useId,
  useMemo,
  useRef,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { useTranslation } from 'react-i18next';
import { InputAccessoryView, Keyboard, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useTheme } from '../theme';
import { Button } from './Button';
import {
  FormKeyboardContext,
  useKeyboardVisible,
  type FormKeyboard,
  type ViewHandle,
} from './formKeyboard';
import { IconButton } from './IconButton';
import { Text } from './Text';

/** Ação principal mostrada na barra do teclado (ex.: Guardar), igual ao botão do rodapé. */
export type KeyboardAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

type Props = {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  /** Ações fixas no fundo (ex.: Guardar). Escondem-se com o teclado aberto (ADR-080). */
  footer?: ReactNode;
  headerRight?: ReactNode;
  /** `wide`: fichas e formulários longos usam a largura do desktop (o telemóvel não muda). */
  width?: 'default' | 'wide';
  /** iPhone: a ação principal também aparece na barra colada ao teclado, ao lado de Concluído. */
  keyboardAction?: KeyboardAction;
};

const FORM_MAX_WIDTH = 560;
const WIDE_MAX_WIDTH = 1040;

/**
 * Estrutura de ecrãs de formulário apresentados como modal (ADR-080). Com o teclado aberto o
 * rodapé esconde-se (não fica cortado em cima do teclado); no iPhone uma barra nativa colada ao
 * teclado traz "Concluído" e, se houver, a ação principal. O deslocamento por causa do teclado é do
 * sistema: no iPhone pelo `automaticallyAdjustKeyboardInsets` (mede o teclado real dentro da
 * folha), no Android pelo `adjustResize`.
 */
export function FormScreen({
  title,
  closeLabel,
  onClose,
  children,
  footer,
  headerRight,
  width = 'default',
  keyboardAction,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const maxWidth = { maxWidth: width === 'wide' ? WIDE_MAX_WIDTH : FORM_MAX_WIDTH };
  const insets = useSafeAreaInsets();
  // No iOS o modal abre como folha (page sheet), já abaixo da barra de estado: somar a margem de
  // segurança do topo deixava o "×" e o título a meio da folha.
  const topInset = Platform.OS === 'ios' ? 0 : insets.top;
  const keyboardVisible = useKeyboardVisible();
  const accessoryId = `form-keyboard-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const content = useRef<ViewHandle>(null);
  const listeners = useRef(new Set<() => void>());

  const scrollIntoView = useCallback((target: RefObject<ViewHandle | null>) => {
    const node = target.current;
    const container = content.current;
    if (!node || !container) return;
    // Depois do layout (o painel acabou de abrir): mede em relação ao conteúdo do formulário.
    requestAnimationFrame(() => {
      node.measureLayout(
        container,
        (_x: number, y: number) =>
          scroll.current?.scrollTo({ y: Math.max(0, y - spacing.lg), animated: true }),
        () => undefined,
      );
    });
  }, []);

  const keyboard = useMemo<FormKeyboard>(
    () => ({
      accessoryId: Platform.OS === 'ios' ? accessoryId : null,
      scrollIntoView,
      onFieldFocus: () => listeners.current.forEach((listener) => listener()),
      addFocusListener: (listener) => {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
      },
    }),
    [accessoryId, scrollIntoView],
  );

  const runKeyboardAction = () => {
    if (!keyboardAction) return;
    // Fecha primeiro: o rodapé volta e um erro de validação aparece lá, com o campo visível.
    Keyboard.dismiss();
    keyboardAction.onPress();
  };

  return (
    <FormKeyboardContext.Provider value={keyboard}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topInset + spacing.md }]}>
          <View style={[styles.headerInner, maxWidth]}>
            <IconButton
              icon="close"
              variant="filled"
              accessibilityLabel={closeLabel}
              onPress={onClose}
            />
            <Text variant="title3" numberOfLines={1} style={styles.title}>
              {title}
            </Text>
            <View style={styles.headerRight}>{headerRight}</View>
          </View>
        </View>
        <ScrollView
          ref={scroll}
          style={styles.root}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}>
          <View ref={content} collapsable={false} style={[styles.body, maxWidth]}>
            {children}
          </View>
        </ScrollView>
        {footer ? (
          // Escondido (não desmontado) com o teclado aberto: o estado do rodapé mantém-se.
          <View
            testID="form-footer"
            style={[
              styles.footer,
              {
                paddingBottom: insets.bottom + spacing.md,
                borderTopColor: colors.border,
                backgroundColor: colors.background,
              },
              keyboardVisible ? styles.hidden : null,
            ]}>
            <View style={[styles.footerInner, maxWidth]}>{footer}</View>
          </View>
        ) : null}
        {Platform.OS === 'ios' ? (
          <InputAccessoryView nativeID={accessoryId}>
            <View
              // Só existe para quem usa o ecrã com o teclado aberto.
              accessibilityElementsHidden={!keyboardVisible}
              importantForAccessibility={keyboardVisible ? 'auto' : 'no-hide-descendants'}
              style={[
                styles.accessory,
                { backgroundColor: colors.surface, borderTopColor: colors.border },
              ]}>
              <View style={[styles.accessoryInner, maxWidth]}>
                {keyboardAction ? (
                  <Button
                    label={keyboardAction.label}
                    disabled={keyboardAction.disabled}
                    loading={keyboardAction.loading}
                    onPress={runKeyboardAction}
                  />
                ) : (
                  <View />
                )}
                <Button
                  label={t('common.keyboardDone')}
                  variant="ghost"
                  onPress={() => Keyboard.dismiss()}
                />
              </View>
            </View>
          </InputAccessoryView>
        ) : null}
      </View>
    </FormKeyboardContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    alignSelf: 'center',
  },
  title: {
    flex: 1,
  },
  headerRight: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
  },
  body: {
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    alignSelf: 'center',
    gap: spacing.xl,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  footerInner: {
    width: '100%',
    maxWidth: FORM_MAX_WIDTH,
    alignSelf: 'center',
    gap: spacing.sm,
  },
  hidden: {
    display: 'none',
  },
  accessory: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  accessoryInner: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
