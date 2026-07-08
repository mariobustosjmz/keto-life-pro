// Time and fasting engine for KetoLife Pro
// Pure JS, no external dependencies. Uses local time.

const TimeEngine = {
  // Return a Date object for "now". If localStorage has a simulated date (ketoSimDate: YYYY-MM-DD),
  // combine that date with the current local time so the day advances while the wall-clock hour stays real.
  getToday() {
    try {
      const sim = localStorage.getItem('ketoSimDate');
      if (sim) {
        const [y, m, d] = sim.split('-').map(Number);
        if (y && m && d) {
          const now = new Date();
          return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        }
      }
    } catch (e) {
      console.error('Error reading ketoSimDate:', e);
    }
    return new Date();
  },

  // ISO date string (YYYY-MM-DD) for the simulated or real today
  todayKey() {
    return this.getToday().toISOString().split('T')[0];
  },

  // Convert "HH:MM" to minutes from midnight
  toMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  },

  // Convert minutes from midnight to "HH:MM"
  fromMinutes(mins) {
    mins = ((mins % 1440) + 1440) % 1440; // wrap within 24h
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  // Get current time as minutes from midnight
  nowMinutes() {
    const now = this.getToday();
    return now.getHours() * 60 + now.getMinutes();
  },

  // Difference in minutes from now to target time today (can be negative if past)
  minutesUntil(targetTimeStr) {
    const target = this.toMinutes(targetTimeStr);
    const now = this.nowMinutes();
    return target - now;
  },

  // Format minutes into "2h 15m" or "15m" (positive or negative)
  formatDuration(totalMinutes) {
    const sign = totalMinutes < 0 ? '-' : '';
    const abs = Math.abs(totalMinutes);
    const h = Math.floor(abs / 60);
    const m = Math.floor(abs % 60);
    if (h > 0) return `${sign}${h}h ${m}m`;
    return `${sign}${m}m`;
  },

  // Format minutes into localized string
  formatDurationLocalized(totalMinutes, lang = 'es') {
    const labels = {
      es: { h: 'h', m: 'min' },
      en: { h: 'h', m: 'min' }
    };
    const l = labels[lang] || labels.es;
    const abs = Math.abs(totalMinutes);
    const h = Math.floor(abs / 60);
    const m = Math.floor(abs % 60);
    if (h > 0 && m > 0) return `${h}${l.h} ${m}${l.m}`;
    if (h > 0) return `${h}${l.h}`;
    return `${m}${l.m}`;
  },

  // Compute fasting / eating window status given settings and current time
  getFastStatus(settings, now = null) {
    if (!now) now = this.getToday();
    const fastStart = this.toMinutes(settings.fastStart || '10:00');
    const fastEnd = this.toMinutes(settings.fastEnd || '18:00');
    const minutes = now.getHours() * 60 + now.getMinutes();

    // Normalize eating window (fastStart = eating window open, fastEnd = eating window close)
    let eatingStart = fastStart;
    let eatingEnd = fastEnd;

    if (eatingEnd < eatingStart) {
      // Overnight eating window (not expected for this app, but handle gracefully)
      eatingEnd += 1440;
    }

    let isEatingWindow = false;
    if (eatingStart <= eatingEnd) {
      isEatingWindow = minutes >= eatingStart && minutes < eatingEnd;
    } else {
      isEatingWindow = minutes >= eatingStart || minutes < (eatingEnd % 1440);
    }

    const totalEatingWindow = ((eatingEnd - eatingStart) % 1440 + 1440) % 1440;
    const totalFastingWindow = 1440 - totalEatingWindow;

    let minutesRemaining = 0;
    let progress = 0;
    let nextEventTime = null;
    let nextEventLabel = null;

    if (isEatingWindow) {
      minutesRemaining = eatingEnd - minutes;
      progress = (minutes - eatingStart) / totalEatingWindow;
      nextEventTime = this.fromMinutes(eatingEnd % 1440);
      nextEventLabel = 'fastStart';
    } else {
      // We are fasting. Compute minutes until eating window opens.
      if (minutes < eatingStart) {
        minutesRemaining = eatingStart - minutes;
      } else {
        minutesRemaining = (1440 - minutes) + eatingStart;
      }
      // Progress in fasting window: 0 at start of fast, 1 at fast end
      const fastElapsed = totalFastingWindow - minutesRemaining;
      progress = fastElapsed / totalFastingWindow;
      nextEventTime = this.fromMinutes(eatingStart);
      nextEventLabel = 'fastEnd';
    }

    // Clamp
    progress = Math.max(0, Math.min(1, progress));

    return {
      isEatingWindow,
      minutesRemaining,
      formattedRemaining: this.formatDuration(minutesRemaining),
      formattedRemainingLocalized: (lang) => this.formatDurationLocalized(minutesRemaining, lang),
      totalEatingWindow,
      totalFastingWindow,
      progress,
      nextEventTime,
      nextEventLabel,
      currentTime: this.fromMinutes(minutes)
    };
  },

  // Check if a given dinner time is OK relative to dinnerDeadline and bedtime
  isDinnerTimeOK(dinnerTime, settings) {
    const dinnerMinutes = this.toMinutes(dinnerTime);
    const deadline = this.toMinutes(settings.dinnerDeadline || '20:00');
    const bed = this.toMinutes(settings.bedTime || '23:00');

    const beforeDeadline = dinnerMinutes <= deadline;
    const hoursBeforeBed = ((bed - dinnerMinutes) % 1440 + 1440) % 1440 / 60;
    const threeHoursBeforeBed = hoursBeforeBed >= 3;

    const warnings = [];
    if (!beforeDeadline) {
      warnings.push('dinnerAfterDeadline');
    }
    if (!threeHoursBeforeBed) {
      warnings.push('dinnerTooCloseToBed');
    }

    return {
      ok: beforeDeadline && threeHoursBeforeBed,
      beforeDeadline,
      threeHoursBeforeBed,
      hoursBeforeBed,
      warnings,
      deadlineTime: this.fromMinutes(deadline),
      bedTime: this.fromMinutes(bed)
    };
  },

  // Get next scheduled reminder times for today
  getNextReminderTimes(settings, now = null) {
    if (!now) now = this.getToday();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const events = [
      { key: 'fastStart', label: 'fastStart', time: settings.fastStart || '10:00' },
      { key: 'fastEnd', label: 'fastEnd', time: settings.fastEnd || '18:00' },
      { key: 'dinnerDeadline', label: 'dinnerDeadline', time: settings.dinnerDeadline || '20:00' },
      { key: 'bedTime', label: 'bedTime', time: settings.bedTime || '23:00' },
      { key: 'water', label: 'water', time: '09:00' } // default water reminder
    ];

    // Sort by time today, wrapping events that already passed to tomorrow
    return events
      .map(ev => {
        let t = this.toMinutes(ev.time);
        let dayOffset = 0;
        if (t < minutes) dayOffset = 1;
        return {
          ...ev,
          minutes: t + dayOffset * 1440,
          displayTime: this.fromMinutes(t)
        };
      })
      .sort((a, b) => a.minutes - b.minutes)
      .slice(0, 4);
  },

  // Compute percentage of water goal reached
  waterProgress(mlLogged, goalMl = 2500) {
    return Math.min(1, Math.max(0, mlLogged / goalMl));
  },

  // Compute macro percentages from grams
  macroPercentages(fat, protein, netCarbs) {
    const fatCal = (fat || 0) * 9;
    const proteinCal = (protein || 0) * 4;
    const carbCal = (netCarbs || 0) * 4;
    const total = fatCal + proteinCal + carbCal;
    if (!total) return { fat: 0, protein: 0, carbs: 0, totalCalories: 0 };
    return {
      fat: fatCal / total,
      protein: proteinCal / total,
      carbs: carbCal / total,
      totalCalories: total
    };
  },

  // Calculate net carbs from total carbs and fiber
  netCarbs(totalCarbs, fiber) {
    return Math.max(0, (totalCarbs || 0) - (fiber || 0));
  },

  // Calculate calories from macros
  calories(fat, protein, netCarbs) {
    return (fat || 0) * 9 + (protein || 0) * 4 + (netCarbs || 0) * 4;
  }
};

if (typeof window !== 'undefined') {
  window.TimeEngine = TimeEngine;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimeEngine;
}
