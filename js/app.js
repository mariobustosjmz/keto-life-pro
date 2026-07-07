(function () {
  const defaultState = {
    lang: 'es',
    user: {
      name: '',
      weightGoal: 70,
      bedTime: '23:00',
      fastStart: '10:00',
      fastEnd: '18:00',
      dinnerDeadline: '20:00',
      netCarbsTarget: 30,
      fatTargetPct: 70,
      proteinTargetPct: 20,
      carbTargetPct: 10
    },
    activePanel: 'today'
  };

  function loadState() {
    try {
      const saved = localStorage.getItem('ketoLifeState');
      if (saved) {
        const parsed = JSON.parse(saved);
        return mergeDeep(defaultState, parsed);
      }
    } catch (e) {
      console.error('Error loading state:', e);
    }
    return structuredClone(defaultState);
  }

  function saveState() {
    try {
      localStorage.setItem('ketoLifeState', JSON.stringify(state));
    } catch (e) {
      console.error('Error saving state:', e);
    }
  }

  function mergeDeep(base, override) {
    const result = structuredClone(base);
    for (const key in override) {
      if (override[key] == null) continue;
      if (typeof result[key] === 'object' && typeof override[key] === 'object' && !Array.isArray(override[key])) {
        result[key] = mergeDeep(result[key], override[key]);
      } else {
        result[key] = override[key];
      }
    }
    return result;
  }

  const state = loadState();

  const subscribers = new Set();
  const pubsub = {
    on(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    emit(eventName, payload) {
      subscribers.forEach(fn => {
        try { fn(eventName, payload); } catch (e) { console.error(e); }
      });
    }
  };

  function translateDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = window.i18n.t(key);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria-label');
      el.setAttribute('aria-label', window.i18n.t(key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      el.setAttribute('title', window.i18n.t(key));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.setAttribute('placeholder', window.i18n.t(key));
    });
  }

  function showPanel(id) {
    const panelId = id.startsWith('panel-') ? id : `panel-${id}`;
    const sectionId = panelId.replace('panel-', '');
    const targetPanel = document.getElementById(panelId);
    if (!targetPanel) return;

    document.querySelectorAll('.panel').forEach(panel => {
      const isActive = panel.id === panelId;
      panel.classList.toggle('is-active', isActive);
      panel.hidden = !isActive;
    });
    document.querySelectorAll('.nav-item').forEach(btn => {
      const isActive = btn.dataset.section === sectionId;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
    state.activePanel = sectionId;
    saveState();
    pubsub.emit('panelChange', { panel: sectionId });
  }

  function setLang(lang) {
    if (window.i18n && window.i18n.setLang(lang)) {
      state.lang = lang;
      translateDOM();
      saveState();
      pubsub.emit('langChange', { lang });
    }
  }

  function init() {
    window.i18n.setLang(state.lang);
    translateDOM();
    showPanel(state.activePanel);

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => showPanel(btn.dataset.section));
    });

    const langBtn = document.getElementById('btn-lang');
    if (langBtn) {
      langBtn.textContent = state.lang === 'es' ? 'EN' : 'ES';
      langBtn.setAttribute('aria-label', window.i18n.t('common.switchLanguage'));
      langBtn.addEventListener('click', () => {
        const nextLang = state.lang === 'es' ? 'en' : 'es';
        setLang(nextLang);
        langBtn.textContent = nextLang === 'es' ? 'EN' : 'ES';
      });
    }

    const testNotifBtn = document.getElementById('btn-test-notif');
    if (testNotifBtn) {
      testNotifBtn.addEventListener('click', () => {
        const title = window.i18n.t('app.title');
        const body = window.i18n.t('notifications.testNotification');
        if (window.notifications) {
          window.notifications.sendTest(title, body);
        } else {
          alert(body);
        }
      });
    }
  }

  window.state = state;
  window.state.setLang = setLang;
  window.state.showPanel = showPanel;
  window.state.save = saveState;
  window.pubsub = pubsub;
  window.translateDOM = translateDOM;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
