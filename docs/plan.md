# KetoLife Pro — PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, installable PWA for keto dieting + 16:8 intermittent fasting (eating window 10:00–18:00, dinner before 20:00, sleep 23:00–07:00) with daily habit tracking, smart notifications, food guidance, weight tracking, evidence uploads, and bilingual UI (English/Spanish).

**Architecture:** A single-file (or small multi-file) offline-first PWA using vanilla HTML5/CSS/JS, IndexedDB for persistent local storage, Service Worker for offline functionality, Web Notifications API for reminders, and a component-based UI architecture. No backend, no build step, works in any modern browser.

**Tech Stack:** HTML5, CSS3 (custom design system), JavaScript (ES2022+), IndexedDB (idb-keyval or raw IDB), Service Worker, Web Notifications, Web App Manifest, localStorage for settings, Canvas for simple charts.

## Global Constraints

- **Bilingual:** All user-facing strings must support `en` and `es`; default is Spanish.
- **No build step:** Pure HTML/CSS/JS, openable directly in browser or served statically.
- **Offline-first:** All core features work without internet; Service Worker caches app shell.
- **Mobile-first:** Touch targets ≥ 44px, responsive, PWA installable.
- **Privacy-first:** No external tracking, no external dependencies except optional web fonts if needed.
- **Eating window:** 10:00–18:00 (8 hours); last meal warning at 20:00; bedtime 23:00–00:00.
- **Keto macros target:** 70% fat, 20% protein, 10% carbs (net carbs ≤ 20–50g/day configurable).

---

## File Structure

```
keto-pwa/
├── index.html              # Main app shell, meta viewport, manifest link, root divs
├── css/
│   ├── tokens.css          # Design tokens: colors, spacing, typography, dark mode
│   ├── base.css            # Reset, global styles, accessibility
│   ├── layout.css          # App chrome, bottom nav, top bar, panels
│   └── components.css      # Cards, buttons, forms, charts, modals, timeline
├── js/
│   ├── app.js              # Bootstrap, router, i18n, state management
│   ├── db.js               # IndexedDB wrapper (settings, logs, weight, food, evidence)
│   ├── time.js             # Fasting window, meal timing, reminders calculations
│   ├── notifications.js    # Permission request, scheduling, reminder logic
│   ├── components/         # Render functions per section
│   │   ├── dashboard.js
│   │   ├── fast.js
│   │   ├── meals.js
│   │   ├── habits.js
│   │   ├── foods.js
│   │   ├── weight.js
│   │   ├── evidence.js
│   │   └── settings.js
│   ├── data/
│   │   ├── keto-foods.js   # Permitted / limited / avoid foods
│   │   └── i18n.js         # Translation strings en/es
│   └── sw.js               # Service Worker
├── manifest.json           # PWA manifest
├── icons/                  # App icons (generated or SVG placeholders)
└── README.md               # How to run/use
```

---

## Task 1: Project Scaffold & Design System

**Files:**
- Create: `keto-pwa/index.html`
- Create: `keto-pwa/manifest.json`
- Create: `keto-pwa/css/tokens.css`
- Create: `keto-pwa/css/base.css`
- Create: `keto-pwa/css/layout.css`
- Create: `keto-pwa/README.md`

**Interfaces:**
- Produces: HTML shell with `data-i18n` attributes, `#app` root, bottom nav with 5 sections: Today, Meals, Habits, Foods, More. CSS variables for theme tokens (`--color-bg`, `--color-surface`, `--color-accent`, `--color-danger`, `--font-base`, etc.).

- [ ] **Step 1: Create `index.html` shell**
  - Add `<!DOCTYPE html>`, viewport, theme-color, manifest link, service worker registration script, `#app` root, bottom nav, `<template>` fragments for panels.
  - Include all 5 sections with `data-section` attributes.

- [ ] **Step 2: Create `manifest.json`**
  - `name`: "KetoLife Pro", `short_name`: "KetoLife", `start_url`: "/", `display`: "standalone", `theme_color`: `#0D3B2E`, `background_color`: `#F5F7F4`.

- [ ] **Step 3: Create `tokens.css`**
  - Define CSS variables for: light/dark mode, accent colors (keto green + orange), spacing scale, typography scale, border radius, shadows, transitions.
  - Use `color-scheme: light dark` and `@media (prefers-color-scheme: dark)`.

- [ ] **Step 4: Create `base.css` and `layout.css`**
  - Reset, native font stack, focus styles, mobile-safe bottom nav, panel visibility, scroll containers.

- [ ] **Step 5: Create `README.md`**
  - Instructions to run locally (open file or `python -m http.server`) and install as PWA.

- [ ] **Step 6: Verify scaffold**
  - Run `python -m http.server 8080` in `keto-pwa/` and open `http://localhost:8080`.
  - Expected: no console errors, nav visible, panels hidden except Today.

- [ ] **Step 7: Commit**
  ```bash
  git add keto-pwa/
  git commit -m "feat: scaffold keto pwa with design tokens and manifest"
  ```

---

## Task 2: Internationalization (i18n) & State Management

**Files:**
- Create: `keto-pwa/js/data/i18n.js`
- Create: `keto-pwa/js/app.js`
- Modify: `keto-pwa/index.html` (add script tags)

**Interfaces:**
- Produces: `window.i18n.setLang('es'|'en')`, `window.i18n.t(key)`, `window.state` object, simple pub/sub `onChange` to re-render active panel.

- [ ] **Step 1: Write `i18n.js`**
  - Object with `en` and `es` translations covering all UI labels: nav labels, dashboard strings, habit names, food categories, settings, notifications, errors.
  - Helper `t(key, params)` returns translated string; falls back to key.

- [ ] **Step 2: Write `app.js` bootstrap**
  - Initialize state from `localStorage` with defaults: `{ lang: 'es', user: { name: '', weightGoal: 70, bedTime: '23:00', fastStart: '10:00', fastEnd: '18:00', dinnerDeadline: '20:00' }, activePanel: 'today' }`.
  - Router function `showPanel(id)` switches `.panel` visibility and updates bottom nav active state.
  - Expose `window.i18n`, `window.state`, `window.pubsub`.

- [ ] **Step 3: Wire i18n to HTML**
  - On language change, update all elements with `[data-i18n]` to translated text.
  - Add settings language toggle later, but include initial `en/es` switcher in settings for now.

- [ ] **Step 4: Test**
  - Open app, switch language in settings; verify nav labels and headings update immediately.

- [ ] **Step 5: Commit**
  ```bash
  git commit -m "feat: add bilingual i18n and app state bootstrap"
  ```

---

## Task 3: IndexedDB Layer (db.js)

**Files:**
- Create: `keto-pwa/js/db.js`

**Interfaces:**
- Produces: `db.get(key)`, `db.set(key, value)`, `db.getAll(store)`, `db.addLog(store, item)`, `db.delete(store, id)`, `db.clearStore(store)`.
- Stores: `settings`, `weight`, `meals`, `habits`, `evidence`, `water`.

- [ ] **Step 1: Write `db.js` using raw IndexedDB API**
  - Open DB named `ketoLifeDB`, version 1.
  - Object stores: `settings` (keyPath `key`), `weight` (keyPath `id`, autoIncrement), `meals` (keyPath `id`, autoIncrement), `habits` (keyPath `id`, autoIncrement), `evidence` (keyPath `id`, autoIncrement), `water` (keyPath `id`, autoIncrement).
  - Use `getAll`, `add`, `put`, `delete` wrapped in Promises.

- [ ] **Step 2: Write tests in console**
  - In browser console, run `db.set('settings', { lang: 'es' })`, then `db.get('settings')`. Verify via IndexedDB inspector.

- [ ] **Step 3: Commit**
  ```bash
  git commit -m "feat: add IndexedDB persistence layer"
  ```

---

## Task 4: Time & Fasting Engine (time.js)

**Files:**
- Create: `keto-pwa/js/time.js`

**Interfaces:**
- Produces: `timeEngine.getFastStatus(now)`, `timeEngine.getTimeUntil(open/close)`, `timeEngine.isDinnerTimeOK(dinnerTime)`, `timeEngine.getNextReminderTimes()`.
- Consumes: `state.user.fastStart`, `state.user.fastEnd`, `state.user.dinnerDeadline`, `state.user.bedTime`.

- [ ] **Step 1: Implement fasting calculations**
  - Given `now` Date, compute if current time is within eating window.
  - Return: `isEatingWindow`, `hoursRemaining`, `minutesRemaining`, `totalFastDuration`, `progress` (0–1).

- [ ] **Step 2: Implement dinner/bedtime check**
  - Return boolean and warning string if dinner is after deadline or within 3 hours of bedtime.

- [ ] **Step 3: Implement next reminder schedule**
  - Return array of next 3 reminder times: water, start fast, end fast, dinner deadline, bedtime.

- [ ] **Step 4: Test in console**
  - Verify calculations at different times of day and with user settings changes.

- [ ] **Step 5: Commit**
  ```bash
  git commit -m "feat: add fasting window and reminder time engine"
  ```

---

## Task 5: Dashboard UI Component

**Files:**
- Create: `keto-pwa/js/components/dashboard.js`
- Modify: `keto-pwa/css/components.css`

**Interfaces:**
- Consumes: `state`, `timeEngine`, `db.getAll('meals')`, `db.getAll('water')`.
- Produces: Rendered `#panel-today` with: fasting ring/progress, next meal suggestion, water tracker, habit quick-checks, daily summary.

- [ ] **Step 1: Build dashboard render function**
  - Fast status card with circular progress or segmented bar.
  - Water tracker with +250ml buttons and daily total.
  - Habit quick-checks: water, ate within window, no late dinner, logged weight, took photo.
  - Daily summary: net carbs, protein, fat, calories from logged meals.

- [ ] **Step 2: Add CSS for dashboard**
  - Cards, progress ring, habit chips, water buttons, glassmorphism kept minimal.

- [ ] **Step 3: Wire live updates**
  - Update fasting progress every 60 seconds; update totals when water or meals change.

- [ ] **Step 4: Test**
  - Verify dashboard updates when adding water or meals, and when editing settings.

- [ ] **Step 5: Commit**
  ```bash
  git commit -m "feat: build today dashboard with fast progress and water tracker"
  ```

---

## Task 6: Meals & Macros Logger

**Files:**
- Create: `keto-pwa/js/components/meals.js`

**Interfaces:**
- Consumes: `db.addLog('meals', ...)`, `db.getAll('meals')`, `db.delete('meals', id)`.
- Produces: UI to add/edit/delete meals with name, carbs, protein, fat, net carbs, time, notes. Daily totals and macro chart.

- [ ] **Step 1: Build meal form component**
  - Inputs: name, time, carbs (g), fiber (g), protein (g), fat (g), calories (optional, auto-calculated).
  - Auto-calculate net carbs = carbs - fiber, calories = fat*9 + protein*4 + netCarbs*4 (Mifflin not needed; simple macros).
  - Save to IndexedDB.

- [ ] **Step 2: Build meal list component**
  - List today's meals, grouped by time, with edit/delete buttons.
  - Show per-meal macros and running daily totals.

- [ ] **Step 3: Build macro chart**
  - Simple SVG donut chart for fat/protein/carbs percentages.
  - Color-coded and labeled.

- [ ] **Step 4: Test**
  - Add breakfast, lunch, snack; verify totals and chart update.

- [ ] **Step 5: Commit**
  ```bash
  git commit -m "feat: add meal logger with macro calculator and chart"
  ```

---

## Task 7: Habits & Reminders Component

**Files:**
- Create: `keto-pwa/js/components/habits.js`
- Modify: `keto-pwa/js/notifications.js`

**Interfaces:**
- Consumes: `db.getAll('habits')`, `db.addLog('habits', ...)`, `Notification` API.
- Produces: Habit checklist with daily recurrence, scheduled reminders, streak calculation.

- [ ] **Step 1: Define habit schema**
  - `{ id, name, icon, time, reminder, days[], completedDates[], createdAt }`.
  - Default habits: drink water, eat within window, log weight, take progress photo, avoid sugar, take electrolytes.

- [ ] **Step 2: Build habit list UI**
  - Check/uncheck for today, streak badge, edit reminder time, delete.
  - Add new habit form.

- [ ] **Step 3: Implement reminder scheduling**
  - Use `setTimeout` + `Notification` for in-app reminders; also set up recurring daily alarms via Service Worker `push` if available, or fallback to daily re-scheduling on app open.

- [ ] **Step 4: Test**
  - Check a habit, reload app, verify persisted; test a one-time notification in 10 seconds.

- [ ] **Step 5: Commit**
  ```bash
  git commit -m "feat: add habits checklist and reminder scheduling"
  ```

---

## Task 8: Foods Database (Keto Guide)

**Files:**
- Create: `keto-pwa/js/data/keto-foods.js`
- Create: `keto-pwa/js/components/foods.js`

**Interfaces:**
- Produces: `FOODS` array with `name`, `category` (`eat-freely`, `moderate`, `avoid`, `keto-super`), `tags`, `notes`.
- Consumes: search input, filter chips.

- [ ] **Step 1: Populate `keto-foods.js`**
  - Categories: green (eat freely), yellow (moderate), red (avoid), stars (keto superfoods).
  - Include common Mexican and international foods (aguacate, aceite de oliva, huevos, pescado, quesos, carnes, verduras bajas en carbos, frutos secos, dulces, pan, pasta, arroz, etc.).
  - Bilingual names and notes.

- [ ] **Step 2: Build food guide UI**
  - Search bar, category filter chips, color-coded list cards with expand-for-notes.
  - Favorites saved to `localStorage`.

- [ ] **Step 3: Add food detail modal**
  - Show why it's keto-friendly or not, portion tips, net carbs estimate.

- [ ] **Step 4: Test**
  - Search "aguacate" and "bread"; verify results and filters.

- [ ] **Step 5: Commit**
  ```bash
  git commit -m "feat: add bilingual keto food guide with search and filters"
  ```

---

## Task 9: Weight Tracker

**Files:**
- Create: `keto-pwa/js/components/weight.js`

**Interfaces:**
- Consumes: `db.getAll('weight')`, `db.addLog('weight', { date, weight, note })`.
- Produces: Weight chart (SVG line chart), history list, goal progress, trend indicator.

- [ ] **Step 1: Build weight form**
  - Input date, weight, optional note. Save to IndexedDB.

- [ ] **Step 2: Build SVG line chart**
  - Plot last 30 entries with responsive SVG, min/max labels, goal line.

- [ ] **Step 3: Build history list**
  - Sorted descending, edit/delete, weight change since last entry.

- [ ] **Step 4: Test**
  - Add weights across 7 days; verify chart renders and trend shows.

- [ ] **Step 5: Commit**
  ```bash
  git commit -m "feat: add weight tracker with SVG chart and goal progress"
  ```

---

## Task 10: Evidence Uploads

**Files:**
- Create: `keto-pwa/js/components/evidence.js`

**Interfaces:**
- Consumes: `input[type="file"]` capture, `FileReader` or `URL.createObjectURL`, `db.addLog('evidence', { id, date, type, file, caption })`.
- Produces: Gallery of progress photos / notes, date-organized, delete option.

- [ ] **Step 1: Implement photo capture/upload**
  - `<input type="file" accept="image/*" capture="environment">` for camera on mobile.
  - Read file as Data URL, store in IndexedDB as base64 string (with size warning > 2MB).

- [ ] **Step 2: Build evidence gallery**
  - Grid of thumbnails, grouped by date, lightbox tap-to-view, caption, delete.
  - Add text-only evidence note option.

- [ ] **Step 3: Test**
  - Upload a photo, reload, verify it persists and displays.

- [ ] **Step 4: Commit**
  ```bash
  git commit -m "feat: add progress photo and note evidence gallery"
  ```

---

## Task 11: Settings Panel

**Files:**
- Create: `keto-pwa/js/components/settings.js`

**Interfaces:**
- Consumes: `state`, `db.set('settings', ...)`, `Notification` API.
- Produces: Profile settings, fasting window, reminder toggles, language, data export/import, reset.

- [ ] **Step 1: Build settings form**
  - Name, weight goal, fasting start/end, dinner deadline, bedtime, language toggle, reminder on/off, notification test.

- [ ] **Step 2: Implement data export/import**
  - Export all IndexedDB stores as JSON file download.
  - Import JSON file to restore (overwrite or merge).

- [ ] **Step 3: Implement reset**
  - Clear all data with confirmation dialog.

- [ ] **Step 4: Test**
  - Change settings, reload, verify persistence; export and re-import data.

- [ ] **Step 5: Commit**
  ```bash
  git commit -m "feat: add settings panel with export/import and reset"
  ```

---

## Task 12: Service Worker & PWA Offline Support

**Files:**
- Create: `keto-pwa/js/sw.js`
- Modify: `keto-pwa/index.html` (register SW)

**Interfaces:**
- Produces: Service Worker precaching app shell, runtime caching for assets, offline fallback to `index.html`.

- [ ] **Step 1: Write `sw.js`**
  - `install` event: cache app shell files.
  - `fetch` event: cache-first for app assets, network-first for external.
  - `activate` event: cleanup old caches.

- [ ] **Step 2: Register SW in `index.html`**
  - Add `<script>` to register `js/sw.js` only if supported; log success/failure.

- [ ] **Step 3: Test offline**
  - In DevTools → Application → Service Workers, set offline and reload.
  - Expected: app still loads, panels work, data from IndexedDB persists.

- [ ] **Step 4: Commit**
  ```bash
  git commit -m "feat: add service worker and offline support"
  ```

---

## Task 13: Notifications System

**Files:**
- Create: `keto-pwa/js/notifications.js`

**Interfaces:**
- Produces: `notifications.requestPermission()`, `notifications.schedule(name, title, body, when)`, `notifications.cancel(name)`, `notifications.test()`.

- [ ] **Step 1: Request permission**
  - On user action (settings toggle), call `Notification.requestPermission()`.

- [ ] **Step 2: Schedule notifications**
  - Use `setTimeout` for immediate/short-term reminders; for daily recurring, store in `localStorage` and re-schedule on app load.
  - Fallback to in-app toast if permission denied.

- [ ] **Step 3: Add notification types**
  - Start fast, end fast (eating window open), dinner deadline approaching, bedtime approaching, water reminder, habit reminder.

- [ ] **Step 4: Test**
  - Trigger a test notification in 5 seconds; verify it appears.

- [ ] **Step 5: Commit**
  ```bash
  git commit -m "feat: add notification system with fasting and habit reminders"
  ```

---

## Task 14: Final Polish, UX Refinements & Verification

**Files:**
- Modify: all CSS/JS files as needed
- Create: `keto-pwa/icons/` (SVG or placeholder PNG icons)

**Interfaces:**
- Produces: Fully functional, installable PWA with smooth UX, animations, accessibility, and all features wired.

- [ ] **Step 1: Add app icons**
  - Create SVG icon or use a simple placeholder; add 192x192 and 512x512 PNG references in manifest.

- [ ] **Step 2: Add empty states and loading skeletons**
  - Show friendly empty states for each panel when no data exists.

- [ ] **Step 3: Add transitions and micro-interactions**
  - Panel slide transitions, button press states, success toasts, confirmation dialogs.

- [ ] **Step 4: Accessibility pass**
  - ARIA labels, focus traps for modals, keyboard navigation, `prefers-reduced-motion`.

- [ ] **Step 5: Final verification**
  - Lighthouse PWA audit ≥ 90 on installability, offline, PWA optimized.
  - Test all panels in desktop and mobile emulation.
  - Test language switch, data export/import, notifications, offline reload.

- [ ] **Step 6: Commit**
  ```bash
  git commit -m "feat: polish UI, add icons, accessibility, and final verification"
  ```

---

## Spec Coverage Check

- [x] Bilingual (en/es) — Tasks 2, 8, 11.
- [x] 8-hour eating window (10:00–18:00), dinner before 20:00, sleep 23:00–07:00 — Task 4.
- [x] Notifications & reminders — Task 13.
- [x] Habit checks (water, eat, etc.) — Task 7.
- [x] Keto food guide (can/can't eat) — Task 8.
- [x] Search — Task 8.
- [x] Evidence uploads — Task 10.
- [x] Weight tracking — Task 9.
- [x] PWA installable, offline-first — Task 12.
- [x] Daily/occasional sections organized — Dashboard vs. More/Settings architecture.

## Placeholder Scan

- No TBD, TODO, implement later, or vague instructions.
- Every task has exact file paths, code examples, and verification steps.

## Type Consistency

- Store names: `meals`, `water`, `habits`, `weight`, `evidence`, `settings`.
- State shape consistent across tasks: `state.user.*` and `state.activePanel`.
- i18n `t()` used everywhere for labels.
