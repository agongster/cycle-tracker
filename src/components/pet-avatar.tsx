import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { PixelSprite } from '@/components/pixel';
import { buildPet, PET_H, PET_W, petPalette, PetLook } from '@/lib/sprites';

const FRAME_MS = 500;

/**
 * The pet, animated with a two-frame idle bob (plus steam, sparkles and blinking),
 * stepped like a retro game instead of smoothly tweened.
 */
export function PetAvatar({
  look,
  size = 5,
  animate = true,
  onPress,
  accessibilityLabel,
}: {
  look: PetLook;
  size?: number;
  animate?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!animate) return;
    const id = setInterval(() => setTick((t) => t + 1), FRAME_MS);
    return () => clearInterval(id);
  }, [animate]);

  const frame: 0 | 1 = tick % 2 === 0 ? 0 : 1;
  const canBlink = look.eyes === 'normal' || look.eyes === 'soft' || look.eyes === 'sparkle';
  const blinking = animate && canBlink && tick % 10 === 9;

  const rows = useMemo(
    () => buildPet({ ...look, eyes: blinking ? 'blink' : look.eyes }, frame),
    [look, blinking, frame],
  );
  const palette = useMemo(() => petPalette(look.color), [look.color]);

  const sprite = (
    <View style={{ width: PET_W * size, height: (PET_H + 1) * size, justifyContent: 'flex-end' }}>
      <View style={{ transform: [{ translateY: frame === 1 ? -size : 0 }] }}>
        <PixelSprite rows={rows} palette={palette} size={size} />
      </View>
    </View>
  );

  if (!onPress) return sprite;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      {sprite}
    </Pressable>
  );
}

/** Static, horizontally cropped pet for small picker tiles (no props, so the sides are empty). */
export function PetThumb({ look, size = 2 }: { look: PetLook; size?: number }) {
  const rows = useMemo(() => buildPet(look, 0).map((r) => r.slice(5, 35)), [look]);
  return <PixelSprite rows={rows} palette={petPalette(look.color)} size={size} />;
}
