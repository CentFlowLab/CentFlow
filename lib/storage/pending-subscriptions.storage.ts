import * as SecureStore from 'expo-secure-store';

const key = (userId: string) => `centflow:dismissed-sub-detections:${userId}`;

export async function loadDismissedSubscriptionDetections(userId: string): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(key(userId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function dismissSubscriptionDetection(
  userId: string,
  detectionId: string,
): Promise<string[]> {
  const current = await loadDismissedSubscriptionDetections(userId);
  if (current.includes(detectionId)) return current;

  const next = [...current, detectionId];
  await SecureStore.setItemAsync(key(userId), JSON.stringify(next));
  return next;
}
