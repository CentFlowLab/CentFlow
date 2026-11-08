import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { useDataQuery, type Repositories } from '@/data';
import { EmptyState, FormScreen } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { CategoryForm } from './CategoryForm';

const loadCategories = (repositories: Repositories) => repositories.categories.listWithUsage();

/** `/category/new` e `/category/[id]` */
export function CategoryFormScreen({ id }: { id?: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const query = useDataQuery(loadCategories);
  const title = t(id ? 'categoryForm.editTitle' : 'categoryForm.newTitle');

  if (!query.data) {
    return (
      <FormScreen
        title={title}
        closeLabel={t('common.close')}
        onClose={() => closeModal('/categories')}>
        <ActivityIndicator color={colors.primary} />
      </FormScreen>
    );
  }

  if (!id) return <CategoryForm others={query.data} />;

  const category = query.data.find((candidate) => candidate.id === id);
  if (!category) {
    return (
      <FormScreen
        title={title}
        closeLabel={t('common.close')}
        onClose={() => closeModal('/categories')}>
        <EmptyState icon="search-outline" title={t('categoryForm.notFoundTitle')} />
      </FormScreen>
    );
  }
  return <CategoryForm key={category.id} category={category} others={query.data} />;
}
