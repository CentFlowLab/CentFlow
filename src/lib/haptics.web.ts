/** Web e Windows (Electron): sem vibração. A mesma API, sem efeito. */
const none = () => undefined;

export const haptics = {
  selection: none,
  impactLight: none,
  impactMedium: none,
  success: none,
  warning: none,
  error: none,
};

export type HapticsApi = typeof haptics;

export const hapticsAvailable = false;
