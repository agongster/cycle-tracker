# Prompt log — cycle-tracker

## AI tools used

- **Claude Code** (VS Code extension), model Claude Opus 5.5: explaining the project and Expo Go, setting up git, and scaffolding the README and assignment files.
- _TODO (April): add any other tools, e.g. the second agent used for REVIEW.md._

## Prompts

Prompts are copied verbatim. Notes in _italics_ summarize what happened.

---

### 1. Understanding the project layout and Expo Go (2026-11-16)

> please see aprils-app and help me understand the overall layout and the limitations of using expo go for mobile app development. what can i do, and what can't i?

_Claude read the starter project and explained it. Every file in `src/app/` is a screen (Expo Router file-based routing). `_layout.tsx` sets up the theme and the tab navigator. `app-tabs.tsx` has a `.web.tsx` twin, and the bundler uses that one on web. Colors are kept in `constants/theme.ts`. Using Expo's docs, it listed what Expo Go can and can't do. You can build all the JS/UI and use the Expo SDK modules that come with Expo Go. You can't use other native libraries, a custom icon, name or splash screen, remote push notifications, or native config changes. Expo Go also has to match the project's SDK (58). Any of those things needs a development build instead._

---

### 2. Pushing to GitHub (2026-11-16)

> can you commit all these files in aprils-app to https://github.com/agongster/cycle-tracker.git? add the README.md

_Claude merged the GitHub repo's existing initial commit (a one-line README) into the local history instead of overwriting it. It titled the README "cycle-tracker" and pushed to `main`._

---

### 3. Setting up the deliverables (2026-11-16)

> note all the final requirements, please set up this for me:
>
> [pasted the assignment's submission requirements: Code, README.md, SPEC.md and REVIEW.md, prompt log]

_Claude restructured README.md into the required sections. It wrote the setup/run section and left the "don't use AI" sections as TODOs for me. It also created placeholder SPEC.md and REVIEW.md files for me to fill in, and started this prompt log._

---

<!-- Add new prompts below. Include the ones where you asked AI to EXPLAIN React Native concepts
     (e.g. "what does useState do?", "why do I need SafeAreaView?"). The assignment specifically wants those. -->

---

### 4. Building the app from my spec (2026-11-20)

> please follow SPEC.md and create the fully working app as directed. thematically, please make it warm with a pixel-art style.

_Claude built "Lunar Pal" from SPEC.md. **Home** has an animated pixel pet whose outfit, expression and props change with the predicted phase (pajamas + tea while menstrual, cozy sweater + tea on late-luteal days, sparkles when ovulatory). It also has a speech-bubble card with cycle day, phase, energy meter, expected flow and next period, plus six self-care toggles (+2 points each) and a care-point counter. **Calendar** has a month grid with period days colored by flow and predicted windows shown with dashed (likely) and dotted (possible) borders. Below it are a log panel (date arrows, period toggle, flow picker, symptoms, mood) that earns +5 points the first time a day is logged, and a history summary (average cycle, ± variability, range, average period, recent-cycle bars). A **Customize** modal sets name, species (cat/bunny/bear/pup), fur color, and costumes bought with care points. Predictions are windows that widen with variability. When a cycle runs long, the pet says so gently and never counts "days late." All data is saved locally with AsyncStorage. Claude drew all the pixel art in code with automatic outlines. It swapped the Pixelify Sans font for Jersey 15 because Pixelify's "5" looked like an "S". It verified the app with tsc, expo lint, iOS/Android bundle exports, and headless-browser screenshots of each screen._

---

### 5. Code review against the spec (2026-11-20)

> Review the React Native/Expo code in this project against the spec in SPEC.md.
> For each acceptance criterion in the spec, verify whether the code actually implements it correctly.
> Also check for:
> - Bugs or logic errors
> - Missing error handling
> - Code quality issues (unclear naming, repeated code, etc.)
> - Best practices for React Native or other technologies
>
> Format your review as a numbered list of findings, each marked as [PASS], [FAIL], or [WARN].
> Be specific. Reference file names and line numbers.
> Do not fix anything in this session. Report only.
> Export the review as REVIEW.md at the root of the project.

_Claude read all of `src/`, ran `tsc` and `eslint` (both clean), and tested the cycle prediction code on made-up data. It wrote REVIEW.md with 37 findings: 14 PASS, 5 FAIL, 18 WARN. Every spec item passed. The FAILs were: Home says "None expected today" on the predicted period start day; a failed data load overwrites saved data with defaults; tapping the pet permanently replaces the daily dialogue; spent care points can be earned back by toggling care off and on; and the previous-day arrow does nothing on future dates. No code was changed._

---

### 6. Fixing the review's five FAILs (2026-11-20)

> please see REVIEW.md. i want to fix the following errors: 13, the home and calendar should agree at all times, especially the day a period is predicted to start. 14, it is important that if loading saved data fails, it is not completely overwritten. 15, the dialogue should fade momentarily. 16, this is simply just a bug in the way that care points are calculated. 17, previous day arrow should be functional. in the end, please summarize the fix you made for each issue.

_Claude fixed findings 13–17 and left REVIEW.md as it was. **13:** Home now uses the same "next period" as the Calendar (`predictions[0]`) and reads its Flow line from the same mark the Calendar puts on today. One shared `nextPeriodText` writes both Home's "Next" row and the Calendar's "Next period". **14:** loading retries a failed read; if it still fails, saving is switched off for that session so stored data is never overwritten, and a toast explains why. Damaged data is copied to a backup key before starting fresh. **15:** a tapped affirmation fades in and fades back to the daily line after about 3.5 s. **16:** a new `carePaid` record means each self-care action pays only once per day. Unchecking refunds the points only if you still have them. **17:** ◀ now works from future days; ▶ still stops at today. Claude checked the fixes with tsc, lint, a Node script comparing Home and Calendar day by day, and headless-browser runs of each fix, including simulated damaged and unreadable storage._

---

### 7. Stopping point farming, spotting, and the review's warnings (2026-11-20)

> make it so that user cannot farm log points by filling in days repeatedly. that is, they should not be able to erase previous logs and fill them in again for points. you probably need some sort of flag to determine whether something has been touched previously or not. a single logged spotting day does not necessarily start a new cycle, as seen in point 21 of review.md. fix all valid warnings in review.md as well.

_Claude added a permanent "touched" list of days that have ever been logged. A touched day never earns points again, even after "Clear day", and sample days count as touched. Only one logged day earns +5 per real day, so backfilling months of days earns 5, not 5 per day. Spotting-only days no longer start a cycle; a cycle starts on the first day of real flow. Claude judged all 18 WARNs (18–35) valid and fixed each: toasts now show inside the Customize sheet, a blank pet name can't be saved, "Log today" always opens today, saved data is checked field by field, there's a crash screen, failed saves show a warning, buying a costume asks first, Android cloud backup is off, the pet's look comes from one hook, there's a single shared "today", care IDs are typed, unused code and 9 unused packages are gone, there are 69 Jest unit tests, the pet's animation pauses when its screen isn't showing, toasts have their own context, and screen-reader labels were fixed. It moved the points rules and the saved-data check into plain modules (`src/lib/rewards.ts`, `src/lib/saved-state.ts`) so they could be tested. Claude checked everything with tsc, lint, `npm test`, iOS/Android bundle exports, and headless-browser runs (including a simulated crash). REVIEW.md was left unchanged._
