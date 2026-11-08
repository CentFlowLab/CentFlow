import { useTranslation } from 'react-i18next';

import { getNavItem, type PlannedModule } from '@/features/navigation/nav-items';
import { Badge, Card, EmptyState, Screen } from '@/ui/components';

/**
 * Ecrã de um módulo ainda não implementado. Diz claramente "Em breve"
 * em vez de mostrar dados ou controlos fictícios.
 */
export function ModulePlaceholderScreen({ module }: { module: PlannedModule }) {
  const { t } = useTranslation();
  const item = getNavItem(module);
  const title = t(`nav.${module}`);

  return (
    <Screen title={title}>
      <Card padding="none">
        <EmptyState icon={item.icon} title={title} description={t(`modules.${module}.description`)}>
          <Badge label={t('common.comingSoon')} tone="accent" />
        </EmptyState>
      </Card>
    </Screen>
  );
}
