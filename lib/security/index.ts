export {
  subscribeToAuthSessionChanges,
  getSessionExpiredMessage,
} from './sessionSecurity';

export { checkAppIntegrity } from './appIntegrity';

export {
  evaluateVersionGuard,
  type VersionGuardResult,
} from './versionGuard';

export {
  logSecurityEvent,
  logSecurityError,
} from './securityLogger';

export {
  authenticateWithBiometrics,
  getBiometricSupport,
  setBiometricLockEnabled,
} from './biometricLock';
