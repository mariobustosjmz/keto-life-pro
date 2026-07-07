(function () {
  const scheduledReminders = new Map();

  function isSupported() {
    return 'Notification' in window;
  }

  async function requestPermission() {
    if (!isSupported()) return 'unsupported';
    const result = await Notification.requestPermission();
    return result;
  }

  async function ensurePermission() {
    if (!isSupported()) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await requestPermission();
    return result === 'granted';
  }

  function getPermission() {
    if (!isSupported()) return 'unsupported';
    return Notification.permission;
  }

  function cancelReminder(id) {
    const timer = scheduledReminders.get(id);
    if (timer) {
      clearTimeout(timer);
      scheduledReminders.delete(id);
    }
  }

  const BELL_ICON = '/icons/icon-192x192.png';

  function scheduleReminder(id, title, body, delay, icon = BELL_ICON) {
    cancelReminder(id);
    if (!isSupported() || Notification.permission !== 'granted') return;

    const clampedDelay = Math.max(0, delay);
    const timer = setTimeout(() => {
      showNotification(title, body, icon);
      scheduledReminders.delete(id);
    }, clampedDelay);

    scheduledReminders.set(id, timer);
  }

  function showNotification(title, body, icon = BELL_ICON) {
    if (!isSupported() || Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, icon });
    } catch (e) {
      console.error('Error showing notification:', e);
    }
  }

  function sendTest(title, body) {
    ensurePermission().then(granted => {
      if (granted) {
        showNotification(title, body);
      } else {
        alert(body || title);
      }
    });
  }

  function scheduleHabitRemindersFromDB() {
    if (!window.db || !window.habits) return;
    window.db.getAll('habits').then(habits => {
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];
      habits.forEach(habit => {
        if (!habit.reminder || habit.completed) return;
        const [h, m] = (habit.time || '00:00').split(':').map(Number);
        const target = new Date();
        target.setHours(h, m, 0, 0);
        let delay = target.getTime() - now;
        if (delay <= 0) delay += 24 * 60 * 60 * 1000;
        const title = window.i18n.t(`habits.${habit.name}`);
        const body = window.i18n.t('habits.reminderBody', { time: habit.time });
        scheduleReminder(habit.id, title, body, delay, habit.icon);
      });
    });
  }

  function init() {
    if (!isSupported()) {
      console.warn('Notification API no soportada');
      return;
    }
    scheduleHabitRemindersFromDB();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const testBtn = document.getElementById('btn-test-notif');
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        const title = window.i18n.t('app.title');
        const body = window.i18n.t('notifications.testNotification');
        sendTest(title, body);
      });
    }
  });

  window.notifications = {
    init,
    requestPermission,
    ensurePermission,
    getPermission,
    showNotification,
    scheduleReminder,
    cancelReminder,
    sendTest,
    scheduleHabitRemindersFromDB
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
