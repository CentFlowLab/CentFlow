import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui';

type AnalysisSectionEmptyProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

export function AnalysisSectionEmpty({
  icon,
  title,
  description,
}: AnalysisSectionEmptyProps) {
  return (
    <View style={styles.wrap}>
      <EmptyState
        icon={icon}
        title={title}
        description={description}
        compact
        inCard
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
});
