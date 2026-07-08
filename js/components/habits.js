(function () {
  const HABIT_STORE = 'habits';
  const BELL_ICON = '/icons/icon-192x192.png';

  const ICONS = {
    water: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"/></svg>',
    meal: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v9a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V7"/><path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/><path d="M12 14v-2"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    scale: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8.5" y1="10" x2="15.5" y2="10"/></svg>',
    camera: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
    'no-sugar': '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><path d="M10 14l2-2m2-2l2-2"/></svg>',
    electrolytes: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M2 12h20"/></svg>',
    default: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  };

  function iconSvg(key) {
    return ICONS[key] || ICONS.default;
  }

  const DEFAULT_HABITS = [
    { name: 'drinkWater', icon: 'water', time: '08:00', reminder: true, streak: 0, completed: false },
    { name: 'eatWithinWindow', icon: 'meal', time: '10:00', reminder: true, streak: 0, completed: false },
    { name: 'noLateDinner', icon: 'moon', time: '20:00', reminder: true, streak: 0, completed: false },
    { name: 'logWeight', icon: 'scale', time: '07:00', reminder: true, streak: 0, completed: false },
    { name: 'takePhoto', icon: 'camera', time: '08:00', reminder: true, streak: 0, completed: false },
    { name: 'avoidSugar', icon: 'no-sugar', time: '10:00', reminder: true, streak: 0, completed: false },
    { name: 'takeElectrolytes', icon: 'electrolytes', time: '09:00', reminder: true, streak: 0, completed: false }
  ];

  const DAYS_MS = 24 * 60 * 60 * 1000;

  function todayKey() {
    return window.TimeEngine ? window.TimeEngine.todayKey() : new Date().toISOString().split('T')[0];
  }

  function isSameDay(a, b) {
    if (!a || !b) return false;
    return a.split('T')[0] === b.split('T')[0];
  }

  async function ensureDefaults() {
    const all = await window.db.getAll(HABIT_STORE);
    if (all.length === 0) {
      for (const habit of DEFAULT_HABITS) {
        await window.db.add(HABIT_STORE, {
          ...habit,
          createdAt: new Date().toISOString(),
          completedAt: null,
          lastStreakAt: null,
          reminderDate: todayKey()
        });
      }
    }
  }

  function buildHabitCard(habit) {
    const card = document.createElement('article');
    card.className = 'habit-card';
    card.dataset.id = habit.id;

    const label = window.i18n.t(`habits.${habit.name}`);
    const streakText = window.i18n.t('habits.streak', { days: habit.streak });

    card.innerHTML = `
      <div class="habit-card__main">
        <span class="habit-card__icon" aria-hidden="true">${iconSvg(habit.icon)}</span>
        <div class="habit-card__info">
          <h3 class="habit-card__name">${label}</h3>
          <p class="habit-card__meta">${habit.time} · ${streakText}</p>
        </div>
      </div>
      <div class="habit-card__controls">
        <label class="habit-card__toggle" title="${window.i18n.t('habits.reminder')}">
          <input type="checkbox" class="habit-reminder-toggle" ${habit.reminder ? 'checked' : ''} aria-label="${window.i18n.t('habits.reminder')} - ${label}">
          <span aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
          </span>
        </label>
        <button class="habit-complete-btn ${habit.completed ? 'is-completed' : ''}" type="button" aria-pressed="${habit.completed}">
          ${habit.completed ? window.i18n.t('common.completed') : window.i18n.t('common.complete')}
        </button>
      </div>
    `;

    card.querySelector('.habit-reminder-toggle').addEventListener('change', async (e) => {
      habit.reminder = e.target.checked;
      await window.db.put(HABIT_STORE, { ...habit, reminderDate: todayKey() });
      window.pubsub.emit('habitChange', { habit, action: 'reminder' });
      scheduleHabitReminder(habit);
    });

    card.querySelector('.habit-complete-btn').addEventListener('click', async () => {
      await toggleComplete(habit);
      renderHabits();
    });

    return card;
  }

  async function toggleComplete(habit) {
    const now = (window.TimeEngine ? window.TimeEngine.getToday() : new Date()).toISOString();
    const wasCompleted = habit.completed;
    const all = await window.db.getAll(HABIT_STORE);

    if (!wasCompleted) {
      habit.completed = true;
      habit.completedAt = now;
      habit.lastStreakAt = now;
      habit.streak += 1;
    } else {
      habit.completed = false;
      habit.completedAt = null;
      habit.streak = Math.max(0, habit.streak - 1);
    }

    await window.db.put(HABIT_STORE, { ...habit, reminderDate: todayKey() });
    window.pubsub.emit('habitChange', { habit, action: wasCompleted ? 'uncomplete' : 'complete' });

    if (habit.completed && habit.reminder) {
      window.notifications.cancelReminder(habit.id);
    }
  }

  async function addHabitFromForm(name, icon, time, reminder = true) {
    if (!name || !icon || !time) return null;
    const habit = {
      name,
      icon,
      time,
      reminder,
      streak: 0,
      completed: false,
      createdAt: (window.TimeEngine ? window.TimeEngine.getToday() : new Date()).toISOString(),
      completedAt: null,
      lastStreakAt: null,
      reminderDate: todayKey()
    };
    const id = await window.db.add(HABIT_STORE, habit);
    habit.id = id;
    scheduleHabitReminder(habit);
    return habit;
  }

  async function deleteHabit(id) {
    window.notifications.cancelReminder(id);
    await window.db.delete(HABIT_STORE, id);
    window.pubsub.emit('habitChange', { habit: { id }, action: 'delete' });
  }

  async function resetDailyHabits() {
    const all = await window.db.getAll(HABIT_STORE);
    const now = (window.TimeEngine ? window.TimeEngine.getToday() : new Date()).toISOString();
    for (const habit of all) {
      if (habit.completed && !isSameDay(habit.completedAt, now)) {
        habit.completed = false;
        habit.completedAt = null;
        habit.reminderDate = todayKey();
        await window.db.put(HABIT_STORE, habit);
      }
    }
  }

  function scheduleHabitReminder(habit) {
    if (!window.notifications || !habit.reminder || habit.completed) return;

    const now = window.TimeEngine ? window.TimeEngine.getToday() : new Date();
    const [h, m] = habit.time.split(':').map(Number);
    let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);

    if (target.getTime() <= now.getTime()) {
      target = new Date(target.getTime() + DAYS_MS);
    }

    const delay = target.getTime() - now.getTime();
    const label = window.i18n.t(`habits.${habit.name}`);
    const body = window.i18n.t('habits.reminderBody', { time: habit.time });

    window.notifications.scheduleReminder(habit.id, label, body, delay, BELL_ICON);
  }

  async function renderHabits() {
    await resetDailyHabits();
    const panel = document.getElementById('panel-habits');
    if (!panel) return;

    const oldList = panel.querySelector('.habits-list');
    if (oldList) oldList.remove();

    const all = await window.db.getAll(HABIT_STORE);
    const list = document.createElement('div');
    list.className = 'habits-list';

    all.forEach(habit => list.appendChild(buildHabitCard(habit)));

    const addBtn = document.createElement('button');
    addBtn.className = 'habit-add-btn';
    addBtn.type = 'button';
    addBtn.textContent = window.i18n.t('habits.addHabit');
    addBtn.addEventListener('click', () => {
      const name = prompt(window.i18n.t('habits.promptName'));
      const icon = prompt(window.i18n.t('habits.promptIcon'));
      const time = prompt(window.i18n.t('habits.promptTime'));
      if (name && icon && time) {
        addHabitFromForm(name, icon, time).then(() => renderHabits());
      }
    });
    list.appendChild(addBtn);

    const existing = panel.querySelector('.habits-list');
    if (existing) existing.replaceWith(list);
    else panel.appendChild(list);

    all.forEach(h => scheduleHabitReminder(h));
  }

  function init() {
    ensureDefaults().then(() => {
      renderHabits();
      window.pubsub.on((event) => {
        if (event === 'langChange') renderHabits();
      });
    });
  }

  window.habits = {
    init,
    renderHabits,
    addHabit: addHabitFromForm,
    deleteHabit,
    toggleComplete,
    getAll: () => window.db.getAll(HABIT_STORE),
    defaultHabits: DEFAULT_HABITS
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
