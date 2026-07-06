/*
 * KetoLife Pro — Dashboard (Today panel)
 *
 * Responsibilities:
 *  - Render the #panel-today dashboard widgets
 *  - Read from db.getAll('meals'), db.getAll('water'), window.state.user
 *  - Use TimeEngine for fasting/window/dinner/bedtime logic
 *  - Subscribe to window.pubsub events so updates reflect immediately
 */
(function () {
  const DASHBOARD_ID = 'panel-today';

  // --- Helpers ---------------------------------------------------------------

  function todayISODate() {
    return new Date().toISOString().split('T')[0];
  }

  function isToday(isoDateOrString) {
    if (!isoDateOrString) return false;
    const s = typeof isoDateOrString === 'string' ? isoDateOrString.split('T')[0] : '';
    return s === todayISODate();
  }

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function t(key, params) {
    return window.i18n ? window.i18n.t(key, params || {}) : key;
  }

  function macroColorClass(netCarbs) {
    if (netCarbs <= 5) return 'is-green';
    if (netCarbs <= 15) return 'is-yellow';
    return 'is-red';
  }

  function currentLang() {
    return window.i18n ? window.i18n.getLang() : 'es';
  }

  // --- SVG icon helpers ------------------------------------------------------

  function icon(name, attrs = {}) {
    const base = '0 0 24 24';
    const paths = {
      water: '<path d="M12 2c-2 4-6 8.5-6 12a6 6 0 0 0 12 0c0-3.5-4-8-6-12Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 17a4 4 0 0 0 8 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
      fire: '<path d="M12 2c-3 4-6 7.5-6 11a6 6 0 0 0 12 0c0-2-.5-3.5-2-6-1 2.5-2 4-4 5 0-2 0-4 2-6-2 1-4 0-5-1.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      scale: '<path d="m12 2 7 19H5L12 2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      check: '<path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      plus: '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
      warning: '<path d="M10.3 3.9 1.8 18.5A2 2 0 0 0 3.6 22h16.8a2 2 0 0 0 1.8-3.5L13.7 3.9a2 2 0 0 0-3.4 0Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 9v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="18" r="0.5" fill="currentColor"/>',
      moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      clock: '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      utensils: '<path d="M3 2v6a3 3 0 0 0 6 0V2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 2v12a3 3 0 0 0 6 0V2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 2v12a3 3 0 0 1-3 3v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      droplet: '<path d="M12 2.7c-3 4.8-6 8.6-6 12a6 6 0 0 0 12 0c0-3.4-3-7.2-6-12Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    };
    const attributes = { viewBox: base, 'aria-hidden': 'true', width: '20', height: '20', fill: 'none', ...attrs };
    const attrsString = Object.entries(attributes).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<svg ${attrsString}>${paths[name] || ''}</svg>`;
  }

  // --- Ring rendering --------------------------------------------------------

  function progressRing(progress, colorClass, centerText, subText) {
    const radius = 54;
    const stroke = 10;
    const normalized = Math.max(0, Math.min(1, progress));
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - normalized);
    const colorVar = colorClass === 'is-green' ? 'var(--color-success)' : colorClass === 'is-yellow' ? 'var(--color-warning)' : colorClass === 'is-red' ? 'var(--color-danger)' : 'var(--color-accent)';

    return `
      <div class="dashboard-ring" role="img" aria-label="${t('today.fastStatus')}: ${centerText}">
        <svg width="140" height="140" viewBox="0 0 140 140" class="dashboard-ring__svg">
          <circle cx="70" cy="70" r="${radius}" stroke="var(--color-border)" stroke-width="${stroke}" fill="none" />
          <circle cx="70" cy="70" r="${radius}" stroke="${colorVar}" stroke-width="${stroke}" fill="none"
            stroke-linecap="round"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"
            transform="rotate(-90 70 70)"
            class="dashboard-ring__progress" />
        </svg>
        <div class="dashboard-ring__content">
          <span class="dashboard-ring__value">${centerText}</span>
          <span class="dashboard-ring__label">${subText}</span>
        </div>
      </div>
    `;
  }

  // --- Templates --------------------------------------------------------------

  function dashboardTemplate() {
    return `
      <div class="dashboard">
        <div class="dashboard__ribbon" id="dashboard-ribbon" role="status" aria-live="polite"></div>

        <div class="dashboard-grid dashboard-grid--2">
          <article class="dashboard-card dashboard-card--fast" aria-labelledby="fast-title">
            <div class="dashboard-card__header">
              <span class="dashboard-card__icon" aria-hidden="true">${icon('fire')}</span>
              <h3 id="fast-title" class="dashboard-card__title">${t('today.fastStatus')}</h3>
            </div>
            <div class="dashboard-card__body" id="fast-widget"></div>
          </article>

          <article class="dashboard-card dashboard-card--water" aria-labelledby="water-title">
            <div class="dashboard-card__header">
              <span class="dashboard-card__icon" aria-hidden="true">${icon('droplet')}</span>
              <h3 id="water-title" class="dashboard-card__title">${t('today.water')}</h3>
              <span class="dashboard-card__meta" id="water-meta">0 / 2500 ml</span>
            </div>
            <div class="dashboard-card__body" id="water-widget"></div>
            <div class="dashboard-card__actions">
              <button class="dashboard-btn dashboard-btn--secondary" id="btn-add-water" type="button" data-i18n="today.addWater">
                ${t('today.addWater')}
              </button>
            </div>
          </article>
        </div>

        <div class="dashboard-grid dashboard-grid--3">
          <button class="dashboard-quick" type="button" data-action="water" data-i18n-aria-label="today.addWater">
            <span class="dashboard-quick__icon" aria-hidden="true">${icon('droplet')}</span>
            <span class="dashboard-quick__label">+ ${t('today.water')}</span>
          </button>
          <button class="dashboard-quick" type="button" data-action="meal" data-i18n-aria-label="meals.addMeal">
            <span class="dashboard-quick__icon" aria-hidden="true">${icon('utensils')}</span>
            <span class="dashboard-quick__label">+ ${t('meals.addMeal')}</span>
          </button>
          <button class="dashboard-quick" type="button" data-action="habit" data-i18n-aria-label="habits.addHabit">
            <span class="dashboard-quick__icon" aria-hidden="true">${icon('check')}</span>
            <span class="dashboard-quick__label">+ ${t('habits.addHabit')}</span>
          </button>
        </div>

        <article class="dashboard-card dashboard-card--macros" aria-labelledby="macros-title">
          <div class="dashboard-card__header">
            <span class="dashboard-card__icon" aria-hidden="true">${icon('scale')}</span>
            <h3 id="macros-title" class="dashboard-card__title">${t('today.dailySummary')}</h3>
          </div>
          <div class="dashboard-card__body" id="macros-widget"></div>
        </article>

        <article class="dashboard-card dashboard-card--habits" aria-labelledby="habits-title">
          <div class="dashboard-card__header">
            <span class="dashboard-card__icon" aria-hidden="true">${icon('check')}</span>
            <h3 id="habits-title" class="dashboard-card__title">${t('today.habitQuickChecks')}</h3>
          </div>
          <div class="dashboard-card__body" id="habits-widget"></div>
        </article>

        <div id="dinner-warning" class="dashboard-warning" hidden></div>
      </div>
    `;
  }

  // --- State derived from data ------------------------------------------------

  function deriveMacroSummary(meals) {
    const today = meals.filter(m => isToday(m.date));
    let netCarbs = 0, fat = 0, protein = 0, calories = 0;
    today.forEach(m => {
      netCarbs += Number(m.netCarbs || m.carbs || 0);
      fat += Number(m.fat || 0);
      protein += Number(m.protein || 0);
      calories += Number(m.calories || TimeEngine.calories(m.fat, m.protein, m.netCarbs || m.carbs || 0));
    });
    return { netCarbs, fat, protein, calories };
  }

  function deriveWaterTotal(waterLogs) {
    return waterLogs.filter(w => isToday(w.date)).reduce((sum, w) => sum + Number(w.amount || 0), 0);
  }

  function deriveLatestMealTime(meals) {
    const today = meals.filter(m => isToday(m.date));
    if (!today.length) return null;
    return today.map(m => m.time || '00:00').sort().pop();
  }

  // --- Render widgets ---------------------------------------------------------

  function renderFastWidget(user) {
    const status = TimeEngine.getFastStatus(user);
    const lang = currentLang();
    const isEating = status.isEatingWindow;
    const colorClass = isEating ? 'is-green' : status.progress >= 0.9 ? 'is-yellow' : 'is-orange';
    const centerText = isEating
      ? t('today.eatingWindowOpen')
      : t('today.fasting');
    const subText = status.formattedRemainingLocalized(lang) + ' ' + (isEating ? t('today.leftWindow') : t('today.untilEating'));

    const nextLabel = isEating ? t('today.nextFast') : t('today.nextMeal');
    const nextTime = status.nextEventTime;

    return progressRing(status.progress, colorClass, centerText, subText) + `
      <div class="fast-next">
        <span class="fast-next__label">${nextLabel}</span>
        <span class="fast-next__time">${nextTime}</span>
      </div>
    `;
  }

  function renderWaterWidget(totalMl, goalMl) {
    const pct = Math.min(1, Math.max(0, totalMl / goalMl));
    const remaining = Math.max(0, goalMl - totalMl);
    return `
      <div class="water-bar" role="img" aria-label="${pct * 100}% ${t('today.ofWaterGoal')}">
        <div class="water-bar__track">
          <div class="water-bar__fill" style="width: ${pct * 100}%"></div>
        </div>
      </div>
      <div class="water-stats">
        <span class="water-stats__value">${totalMl} ml</span>
        <span class="water-stats__remaining">${remaining > 0 ? `${remaining} ml ${t('today.toGo')}` : t('today.goalReached')}</span>
      </div>
    `;
  }

  function renderMacrosWidget(macros, user) {
    const carbTarget = user.netCarbsTarget || 30;
    const carbPct = Math.min(100, Math.round((macros.netCarbs / carbTarget) * 100));
    const macroPct = TimeEngine.macroPercentages(macros.fat, macros.protein, macros.netCarbs);
    const totalCal = macros.calories || Math.round(macroPct.totalCalories);

    const fatPct = Math.round((macroPct.fat || 0) * 100);
    const proteinPct = Math.round((macroPct.protein || 0) * 100);
    const carbsPct = Math.round((macroPct.carbs || 0) * 100);

    const carbColor = macroColorClass(macros.netCarbs);

    return `
      <div class="macros-header">
        <div class="macros-total">
          <span class="macros-total__value">${totalCal}</span>
          <span class="macros-total__label">${t('today.calories')}</span>
        </div>
        <div class="macros-split">
          <div class="macro-pill macro-pill--fat"><span>${macros.fat}g</span><span>${fatPct}%</span></div>
          <div class="macro-pill macro-pill--protein"><span>${macros.protein}g</span><span>${proteinPct}%</span></div>
          <div class="macro-pill macro-pill--carbs ${carbColor}"><span>${macros.netCarbs}g</span><span>${carbsPct}%</span></div>
        </div>
      </div>
      <div class="macros-carbs">
        <div class="macros-carbs__label">
          <span>${t('today.netCarbs')}</span>
          <span>${carbPct}% ${t('today.ofTarget')}</span>
        </div>
        <div class="macros-carbs__track">
          <div class="macros-carbs__fill ${carbColor}" style="width: ${carbPct}%"></div>
        </div>
      </div>
    `;
  }

  function renderHabitsWidget() {
    // Quick default checks matching the user's most common keto habits
    const checks = [
      { key: 'drinkWater', label: t('habits.drinkWater'), checked: false },
      { key: 'eatWithinWindow', label: t('habits.eatWithinWindow'), checked: false },
      { key: 'noLateDinner', label: t('habits.noLateDinner'), checked: false },
      { key: 'avoidSugar', label: t('habits.avoidSugar'), checked: false },
      { key: 'takeElectrolytes', label: t('habits.takeElectrolytes'), checked: false }
    ];

    return `
      <ul class="habit-chips" role="list">
        ${checks.map(c => `
          <li class="habit-chip ${c.checked ? 'is-checked' : ''}" data-habit="${c.key}">
            <button type="button" class="habit-chip__btn" aria-pressed="${c.checked ? 'true' : 'false'}">
              <span class="habit-chip__check" aria-hidden="true">${icon('check')}</span>
              <span class="habit-chip__label">${c.label}</span>
            </button>
          </li>
        `).join('')}
      </ul>
    `;
  }

  function renderRibbon(user) {
    const status = TimeEngine.getFastStatus(user);
    const minutesUntilDinner = TimeEngine.minutesUntil(user.dinnerDeadline || '20:00');
    const minutesUntilBed = TimeEngine.minutesUntil(user.bedTime || '23:00');

    let text = '';
    let type = 'info';

    if (status.isEatingWindow) {
      text = t('today.ribbon.eatingWindow', { time: status.formattedRemainingLocalized(currentLang()) });
      type = 'success';
    } else {
      text = t('today.ribbon.fasting', { time: status.nextEventTime });
      type = 'warning';
    }

    if (status.isEatingWindow && minutesUntilDinner <= 60 && minutesUntilDinner > 0) {
      text = t('today.ribbon.dinnerDeadline', { time: user.dinnerDeadline || '20:00' });
      type = 'warning';
    }

    if (minutesUntilBed <= 60 && minutesUntilBed > 0) {
      text = t('today.ribbon.bedtime', { time: user.bedTime || '23:00' });
      type = 'info';
    }

    const ribbon = document.getElementById('dashboard-ribbon');
    if (ribbon) {
      ribbon.className = `dashboard__ribbon is-${type}`;
      ribbon.innerHTML = `<span class="dashboard__ribbon-icon" aria-hidden="true">${icon(type === 'success' ? 'check' : type === 'warning' ? 'clock' : 'moon')}</span><span>${text}</span>`;
    }
  }

  function renderDinnerWarning(user, meals) {
    const latest = deriveLatestMealTime(meals);
    const warningEl = document.getElementById('dinner-warning');
    if (!latest) {
      if (warningEl) warningEl.hidden = true;
      return;
    }
    const ok = TimeEngine.isDinnerTimeOK(latest, user);
    if (ok.ok) {
      if (warningEl) warningEl.hidden = true;
      return;
    }

    const items = [];
    if (!ok.beforeDeadline) items.push(t('today.warn.afterDeadline', { time: ok.deadlineTime }));
    if (!ok.threeHoursBeforeBed) items.push(t('today.warn.closeToBed', { hours: ok.hoursBeforeBed.toFixed(1) }));

    if (warningEl) {
      warningEl.hidden = false;
      warningEl.innerHTML = `${icon('warning')}<div><strong>${t('today.dinnerWarning')}</strong><p>${items.join(' · ')}</p></div>`;
    }
  }

  // --- Main render ------------------------------------------------------------

  async function refreshDashboard() {
    const user = window.state && window.state.user ? window.state.user : {};
    const [meals, water] = await Promise.all([
      window.db.getAll('meals').catch(() => []),
      window.db.getAll('water').catch(() => [])
    ]);

    const macros = deriveMacroSummary(meals);
    const waterTotal = deriveWaterTotal(water);
    const waterGoal = 2500;

    const fastWidget = document.getElementById('fast-widget');
    const waterWidget = document.getElementById('water-widget');
    const macrosWidget = document.getElementById('macros-widget');
    const habitsWidget = document.getElementById('habits-widget');
    const waterMeta = document.getElementById('water-meta');

    if (fastWidget) fastWidget.innerHTML = renderFastWidget(user);
    if (waterWidget) waterWidget.innerHTML = renderWaterWidget(waterTotal, waterGoal);
    if (macrosWidget) macrosWidget.innerHTML = renderMacrosWidget(macros, user);
    if (habitsWidget) habitsWidget.innerHTML = renderHabitsWidget();
    if (waterMeta) waterMeta.textContent = `${waterTotal} / ${waterGoal} ml`;

    renderRibbon(user);
    renderDinnerWarning(user, meals);
  }

  // --- Interactions -----------------------------------------------------------

  async function addWater(amount) {
    const now = new Date();
    const item = {
      amount: Number(amount) || 250,
      date: now.toISOString(),
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      createdAt: now.toISOString()
    };
    try {
      await window.db.add('water', item);
      window.pubsub.emit('waterAdded', item);
    } catch (e) {
      console.error('Error adding water:', e);
    }
  }

  function wireInteractions() {
    const container = document.getElementById(DASHBOARD_ID);
    if (!container) return;

    container.addEventListener('click', async (e) => {
      const addWaterBtn = e.target.closest('#btn-add-water');
      if (addWaterBtn) {
        await addWater(250);
        return;
      }

      const quick = e.target.closest('[data-action]');
      if (quick) {
        const action = quick.dataset.action;
        if (action === 'water') await addWater(250);
        else if (action === 'meal') {
          window.state.showPanel('meals');
          window.pubsub.emit('openAddMeal', {});
        } else if (action === 'habit') {
          window.state.showPanel('habits');
        }
        return;
      }

      const habitChip = e.target.closest('.habit-chip');
      if (habitChip) {
        habitChip.classList.toggle('is-checked');
        const btn = habitChip.querySelector('.habit-chip__btn');
        if (btn) btn.setAttribute('aria-pressed', habitChip.classList.contains('is-checked') ? 'true' : 'false');
      }
    });
  }

  // --- Lifecycle --------------------------------------------------------------

  function init() {
    const panel = document.getElementById(DASHBOARD_ID);
    if (!panel) return;

    // Replace placeholder content with the dashboard markup
    // Keep the panel title intact and append dashboard content
    const title = panel.querySelector('.panel-title');
    const existing = title ? title.outerHTML : `<h2 class="panel-title" data-i18n="nav.today">${t('nav.today')}</h2>`;
    panel.innerHTML = existing + dashboardTemplate();

    // Ensure active panel layout applies to #panel-today
    panel.classList.add('is-active');

    // Re-translate static placeholders inside the dashboard
    if (window.translateDOM) window.translateDOM();

    wireInteractions();
    refreshDashboard();

    // Update fasting ring every minute so time stays current
    setInterval(() => {
      if (panel.classList.contains('is-active')) refreshDashboard();
    }, 60000);

    // Re-render when relevant data changes
    window.pubsub.on((eventName) => {
      if (['mealAdded', 'mealUpdated', 'mealDeleted', 'waterAdded', 'waterDeleted', 'habitToggled', 'settingsSaved', 'langChange', 'panelChange'].includes(eventName)) {
        if (panel.classList.contains('is-active')) refreshDashboard();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
