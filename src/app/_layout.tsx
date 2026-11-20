import { Jersey15_400Regular } from '@expo-google-fonts/jersey-15';
import { Silkscreen_400Regular, Silkscreen_700Bold } from '@expo-google-fonts/silkscreen';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Toast } from '@/components/toast';
import { C } from '@/constants/theme';
import { LunarProvider, useLunar } from '@/state/lunar';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Jersey15_400Regular,
    Silkscreen_400Regular,
    Silkscreen_700Bold,
  });

  return (
    <LunarProvider>
      <App fontsReady={fontsLoaded || !!fontError} />
    </LunarProvider>
  );
}

function App({ fontsReady }: { fontsReady: boolean }) {
  const { ready } = useLunar();
  const show = fontsReady && ready;

  // Keep the splash screen up until fonts and saved data are both loaded.
  useEffect(() => {
    if (show) SplashScreen.hideAsync();
  }, [show]);

  if (!show) return null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="customize" options={{ presentation: 'modal' }} />
      </Stack>
      <Toast />
    </View>
  );
}
