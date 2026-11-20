import { Jersey15_400Regular } from '@expo-google-fonts/jersey-15';
import { Silkscreen_400Regular, Silkscreen_700Bold } from '@expo-google-fonts/silkscreen';
import { useFonts } from 'expo-font';
import { ErrorBoundaryProps, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { PixelBox, PixelButton, PText } from '@/components/pixel';
import { Toast } from '@/components/toast';
import { C } from '@/constants/theme';
import { LunarProvider, useLunar } from '@/state/lunar';
import { ToastProvider } from '@/state/toast';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Jersey15_400Regular,
    Silkscreen_400Regular,
    Silkscreen_700Bold,
  });

  return (
    <ToastProvider>
      <LunarProvider>
        <App fontsReady={fontsLoaded || !!fontError} />
      </LunarProvider>
    </ToastProvider>
  );
}

function App({ fontsReady }: { fontsReady: boolean }) {
  const { ready } = useLunar();
  const segments = useSegments();
  const show = fontsReady && ready;
  // The Customize sheet shows its own toast, since on iOS the native modal covers this one.
  const customizeOpen = segments[0] === 'customize';

  // Keep the splash screen up until fonts and saved data are both loaded.
  useEffect(() => {
    if (show) SplashScreen.hideAsync();
  }, [show]);

  if (!show) return null;

  return (
    <View style={styles.fill}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="customize" options={{ presentation: 'modal' }} />
      </Stack>
      {customizeOpen ? null : <Toast />}
    </View>
  );
}

/**
 * Shown instead of a blank or red screen if anything in the app crashes while rendering.
 * Saved data isn't touched: nothing is written while this screen is up.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    // The crash may have happened before the splash screen was hidden.
    SplashScreen.hideAsync().catch(() => {});
    console.error('Lunar Pal crashed', error);
  }, [error]);

  return (
    <View style={[styles.fill, styles.crash]}>
      <PixelBox innerStyle={styles.crashBox}>
        <PText variant="title">Oops!</PText>
        <PText variant="body">
          Something went wrong on this screen. Your logs are still saved on this device.
        </PText>
        <PixelButton bg={C.amber} onPress={retry} accessibilityLabel="Try again">
          <PText variant="heading">Try again</PText>
        </PixelButton>
      </PixelBox>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  crash: { justifyContent: 'center', padding: 24 },
  crashBox: { padding: 20, gap: 14 },
});
