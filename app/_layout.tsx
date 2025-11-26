import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ServicesProvider } from '@/contexts/ServicesContext';
import { AnnotationsProvider } from '@/contexts/AnnotationsContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import { initCache } from '@/lib/cache';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Initialize cache on app startup
  useEffect(() => {
    initCache().catch((error) => {
      console.error('Failed to initialize cache:', error);
    });
  }, []);

  return (
    <PreferencesProvider>
      <AnnotationsProvider>
        <ServicesProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </ServicesProvider>
      </AnnotationsProvider>
    </PreferencesProvider>
  );
}
