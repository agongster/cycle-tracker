import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PixelBox, PixelButton, PixelIcon, PText } from '@/components/pixel';
import { C, FLOW_COLORS } from '@/constants/theme';
import { CycleStats, DayLog, FLOWS, hasContent, Logs, Mood, MOODS, SYMPTOMS } from '@/lib/cycle';
import { DateKey, formatLong, MonthRef, monthGrid, MONTHS } from '@/lib/dates';
import { FLOW_LABEL, MOOD_LABEL, nextPeriodText } from '@/lib/insights';
import { LOG_POINTS } from '@/lib/rewards';

// ---------------------------------------------------------------------------
// Month calendar
// ---------------------------------------------------------------------------

export function MonthCalendar({
  month,
  logs,
  predicted,
  today,
  selected,
  onSelect,
  onShiftMonth,
}: {
  month: MonthRef;
  logs: Logs;
  predicted: CycleStats['predicted'];
  today: DateKey;
  selected: DateKey;
  onSelect: (d: DateKey) => void;
  onShiftMonth: (delta: number) => void;
}) {
  const weeks = monthGrid(month);
  return (
    <PixelBox innerStyle={styles.calendar}>
      <View style={styles.monthHeader}>
        <PixelButton onPress={() => onShiftMonth(-1)} accessibilityLabel="Previous month" innerStyle={styles.arrow}>
          <PixelIcon name="left" size={3} />
        </PixelButton>
        <PText variant="heading" style={styles.monthTitle}>
          {MONTHS[month.month]} {month.year}
        </PText>
        <PixelButton onPress={() => onShiftMonth(1)} accessibilityLabel="Next month" innerStyle={styles.arrow}>
          <PixelIcon name="right" size={3} />
        </PixelButton>
      </View>
      <View style={styles.weekRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <PText key={i} variant="label" color={C.inkSoft} style={styles.weekday}>
            {d}
          </PText>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((date, di) =>
            date ? (
              <DayCell
                key={date}
                date={date}
                log={logs[date]}
                predicted={predicted[date]}
                isToday={date === today}
                isSelected={date === selected}
                isFuture={date > today}
                onPress={() => onSelect(date)}
              />
            ) : (
              <View key={`blank-${di}`} style={styles.cellWrap} />
            ),
          )}
        </View>
      ))}
    </PixelBox>
  );
}

function DayCell({
  date,
  log,
  predicted,
  isToday,
  isSelected,
  isFuture,
  onPress,
}: {
  date: DateKey;
  log?: DayLog;
  predicted?: 'likely' | 'possible';
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
  onPress: () => void;
}) {
  const period = !!log?.period;
  const flow = log?.flow ?? 'medium';
  const bg = period ? FLOW_COLORS[flow] : predicted === 'likely' ? C.blush : undefined;
  const lightText = period && (flow === 'medium' || flow === 'heavy');
  const extra = !period && !!log && (log.symptoms.length > 0 || !!log.mood);

  let label = formatLong(date);
  if (period) label += `, period, ${FLOW_LABEL[flow]} flow`;
  else if (predicted) label += `, ${predicted === 'likely' ? 'period likely' : 'period possible'}`;
  if (extra) label += ', has notes';
  if (isToday) label += ', today';

  return (
    <Pressable
      style={styles.cellWrap}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected }}>
      <View style={[styles.cell, isSelected && styles.cellSelected]}>
        <View
          style={[
            styles.cellInner,
            { backgroundColor: bg },
            predicted === 'likely' && !period && styles.likely,
            predicted === 'possible' && !period && styles.possible,
          ]}>
          <PText variant="small" color={lightText ? C.white : isFuture ? C.inkSoft : C.ink}>
            {Number(date.slice(8))}
          </PText>
          {extra ? <View style={styles.noteDot} /> : null}
          {isToday ? <View style={[styles.todayBar, { backgroundColor: lightText ? C.white : C.ink }]} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

export function Legend() {
  return (
    <View style={styles.legend}>
      <LegendItem swatch={<View style={[styles.swatch, { backgroundColor: FLOW_COLORS.medium }]} />} text="Period" />
      <LegendItem swatch={<View style={[styles.swatch, styles.likely, { backgroundColor: C.blush }]} />} text="Likely" />
      <LegendItem swatch={<View style={[styles.swatch, styles.possible]} />} text="Possible" />
      <LegendItem swatch={<View style={[styles.swatch, styles.swatchNote]}><View style={styles.noteDot} /></View>} text="Notes" />
      <LegendItem swatch={<View style={[styles.swatch, styles.swatchNote]}><View style={[styles.todayBar, { backgroundColor: C.ink }]} /></View>} text="Today" />
    </View>
  );
}

function LegendItem({ swatch, text }: { swatch: ReactNode; text: string }) {
  return (
    <View style={styles.legendItem}>
      {swatch}
      <PText variant="tiny" color={C.inkSoft}>
        {text}
      </PText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Log entry panel
// ---------------------------------------------------------------------------

export function LogPanel({
  date,
  today,
  log,
  predicted,
  touched,
  canEarn,
  onChange,
  onShiftDate,
}: {
  date: DateKey;
  today: DateKey;
  log?: DayLog;
  predicted?: 'likely' | 'possible';
  /** this day has been logged before (even if it was cleared later) */
  touched: boolean;
  /** logging this day right now would earn points */
  canEarn: boolean;
  onChange: (log: DayLog) => void;
  onShiftDate: (delta: number) => void;
}) {
  const isFuture = date > today;
  const current: DayLog = log ?? { period: false, symptoms: [] };

  const update = (patch: Partial<DayLog>) => onChange({ ...current, ...patch });
  const toggleSymptom = (s: string) =>
    update({ symptoms: current.symptoms.includes(s) ? current.symptoms.filter((x) => x !== s) : [...current.symptoms, s] });
  const toggleMood = (m: Mood) => update({ mood: current.mood === m ? undefined : m });

  return (
    <PixelBox innerStyle={styles.panel}>
      {/* Date selector */}
      <View style={styles.dateRow}>
        <PixelButton onPress={() => onShiftDate(-1)} accessibilityLabel="Previous day" innerStyle={styles.arrow}>
          <PixelIcon name="left" size={3} />
        </PixelButton>
        <View style={styles.dateLabel}>
          <PText variant="heading">{formatLong(date)}</PText>
          <PText variant="tiny" color={C.inkSoft}>
            {date === today ? 'Today' : isFuture ? 'Upcoming' : 'Past day'}
          </PText>
        </View>
        <PixelButton
          onPress={() => onShiftDate(1)}
          disabled={date >= today}
          accessibilityLabel="Next day"
          innerStyle={styles.arrow}>
          <PixelIcon name="right" size={3} />
        </PixelButton>
      </View>

      {isFuture ? (
        <View style={styles.futureNote}>
          <PText variant="body" style={styles.centerText}>
            This day hasn&apos;t happened yet, so there&apos;s nothing to log.
          </PText>
          <PText variant="small" color={C.inkSoft} style={styles.centerText}>
            {predicted === 'likely'
              ? 'Your period is likely around here, based on your history.'
              : predicted === 'possible'
                ? 'Your period could fall around here, since cycles shift.'
                : 'No period expected around this day.'}
          </PText>
        </View>
      ) : (
        <>
          {/* Period toggle */}
          <Section title="Period">
            <View style={styles.segment}>
              <Choice label="No" a11yLabel="Period: no" selected={!current.period} onPress={() => update({ period: false })} />
              <Choice
                label="Yes"
                a11yLabel="Period: yes"
                selected={current.period}
                selectedBg={C.roseLight}
                onPress={() => update({ period: true, flow: current.flow ?? 'medium' })}
              />
            </View>
          </Section>

          {/* Flow intensity */}
          {current.period ? (
            <Section title="Flow">
              <View style={styles.wrap}>
                {FLOWS.map((f) => (
                  <Choice
                    key={f}
                    label={FLOW_LABEL[f]}
                    selected={current.flow === f}
                    selectedBg={C.roseLight}
                    onPress={() => update({ flow: f })}
                    leading={<View style={[styles.flowDot, { backgroundColor: FLOW_COLORS[f] }]} />}
                  />
                ))}
              </View>
            </Section>
          ) : null}

          {/* Symptoms */}
          <Section title="Symptoms">
            <View style={styles.wrap}>
              {SYMPTOMS.map((s) => (
                <Choice key={s} label={s} selected={current.symptoms.includes(s)} onPress={() => toggleSymptom(s)} small />
              ))}
            </View>
          </Section>

          {/* Mood */}
          <Section title="Mood">
            <View style={styles.wrap}>
              {MOODS.map((m) => (
                <Choice
                  key={m}
                  label={MOOD_LABEL[m]}
                  selected={current.mood === m}
                  selectedBg={C.lavender}
                  onPress={() => toggleMood(m)}
                  small
                />
              ))}
            </View>
          </Section>

          <View style={styles.panelFooter}>
            <PText variant="tiny" color={C.inkSoft} style={styles.flex}>
              {hasContent(log)
                ? 'Saved on this device'
                : touched
                  ? 'Nothing logged. A day only earns points the first time it’s logged.'
                  : canEarn
                    ? `Log anything to earn +${LOG_POINTS} care points`
                    : `You’ve earned today’s +${LOG_POINTS}. Logging more days still helps predictions.`}
            </PText>
            {hasContent(log) ? (
              <Pressable
                onPress={() => onChange({ period: false, symptoms: [] })}
                accessibilityRole="button"
                hitSlop={8}>
                <PText variant="label" color={C.roseDeep}>
                  Clear day
                </PText>
              </Pressable>
            ) : null}
          </View>
        </>
      )}
    </PixelBox>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <PText variant="label" color={C.inkSoft}>
        {title}
      </PText>
      {children}
    </View>
  );
}

function Choice({
  label,
  a11yLabel,
  selected,
  onPress,
  selectedBg = C.amber,
  leading,
  small,
}: {
  label: string;
  /** what screen readers say, if `label` alone isn't clear */
  a11yLabel?: string;
  selected: boolean;
  onPress: () => void;
  selectedBg?: string;
  leading?: ReactNode;
  small?: boolean;
}) {
  return (
    <PixelButton
      onPress={onPress}
      bg={selected ? selectedBg : C.panel}
      shadow={selected ? null : C.shadow}
      unit={2}
      accessibilityState={{ selected }}
      accessibilityLabel={a11yLabel ?? label}
      innerStyle={[styles.choice, small && styles.choiceSmall]}>
      {leading}
      <PText variant={small ? 'small' : 'body'}>{label}</PText>
    </PixelButton>
  );
}

// ---------------------------------------------------------------------------
// Historical summary
// ---------------------------------------------------------------------------

function variabilityLabel(sd: number) {
  if (sd <= 2) return 'Very steady';
  if (sd <= 4) return 'Fairly steady';
  if (sd <= 7) return 'Varies a bit, and that’s normal';
  return 'Varies a lot, so I use wider windows';
}

export function HistorySummary({ stats, today }: { stats: CycleStats; today: DateKey }) {
  const { avgCycle, sd, minCycle, maxCycle, cycleLengths, periods, avgPeriod } = stats;
  const maxBar = Math.max(...cycleLengths, 1);

  return (
    <PixelBox innerStyle={styles.panel}>
      {cycleLengths.length === 0 ? (
        <PText variant="body" color={C.inkSoft}>
          {periods.length === 0
            ? 'Log your period days and your patterns will show up here.'
            : 'Log one more period and I can calculate your cycle length. Irregular is normal. I’ll learn yours.'}
        </PText>
      ) : (
        <>
          <View style={styles.statGrid}>
            <Stat label="Avg cycle" value={`${avgCycle} days`} />
            <Stat
              label="Variability"
              value={sd !== null ? `±${sd.toFixed(1)} days` : '—'}
              note={minCycle !== null && maxCycle !== null && cycleLengths.length > 1 ? `Range ${minCycle}–${maxCycle}` : 'Needs 2+ cycles'}
            />
            <Stat label="Avg period" value={`${avgPeriod} days`} />
            <Stat label="Cycles" value={`${cycleLengths.length}`} note="recent" />
          </View>
          {sd !== null ? (
            <PText variant="small" color={C.inkSoft}>
              {variabilityLabel(sd)}
            </PText>
          ) : null}

          <PText variant="label" color={C.inkSoft}>
            Recent cycle lengths
          </PText>
          <View style={styles.bars} accessibilityLabel={`Recent cycle lengths: ${cycleLengths.join(', ')} days`}>
            {cycleLengths.map((len, i) => (
              <View key={i} style={styles.barCol}>
                <PText variant="tiny">{len}</PText>
                <View style={[styles.bar, { height: Math.max(8, Math.round((len / maxBar) * 64)) }]} />
              </View>
            ))}
          </View>
        </>
      )}
      {stats.predictions.length ? (
        <View style={styles.nextBox}>
          <PText variant="label" color={C.inkSoft}>
            Next period
          </PText>
          {/* same wording as Home's "Next" row */}
          <PText variant="body">{nextPeriodText(stats, today)}</PText>
        </View>
      ) : null}
    </PixelBox>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.stat}>
      <PText variant="label" color={C.inkSoft}>
        {label}
      </PText>
      <PText variant="bodyBold">{value}</PText>
      {note ? (
        <PText variant="tiny" color={C.inkSoft}>
          {note}
        </PText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerText: { textAlign: 'center' },
  calendar: { padding: 10, gap: 2 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  monthTitle: { flex: 1, textAlign: 'center' },
  arrow: { paddingHorizontal: 8, paddingVertical: 6 },
  weekRow: { flexDirection: 'row' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', paddingBottom: 4 },
  cellWrap: { width: `${100 / 7}%`, aspectRatio: 1, padding: 1 },
  cell: { flex: 1, borderWidth: 2, borderColor: 'transparent' },
  cellSelected: { borderColor: C.ink, backgroundColor: C.cream },
  cellInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  likely: { borderWidth: 2, borderStyle: 'dashed', borderColor: C.rose },
  possible: { borderWidth: 2, borderStyle: 'dotted', borderColor: C.roseLight },
  noteDot: { position: 'absolute', top: 3, right: 3, width: 5, height: 5, backgroundColor: C.amberDeep },
  todayBar: { position: 'absolute', bottom: 3, width: 12, height: 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 14, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  swatchNote: { borderWidth: 1, borderColor: C.inkFaint },
  panel: { padding: 14, gap: 14 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateLabel: { flex: 1, alignItems: 'center' },
  futureNote: { gap: 6, paddingVertical: 8 },
  section: { gap: 8 },
  segment: { flexDirection: 'row', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choice: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  choiceSmall: { paddingHorizontal: 8, paddingVertical: 4 },
  flowDot: { width: 10, height: 10, borderWidth: 2, borderColor: C.ink },
  panelFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 },
  stat: { width: '50%', gap: 2 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 88 },
  barCol: { alignItems: 'center', gap: 3, width: 26 },
  bar: { width: 18, backgroundColor: C.peach, borderWidth: 2, borderColor: C.ink },
  nextBox: { gap: 4, paddingTop: 4 },
});
