import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let handlerConfigured = false;

function ensureHandlerConfigured(): void {
  if (handlerConfigured || Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerConfigured = true;
}

export async function ensureLocalNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  ensureHandlerConfigured();

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function presentImmediateLocalNotification(
  title: string,
  body: string,
): Promise<void> {
  if (Platform.OS === 'web') return;

  ensureHandlerConfigured();

  await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: null,
  });
}
