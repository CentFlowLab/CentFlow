import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { fetchAppConfig, type AppConfig } from '@/lib/supabase/app-config';

import { logSecurityEvent } from './securityLogger';

export type VersionGuardResult = {
  currentVersion: string;
  config: AppConfig;
  forceUpdate: boolean;
  maintenanceMode: boolean;
  updateRecommended: boolean;
  storeUrl: string | null;
};

function parseVersionParts(version: string): number[] {
  return version
    .split('.')
    .map((part) => parseInt(part.replace(/[^0-9].*$/, ''), 10))
    .map((value) => (Number.isFinite(value) ? value : 0));
}

export function compareVersions(current: string, target: string): -1 | 0 | 1 {
  const a = parseVersionParts(current);
  const b = parseVersionParts(target);
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] ?? 0) - (b[index] ?? 0);
    if (diff < 0) return -1;
    if (diff > 0) return 1;
  }

  return 0;
}

export function getCurrentAppVersion(): string {
  return (
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    '1.0.0'
  );
}

export async function evaluateVersionGuard(): Promise<VersionGuardResult> {
  const currentVersion = getCurrentAppVersion();
  const config = await fetchAppConfig();

  const belowMinimum = compareVersions(currentVersion, config.minimumSupportedVersion) < 0;
  const belowLatest = compareVersions(currentVersion, config.latestVersion) < 0;

  const forceUpdate = config.maintenanceMode || config.forceUpdateRequired || belowMinimum;
  const updateRecommended = !forceUpdate && belowLatest;

  if (forceUpdate) {
    logSecurityEvent(
      'force_update_required',
      {
        currentVersion,
        minimumSupportedVersion: config.minimumSupportedVersion,
        maintenanceMode: config.maintenanceMode,
      },
      'warn',
    );
  }

  const storeUrl =
    Platform.OS === 'ios'
      ? config.storeUrlIos
      : Platform.OS === 'android'
        ? config.storeUrlAndroid
        : null;

  return {
    currentVersion,
    config,
    forceUpdate,
    maintenanceMode: config.maintenanceMode,
    updateRecommended,
    storeUrl,
  };
}
