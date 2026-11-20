# cycle-tracker

I wanted to make a period tracker that involved a digital mascot, and that actually adjusts to irregular cycles and informs the user what to expect with energy levels and track patterns. 

## What the app does

The app lets the user mark which days they have their cycle on a calendar, predicts future cycles based on the historical user data, as well as expectations on heavier/lighter flow. There is a custom mascot that reflects the user's moods and expected energy levels. 

## Screens
There are two screens. The first is the home screen, where the user sees the digital pet and is able to interact with it. The second is the calendar screen, which is not gamified at all, and purely serves as a tracker with predictions and analytics.

### Home
- dialogue with the pet (when tapped on) and custom modifications of the pet's species, color, costume, and name with the edit pencil icon
- a tracker of care points that increase when the user marks certain self-care actions as complete, like drinking water, eating good food, etc.
- the day and phase of the cycle
- energy level, expected flow, and next period predictions.

### Calendar
- log entries for each day on the calendar, including symptoms and mood
- patterns displaying average cycle, variability, average period length, and number of cycles
- pink/red days symbolize period days, and intensity depends on the flow intensity
- dashed lines around expected period days, taking variability into account

## Setup and running

**Expo SDK:** 58 (`expo@~58.0.25`, React Native 0.88, Expo Router)
**Tested on:** iPhone 17

### Prerequisites

- [Node.js](https://nodejs.org/) **22.13 or newer** (Expo SDK 58 / React Native 0.88 require it; Node 20 prints engine warnings and may fail)
- One of:
  - The **Expo Go** app on a phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)). It must be the build that supports **SDK 58**. If the App Store version is newer, install a matching one from [expo.dev/go](https://expo.dev/go).
  - An iOS Simulator (Xcode on macOS) or Android Emulator (Android Studio)

### Run it

```bash
git clone https://github.com/agongster/cycle-tracker.git
cd cycle-tracker
npm install
npx expo start
```

Once the dev server starts:

- **Phone:** scan the QR code. On iOS use the Camera app; on Android use the scanner in Expo Go. Your phone and computer need to be on the same Wi-Fi network. If they can't connect (for example on campus Wi-Fi), try `npx expo start --tunnel`.
- **iOS Simulator:** press `i` in the terminal.
- **Android Emulator:** press `a` in the terminal.
- **Web:** press `w` in the terminal.

Saving a file reloads the app automatically. To open the developer menu, shake the device or press `m` in the terminal.

### Run the tests

```bash
npm test
```

Runs the Jest unit tests in `src/lib/__tests__/`. They cover the cycle math, predictions, care-point rules, and the check on saved data.

### Trying it out

A fresh install starts with no data. To see predictions and stats right away, tap the pencil button on Home, then **Load sample cycles** (six irregular cycles, 26–34 days). **Erase everything** on the same screen resets the app. All data is stored only on the device (AsyncStorage) and survives app restarts. Android cloud backup is turned off in `app.json` (`allowBackup: false`). That setting only applies to a development or store build, not Expo Go.

### Project structure

```
src/app/                 screens (Expo Router file-based routing)
  _layout.tsx            root Stack: loads fonts + saved data, hosts the toast, crash screen
  (tabs)/_layout.tsx     custom pixel-art tab bar (Home, Calendar)
  (tabs)/index.tsx       Home: pet, dialogue/insight card, self-care, care points
  (tabs)/calendar.tsx    Calendar: month grid, log entry panel, history summary
  customize.tsx          modal for pet name, species, color, costumes, data tools
src/components/          pixel UI kit (boxes, buttons, text), pet avatar, calendar parts, toast
src/lib/                 plain TypeScript, no React (unit tested in __tests__/)
  cycle.ts               period grouping, averages, variability, predictions, phase
  dates.ts               timezone-safe YYYY-MM-DD date math
  insights.ts            pet dialogue, advice, and phase/mood -> pet appearance
  rewards.ts             care-point rules (logging and self-care), costumes
  saved-state.ts         saved data shape + checking data loaded from storage
  sprites.ts             procedural pixel art for pets, costumes, props, icons
src/state/
  lunar.tsx              app state, today's date, AsyncStorage load/save
  toast.tsx              toast messages (kept separate so they don't re-render screens)
  use-cycle.ts           derived cycle stats for today, and the pet's look
src/constants/theme.ts   warm color palette, fonts
```

Fonts: [Silkscreen](https://fonts.google.com/specimen/Silkscreen) (headings) and [Jersey 15](https://fonts.google.com/specimen/Jersey+15) (body), via `@expo-google-fonts`. All pet and icon art is drawn in code. There are no image assets.

## What surprised me about mobile development

I think what surprised me about mobile development is how similar it is to actual webapp development. I'd always assumed that mobile development needed a special set of knowledge that was quite different from other platforms, but through this experience I realized that that isn't necessarily the case. While it does require specialized tools, and can be difficult to get an app published, the core coding concepts remain the same. 
