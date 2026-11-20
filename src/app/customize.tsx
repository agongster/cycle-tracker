import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PetAvatar, PetThumb } from '@/components/pet-avatar';
import { PixelBox, PixelButton, PixelIcon, PText } from '@/components/pixel';
import { C, Fonts, MaxContentWidth, PHASE_STAGE } from '@/constants/theme';
import { petAppearance } from '@/lib/insights';
import { FUR, FurColor, PetLook, Species } from '@/lib/sprites';
import { COSTUMES, useLunar } from '@/state/lunar';
import { useCycle } from '@/state/use-cycle';

const SPECIES: { id: Species; label: string }[] = [
  { id: 'cat', label: 'Cat' },
  { id: 'bunny', label: 'Bunny' },
  { id: 'bear', label: 'Bear' },
  { id: 'pup', label: 'Pup' },
];

const COLORS: { id: FurColor; label: string }[] = [
  { id: 'honey', label: 'Honey' },
  { id: 'cocoa', label: 'Cocoa' },
  { id: 'cream', label: 'Cream' },
  { id: 'rose', label: 'Rose' },
  { id: 'lavender', label: 'Lavender' },
  { id: 'charcoal', label: 'Charcoal' },
];

export default function CustomizeScreen() {
  const insets = useSafeAreaInsets();
  const { state, updatePet, chooseCostume, loadSampleData, eraseAll } = useLunar();
  const { status, todayLog } = useCycle();
  const { pet } = state;
  const [confirm, setConfirm] = useState<null | 'sample' | 'erase'>(null);

  const look: PetLook = useMemo(
    () => ({ species: pet.species, color: pet.color, costume: pet.costume, ...petAppearance(status, todayLog?.mood) }),
    [pet.species, pet.color, pet.costume, status, todayLog?.mood],
  );
  const neutral = { eyes: 'normal', outfit: 'none', prop: 'none' } as const;

  // iOS shows this as a sheet below the status bar; other platforms need the inset.
  const topPad = Platform.OS === 'ios' ? 16 : insets.top + 12;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: topPad, paddingBottom: insets.bottom + 32 }]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.column}>
        <View style={styles.header}>
          <PText variant="title" style={styles.flex}>
            Your pal
          </PText>
          <PixelButton bg={C.amber} onPress={() => router.back()} accessibilityLabel="Done">
            <PText variant="heading">Done</PText>
          </PixelButton>
        </View>

        <PixelBox bg={PHASE_STAGE[status.phase].sky} innerStyle={styles.preview}>
          <PetAvatar look={look} size={5} />
          <View style={styles.pointsRow}>
            <PixelIcon name="star" size={2} />
            <PText variant="label">{state.points} care points to spend</PText>
          </View>
        </PixelBox>

        {/* Name */}
        <Field title="Name">
          <PixelBox bg={C.white} shadow={null} innerStyle={styles.inputBox}>
            <TextInput
              value={pet.name}
              onChangeText={(name) => updatePet({ name })}
              onBlur={() => updatePet({ name: pet.name.trim() || 'Mochi' })}
              maxLength={14}
              placeholder="Mochi"
              placeholderTextColor={C.inkFaint}
              style={styles.input}
              accessibilityLabel="Pet name"
              returnKeyType="done"
            />
          </PixelBox>
        </Field>

        {/* Species */}
        <Field title="Species">
          <View style={styles.row}>
            {SPECIES.map((s) => (
              <Tile key={s.id} selected={pet.species === s.id} onPress={() => updatePet({ species: s.id })} label={s.label}>
                <PetThumb look={{ ...neutral, species: s.id, color: pet.color, costume: 'none' }} size={2} />
              </Tile>
            ))}
          </View>
        </Field>

        {/* Color */}
        <Field title="Color">
          <View style={styles.row}>
            {COLORS.map((c) => {
              const selected = pet.color === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => updatePet({ color: c.id })}
                  accessibilityRole="button"
                  accessibilityLabel={c.label}
                  accessibilityState={{ selected }}
                  style={styles.flex}>
                  <PixelBox
                    bg={FUR[c.id].B}
                    border={C.ink}
                    shadow={selected ? C.amberDeep : C.shadow}
                    innerStyle={[styles.swatch, selected && styles.swatchSelected]}>
                    {selected ? <PixelIcon name="check" size={2} /> : null}
                  </PixelBox>
                </Pressable>
              );
            })}
          </View>
        </Field>

        {/* Costumes */}
        <Field title="Costume" note="Earn care points by logging and self-care">
          <View style={styles.costumeGrid}>
            {COSTUMES.map((c) => {
              const owned = state.owned.includes(c.id);
              const wearing = pet.costume === c.id;
              return (
                <View key={c.id} style={styles.costumeCell}>
                  <Tile
                    selected={wearing}
                    onPress={() => chooseCostume(c.id)}
                    label={c.label}
                    sub={wearing ? 'Wearing' : owned ? 'Owned' : `${c.cost} pts`}
                    locked={!owned}
                    a11y={owned ? `${c.label} costume` : `${c.label} costume, costs ${c.cost} care points`}>
                    <PetThumb look={{ ...neutral, species: pet.species, color: pet.color, costume: c.id }} size={2} />
                  </Tile>
                </View>
              );
            })}
          </View>
        </Field>

        {/* Data */}
        <Field title="Your data" note="Everything is stored only on this device.">
          {confirm ? (
            <PixelBox bg={C.blush} innerStyle={styles.confirm}>
              <PText variant="body">
                {confirm === 'erase'
                  ? 'Erase all logs, points and pet settings? This can’t be undone.'
                  : 'Replace your calendar logs with sample cycles? Your current logs will be lost.'}
              </PText>
              <View style={styles.row}>
                <PixelButton style={styles.flex} onPress={() => setConfirm(null)}>
                  <PText variant="heading">Cancel</PText>
                </PixelButton>
                <PixelButton
                  style={styles.flex}
                  bg={C.roseLight}
                  onPress={() => {
                    if (confirm === 'erase') eraseAll();
                    else loadSampleData();
                    setConfirm(null);
                  }}>
                  <PText variant="heading">{confirm === 'erase' ? 'Erase' : 'Load'}</PText>
                </PixelButton>
              </View>
            </PixelBox>
          ) : (
            <View style={styles.row}>
              <PixelButton style={styles.flex} onPress={() => setConfirm('sample')}>
                <PText variant="label" style={styles.center}>
                  Load sample cycles
                </PText>
              </PixelButton>
              <PixelButton style={styles.flex} onPress={() => setConfirm('erase')}>
                <PText variant="label" color={C.roseDeep} style={styles.center}>
                  Erase everything
                </PText>
              </PixelButton>
            </View>
          )}
        </Field>
      </View>
    </ScrollView>
  );
}

function Field({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <View>
        <PText variant="heading">{title}</PText>
        {note ? (
          <PText variant="tiny" color={C.inkSoft}>
            {note}
          </PText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Tile({
  selected,
  onPress,
  label,
  sub,
  locked,
  a11y,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
  sub?: string;
  locked?: boolean;
  a11y?: string;
  children: React.ReactNode;
}) {
  return (
    <PixelButton
      style={styles.flex}
      onPress={onPress}
      bg={selected ? C.amber : C.panel}
      shadow={selected ? null : C.shadow}
      accessibilityLabel={a11y ?? label}
      accessibilityState={{ selected }}
      innerStyle={styles.tile}>
      <View style={locked ? styles.lockedArt : undefined}>{children}</View>
      {locked ? (
        <View style={styles.lock}>
          <PixelIcon name="lock" size={2} />
        </View>
      ) : null}
      <PText variant="label">{label}</PText>
      {sub ? (
        <PText variant="tiny" color={C.inkSoft}>
          {sub}
        </PText>
      ) : null}
    </PixelButton>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, alignItems: 'center' },
  column: { width: '100%', maxWidth: MaxContentWidth, gap: 18 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  preview: { alignItems: 'center', paddingVertical: 12, gap: 8 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  field: { gap: 8 },
  inputBox: { paddingHorizontal: 10 },
  input: { fontFamily: Fonts.body, fontSize: 20, color: C.ink, paddingVertical: 8 },
  row: { flexDirection: 'row', gap: 8 },
  swatch: { height: 34, alignItems: 'center', justifyContent: 'center' },
  swatchSelected: { borderWidth: 2, borderColor: C.white },
  costumeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  costumeCell: { width: '33.333%', padding: 4 },
  tile: { paddingHorizontal: 4, paddingVertical: 8, gap: 2 },
  lockedArt: { opacity: 0.45 },
  lock: { position: 'absolute', top: 4, right: 4 },
  confirm: { padding: 12, gap: 12 },
});
