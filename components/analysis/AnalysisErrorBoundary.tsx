import React from 'react';
import { StyleSheet } from 'react-native';

import { Card, Text } from '@/components/ui';
import { logAppError } from '@/lib/diagnostics';
import { spacing } from '@/lib/theme';

type AnalysisErrorBoundaryProps = {
  children: React.ReactNode;
  label?: string;
};

type AnalysisErrorBoundaryState = {
  error: Error | null;
};

/** Impede que um erro numa secção de Análises derrube a app inteira. */
export class AnalysisErrorBoundary extends React.Component<
  AnalysisErrorBoundaryProps,
  AnalysisErrorBoundaryState
> {
  state: AnalysisErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AnalysisErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    logAppError('analysis-section', error);
    console.error('[Analysis]', error);
  }

  render() {
    if (this.state.error) {
      return (
        <Card variant="outlined" style={styles.fallback}>
          <Text variant="label" color="textMuted">
            {this.props.label ?? 'Análise'}
          </Text>
          <Text variant="caption" color="textSecondary">
            Não foi possível carregar esta secção.
          </Text>
        </Card>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
});
