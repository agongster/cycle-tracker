import { TabList, Tabs, TabSlot, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PixelBox, PixelIcon, PText } from '@/components/pixel';
import { C } from '@/constants/theme';
import type { IconName } from '@/lib/sprites';

/**
 * Custom pixel-art tab bar built on Expo Router's headless tabs, so it looks
 * the same on iOS, Android and web.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs style={styles.fill}>
      <TabSlot style={styles.fill} />
      <TabList style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TabTrigger name="index" href="/" asChild>
          <TabButton icon="home" label="Home" />
        </TabTrigger>
        <TabTrigger name="calendar" href="/calendar" asChild>
          <TabButton icon="calendar" label="Calendar" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

function TabButton({ icon, label, isFocused, ...props }: Omit<TabTriggerSlotProps, 'ref'> & { icon: IconName; label: string }) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      style={styles.tab}>
      <PixelBox
        bg={isFocused ? C.amber : C.panelAlt}
        shadow={isFocused ? null : C.shadow}
        innerStyle={styles.tabInner}>
        <PixelIcon name={icon} size={2} />
        <PText variant="label">{label}</PText>
      </PixelBox>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: C.bgDeep,
    borderTopWidth: 3,
    borderTopColor: C.ink,
    justifyContent: 'center',
  },
  tab: { flex: 1, maxWidth: 240 },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
});
