/*
 * KetoLife Pro — Guía de alimentos / Food guide
 *
 * Responsibilities:
 *  - Render the #panel-foods panel
 *  - Read from window.FOODS (keto-foods.js)
 *  - Provide category tabs, search, and bilingual cards
 *  - Persist active category filter in window.state.foodsFilter
 */
(function () {
  const PANEL_ID = 'panel-foods';

  const CATEGORIES = [
    { key: 'keto-super', color: 'gold' },
    { key: 'eat-freely', color: 'green' },
    { key: 'moderate', color: 'yellow' },
    { key: 'avoid', color: 'red' }
  ];

  const CATEGORY_ICONS = {
    'keto-super': '⭐',
    'eat-freely': '✅',
    'moderate': '⚠️',
    'avoid': '🚫'
  };

  function t(key, params) {
    return window.i18n ? window.i18n.t(key, params || {}) : key;
  }

  function currentLang() {
    return window.i18n ? window.i18n.getLang() : 'es';
  }

  // Local bilingual strings for labels not covered by window.i18n
  const LOCAL_STRINGS = {
    en: {
      all: 'All',
      searchResults: '{count} of {total} foods',
      noResults: 'No foods found',
      tryAnotherSearch: 'Try a different term or category.'
    },
    es: {
      all: 'Todos',
      searchResults: '{count} de {total} alimentos',
      noResults: 'No se encontraron alimentos',
      tryAnotherSearch: 'Prueba con otro término o categoría.'
    }
  };

  function localT(key, params) {
    const lang = currentLang();
    let value = (LOCAL_STRINGS[lang] && LOCAL_STRINGS[lang][key]) || LOCAL_STRINGS.es[key] || key;
    if (params) {
      value = value.replace(/\{(\w+)\}/g, (_, name) => {
        return params[name] != null ? String(params[name]) : `{${name}}`;
      });
    }
    return value;
  }

  function getState() {
    if (!window.state) window.state = {};
    if (!window.state.foodsFilter) {
      window.state.foodsFilter = { category: 'all', query: '' };
    }
    return window.state.foodsFilter;
  }

  function saveFilter() {
    if (window.state && typeof window.state.save === 'function') {
      window.state.save();
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getFoodName(food) {
    if (!food || !food.name) return '';
    return food.name[currentLang()] || food.name.es || food.name.en || '';
  }

  function getFoodNotes(food) {
    if (!food || !food.notes) return '';
    return food.notes[currentLang()] || food.notes.es || food.notes.en || '';
  }

  function translateTag(tag) {
    // Return the tag as-is; this could be expanded later with a tag dictionary.
    return tag;
  }

  function categoryClass(category) {
    switch (category) {
      case 'keto-super': return 'is-gold';
      case 'eat-freely': return 'is-green';
      case 'moderate': return 'is-yellow';
      case 'avoid': return 'is-red';
      default: return '';
    }
  }

  function categoryLabel(category) {
    switch (category) {
      case 'keto-super': return t('foods.ketoSuper');
      case 'eat-freely': return t('foods.eatFreely');
      case 'moderate': return t('foods.moderate');
      case 'avoid': return t('foods.avoid');
      default: return category;
    }
  }

  class FoodsPanel {
    constructor(container) {
      this.container = container;
      this.filter = getState();
      this.searchEl = null;
      this.tabsEl = null;
      this.gridEl = null;
      this.countEl = null;
    }

    init() {
      this.buildUI();
      this.bindEvents();
      this.render();
      if (window.pubsub) {
        window.pubsub.on((event) => {
          if (event === 'langChange') {
            this.render();
          }
        });
      }
    }

    buildUI() {
      this.container.innerHTML = '';
      this.container.className = 'foods-panel';

      const header = document.createElement('header');
      header.className = 'foods-panel__header';
      header.innerHTML = `
        <h2 class="panel-title" data-i18n="nav.foods">${t('nav.foods')}</h2>
      `;
      this.container.appendChild(header);

      const searchWrap = document.createElement('div');
      searchWrap.className = 'foods-search';
      this.searchEl = document.createElement('input');
      this.searchEl.type = 'search';
      this.searchEl.className = 'foods-search__input';
      this.searchEl.placeholder = t('foods.search');
      this.searchEl.setAttribute('aria-label', t('foods.search'));
      this.searchEl.value = this.filter.query || '';
      searchWrap.appendChild(this.searchEl);
      this.container.appendChild(searchWrap);

      this.tabsEl = document.createElement('div');
      this.tabsEl.className = 'foods-tabs';
      this.tabsEl.setAttribute('role', 'tablist');
      this.tabsEl.setAttribute('aria-label', t('foods.placeholder'));
      this.container.appendChild(this.tabsEl);

      this.countEl = document.createElement('p');
      this.countEl.className = 'foods-count';
      this.countEl.setAttribute('aria-live', 'polite');
      this.container.appendChild(this.countEl);

      this.gridEl = document.createElement('div');
      this.gridEl.className = 'foods-grid';
      this.container.appendChild(this.gridEl);

      // Add a dedicated stylesheet scoped to this component
      this.addStyles();
    }

    addStyles() {
      const id = 'foods-panel-styles';
      if (document.getElementById(id)) return;
      const style = document.createElement('style');
      style.id = id;
      style.textContent = `
        .foods-panel { padding-bottom: var(--space-6); }
        .foods-panel__header { margin-bottom: var(--space-3); }
        .foods-search { margin-bottom: var(--space-4); }
        .foods-search__input {
          width: 100%;
          min-height: var(--touch-target);
          padding: var(--space-3) var(--space-4);
          font-size: 1rem;
          color: var(--color-text);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-sm);
        }
        .foods-search__input::placeholder { color: var(--color-text-muted); }
        .foods-tabs {
          display: flex;
          gap: var(--space-2);
          overflow-x: auto;
          padding-bottom: var(--space-2);
          margin-bottom: var(--space-3);
          scrollbar-width: none;
        }
        .foods-tabs::-webkit-scrollbar { display: none; }
        .foods-tab {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-4);
          border-radius: var(--radius-full);
          font-size: 0.875rem;
          font-weight: 600;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
          white-space: nowrap;
        }
        .foods-tab[aria-selected="true"] { color: var(--color-surface); border-color: transparent; box-shadow: var(--shadow-sm); }
        .foods-tab.is-all[aria-selected="true"] { background: var(--color-primary); }
        .foods-tab.is-gold[aria-selected="true"] { background: linear-gradient(135deg, #C8A415, #E6C229); color: #1A1A1A; }
        .foods-tab.is-green[aria-selected="true"] { background: var(--color-success); }
        .foods-tab.is-yellow[aria-selected="true"] { background: var(--color-warning); color: #1A1A1A; }
        .foods-tab.is-red[aria-selected="true"] { background: var(--color-danger); }
        .foods-count {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0 0 var(--space-3) 0;
        }
        .foods-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-3);
        }
        @media (min-width: 28rem) {
          .foods-grid { grid-template-columns: repeat(2, 1fr); }
        }
        .food-card {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          padding: var(--space-4);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
        }
        .food-card:active { transform: scale(0.99); }
        .food-card__header { display: flex; align-items: flex-start; gap: var(--space-3); }
        .food-card__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.75rem;
          height: 2.75rem;
          font-size: 1.5rem;
          border-radius: var(--radius-md);
          background: var(--color-bg);
          flex-shrink: 0;
        }
        .food-card__title-wrap { flex: 1; min-width: 0; }
        .food-card__name {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-text);
          margin: 0;
          line-height: 1.3;
        }
        .food-card__category {
          display: inline-flex;
          align-items: center;
          gap: var(--space-1);
          margin-top: var(--space-1);
          padding: var(--space-1) var(--space-2);
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          border-radius: var(--radius-sm);
          background: var(--color-bg);
          color: var(--color-text-muted);
        }
        .food-card__category.is-gold { color: #8A6D0B; background: #FDF6D3; }
        .food-card__category.is-green { color: #1E5C3A; background: #E7F5EC; }
        .food-card__category.is-yellow { color: #7A5F08; background: #FFF8DC; }
        .food-card__category.is-red { color: #8A2A2A; background: #FDEBEB; }
        @media (prefers-color-scheme: dark) {
          .food-card__category.is-gold { color: #F4E285; background: #4A3B08; }
          .food-card__category.is-green { color: #7FEFB5; background: #0F2E1C; }
          .food-card__category.is-yellow { color: #FFEC8B; background: #4A3B08; }
          .food-card__category.is-red { color: #FFB3B3; background: #3A1010; }
        }
        .food-card__macros {
          display: flex;
          align-items: baseline;
          gap: var(--space-2);
        }
        .food-card__carbs {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--color-text);
        }
        .food-card__carbs-unit {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--color-text-muted);
        }
        .food-card__tags {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-1);
        }
        .food-card__tag {
          padding: var(--space-1) var(--space-2);
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--color-text-muted);
          background: var(--color-bg);
          border-radius: var(--radius-sm);
        }
        .food-card__notes {
          font-size: 0.875rem;
          line-height: 1.45;
          color: var(--color-text-muted);
          margin: 0;
        }
        .foods-empty {
          text-align: center;
          padding: var(--space-8) var(--space-4);
          color: var(--color-text-muted);
        }
        .foods-empty__icon { font-size: 2.5rem; margin-bottom: var(--space-3); }
        .foods-empty__title { font-weight: 600; margin-bottom: var(--space-2); color: var(--color-text); }
      `;
      document.head.appendChild(style);
    }

    bindEvents() {
      this.searchEl.addEventListener('input', (e) => {
        this.filter.query = String(e.target.value || '').trim().toLowerCase();
        saveFilter();
        this.renderList();
      });

      this.tabsEl.addEventListener('click', (e) => {
        const tab = e.target.closest('.foods-tab');
        if (!tab) return;
        this.filter.category = tab.dataset.category;
        saveFilter();
        this.renderTabs();
        this.renderList();
      });
    }

    getFoods() {
      return Array.isArray(window.FOODS) ? window.FOODS : [];
    }

    filteredFoods() {
      const query = (this.filter.query || '').toLowerCase();
      const category = this.filter.category || 'all';
      return this.getFoods().filter((food) => {
        if (category !== 'all' && food.category !== category) return false;
        if (!query) return true;
        const name = getFoodName(food).toLowerCase();
        const notes = getFoodNotes(food).toLowerCase();
        const tags = (food.tags || []).join(' ').toLowerCase();
        return name.includes(query) || notes.includes(query) || tags.includes(query);
      });
    }

    renderTabs() {
      const activeCategory = this.filter.category || 'all';
      const tabs = [
        { key: 'all', color: 'all', icon: '🍽️' },
        ...CATEGORIES.map(c => ({ key: c.key, color: c.color, icon: CATEGORY_ICONS[c.key] }))
      ];

      this.tabsEl.innerHTML = tabs.map((tab, index) => {
        const isActive = activeCategory === tab.key;
        const cls = tab.key === 'all' ? 'is-all' : categoryClass(tab.key);
        return `
          <button
            type="button"
            class="foods-tab ${cls}"
            role="tab"
            data-category="${tab.key}"
            aria-selected="${isActive ? 'true' : 'false'}"
            aria-controls="foods-grid"
            tabindex="${isActive ? '0' : '-1'}"
            id="foods-tab-${tab.key}"
          >
            <span aria-hidden="true">${tab.icon}</span>
            <span>${tab.key === 'all' ? localT('all') : categoryLabel(tab.key)}</span>
          </button>
        `;
      }).join('');
    }

    renderList() {
      const foods = this.filteredFoods();
      const query = (this.filter.query || '').toLowerCase();
      const total = this.getFoods().length;
      const countText = query
        ? localT('searchResults', { count: foods.length, total })
        : `${foods.length} / ${total}`;
      this.countEl.textContent = countText;

      if (foods.length === 0) {
        this.gridEl.innerHTML = `
          <div class="foods-empty">
            <div class="foods-empty__icon" aria-hidden="true">🔍</div>
            <p class="foods-empty__title">${localT('noResults')}</p>
            <p>${localT('tryAnotherSearch')}</p>
          </div>
        `;
        return;
      }

      this.gridEl.innerHTML = foods.map((food) => this.buildCard(food)).join('');
    }

    buildCard(food) {
      const name = escapeHtml(getFoodName(food));
      const notes = escapeHtml(getFoodNotes(food));
      const category = food.category || 'eat-freely';
      const cls = categoryClass(category);
      const carbs = Number(food.netCarbsPer100g) || 0;
      const tags = (food.tags || []).map(tag => `<span class="food-card__tag">${escapeHtml(translateTag(tag))}</span>`).join('');

      return `
        <article class="food-card ${cls}" data-category="${category}">
          <div class="food-card__header">
            <span class="food-card__icon" aria-hidden="true">${CATEGORY_ICONS[category] || '🍽️'}</span>
            <div class="food-card__title-wrap">
              <h3 class="food-card__name">${name}</h3>
              <span class="food-card__category ${cls}">${categoryLabel(category)}</span>
            </div>
          </div>
          <div class="food-card__macros" aria-label="${t('meals.netCarbs')}">
            <span class="food-card__carbs">${carbs}g</span>
            <span class="food-card__carbs-unit">${t('meals.netCarbs')} / 100g</span>
          </div>
          <div class="food-card__tags">${tags}</div>
          <p class="food-card__notes">${notes}</p>
        </article>
      `;
    }

    render() {
      this.renderTabs();
      this.renderList();
    }
  }

  function init() {
    const container = document.getElementById(PANEL_ID);
    if (!container) return;
    const panel = new FoodsPanel(container);
    panel.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
