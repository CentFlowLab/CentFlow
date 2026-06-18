import { useEffect, useState } from 'react';

import { ForceUpdateScreen } from '@/components/version/ForceUpdateScreen';
import { useAuth } from '@/lib/auth';
import { runAllDataMigrations } from '@/lib/migrations';
import {
  checkAppIntegrity,
  evaluateVersionGuard,
  logSecurityEvent,
  type VersionGuardResult,
} from '@/lib/security';
import { View } from 'react-native';

import { checkForUpdates, reloadIfUpdatePending, setUpdateStatus } from '@/lib/updates';
import { colors } from '@/lib/theme';

type AppSecurityBootstrapProps = {
  children: React.ReactNode;
};

export function AppSecurityBootstrap({ children }: AppSecurityBootstrapProps) {
  const { user } = useAuth();
  const [guard, setGuard] = useState<VersionGuardResult | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function bootstrapSecurity() {
      const integrity = checkAppIntegrity();
      if (integrity.shouldRestrict) {
        logSecurityEvent('integrity_restrict', { reasons: integrity.reasons }, 'error');
      }

      const versionGuard = await evaluateVersionGuard();
      if (!mounted) return;
      setGuard(versionGuard);

      setUpdateStatus('checking');
      const updateResult = await checkForUpdates();
      if (updateResult.isAvailable) {
        setUpdateStatus('available');
        void reloadIfUpdatePending();
      } else {
        setUpdateStatus('idle');
      }

      setReady(true);
    }

    void bootstrapSecurity();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    void runAllDataMigrations(user.id);
  }, [user?.id]);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (guard?.forceUpdate) {
    return (
      <ForceUpdateScreen
        message={
          guard.config.updateMessage ??
          (guard.maintenanceMode
            ? 'Estamos a melhorar a CentFlow. Volta dentro de momentos.'
            : undefined)
        }
        storeUrl={guard.storeUrl}
        maintenanceMode={guard.maintenanceMode}
      />
    );
  }

  return children;
}
