(function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const STORE = 'meals';

  function t(key, params) {
    return window.i18n ? window.i18n.t(key, params) : key;
  }

  function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getToday() {
    return formatDate(window.TimeEngine ? window.TimeEngine.getToday() : new Date());
  }

  function parseInputFloat(value) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }

  function computeMacros(meal) {
    const carbs = parseInputFloat(meal.carbs);
    const fiber = parseInputFloat(meal.fiber);
    const protein = parseInputFloat(meal.protein);
    const fat = parseInputFloat(meal.fat);
    const netCarbs = Math.max(0, carbs - fiber);
    const calories = fat * 9 + protein * 4 + netCarbs * 4;
    return { netCarbs, calories };
  }

  function mealStatusClass(netCarbs) {
    if (netCarbs <= 5) return 'is-green';
    if (netCarbs <= 15) return 'is-yellow';
    return 'is-red';
  }

  function createSVGElement(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
    return el;
  }

  function createDonutChart(fat, protein, netCarbs) {
    const total = fat + protein + netCarbs;
    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const chart = createSVGElement('svg', {
      viewBox: '0 0 120 120',
      class: 'macro-chart',
      role: 'img',
      'aria-label': t('meals.macroChart')
    });

    let offset = 0;
    const segments = [
      { value: fat, color: '#FF8C42', label: t('meals.fat') },
      { value: protein, color: '#2E8B57', label: t('meals.protein') },
      { value: netCarbs, color: '#F1C40F', label: t('meals.netCarbs') }
    ];

    segments.forEach(segment => {
      const length = total === 0 ? 0 : (segment.value / total) * circumference;
      const circle = createSVGElement('circle', {
        cx: '60',
        cy: '60',
        r: String(radius),
        fill: 'transparent',
        stroke: segment.color,
        'stroke-width': '14',
        'stroke-dasharray': total === 0 ? `${circumference} ${circumference}` : `${length} ${circumference - length}`,
        'stroke-dashoffset': -offset,
        'stroke-linecap': 'round'
      });
      chart.appendChild(circle);
      offset += length;
    });

    if (total === 0) {
      const placeholder = createSVGElement('circle', {
        cx: '60',
        cy: '60',
        r: String(radius),
        fill: 'transparent',
        stroke: 'var(--color-border)',
        'stroke-width': '14',
        'stroke-dasharray': `${circumference} ${circumference}`,
        'stroke-dashoffset': '0'
      });
      chart.appendChild(placeholder);
    }

    return chart;
  }

  class MealsPanel {
    constructor(container) {
      this.container = container;
      this.formEl = null;
      this.listEl = null;
      this.totalsEl = null;
      this.chartEl = null;
      this.editingId = null;
      this.meals = [];
    }

    async init() {
      this.buildUI();
      await this.loadMeals();
      this.bindEvents();
      if (window.pubsub) {
        window.pubsub.on((event) => {
          if (event === 'langChange') this.render();
        });
      }
    }

    buildUI() {
      this.container.innerHTML = '';
      this.container.classList.add('meals-panel');

      const header = document.createElement('header');
      header.className = 'meals-panel__header';

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn btn--primary';
      addBtn.textContent = t('meals.addMeal');
      addBtn.addEventListener('click', () => this.openForm());
      header.appendChild(addBtn);
      this.container.appendChild(header);

      const summary = document.createElement('section');
      summary.className = 'meals-summary card';
      const summaryTitle = document.createElement('h3');
      summaryTitle.className = 'meals-summary__title';
      summaryTitle.textContent = t('today.dailySummary');
      this.totalsEl = document.createElement('div');
      this.totalsEl.className = 'meals-summary__grid';
      this.chartEl = document.createElement('div');
      this.chartEl.className = 'meals-summary__chart';
      summary.appendChild(summaryTitle);
      summary.appendChild(this.totalsEl);
      summary.appendChild(this.chartEl);
      this.container.appendChild(summary);

      this.listEl = document.createElement('div');
      this.listEl.className = 'meals-list';
      this.container.appendChild(this.listEl);

      const modal = document.createElement('div');
      modal.id = 'meal-modal';
      modal.className = 'modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', t('meals.addMeal'));
      modal.hidden = true;
      const modalHTML = document.createElement('div');
      modalHTML.innerHTML = `
        <div class="modal__backdrop"></div>
        <div class="modal__sheet">
          <div class="modal__header">
            <h3 class="modal__title">${t('meals.addMeal')}</h3>
            <button type="button" class="modal__close" aria-label="${t('common.close')}">✕</button>
          </div>
          <form class="meal-form" novalidate>
            <div class="form-group">
              <label for="meal-name">${t('meals.mealName')}</label>
              <input type="text" id="meal-name" name="name" required data-i18n-placeholder="meals.mealName">
            </div>
            <div class="form-group">
              <label for="meal-time">${t('meals.time')}</label>
              <input type="time" id="meal-time" name="time" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="meal-carbs">${t('meals.carbs')} (g)</label>
                <input type="number" id="meal-carbs" name="carbs" min="0" step="0.1" inputmode="decimal" required>
              </div>
              <div class="form-group">
                <label for="meal-fiber">${t('meals.fiber')} (g)</label>
                <input type="number" id="meal-fiber" name="fiber" min="0" step="0.1" inputmode="decimal" required>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label for="meal-protein">${t('meals.protein')} (g)</label>
                <input type="number" id="meal-protein" name="protein" min="0" step="0.1" inputmode="decimal" required>
              </div>
              <div class="form-group">
                <label for="meal-fat">${t('meals.fat')} (g)</label>
                <input type="number" id="meal-fat" name="fat" min="0" step="0.1" inputmode="decimal" required>
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn--primary">${t('common.save')}</button>
              <button type="button" class="btn btn--secondary modal__cancel">${t('common.cancel')}</button>
              <button type="button" class="btn btn--danger modal__delete" hidden>${t('common.delete')}</button>
            </div>
          </form>
        </div>
      `;
      while (modalHTML.firstChild) {
        modal.appendChild(modalHTML.firstChild);
      }
      this.container.appendChild(modal);
      this.modalEl = modal;
      this.formEl = modal.querySelector('.meal-form');
      this.deleteBtn = modal.querySelector('.modal__delete');
    }

    bindEvents() {
      this.formEl.addEventListener('submit', (e) => this.onSubmit(e));
      this.modalEl.querySelector('.modal__close').addEventListener('click', () => this.closeForm());
      this.modalEl.querySelector('.modal__cancel').addEventListener('click', () => this.closeForm());
      this.modalEl.querySelector('.modal__backdrop').addEventListener('click', () => this.closeForm());
      this.deleteBtn.addEventListener('click', () => this.onDelete());
      this.modalEl.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeForm();
      });
    }

    async loadMeals() {
      try {
        this.meals = (await window.db.getAll(STORE)) || [];
      } catch (e) {
        console.error('Error loading meals:', e);
        this.meals = [];
      }
      this.render();
    }

    render() {
      this.renderTotals();
      this.renderList();
    }

    renderTotals() {
      const today = getToday();
      const todayMeals = this.meals.filter(m => m.date === today);
      const totals = todayMeals.reduce((acc, m) => {
        const macros = computeMacros(m);
        acc.carbs += parseInputFloat(m.carbs);
        acc.fiber += parseInputFloat(m.fiber);
        acc.protein += parseInputFloat(m.protein);
        acc.fat += parseInputFloat(m.fat);
        acc.netCarbs += macros.netCarbs;
        acc.calories += macros.calories;
        return acc;
      }, { carbs: 0, fiber: 0, protein: 0, fat: 0, netCarbs: 0, calories: 0 });

      const totalClass = mealStatusClass(totals.netCarbs);
      this.totalsEl.innerHTML = `
        <div class="summary-item ${totalClass}">
          <span class="summary-item__value">${totals.netCarbs.toFixed(1)}g</span>
          <span class="summary-item__label">${t('meals.netCarbs')}</span>
        </div>
        <div class="summary-item">
          <span class="summary-item__value">${totals.fat.toFixed(1)}g</span>
          <span class="summary-item__label">${t('meals.fat')}</span>
        </div>
        <div class="summary-item">
          <span class="summary-item__value">${totals.protein.toFixed(1)}g</span>
          <span class="summary-item__label">${t('meals.protein')}</span>
        </div>
        <div class="summary-item">
          <span class="summary-item__value">${Math.round(totals.calories)}</span>
          <span class="summary-item__label">${t('meals.calories')}</span>
        </div>
      `;

      this.chartEl.innerHTML = '';
      this.chartEl.appendChild(createDonutChart(totals.fat, totals.protein, totals.netCarbs));
    }

    renderList() {
      const today = getToday();
      const todayMeals = this.meals.filter(m => m.date === today).sort((a, b) => a.time.localeCompare(b.time));

      if (todayMeals.length === 0) {
        this.listEl.innerHTML = '';
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
          <div class="empty-state__icon" aria-hidden="true">🍽️</div>
          <p class="empty-state__title">${t('meals.emptyTitle')}</p>
          <p class="empty-state__text">${t('meals.emptyText')}</p>
        `;
        this.listEl.appendChild(empty);
        return;
      }

      this.listEl.innerHTML = '';
      todayMeals.forEach((meal) => {
        const macros = computeMacros(meal);
        const statusClass = mealStatusClass(macros.netCarbs);
        const card = document.createElement('article');
        card.className = 'meal-card card';
        card.innerHTML = `
          <div class="meal-card__main">
            <div class="meal-card__title-row">
              <h4 class="meal-card__name">${this.escapeHtml(meal.name)}</h4>
              <span class="meal-card__time">${this.escapeHtml(meal.time)}</span>
            </div>
            <div class="meal-card__macros">
              <span class="meal-card__pill ${statusClass}">${t('meals.netCarbs')}: ${macros.netCarbs.toFixed(1)}g</span>
              <span class="meal-card__pill">${t('meals.fat')}: ${parseInputFloat(meal.fat).toFixed(1)}g</span>
              <span class="meal-card__pill">${t('meals.protein')}: ${parseInputFloat(meal.protein).toFixed(1)}g</span>
              <span class="meal-card__pill">${t('meals.calories')}: ${Math.round(macros.calories)}</span>
            </div>
          </div>
          <button type="button" class="icon-btn meal-card__edit" aria-label="${t('common.edit')}" data-id="${meal.id}">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
        `;
        card.querySelector('.meal-card__edit').addEventListener('click', () => this.openForm(meal));
        this.listEl.appendChild(card);
      });
    }

    openForm(meal = null) {
      this.editingId = meal ? meal.id : null;
      const title = this.modalEl.querySelector('.modal__title');
      title.textContent = meal ? t('meals.editMeal') : t('meals.addMeal');
      this.deleteBtn.hidden = !meal;

      if (meal) {
        this.formEl.name.value = meal.name || '';
        this.formEl.time.value = meal.time || '';
        this.formEl.carbs.value = meal.carbs != null ? meal.carbs : '';
        this.formEl.fiber.value = meal.fiber != null ? meal.fiber : '';
        this.formEl.protein.value = meal.protein != null ? meal.protein : '';
        this.formEl.fat.value = meal.fat != null ? meal.fat : '';
      } else {
        this.formEl.reset();
        this.formEl.time.value = this.currentTime();
      }

      this.modalEl.hidden = false;
      this.formEl.name.focus();
    }

    closeForm() {
      this.modalEl.hidden = true;
      this.editingId = null;
      this.formEl.reset();
    }

    currentTime() {
      const now = window.TimeEngine ? window.TimeEngine.getToday() : new Date();
      return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    }

    async onSubmit(e) {
      e.preventDefault();
      const data = new FormData(this.formEl);
      const meal = {
        name: String(data.get('name') || '').trim(),
        time: String(data.get('time') || '00:00'),
        carbs: parseInputFloat(data.get('carbs')),
        fiber: parseInputFloat(data.get('fiber')),
        protein: parseInputFloat(data.get('protein')),
        fat: parseInputFloat(data.get('fat')),
        date: getToday()
      };

      if (!meal.name) {
        this.formEl.name.focus();
        return;
      }

      try {
        if (this.editingId) {
          const existing = this.meals.find(m => m.id === this.editingId);
          const updated = { ...existing, ...meal, id: this.editingId };
          await window.db.put(STORE, updated);
        } else {
          await window.db.add(STORE, meal);
        }
        await this.loadMeals();
        this.closeForm();
      } catch (err) {
        console.error('Error saving meal:', err);
      }
    }

    async onDelete() {
      if (!this.editingId) return;
      try {
        await window.db.delete(STORE, this.editingId);
        await this.loadMeals();
        this.closeForm();
      } catch (err) {
        console.error('Error deleting meal:', err);
      }
    }

    escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  }

  function init() {
    const container = document.getElementById('panel-meals');
    if (!container) return;
    const panel = new MealsPanel(container);
    panel.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
