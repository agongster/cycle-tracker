import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HistorySummary, Legend, LogPanel, MonthCalendar } from '@/components/calendar-parts';
import { PText } from '@/components/pixel';
import { C, MaxContentWidth } from '@/constants/theme';
import { addDays, DateKey, MonthRef, monthOf, shiftMonth } from '@/lib/dates';
import { canEarnLogPoints } from '@/lib/rewards';
import { useLunar } from '@/state/lunar';
import { useCycle } from '@/state/use-cycle';

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const { state, setDayLog } = useLunar();
  const { today, stats } = useCycle();
  const { day } = useLocalSearchParams<{ day?: string }>();

  // null means "follow today" (so it's still right after midnight)...
  const [picked, setPicked] = useState<DateKey | null>(null);
  // ...and "show the month of the selected day".
  const [pickedMonth, setPickedMonth] = useState<MonthRef | null>(null);
  const selected = picked ?? today;
  const month = pickedMonth ?? monthOf(selected);

  const select = (d: DateKey) => {
    setPicked(d === today ? null : d);
    setPickedMonth(null);
  };

  // Home's "Log today" button opens this screen with ?day=today: jump back to today...
  if (day === 'today' && (picked !== null || pickedMonth !== null)) {
    setPicked(null);
    setPickedMonth(null);
  }
  // ...then clear the param, so pressing the button again later works too.
  useEffect(() => {
    if (day === 'today') router.setParams({ day: undefined });
  }, [day]);

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
          onShiftMonth={(delta) => setPickedMonth(shiftMonth(month, delta))}
        />
        <Legend />

        <PText variant="heading">Log entry</PText>
        <LogPanel
          date={selected}
          today={today}
          log={state.logs[selected]}
          predicted={stats.predicted[selected]}
          touched={state.touched.includes(selected)}
          canEarn={canEarnLogPoints(state, selected, today)}
          onChange={(log) => setDayLog(selected, log)}
          onShiftDate={(delta) => {
            const next = addDays(selected, delta);
            // Going back always works, even from a future day. Going forward stops at
            // today, since future days can't be logged.
            if (delta < 0 || next <= today) select(next);
          }}
        />

        <PText variant="heading">Your patterns</PText>
        <HistorySummary stats={stats} today={today} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 16, paddingBottom: 32, alignItems: 'center' },
  column: { width: '100%', maxWidth: MaxContentWidth, gap: 14 },
});
