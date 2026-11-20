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
