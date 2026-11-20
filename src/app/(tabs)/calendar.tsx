import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HistorySummary, Legend, LogPanel, MonthCalendar } from '@/components/calendar-parts';
import { PText } from '@/components/pixel';
import { C, MaxContentWidth } from '@/constants/theme';
import { addDays, DateKey, monthOf, shiftMonth } from '@/lib/dates';
import { useLunar } from '@/state/lunar';
import { useCycle } from '@/state/use-cycle';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { state, setDayLog } = useLunar();
  const { today, stats } = useCycle();
  const [selected, setSelected] = useState<DateKey>(today);
  const [month, setMonth] = useState(() => monthOf(today));

  const select = (d: DateKey) => {
    setSelected(d);
    setMonth(monthOf(d));
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.column}>
        <View>
          <PText variant="title">Calendar</PText>
          <PText variant="small" color={C.inkSoft}>
            Tap a day to log it. Everything stays on your phone.
          </PText>
        </View>

        <MonthCalendar
          month={month}
          logs={state.logs}
          predicted={stats.predicted}
          today={today}
          selected={selected}
          onSelect={select}
          onShiftMonth={(delta) => setMonth((m) => shiftMonth(m, delta))}
        />
        <Legend />

        <PText variant="heading">Log entry</PText>
        <LogPanel
          date={selected}
          today={today}
          log={state.logs[selected]}
          predicted={stats.predicted[selected]}
          rewarded={state.rewarded.includes(selected)}
          onChange={(log) => setDayLog(selected, log)}
          onShiftDate={(delta) => {
            const next = addDays(selected, delta);
            if (next <= today) select(next);
          }}
        />

        <PText variant="heading">Your patterns</PText>
        <HistorySummary stats={stats} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, paddingBottom: 32, alignItems: 'center' },
  column: { width: '100%', maxWidth: MaxContentWidth, gap: 14 },
});
