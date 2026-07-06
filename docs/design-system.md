# KetoLife Pro — Design System & UX Guidelines

## 1. Surface Archetype

This app is primarily a **Monitor + Operate** surface. The user opens it several times a day to check fasting status, log meals/water, mark habits, and review progress. It is not a marketing landing page. Avoid hero sections, generic feature grids, and decorative stats.

## 2. Personality

- **Clean and clinical, but warm.** Health data should feel trustworthy, not cold.
- **Action-first.** The most common actions (log water, check habit, add meal) are reachable in ≤ 2 taps from any screen.
- **Rewarding without being childish.** Subtle progress rings, streaks, and positive confirmations.
- **Bilingual by default.** All labels and content are available in `es` and `en`.

## 3. Color Palette

```css
:root {
  --keto-green: #0D3B2E;        /* Primary brand, dark trust */
  --keto-green-light: #1A5E48;  /* Hover/active states */
  --accent-orange: #FF8C42;     /* Fasting state, action, energy */
  --accent-yellow: #F4C430;     /* Warnings, late dinner */
  --danger-red: #E84855;        /* Avoid foods, errors */
  --success-mint: #2ECC71;      /* Completed habits, in-window */
  --bg-light: #F5F7F4;         /* Page background */
  --surface-light: #FFFFFF;      /* Cards */
  --text-primary-light: #1A1A1A;
  --text-secondary-light: #5A5A5A;
  --border-light: #E2E4E0;

  @media (prefers-color-scheme: dark) {
    --bg-dark: #0F1412;
    --surface-dark: #151C19;
    --text-primary-dark: #F0F2F0;
    --text-secondary-dark: #9CA3A0;
    --border-dark: #2A3330;
  }
}
```

Use color semantically:
- Green = success, in-window, allowed foods.
- Orange = fasting active, eat soon, moderate foods.
- Yellow = warning, approaching deadline, bedtime soon.
- Red = avoid, error, late dinner, out-of-window.

## 4. Typography

```css
--font-base: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
```

Scale (mobile-first, in rem):
- `--text-xs: 0.75rem` — captions, timestamps
- `--text-sm: 0.875rem` — secondary labels, nav labels
- `--text-base: 1rem` — body
- `--text-lg: 1.125rem` — card titles
- `--text-xl: 1.375rem` — panel headings
- `--text-2xl: 1.75rem` — large numbers, hero metrics
- `--text-3xl: 2.25rem` — empty state titles

Use font-weight to create hierarchy: 600 for headings, 500 for labels, 400 for body.

## 5. Spacing & Layout

- Page padding: `1rem` (16px) horizontal.
- Card padding: `1rem` internal.
- Card gap: `0.75rem` between cards.
- Border radius: `1rem` for cards, `0.75rem` for buttons/inputs, `999px` for pills.
- Bottom nav height: `64px` plus safe-area-inset-bottom.
- Max content width: `680px` centered with auto margins.

## 6. Components

### Bottom Navigation
- 5 items: Today, Meals, Habits, Foods, More.
- Active state: filled icon + primary color + subtle top highlight (2px).
- Inactive: outline icon + muted text.
- Fixed to bottom, safe area aware, backdrop blur on supported browsers.

### Cards
- White/dark surface, 1rem radius, soft shadow (`0 2px 8px rgba(0,0,0,0.04)`), 1px border.
- Optional 4px left accent strip to indicate category (green/orange/yellow/red).
- Title row: icon + label + action button.

### Progress Ring
- SVG circular progress for fasting window.
- Stroke width 10, radius 54, center text showing hours/minutes remaining.
- Color changes based on state: green (in window), orange (fasting), yellow (last hour), red (over deadline).

### Habit Chips
- Horizontal scroll on mobile, grid on desktop.
- Each chip: icon + label + checkmark circle.
- Checked state: green background, white icon, subtle scale animation.
- Unchecked state: outlined, muted.

### Buttons
- Primary: solid keto-green, white text, full-width on mobile.
- Secondary: outlined, green text.
- Danger: solid red.
- Floating Action Button (FAB): circular, accent orange, fixed bottom-right above nav.

### Forms
- Inputs: 1px border, 0.75rem radius, 12px/16px padding.
- Labels above inputs, small and muted.
- Number inputs with stepper buttons on mobile-friendly touch targets.
- Toggle switches for settings, not checkboxes.

### Modals
- Full-screen overlay, bottom sheet on mobile.
- Header with title + close X, scrollable body, sticky footer with primary action.
- Enter/exit animation: slide up + fade.

### Empty States
- Friendly icon (emoji or SVG), short headline, 1-line explanation, primary CTA.
- No sad/empty faces; use optimistic language.

### Toasts
- Bottom-center, auto-dismiss 3s, color-coded by type.
- One at a time, stacked if needed.

## 7. Motion

- Transitions: `0.2s ease-out` for color/transform, `0.3s ease-out` for layout.
- Panel switching: cross-fade or slide (keep under 250ms to avoid lag).
- Button press: scale(0.97) on active.
- Habit check: scale pop + checkmark draw.
- Progress ring: animated stroke-dashoffset on update.

Respect `prefers-reduced-motion: reduce`.

## 8. Accessibility

- Touch targets minimum 44×44px.
- Focus rings visible on all interactive elements (2px outline, offset 2px).
- ARIA labels on icon-only buttons.
- Color is never the sole indicator; pair with icon or text.
- Inputs have associated labels.
- Bottom nav uses `role="tablist"` and `role="tab"`.

## 9. Unique UX Patterns

### Smart Daily Ribbon
At the top of the Today panel, show a contextual ribbon:
- "Eating window open — 4h 12m left" (green)
- "Fasting — next meal at 10:00" (orange)
- "Cena deadline: 20:00" (yellow if approaching)
- "Time to wind down — bedtime at 23:00" (blue/green at night)

### 3-Hour Dinner Rule
When the user logs a meal after 20:00 or within 3 hours of bedtime, show a gentle warning: "Try to finish dinner 3 hours before bed for better sleep and ketosis."

### Quick Log Shortcuts
On the Today panel, show 3 large tappable chips: "+ Water", "+ Meal", "+ Habit". Reduce taps for common actions.

### Macro Traffic Light
In the Meals panel, show a small traffic light next to each meal: green if net carbs ≤ 5g, yellow 6–15g, red > 15g. Also applies to daily total.

### Weekly Streak Flame
On the Habits panel, show a flame icon with current streak for each habit. Tapping reveals history.

### Evidence Timeline
On the Evidence panel, show a vertical timeline with date markers and thumbnails. Tap to expand.

## 10. Responsive Behavior

- Mobile (≤480px): single column, bottom nav, full-width cards.
- Tablet (481–900px): 2-column dashboard, bottom nav becomes side nav.
- Desktop (>900px): max-width 680px centered, sidebar on left for desktop view if needed, but mobile-first layout remains usable.

## 11. Iconography

Use SVG icons inline. Recommended set per section:
- Today: home, droplet, fire, scale, check-circle
- Meals: utensils, plus, edit, trash, chart-pie
- Habits: repeat, check, bell, flame, plus
- Foods: search, filter, info, heart, check, x
- More: settings, user, download, upload, trash, moon, bell

Avoid emoji as primary UI elements; use them only as friendly accents.

## 12. Writing Tone

- Spanish: tú, directo, positivo. Ej: "¡Ventana de comida activa!", "Toma un vaso de agua", "Cena antes de las 20:00".
- English: casual, encouraging. Ex: "Eating window is open!", "Take a water break", "Finish dinner by 8:00 PM".
- Avoid medical claims. Use "supports", "may help", "recommended".

---

All implementers must follow these guidelines. Consistency across all panels is mandatory.
