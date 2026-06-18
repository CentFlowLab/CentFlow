import { Platform } from 'react-native';

import { logSecurityEvent } from './securityLogger';

export type IntegrityRiskLevel = 'none' | 'low' | 'medium' | 'high';

export type IntegrityReport = {
  level: IntegrityRiskLevel;
  reasons: string[];
  shouldRestrict: boolean;
};

/**
 * Verificações básicas de integridade — não substituem auditoria nativa completa.
 * Em __DEV__ nunca restringe.
 */
export function checkAppIntegrity(): IntegrityReport {
  const reasons: string[] = [];

  if (__DEV__) {
    return { level: 'none', reasons: [], shouldRestrict: false };
  }

  if (Platform.OS === 'web') {
    reasons.push('web_runtime');
  }

  // Heurística conservadora: apenas regista, não bloqueia por defeito.
  const level: IntegrityRiskLevel = reasons.length >= 2 ? 'medium' : reasons.length === 1 ? 'low' : 'none';

  if (reasons.length > 0) {
    logSecurityEvent('integrity_check', { level, reasons }, level === 'medium' ? 'warn' : 'info');
  }

  return {
    level,
    reasons,
    shouldRestrict: false,
  };
}
