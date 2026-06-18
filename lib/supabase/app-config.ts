import { isSupabaseEnabled } from './config';
import { getSupabaseClient } from './client';

export type AppConfig = {
  minimumSupportedVersion: string;
  latestVersion: string;
  forceUpdateRequired: boolean;
  maintenanceMode: boolean;
  updateMessage: string | null;
  storeUrlIos: string | null;
  storeUrlAndroid: string | null;
};

const DEFAULT_CONFIG: AppConfig = {
  minimumSupportedVersion: '1.0.0',
  latestVersion: '1.0.0',
  forceUpdateRequired: false,
  maintenanceMode: false,
  updateMessage: null,
  storeUrlIos: null,
  storeUrlAndroid: null,
};

type AppConfigRow = {
  minimum_supported_version: string;
  latest_version: string;
  force_update_required: boolean;
  maintenance_mode: boolean;
  update_message: string | null;
  store_url_ios: string | null;
  store_url_android: string | null;
};

function mapRow(row: AppConfigRow): AppConfig {
  return {
    minimumSupportedVersion: row.minimum_supported_version,
    latestVersion: row.latest_version,
    forceUpdateRequired: row.force_update_required,
    maintenanceMode: row.maintenance_mode,
    updateMessage: row.update_message,
    storeUrlIos: row.store_url_ios,
    storeUrlAndroid: row.store_url_android,
  };
}

export async function fetchAppConfig(): Promise<AppConfig> {
  if (!isSupabaseEnabled()) {
    return DEFAULT_CONFIG;
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('app_config' as 'profiles')
      .select(
        'minimum_supported_version, latest_version, force_update_required, maintenance_mode, update_message, store_url_ios, store_url_android',
      )
      .eq('id', 'global')
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_CONFIG;
    }

    return mapRow(data as unknown as AppConfigRow);
  } catch {
    return DEFAULT_CONFIG;
  }
}
