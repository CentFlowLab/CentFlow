export type SupportedCurrency = 'EUR' | 'USD' | 'GBP';

export type UserRegion = 'portugal' | 'brasil' | 'espanha' | 'outro';

export type ThemeId = 'dark-premium' | 'dark-classic';

export type UserPreferences = {
  pushNotifications: boolean;
  warrantyAlerts: boolean;
  budgetAlerts: boolean;
  weeklyDigest: boolean;
  region: UserRegion;
  themeId: ThemeId;
  biometricsEnabled: boolean;
};

export type UpdateProfileInput = {
  name: string;
  email?: string;
};

export type UpdateProfileResult = {
  name: string;
  email: string;
};

export type ChangePasswordInput = {
  newPassword: string;
};

export type ActiveSessionInfo = {
  count: number;
  currentDeviceLabel: string;
};
