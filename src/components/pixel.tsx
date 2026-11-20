/**
 * Pixel-art UI primitives: text, notched-corner boxes, buttons, sprites, and icons.
 */
import { ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';

import { C, Fonts, PX } from '@/constants/theme';
import { buildIcon, IconName, PALETTE } from '@/lib/sprites';

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

type Variant = 'title' | 'heading' | 'label' | 'body' | 'bodyBold' | 'small' | 'tiny';

export function PText({
  variant = 'body',
  color,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  return <Text style={[textStyles.base, textStyles[variant], color ? { color } : null, style]} {...rest} />;
}

const textStyles = StyleSheet.create({
  base: { color: C.ink },
  title: { fontFamily: Fonts.displayBold, fontSize: 24, lineHeight: 30 },
  heading: { fontFamily: Fonts.displayBold, fontSize: 14, lineHeight: 20, letterSpacing: 0.5 },
  label: { fontFamily: Fonts.display, fontSize: 11, lineHeight: 15, letterSpacing: 0.5 },
  body: { fontFamily: Fonts.body, fontSize: 20, lineHeight: 24 },
  bodyBold: { fontFamily: Fonts.body, fontSize: 21, lineHeight: 24 },
  small: { fontFamily: Fonts.body, fontSize: 17, lineHeight: 21 },
  tiny: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 18 },
});

// ---------------------------------------------------------------------------
// Boxes
// ---------------------------------------------------------------------------

/** A rectangle with 1-"pixel" notched corners, which gives the rounded pixel-art look. */
function Notched({ color, unit, style }: { color: string; unit: number; style: ViewStyle }) {
  return (
    <View style={[styles.abs, { pointerEvents: 'none' }, style]}>
      <View style={[styles.abs, { left: 0, right: 0, top: unit, bottom: unit, backgroundColor: color }]} />
      <View style={[styles.abs, { left: unit, right: unit, top: 0, bottom: 0, backgroundColor: color }]} />
    </View>
  );
}

export interface PixelBoxProps {
  children?: ReactNode;
  bg?: string;
  border?: string;
  /** drop-shadow color; pass null for none */
  shadow?: string | null;
  unit?: number;
  pressed?: boolean;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
}

export function PixelBox({
  children,
  bg = C.panel,
  border = C.ink,
  shadow = C.shadow,
  unit = PX,
  pressed = false,
  style,
  innerStyle,
}: PixelBoxProps) {
  const pad = shadow ? unit : 0;
  return (
    <View style={[{ paddingRight: pad, paddingBottom: pad }, style]}>
      {shadow && !pressed ? <Notched color={shadow} unit={unit} style={{ left: unit, top: unit, right: 0, bottom: 0 }} /> : null}
      <View style={[styles.grow, pressed && shadow ? { transform: [{ translateX: unit }, { translateY: unit }] } : null]}>
        <Notched color={border} unit={unit} style={{ left: 0, top: 0, right: 0, bottom: 0 }} />
        <View style={[styles.grow, { margin: unit, backgroundColor: bg }, innerStyle]}>{children}</View>
      </View>
    </View>
  );
}

export function PixelButton({
  children,
  bg = C.panel,
  border = C.ink,
  shadow = C.shadow,
  unit = PX,
  style,
  innerStyle,
  disabled,
  ...rest
}: Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode;
  bg?: string;
  border?: string;
  shadow?: string | null;
  unit?: number;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} style={[disabled && { opacity: 0.5 }, style]} {...rest}>
      {({ pressed }) => (
        <PixelBox bg={bg} border={border} shadow={shadow} unit={unit} pressed={pressed} innerStyle={[styles.buttonInner, innerStyle]}>
          {children}
        </PixelBox>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Sprites
// ---------------------------------------------------------------------------

/** Run-length encode a row so each horizontal run of one color is a single View. */
function runs(row: string): [string, number][] {
  const out: [string, number][] = [];
  for (const ch of row) {
    const last = out[out.length - 1];
    if (last && last[0] === ch) last[1]++;
    else out.push([ch, 1]);
  }
  return out;
}

export function PixelSprite({ rows, palette, size }: { rows: string[]; palette: Record<string, string>; size: number }) {
  return (
    <View style={{ width: rows[0].length * size, height: rows.length * size }}>
      {rows.map((row, y) => (
        <View key={y} style={styles.row}>
          {runs(row).map(([ch, n], i) => (
            <View key={i} style={{ width: n * size, height: size, backgroundColor: ch === '.' ? undefined : palette[ch] }} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function PixelIcon({ name, size = 3 }: { name: IconName; size?: number }) {
  return <PixelSprite rows={buildIcon(name)} palette={PALETTE} size={size} />;
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  grow: { flexGrow: 1 },
  row: { flexDirection: 'row' },
  buttonInner: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
