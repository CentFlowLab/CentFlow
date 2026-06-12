import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader, SegmentedControl } from '@/components/layout';
import { EmptyState, ScreenContainer } from '@/components/ui';
import { colors } from '@/lib/theme';

type AtivosTab = 'objetivos' | 'garantias' | 'inventario';

const SEGMENTS = [
  { key: 'objetivos' as const, label: 'Objetivos' },
  { key: 'garantias' as const, label: 'Garantias' },
  { key: 'inventario' as const, label: 'Inventário' },
];

const EMPTY_CONFIG: Record<
  AtivosTab,
  {
    icon: SymbolViewProps['name'];
    title: string;
    description: string;
    actionLabel: string;
  }
> = {
  objetivos: {
    icon: { ios: 'target', android: 'flag', web: 'flag' },
    title: 'Define o teu primeiro objetivo',
    description:
      'Cria metas de poupança — viagem, fundo de emergência ou um projeto — e acompanha o progresso.',
    actionLabel: 'Criar objetivo',
  },
  garantias: {
    icon: { ios: 'shield.fill', android: 'verified_user', web: 'verified_user' },
    title: 'Guarda as tuas garantias',
    description:
      'Regista produtos com data de validade da garantia e recebe alertas antes de expirarem.',
    actionLabel: 'Adicionar garantia',
  },
  inventario: {
    icon: { ios: 'shippingbox.fill', android: 'inventory', web: 'inventory' },
    title: 'Inventaria os teus bens',
    description:
      'Mantém registo do valor dos teus ativos — eletrónica, joias, equipamento — num só sítio.',
    actionLabel: 'Adicionar item',
  },
};

export default function AtivosScreen() {
  const [activeTab, setActiveTab] = useState<AtivosTab>('objetivos');
  const config = EMPTY_CONFIG[activeTab];

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Ativos"
        subtitle="Objetivos, garantias e inventário"
      />

      <ScreenContainer>
        <View style={styles.segmentWrapper}>
          <SegmentedControl
            segments={SEGMENTS}
            value={activeTab}
            onChange={setActiveTab}
          />
        </View>

        <EmptyState
          icon={
            <SymbolView
              name={config.icon}
              tintColor={colors.primary}
              size={32}
            />
          }
          title={config.title}
          description={config.description}
          actionLabel={config.actionLabel}
          onAction={() => {}}
        />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  segmentWrapper: {
    marginBottom: 24,
  },
});
