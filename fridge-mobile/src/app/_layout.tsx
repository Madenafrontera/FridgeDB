import '@/global.css';

import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { refreshFridgeNotifications } from '@/services/notifications';

export default function RootLayout() {
  useEffect(() => {
    void refreshFridgeNotifications();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-product" options={{ headerShown: false }} />
      <Stack.Screen name="edit-product" options={{ headerShown: false }} />
      <Stack.Screen name="settings-about" options={{ headerShown: false }} />
    </Stack>
  );
}
