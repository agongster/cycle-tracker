# cycle-tracker

I wanted to make a period tracker that involved a digital mascot, and that actually adjusts to irregular cycles and informs the user what to expect with energy levels and track patterns. 

## What the app does

The app lets the user mark which days they have their cycle on a calendar, predicts future cycles based on the historical user data, as well as expectations on heavier/lighter flow. There is a custom mascot that reflects the user's moods and expected energy levels. 

## Screens

<!-- ✍️ WRITE THIS YOURSELF (no AI): one entry per screen. Describe what it shows and what the user can do there. -->

### Home
_TODO (April)_

### Calendar
_TODO (April)_

### Customize your pal (opens from the pencil button on Home)
_TODO (April)_

## Setup and running

**Expo SDK:** 58 (`expo@~58.0.25`, React Native 0.88, Expo Router)
**Tested on:** _TODO (April): e.g. "iPhone 15, iOS 26, Expo Go (SDK 58)" or "iOS Simulator, iPhone 16 Pro"_

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

### Trying it out

A fresh install starts with no data. To see predictions and stats right away, tap the pencil button on Home, then **Load sample cycles** (six irregular cycles, 26–34 days). **Erase everything** on the same screen resets the app. All data is stored only on the device (AsyncStorage) and survives app restarts.

### Project structure

```
src/app/                 screens (Expo Router file-based routing)
  _layout.tsx            root Stack: loads fonts + saved data, hosts the toast
  (tabs)/_layout.tsx     custom pixel-art tab bar (Home, Calendar)
  (tabs)/index.tsx       Home: pet, dialogue/insight card, self-care, care points
  (tabs)/calendar.tsx    Calendar: month grid, log entry panel, history summary
  customize.tsx          modal for pet name, species, color, costumes, data tools
src/components/          pixel UI kit (boxes, buttons, text), pet avatar, calendar parts, toast
src/lib/
  cycle.ts               period grouping, averages, variability, predictions, phase
  dates.ts               timezone-safe YYYY-MM-DD date math
  insights.ts            pet dialogue, advice, and phase/mood -> pet appearance
  sprites.ts             procedural pixel art for pets, costumes, props, icons
src/state/
  lunar.tsx              app state + AsyncStorage persistence + care points
  use-cycle.ts           derived cycle stats for today
src/constants/theme.ts   warm color palette, fonts, spacing
```

Fonts: [Silkscreen](https://fonts.google.com/specimen/Silkscreen) (headings) and [Jersey 15](https://fonts.google.com/specimen/Jersey+15) (body), via `@expo-google-fonts`. All pet and icon art is drawn in code. There are no image assets.

## What surprised me about mobile development

<!-- ✍️ WRITE THIS YOURSELF (no AI). -->

_TODO (April)_
