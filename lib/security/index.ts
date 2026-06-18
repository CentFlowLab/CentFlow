export {
  validatePassword,
  scorePasswordStrength,
  isPasswordStrongEnough,
  PASSWORD_POLICY_HINT,
  type PasswordStrength,
  type PasswordValidationResult,
  type PasswordContext,
} from './passwordPolicy';

export { secureStorage, SECURE_KEYS, type SecureKey } from './secureStorage';

export {
  subscribeToAuthSessionChanges,
  notifySessionExpired,
  setSessionExpiredHandler,
  getSessionExpiredMessage,
  secureLogoutCleanup,
  type SessionExpiredReason,
} from './sessionSecurity';

export { checkAppIntegrity, type IntegrityReport, type IntegrityRiskLevel } from './appIntegrity';

export {
  compareVersions,
  evaluateVersionGuard,
  getCurrentAppVersion,
  type VersionGuardResult,
} from './versionGuard';

export {
  logSecurityEvent,
  logSecurityError,
  getSafeSecurityMessage,
} from './securityLogger';

export {
  authenticateWithBiometrics,
  getBiometricSupport,
  isBiometricLockEnabled,
  setBiometricLockEnabled,
  type BiometricSupport,
} from './biometricLock';

export {
  prepareOpenBankingConsentStore,
  type OpenBankingConsentRecord,
} from './openBankingPrep';
