import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PetAvatar, PetThumb } from '@/components/pet-avatar';
import { PixelBox, PixelButton, PixelIcon, PText } from '@/components/pixel';
import { Toast } from '@/components/toast';
import { C, Fonts, MaxContentWidth, PHASE_STAGE } from '@/constants/theme';
import { COSTUMES } from '@/lib/rewards';
import { FUR, FurColor, Species } from '@/lib/sprites';
import { MAX_NAME_LENGTH } from '@/lib/saved-state';
import { useLunar } from '@/state/lunar';
import { useShowToast } from '@/state/toast';
import { useCycle, usePetLook } from '@/state/use-cycle';

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
  const { state, updatePet, wearCostume, buyCostume, loadSampleData, eraseAll } = useLunar();
  const showToast = useShowToast();
  const { status, todayLog } = useCycle();
  const { pet } = state;
  const [confirm, setConfirm] = useState<null | 'sample' | 'erase'>(null);
  const [buying, setBuying] = useState<(typeof COSTUMES)[number] | null>(null);

  // The text box can be empty while typing, but a blank name is never saved: only
  // non-blank names are passed on, and leaving the box puts the saved name back.
  const [nameDraft, setNameDraft] = useState(pet.name);
  const [shownName, setShownName] = useState(pet.name);
  if (pet.name !== shownName) {
    // The name changed somewhere else (e.g. "Erase everything"), so show the new one.
    setShownName(pet.name);
    if (nameDraft.trim() !== pet.name) setNameDraft(pet.name);
  }

  const look = usePetLook(status, todayLog?.mood);
  const neutral = { eyes: 'normal', outfit: 'none', prop: 'none' } as const;

  const onCostume = (c: (typeof COSTUMES)[number]) => {
    setBuying(null);
    if (state.owned.includes(c.id)) wearCostume(c.id);
    else if (state.points < c.cost) showToast(`Need ${c.cost - state.points} more care points`);
    else setBuying(c); // ask before spending points
  };

  // iOS shows this as a sheet below the status bar; other platforms need the inset.
  const topPad = Platform.OS === 'ios' ? 16 : insets.top + 12;

  return (
    <View style={styles.screen}>
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
                value={nameDraft}
                onChangeText={(text) => {
                  setNameDraft(text);
                  if (text.trim()) updatePet({ name: text });
                }}
                onBlur={() => setNameDraft(pet.name)}
                maxLength={MAX_NAME_LENGTH}
                placeholder={pet.name}
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
                      selected={wearing || buying?.id === c.id}
                      onPress={() => onCostume(c)}
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
            {buying ? (
              <PixelBox bg={C.cream} innerStyle={styles.confirm}>
                <PText variant="body">
                  Unlock {buying.label} for {buying.cost} care points? You’ll have {state.points - buying.cost} left.
                </PText>
                <View style={styles.row}>
                  <PixelButton style={styles.flex} onPress={() => setBuying(null)}>
                    <PText variant="heading">Cancel</PText>
                  </PixelButton>
                  <PixelButton
                    style={styles.flex}
                    bg={C.amber}
                    onPress={() => {
                      buyCostume(buying.id);
                      setBuying(null);
                    }}>
                    <PText variant="heading">Unlock</PText>
                  </PixelButton>
                </View>
              </PixelBox>
            ) : null}
          </Field>

          {/* Data */}
          <Field
            title="Your data"
            note="Kept only in this app on your phone. Lunar Pal never sends it anywhere. (An iPhone backup can include app data.)">
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
      {/* this sheet's own toast (on iOS the root one would be hidden behind it) */}
      <Toast top={Platform.OS === 'ios' ? 8 : insets.top + 8} />
    </View>
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
