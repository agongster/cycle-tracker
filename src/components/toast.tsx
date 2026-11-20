import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PixelBox, PixelIcon, PText } from '@/components/pixel';
import { C } from '@/constants/theme';
import { useToastMessage } from '@/state/toast';

/**
 * Small pop-up for rewards ("+5 care points!") that floats above the screen it's rendered in.
 * The root layout renders one, and the Customize sheet renders its own, because on iOS a
 * native modal covers anything drawn by the root.
 */
export function Toast({ top }: { top?: number }) {
  const toast = useToastMessage();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <View key={toast.id} style={[styles.wrap, { top: top ?? insets.top + 8 }]} accessibilityLiveRegion="polite">
      <PixelBox bg={C.cream} innerStyle={styles.inner}>
        <PixelIcon name="star" size={2} />
        <PText variant="small" style={styles.text}>
          {toast.message}
        </PText>
      </PixelBox>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', pointerEvents: 'none' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  text: { flexShrink: 1 },
});
