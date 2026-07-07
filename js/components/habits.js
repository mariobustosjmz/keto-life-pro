(function () {
  const HABIT_STORE = 'habits';

  const DEFAULT_HABITS = [
    { name: 'drinkWater', icon: '💧', time: '08:00', reminder: true, streak: 0, completed: false },
    { name: 'eatWithinWindow', icon: '🍽️', time: '10:00', reminder: true, streak: 0, completed: false },
    { name: 'noLateDinner', icon: '🌙', time: '20:00', reminder: true, streak: 0, completed: false },
    { name: 'logWeight', icon: '⚖️', time: '07:00', reminder: true, streak: 0, completed: false },
    { name: 'takePhoto', icon: '📸', time: '08:00', reminder: true, streak: 0, completed: false },
    { name: 'avoidSugar', icon: '🚫🍬', time: '10:00', reminder: true, streak: 0, completed: false },
    { name: 'takeElectrolytes', icon: '🧂', time: '09:00', reminder: true, streak: 0, completed: false }
  ];

  const DAYS_MS = 24 * 60 * 60 * 1000;

  function todayKey() {
    return new Date().toISOString().split('T')[0];
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
        <span class="habit-card__icon" aria-hidden="true">${habit.icon}</span>
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
    const now = new Date().toISOString();
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
      createdAt: new Date().toISOString(),
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
    const now = new Date().toISOString();
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

    const now = new Date();
    const [h, m] = habit.time.split(':').map(Number);
    let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);

    if (target.getTime() <= now.getTime()) {
      target = new Date(target.getTime() + DAYS_MS);
    }

    const delay = target.getTime() - now.getTime();
    const label = window.i18n.t(`habits.${habit.name}`);
    const body = window.i18n.t('habits.reminderBody', { time: habit.time });

    window.notifications.scheduleReminder(habit.id, label, body, delay, habit.icon);
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
