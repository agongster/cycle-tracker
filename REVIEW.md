# REVIEW — Lunar Pal (cycle-tracker)

Code review of `src/` against `SPEC.md`. Report only; nothing was changed.

**Method.** I read every file in `src/`, plus `app.json` and `package.json`. I ran `tsc --noEmit` and `eslint src`, and both passed with no errors. I also ran `src/lib/cycle.ts` and `src/lib/insights.ts` on made-up cycle data to check the prediction logic (results are in finding 13). SPEC.md has no separate "acceptance criteria" list, so each requirement in its Idea, Screens and Data sections is treated as one criterion (findings 1–12).

**Tally:** 14 PASS · 5 FAIL · 18 WARN

---

## Spec criteria

1. **[PASS] The pet shows expected energy across the four phases.** `todayStatus` assigns menstrual, follicular, ovulatory or luteal and an energy level from 1 to 5 (`src/lib/cycle.ts:196-220`). The Home screen shows that energy as a 5-cell meter with a label (`src/app/(tabs)/index.tsx:147-150`, `237-245`), and `petAppearance` changes the pet's eyes, outfit and prop for each phase (`src/lib/insights.ts:125-147`).

2. **[PASS] Gentle dialogue instead of "period late" counters.** When a cycle runs past the usual range, the pet says things like "Your cycle is taking its time, and that's okay" (`src/lib/insights.ts:89-94`), and the advice and next-period lines stay neutral (`insights.ts:45-46`, `72`). Predictions move forward to tomorrow without counting days overdue (`src/lib/cycle.ts:129-131`). No "X days late" text exists anywhere in the code.

3. **[PASS] Logging earns care points.** `setDayLog` gives `LOG_POINTS` (5) the first time a day gets any content (`src/state/lunar.tsx:132-151`), and a toast confirms it. Logging only a mood also earns points, which is broader than the spec's "flow and symptoms" but fits its intent. (See finding 18 about ways to farm these points.)

4. **[PASS] The pet can be customized (species, name, costume, etc.).** The Customize modal has a name field, 4 species, 6 fur colors and 6 costumes, which are bought with care points (`src/app/customize.tsx:70-144`, `src/state/lunar.tsx:172-197`).

5. **[PASS] The pet avatar reflects the predicted phase (pajamas or tea on rough days).** Menstrual days give pajamas, tea and sleepy eyes. Late-luteal days give a sweater and tea. A logged low, anxious or irritable mood adds a sweater and tea (`src/lib/insights.ts:130-144`). The outfit and prop drawing is in `applyOutfit` / `drawProp` (`src/lib/sprites.ts:247`, `317`).

6. **[PASS] The dialogue and insight card shows cycle day, phase, and flow and energy advice.** It has a "Day N" chip and a phase chip (`src/app/(tabs)/index.tsx:128-133`), the pet's line (`134-139`), and Energy, Flow and Next rows plus one line of advice (`147-163`). The card's structure meets the spec, but the Flow and Next values are wrong on some days (finding 13).

7. **[PASS] Quick care buttons are toggles that grant points.** Six toggles, +2 points each, marked with `accessibilityRole="checkbox"` (`src/app/(tabs)/index.tsx:174-199`, `src/state/lunar.tsx:153-170`). (See finding 16 for a points bug.)

8. **[PASS] Care point counter.** It sits in the Home header, with an accessibility label (`src/app/(tabs)/index.tsx:74-87`).

9. **[PASS] The calendar highlights logged period days in red/pink and predicted windows with dashed borders.** Logged days are filled with a color for their flow level (`src/components/calendar-parts.tsx:93-96`, `src/constants/theme.ts:27-32`). "Likely" days get a dashed border, and "possible" days get an extra dotted style that the spec didn't ask for (`calendar-parts.tsx:117-118`, `443-444`). A legend explains both (`131-141`).

10. **[PASS] The log entry panel has a date selector, period toggle, flow picker and symptom toggles.** All four are there (`src/components/calendar-parts.tsx:186-258`), plus a mood picker the spec didn't ask for. The flow picker only appears when Period = Yes, and `setDayLog` clears the flow when the period is turned off (`src/state/lunar.tsx:134-139`). Future days can't be logged (`calendar-parts.tsx:205-217`). (See finding 17 for an arrow bug.)

11. **[PASS] The history summary shows average cycle length and variability.** It shows average cycle, ± standard deviation, range, average period length, and a bar chart of recent cycles (`src/components/calendar-parts.tsx:355-412`). It uses the last 6 cycles (`src/lib/cycle.ts:101-112`). Empty states explain what's needed (`calendar-parts.tsx:362-367`).

12. **[PASS] Data is stored on the device and survives restarts.** All app state is saved as one JSON object in AsyncStorage, under the key `lunar-pal:v1`. It is loaded once on startup, the splash screen stays up until loading finishes, and every change is saved (`src/state/lunar.tsx:102-124`, `src/app/_layout.tsx:30-39`). Nothing is sent over the network. This criterion is met in normal use. Findings 14 and 26 cover the cases where it isn't.

## Bugs and logic errors

13. **[FAIL] On the predicted start day and the day after, Home says "None expected today" and points to next month's period.** `todayStatus` picks `next` as the first prediction whose start is *strictly after* today (`src/lib/cycle.ts:182`). But `analyze` keeps the current prediction while today is still inside its window (`cycle.ts:128-131`). So once the predicted start day arrives, `next` jumps to the following cycle, and `flowLine` / `nextLine` use that later prediction (`src/lib/insights.ts:65-66`, `73`). Meanwhile the Calendar marks today as "likely", and the History summary uses `stats.predictions[0]` (`src/components/calendar-parts.tsx:357`). As a result, Home and Calendar disagree. Test run with regular 28-day cycles (margin ±2), today = Nov 20:

    | Days since last start | Phase chip | Home "Flow" | Home "Next" | Calendar, today |
    |---|---|---|---|---|
    | 27 | Late luteal | Could start any day | Around Nov 21 | possible |
    | **28** | Late luteal | **None expected today** | **Around Dec 18** | **likely** |
    | **29** | Late luteal | **None expected today** | **Around Dec 17** | **likely** |
    | 30 | Taking its time | None expected today | Whenever your body is ready | likely |

    On the days a period is most likely to start, the insight card says the opposite, and the History summary shows "Likely around Nov 18" as a past date.

14. **[FAIL] If loading saved data fails, the defaults overwrite it.** If `AsyncStorage.getItem` rejects or `JSON.parse` throws, the error is only logged (`src/state/lunar.tsx:109`), and `finally` still sets `ready = true` (`110-112`). The save effect then writes `DEFAULT_STATE` over the stored data (`119-124`), so a single read error permanently erases every log and point. The comment on line 118 ("so defaults never overwrite real data") is only true when loading succeeds.

15. **[FAIL] Tapping the pet replaces the daily dialogue until the app restarts.** `onPetPress` sets `tapLine` (`src/app/(tabs)/index.tsx:55-59`), and `line = tapLine ?? dailyLine` (`49`). The timeout only resets `heartKey` (`37-41`), and nothing ever sets `tapLine` back to `null`. The comment on line 36 says "the affirmation bubble + heart fade after a moment", but only the heart fades. Tab screens stay mounted, so after one tap the phase-based, compassionate line (spec criterion 2) is gone until the app restarts.

16. **[FAIL] Spent care points can be earned again by toggling care off and back on.** Unchecking an action subtracts 2 but never goes below 0: `Math.max(0, s.points + (on ? CARE_POINTS : -CARE_POINTS))` (`src/state/lunar.tsx:165`). Example: check all 6 actions (12 pts), buy Flowers (2 pts left), uncheck all 6 (0 pts), check them again (12 pts). The costume ended up free, and this can be repeated every day.

17. **[FAIL] The "Previous day" arrow does nothing when a future day is selected.** If you tap a future day on the calendar and then press ◀, `next = addDays(selected, -1)` is still in the future, so the `next <= today` check silently drops it (`src/app/(tabs)/calendar.tsx:56-59`). The button still looks enabled (`src/components/calendar-parts.tsx:187`), while ▶ is correctly disabled (`196-202`).

18. **[WARN] Log points can be farmed by filling in past days.** Points are capped once per *date*, not per real check-in (`src/state/lunar.tsx:140-146`). A user can step back through months of past days, set any mood on each, and get +5 per day, then use "Clear day" to remove the log and keep the points (`src/components/calendar-parts.tsx:287-295`). "Load sample cycles" also doesn't mark the sample days as rewarded (`lunar.tsx:199-202`), so editing about 35 sample days pays out about 175 points, and "Erase everything" resets this so it can be done again. The comment on `lunar.tsx:28` says points "can't be farmed".

19. **[WARN] Toasts shown from the Customize modal are probably hidden on iOS.** `<Toast />` is rendered beside the root `<Stack>` (`src/app/_layout.tsx:44-48`), but `customize` is a native modal (`46`). On iOS the modal sheet is drawn on top of the root view, so "Need N more care points" (`src/state/lunar.tsx:184`), "Unlocked!" (`193`), "Sample cycles loaded" (`201`) and "All data erased" (`206`) would appear behind it. Tapping a locked costume you can't afford would then seem to do nothing. Android's native-stack "modal" is a normal screen, so the toast should be visible there. Not checked on a device.

20. **[WARN] The pet name can be saved as blank.** `onChangeText` saves every keystroke (`src/app/customize.tsx:74`), and the fallback to "Mochi" only runs on blur (`75`). Clearing the field and pressing **Done** or swiping the sheet away doesn't reliably blur it first, so `name: ""` can be saved. Home would then show an empty name (`src/app/(tabs)/index.tsx:114`), the dialogue would start with ": " (`136`), and the toast would say " is proud of you".

21. **[WARN] A single logged spotting day starts a new cycle.** `groupPeriods` treats any day with `period: true` as part of a period (`src/lib/cycle.ts:82-95`), and spotting is one of the flow options. Mid-cycle spotting logged as Period = Yes on day 14 counts as a new period. A 14-day gap passes the `>= 10` filter (`cycle.ts:104`), so a 14-day cycle is added and the average and variability get worse. Since the app is aimed at irregular cycles, consider not starting a cycle on spotting-only days or single isolated days.

22. **[WARN] "Log today" may open the Calendar on a different date.** The Home button calls `router.navigate('/calendar')` (`src/app/(tabs)/index.tsx:207`), but the Calendar's `selected` and `month` are only set to today on first mount (`src/app/(tabs)/calendar.tsx:16-17`). If you visited the Calendar earlier and picked another day, or the app stayed open past midnight, the panel opens on that old date.

## Error handling

23. **[WARN] Saved data is only checked at the top level, and there is no error boundary.** `sanitize` checks that `logs`, `care` and so on are objects, but not what's inside them (`src/state/lunar.tsx:82-94`). A log entry with no `symptoms` would crash `hasContent` (`src/lib/cycle.ts:29`). An unknown `species` would make `bodyObject` return `undefined` inside `buildPet`. No route exports an Expo Router `ErrorBoundary`, so either problem shows a blank or red screen with no way to recover.

24. **[WARN] Save failures are silent.** `AsyncStorage.setItem` errors only go to `console.warn` (`src/state/lunar.tsx:121-123`). In a release build the user would never learn that their logs aren't being saved.

25. **[WARN] Costumes are bought on tap with no confirmation.** Tapping a locked costume tile spends the points right away (`src/app/customize.tsx:133`, `src/state/lunar.tsx:187-193`), and there is no undo. The boolean `chooseCostume` returns is never used.

26. **[WARN] The privacy promise depends on unencrypted storage and OS backups.** The spec says local storage should "guarantee privacy". AsyncStorage is plain, unencrypted storage. `app.json` doesn't set `android.allowBackup: false` (`app.json:13-21`), so Android Auto Backup can copy the data to the user's cloud backup, and iOS device backups include it too. If "on this device only" is a firm promise (the UI says so at `src/app/customize.tsx:147`), say how backups are handled or turn them off.

## Code quality

27. **[WARN] The pet's look is built in two places.** The same `useMemo` combining `pet` with `petAppearance(status, mood)` appears in `src/app/(tabs)/index.tsx:43-47` and `src/app/customize.tsx:37-40`. A `usePetLook()` hook would keep them from drifting apart.

28. **[WARN] A point value is hard-coded.** "Log anything to earn +5 care points" (`src/components/calendar-parts.tsx:284`) has `5` written in directly instead of using `LOG_POINTS` (`src/state/lunar.tsx:33`), which Home already uses (`src/app/(tabs)/index.tsx:210`).

29. **[WARN] Each screen starts its own date timer.** Every `useCycle()` call runs its own `useToday()`, each with a 60-second `setInterval` and an `AppState` listener (`src/state/use-cycle.ts:9-21`, `26`). Home, Calendar and Customize each call it, so up to three timers can run, and each screen could briefly see a different "today" around midnight. Moving `today` into `LunarProvider` would fix both.

30. **[WARN] Care action IDs are typed as plain strings.** `CARE_ACTIONS` is declared `as const` (`src/state/lunar.tsx:45-52`), but `care` and `toggleCare` accept any `string` (`27`, `70`). Using `(typeof CARE_ACTIONS)[number]['id']` would let TypeScript catch typos.

31. **[WARN] Unused code and dependencies.** `Spacing` (`src/constants/theme.ts:52-58`) is never imported. These packages from the starter template aren't imported anywhere in `src/`: `@expo/ui`, `expo-device`, `expo-glass-effect`, `expo-image`, `expo-symbols`, `expo-web-browser`, `react-native-gesture-handler`, `react-native-reanimated` and `react-native-worklets` (`package.json:8`, `12`, `14`, `15`, `20`, `22`, `26`, `27`, `31`).

32. **[WARN] The cycle math has no tests.** `src/lib/cycle.ts` and `src/lib/dates.ts` are pure functions with tricky edge cases (missed days, ongoing periods, overdue windows, month and DST boundaries), and there are no tests. A few table-driven tests would have caught finding 13.

## React Native and Expo best practices

33. **[WARN] The animated pet re-renders constantly, even when off-screen.** `PetAvatar` re-renders every 500 ms (`src/components/pet-avatar.tsx:28-32`) and rebuilds the sprite grid each frame (`38-41`). Each pet is drawn as hundreds of `View`s (`src/components/pixel.tsx:138-150`). The Home pet keeps animating while the Calendar tab is open or the Customize modal covers it, so two pets can be animating at once. Pausing when the screen isn't focused (`useIsFocused`) and caching both frames would cut this work.

34. **[WARN] Every toast re-renders the whole app.** `toast` lives in the same context as all app data, and the context value is a new object on every render (`src/state/lunar.tsx:99`, `209-212`). Each toast re-renders every consumer twice, once to show and once to hide 2.4 s later. That includes the Calendar grid and every pet sprite. A separate toast context, or a memoized value, would prevent this.

35. **[WARN] Accessibility gaps.** The period toggle buttons are read aloud as just "No" and "Yes", with no mention of "Period" (`src/components/calendar-parts.tsx:224-229`). `EnergyMeter` puts `accessibilityLabel` on a `View` that isn't marked `accessible` (`src/app/(tabs)/index.tsx:239`), so iOS VoiceOver won't read it as one item. `accessibilityLiveRegion` (`src/components/toast.tsx:14`) only works on Android, so iOS screen readers won't announce toasts.

36. **[PASS] Dates use time-zone-safe keys.** Days are stored as local `YYYY-MM-DD` strings, and date math is done in UTC (`src/lib/dates.ts:10-38`), so daylight-saving changes and travel won't shift a log to a different day. Comparing the strings directly (`src/lib/insights.ts:64-65`) works because of this format.

37. **[PASS] Startup, safe areas and routing follow Expo conventions.** The splash screen stays up until both fonts and saved data are ready, and the app still opens if fonts fail to load (`src/app/_layout.tsx:14`, `17-39`). Safe-area insets are applied to the tab bar (`src/app/(tabs)/_layout.tsx:18`) and to each screen's top padding. Navigation is file-based with Expo Router, and all non-route code is kept outside `src/app/`, as `AGENTS.md` asks. `tsc --noEmit` and `eslint src` both pass. Note: the `node` on this machine's PATH is v20.10.0, and `npx expo lint` refuses to run with it (Expo SDK 58 needs Node 22.13 or newer, as the README says).
