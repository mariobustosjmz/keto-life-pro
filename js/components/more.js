/*
 * KetoLife Pro — More panel
 *
 * Responsibilities:
 *  - Render the #panel-more with Settings, Weight and Evidence sections
 *  - Read/write settings to window.state.user and call window.state.save()
 *  - Read/write weight and evidence records via window.db (add/getAll/delete)
 *  - Use window.i18n for all strings
 */
(function () {
  const PANEL_ID = 'panel-more';
  const WEIGHT_STORE = 'weight';
  const EVIDENCE_STORE = 'evidence';

  function t(key, params) {
    return window.i18n ? window.i18n.t(key, params || {}) : key;
  }

  function todayISO() {
    return window.TimeEngine ? window.TimeEngine.todayKey() : new Date().toISOString().split('T')[0];
  }

  function formatDateShort(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(window.i18n.getLang(), { day: 'numeric', month: 'short' });
  }

  function safeInputNumber(value, fallback = 0) {
    const n = parseFloat(value);
    return isNaN(n) ? fallback : n;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  // --- Templates ---------------------------------------------------------------

  function panelTemplate() {
    return `
      <h2 class="panel-title" data-i18n="nav.more">${t('nav.more')}</h2>

      <section class="more-section" aria-labelledby="more-settings-title">
        <h3 id="more-settings-title" class="more-section__title">${icon('settings')} <span>${t('more.settings')}</span></h3>
        <form class="more-form" id="settings-form" novalidate>
          <div class="form-group">
            <label for="settings-name">${t('settings.name')}</label>
            <input type="text" id="settings-name" name="name">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="settings-bedtime">${t('settings.bedtime')}</label>
              <input type="time" id="settings-bedtime" name="bedTime" required>
            </div>
            <div class="form-group">
              <label for="settings-dinner">${t('settings.dinnerDeadline')}</label>
              <input type="time" id="settings-dinner" name="dinnerDeadline" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="settings-fast-start">${t('settings.fastStart')}</label>
              <input type="time" id="settings-fast-start" name="fastStart" required>
            </div>
            <div class="form-group">
              <label for="settings-fast-end">${t('settings.fastEnd')}</label>
              <input type="time" id="settings-fast-end" name="fastEnd" required>
            </div>
          </div>
          <div class="form-group">
            <label for="settings-water-goal">${t('today.water')} meta (ml)</label>
            <input type="number" id="settings-water-goal" name="waterGoal" min="0" step="50" inputmode="numeric">
          </div>
          <div class="form-group">
            <label>${t('settings.macros')}</label>
            <div class="macro-inputs">
              <div>
                <label for="settings-fat" class="sr-only">${t('settings.fatTargetPct')}</label>
                <input type="number" id="settings-fat" name="fatTargetPct" min="0" max="100" step="1" inputmode="numeric">
                <span>% ${t('meals.fat')}</span>
              </div>
              <div>
                <label for="settings-protein" class="sr-only">${t('settings.proteinTargetPct')}</label>
                <input type="number" id="settings-protein" name="proteinTargetPct" min="0" max="100" step="1" inputmode="numeric">
                <span>% ${t('meals.protein')}</span>
              </div>
              <div>
                <label for="settings-carbs" class="sr-only">${t('settings.carbTargetPct')}</label>
                <input type="number" id="settings-carbs" name="carbTargetPct" min="0" max="100" step="1" inputmode="numeric">
                <span>% ${t('meals.carbs')}</span>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label for="settings-language">${t('settings.language')}</label>
            <select id="settings-language" name="language">
              <option value="es">${t('settings.spanish')}</option>
              <option value="en">${t('settings.english')}</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn--primary">${t('common.save')}</button>
          </div>
        </form>
      </section>

      <section class="more-section" aria-labelledby="more-weight-title">
        <h3 id="more-weight-title" class="more-section__title">${icon('scale')} <span>${t('more.weight')}</span></h3>
        <form class="more-form" id="weight-form" novalidate>
          <div class="form-row">
            <div class="form-group">
              <label for="weight-value">${t('settings.weightGoal')}</label>
              <input type="number" id="weight-value" name="weight" min="0" step="0.1" inputmode="decimal" required>
            </div>
            <div class="form-group">
              <label for="weight-date">${t('common.date')}</label>
              <input type="date" id="weight-date" name="date" required>
            </div>
          </div>
          <div class="form-group">
            <label for="weight-note">${t('meals.notes')}</label>
            <input type="text" id="weight-note" name="note">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn--primary">${t('common.save')}</button>
          </div>
        </form>
        <div id="weight-chart" class="weight-chart" aria-hidden="true"></div>
        <div id="weight-list" class="weight-list"></div>
      </section>

      <section class="more-section" aria-labelledby="more-evidence-title">
        <h3 id="more-evidence-title" class="more-section__title">${icon('camera')} <span>${t('more.evidence')}</span></h3>
        <form class="more-form" id="evidence-form" novalidate>
          <div class="form-group">
            <label for="evidence-photo">${t('more.evidence')}</label>
            <input type="file" id="evidence-photo" name="photo" accept="image/*" capture="environment" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="evidence-date">${t('common.date')}</label>
              <input type="date" id="evidence-date" name="date" required>
            </div>
            <div class="form-group">
              <label for="evidence-desc">${t('meals.notes')}</label>
              <input type="text" id="evidence-desc" name="description">
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn--primary">${t('common.save')}</button>
          </div>
        </form>
        <div id="evidence-gallery" class="evidence-gallery"></div>
      </section>
    `;
  }

  function icon(name) {
    const paths = {
      settings: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" fill="currentColor"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51H15a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      scale: '<path d="M12 2l7 19H5L12 2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
      camera: '<path d="M14.5 4l-1-2h-3l-1 2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="13" r="4" fill="none" stroke="currentColor" stroke-width="2"/>',
      trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    };
    return `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ''}</svg>`;
  }

  // --- Settings ---------------------------------------------------------------

  function populateSettings() {
    const user = window.state.user || {};
    const form = document.getElementById('settings-form');
    if (!form) return;

    form.elements.name.value = user.name || '';
    form.elements.bedTime.value = user.bedTime || '23:00';
    form.elements.dinnerDeadline.value = user.dinnerDeadline || '20:00';
    form.elements.fastStart.value = user.fastStart || '10:00';
    form.elements.fastEnd.value = user.fastEnd || '18:00';
    form.elements.fatTargetPct.value = user.fatTargetPct || 70;
    form.elements.proteinTargetPct.value = user.proteinTargetPct || 20;
    form.elements.carbTargetPct.value = user.carbTargetPct || 10;
    form.elements.waterGoal.value = user.waterGoal || 2500;
    form.elements.language.value = window.state.lang || 'es';
  }

  async function onSettingsSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const user = window.state.user || {};

    user.name = fd.get('name') || '';
    user.bedTime = fd.get('bedTime') || '23:00';
    user.dinnerDeadline = fd.get('dinnerDeadline') || '20:00';
    user.fastStart = fd.get('fastStart') || '10:00';
    user.fastEnd = fd.get('fastEnd') || '18:00';
    user.fatTargetPct = safeInputNumber(fd.get('fatTargetPct'), 70);
    user.proteinTargetPct = safeInputNumber(fd.get('proteinTargetPct'), 20);
    user.carbTargetPct = safeInputNumber(fd.get('carbTargetPct'), 10);
    user.waterGoal = safeInputNumber(fd.get('waterGoal'), 2500);

    const lang = fd.get('language') || 'es';
    if (lang !== window.state.lang) {
      window.state.setLang(lang);
    }

    window.state.save();
    window.pubsub.emit('settingsSaved', { user });
  }

  // --- Weight -----------------------------------------------------------------

  async function loadWeight() {
    try {
      return await window.db.getAll(WEIGHT_STORE);
    } catch (e) {
      console.error('Error loading weight records:', e);
      return [];
    }
  }

  function renderWeightChart(records) {
    const container = document.getElementById('weight-chart');
    if (!container) return;

    const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sorted.length < 2) {
      container.innerHTML = '';
      return;
    }

    const weights = sorted.map(r => r.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const pad = Math.max(0.1, (max - min) * 0.1);
    const range = Math.max(0.1, max - min + pad * 2);
    const lo = Math.max(0, min - pad);
    const n = sorted.length;

    const width = 320;
    const height = 120;
    const points = sorted.map((r, i) => {
      const x = (i / (n - 1)) * width;
      const y = height - ((r.weight - lo) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    const avg = (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1);

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="120" role="img" aria-label="${t('more.weight')} trend">
        <line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="var(--color-border)" stroke-width="1"/>
        <polyline points="${points}" fill="none" stroke="var(--color-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${sorted.map((r, i) => {
          const x = (i / (n - 1)) * width;
          const y = height - ((r.weight - lo) / range) * height;
          return `<circle cx="${x}" cy="${y}" r="3" fill="var(--color-accent)" />`;
        }).join('')}
      </svg>
      <div class="weight-chart__meta">Avg: ${avg} kg · ${n} records</div>
    `;
  }

  async function renderWeight() {
    const records = await loadWeight();
    const list = document.getElementById('weight-list');
    if (!list) return;

    list.innerHTML = '';

    if (records.length === 0) {
      list.innerHTML = `<p class="empty-state__text">No hay registros aún.</p>`;
    } else {
      const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
      sorted.forEach(record => {
        const item = document.createElement('article');
        item.className = 'weight-card';
        item.innerHTML = `
          <div class="weight-card__info">
            <span class="weight-card__value">${Number(record.weight).toFixed(1)} kg</span>
            <span class="weight-card__date">${formatDateShort(record.date)}</span>
            ${record.note ? `<span class="weight-card__note">${escapeHtml(record.note)}</span>` : ''}
          </div>
          <button type="button" class="icon-btn weight-delete" data-id="${record.id}" aria-label="${t('common.delete')}">${icon('trash')}</button>
        `;
        list.appendChild(item);
      });
    }

    renderWeightChart(records);
  }

  async function onWeightSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const record = {
      weight: safeInputNumber(fd.get('weight')),
      date: fd.get('date') || todayISO(),
      note: fd.get('note') || '',
      createdAt: (window.TimeEngine ? window.TimeEngine.getToday() : new Date()).toISOString()
    };

    try {
      await window.db.add(WEIGHT_STORE, record);
      window.pubsub.emit('weightAdded', record);
      e.target.reset();
      e.target.elements.date.value = todayISO();
      await renderWeight();
    } catch (err) {
      console.error('Error saving weight:', err);
    }
  }

  async function onWeightDelete(id) {
    try {
      await window.db.delete(WEIGHT_STORE, Number(id));
      window.pubsub.emit('weightDeleted', { id });
      await renderWeight();
    } catch (err) {
      console.error('Error deleting weight:', err);
    }
  }

  // --- Evidence ---------------------------------------------------------------

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function loadEvidence() {
    try {
      return await window.db.getAll(EVIDENCE_STORE);
    } catch (e) {
      console.error('Error loading evidence:', e);
      return [];
    }
  }

  async function renderEvidence() {
    const gallery = document.getElementById('evidence-gallery');
    if (!gallery) return;

    const records = await loadEvidence();
    gallery.innerHTML = '';

    if (records.length === 0) {
      gallery.innerHTML = `<p class="empty-state__text">No hay evidencia aún.</p>`;
      return;
    }

    const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(record => {
      const item = document.createElement('article');
      item.className = 'evidence-card';
      item.innerHTML = `
        <div class="evidence-card__media">
          <img src="${escapeHtml(record.image)}" alt="" loading="lazy">
        </div>
        <div class="evidence-card__info">
          <span class="evidence-card__date">${formatDateShort(record.date)}</span>
          ${record.description ? `<span class="evidence-card__desc">${escapeHtml(record.description)}</span>` : ''}
        </div>
        <button type="button" class="icon-btn evidence-delete" data-id="${record.id}" aria-label="${t('common.delete')}">${icon('trash')}</button>
      `;
      gallery.appendChild(item);
    });
  }

  async function onEvidenceSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const file = fd.get('photo');
    if (!file || file.size === 0) return;

    try {
      const image = await fileToBase64(file);
      const record = {
        image,
        date: fd.get('date') || todayISO(),
        description: fd.get('description') || '',
        createdAt: (window.TimeEngine ? window.TimeEngine.getToday() : new Date()).toISOString()
      };
      await window.db.add(EVIDENCE_STORE, record);
      window.pubsub.emit('evidenceAdded', record);
      e.target.reset();
      e.target.elements.date.value = todayISO();
      await renderEvidence();
    } catch (err) {
      console.error('Error saving evidence:', err);
    }
  }

  async function onEvidenceDelete(id) {
    try {
      await window.db.delete(EVIDENCE_STORE, Number(id));
      window.pubsub.emit('evidenceDeleted', { id });
      await renderEvidence();
    } catch (err) {
      console.error('Error deleting evidence:', err);
    }
  }

  // --- Lifecycle ---------------------------------------------------------------

  function wireEvents() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    panel.addEventListener('submit', (e) => {
      if (e.target.id === 'settings-form') onSettingsSubmit(e);
      if (e.target.id === 'weight-form') onWeightSubmit(e);
      if (e.target.id === 'evidence-form') onEvidenceSubmit(e);
    });

    panel.addEventListener('click', (e) => {
      const weightDelete = e.target.closest('.weight-delete');
      if (weightDelete) onWeightDelete(weightDelete.dataset.id);

      const evidenceDelete = e.target.closest('.evidence-delete');
      if (evidenceDelete) onEvidenceDelete(evidenceDelete.dataset.id);
    });
  }

  function init() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    panel.innerHTML = panelTemplate();
    populateSettings();
    wireEvents();

    const weightForm = document.getElementById('weight-form');
    if (weightForm) weightForm.elements.date.value = todayISO();

    const evidenceForm = document.getElementById('evidence-form');
    if (evidenceForm) evidenceForm.elements.date.value = todayISO();

    renderWeight();
    renderEvidence();

    window.pubsub.on((event) => {
      if (event === 'langChange') {
        panel.innerHTML = panelTemplate();
        populateSettings();
        wireEvents();
        const weightForm = document.getElementById('weight-form');
        if (weightForm) weightForm.elements.date.value = todayISO();
        const evidenceForm = document.getElementById('evidence-form');
        if (evidenceForm) evidenceForm.elements.date.value = todayISO();
        renderWeight();
        renderEvidence();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
