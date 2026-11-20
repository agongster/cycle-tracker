import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PetAvatar } from '@/components/pet-avatar';
import { PixelBox, PixelButton, PixelIcon, PixelSprite, PText } from '@/components/pixel';
import { C, MaxContentWidth, PHASE_STAGE } from '@/constants/theme';
import { hasContent } from '@/lib/cycle';
import { formatLong } from '@/lib/dates';
import {
  adviceFor,
  AFFIRMATIONS,
  energyLabel,
  flowLine,
  nextLine,
  petAppearance,
  petLines,
  phaseTitle,
  pickDaily,
} from '@/lib/insights';
import type { PetLook } from '@/lib/sprites';
import { CARE_ACTIONS, CARE_POINTS, LOG_POINTS, useLunar } from '@/state/lunar';
import { useCycle } from '@/state/use-cycle';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { state, toggleCare } = useLunar();
  const { today, stats, status, todayLog } = useCycle();
  const { pet } = state;

  const [tapLine, setTapLine] = useState<string | null>(null);
  const [heartKey, setHeartKey] = useState(0);

  // the affirmation bubble + heart fade after a moment
  useEffect(() => {
    if (!heartKey) return;
    const id = setTimeout(() => setHeartKey(0), 1400);
    return () => clearTimeout(id);
  }, [heartKey]);

  const mood = todayLog?.mood;
  const look: PetLook = useMemo(
    () => ({ species: pet.species, color: pet.color, costume: pet.costume, ...petAppearance(status, mood) }),
    [pet.species, pet.color, pet.costume, status, mood],
  );
  const dailyLine = pickDaily(petLines(status, pet.name, mood), today + status.phase + (mood ?? ''));
  const line = tapLine ?? dailyLine;
  const stage = PHASE_STAGE[status.phase];
  const doneToday = state.care[today] ?? [];
  const contentWidth = Math.min(width, MaxContentWidth) - 32;
  const petSize = contentWidth >= 340 ? 6 : 5;

  const onPetPress = () => {
    const options = AFFIRMATIONS.filter((a) => a !== tapLine);
    setTapLine(options[Math.floor(Math.random() * options.length)]);
    setHeartKey(Date.now());
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <View style={styles.column}>
        {/* Header + care point counter */}
        <View style={styles.header}>
          <View style={styles.flex}>
            <PText variant="title">Lunar Pal</PText>
            <PText variant="small" color={C.inkSoft}>
              {formatLong(today)}
            </PText>
          </View>
          <PixelBox
            bg={C.cream}
            innerStyle={styles.points}
            style={styles.pointsBox}>
            <PixelIcon name="star" size={3} />
            <View>
              <PText variant="heading" accessibilityLabel={`${state.points} care points`}>
                {state.points}
              </PText>
              <PText variant="tiny" color={C.inkSoft}>
                care pts
              </PText>
            </View>
          </PixelBox>
        </View>

        {/* Pet stage */}
        <PixelBox bg={stage.sky} innerStyle={styles.stage}>
          <StageDecor phase={status.phase} accent={stage.accent} />
          <View style={styles.customize}>
            <PixelButton
              onPress={() => router.push('/customize')}
              accessibilityLabel={`Customize ${pet.name}`}
              bg={C.cream}
              innerStyle={styles.iconButton}>
              <PixelIcon name="pencil" size={3} />
            </PixelButton>
          </View>
          {heartKey ? (
            <View style={styles.heartPop}>
              <PixelIcon name="heart" size={4} />
            </View>
          ) : null}
          <PetAvatar
            look={look}
            size={petSize}
            onPress={onPetPress}
            accessibilityLabel={`${pet.name}, your pet. Tap to say hi.`}
          />
          <View style={[styles.floor, { backgroundColor: stage.floor }]}>
            <PText variant="heading">{pet.name}</PText>
          </View>
        </PixelBox>

        {/* Dialogue + insight card */}
        <View>
          <View style={styles.tail}>
            <PixelSprite
              rows={['...O...', '..OcO..', '.OcccO.', 'OcccccO']}
              palette={{ O: C.ink, c: C.panel }}
              size={3}
            />
          </View>
          <PixelBox innerStyle={styles.bubble}>
            <View style={styles.chips}>
              {status.cycleDay !== null ? (
                <Tag bg={C.cream} text={`Day ${status.cycleDay}`} />
              ) : null}
              <Tag bg={stage.sky} text={phaseTitle(status)} />
            </View>
            <PText variant="body">
              <PText variant="bodyBold" color={C.roseDeep}>
                {pet.name}:{' '}
              </PText>
              {line}
            </PText>

            <View style={styles.divider}>
              {Array.from({ length: 40 }, (_, i) => (
                <View key={i} style={styles.dash} />
              ))}
            </View>

            <InsightRow label="Energy">
              <EnergyMeter value={status.energy} />
              <PText variant="small">{energyLabel(status.energy)}</PText>
            </InsightRow>
            <InsightRow label="Flow">
              <PText variant="small" style={styles.flex}>
                {flowLine(status, today)}
              </PText>
            </InsightRow>
            <InsightRow label="Next">
              <PText variant="small" style={styles.flex}>
                {nextLine(status, stats.margin)}
              </PText>
            </InsightRow>
            <PText variant="small" color={C.inkSoft} style={styles.advice}>
              {adviceFor(status)}
            </PText>
          </PixelBox>
        </View>

        {/* Quick care */}
        <View style={styles.sectionHeader}>
          <PText variant="heading">Self-care today</PText>
          <PText variant="tiny" color={C.inkSoft}>
            +{CARE_POINTS} each
          </PText>
        </View>
        <View style={styles.careGrid}>
          {CARE_ACTIONS.map((a) => {
            const done = doneToday.includes(a.id);
            return (
              <View key={a.id} style={styles.careCell}>
                <PixelButton
                  onPress={() => toggleCare(a.id)}
                  bg={done ? C.sageLight : C.panel}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={a.label}
                  innerStyle={styles.careInner}>
                  <PixelIcon name={a.icon} size={3} />
                  <PText variant="tiny" style={styles.center}>
                    {a.label}
                  </PText>
                  {done ? (
                    <View style={styles.check}>
                      <PixelIcon name="check" size={2} />
                    </View>
                  ) : null}
                </PixelButton>
              </View>
            );
          })}
        </View>

        {/* Logging nudge */}
        {hasContent(todayLog) ? (
          <PText variant="small" color={C.inkSoft} style={styles.center}>
            Today is logged. Thank you for checking in!
          </PText>
        ) : (
          <PixelButton bg={C.amber} onPress={() => router.navigate('/calendar')} innerStyle={styles.logButton}>
            <PixelIcon name="calendar" size={2} />
            <PText variant="heading">Log today</PText>
            <PText variant="tiny">+{LOG_POINTS} pts</PText>
          </PixelButton>
        )}
      </View>
    </ScrollView>
  );
}

function Tag({ text, bg }: { text: string; bg: string }) {
  return (
    <PixelBox bg={bg} shadow={null} unit={2} innerStyle={styles.tag}>
      <PText variant="label">{text}</PText>
    </PixelBox>
  );
}

function InsightRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.insightRow}>
      <PText variant="label" color={C.inkSoft} style={styles.insightLabel}>
        {label}
      </PText>
      <View style={styles.insightValue}>{children}</View>
    </View>
  );
}

function EnergyMeter({ value }: { value: number }) {
  return (
    <View style={styles.meter} accessibilityLabel={`Energy ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[styles.meterCell, { backgroundColor: i <= value ? C.amber : C.cream }]} />
      ))}
    </View>
  );
}

/** A few twinkling pixels and a moon or sparkle in the corner of the stage. */
function StageDecor({ phase, accent }: { phase: string; accent: string }) {
  const night = phase === 'menstrual' || phase === 'luteal';
  return (
    <>
      <View style={styles.decorIcon}>
        <PixelIcon name={night ? 'moon' : 'sparkle'} size={3} />
      </View>
      {[
        [18, 70],
        [64, 22],
        [80, 64],
        [10, 40],
        [88, 30],
      ].map(([left, top], i) => (
        <View
          key={i}
          style={[styles.twinkle, { left: `${left}%`, top: `${top}%`, backgroundColor: accent }]}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, paddingBottom: 24, alignItems: 'center' },
  column: { width: '100%', maxWidth: MaxContentWidth, gap: 16 },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pointsBox: { minWidth: 96 },
  points: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6 },
  stage: { alignItems: 'center', paddingTop: 20, overflow: 'hidden' },
  customize: { position: 'absolute', right: 8, top: 8, zIndex: 2 },
  iconButton: { paddingHorizontal: 6, paddingVertical: 6 },
  heartPop: { position: 'absolute', top: 10, alignSelf: 'center', zIndex: 2 },
  floor: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 3,
    borderTopColor: C.ink,
  },
  decorIcon: { position: 'absolute', left: 12, top: 12 },
  twinkle: { position: 'absolute', width: 6, height: 6 },
  tail: { alignItems: 'center', marginBottom: -3, zIndex: 1 },
  bubble: { padding: 14, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3 },
  divider: { flexDirection: 'row', gap: 4, overflow: 'hidden', height: 2 },
  dash: { width: 6, height: 2, backgroundColor: C.inkFaint },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  insightLabel: { width: 58 },
  insightValue: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  advice: { marginTop: 2 },
  meter: { flexDirection: 'row', gap: 3 },
  meterCell: { width: 14, height: 12, borderWidth: 2, borderColor: C.ink },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4 },
  careGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginTop: -8 },
  careCell: { width: '33.333%', padding: 4 },
  careInner: { gap: 6, paddingVertical: 10, paddingHorizontal: 4 },
  check: { position: 'absolute', right: 3, top: 3 },
  logButton: { flexDirection: 'row', gap: 10 },
});
