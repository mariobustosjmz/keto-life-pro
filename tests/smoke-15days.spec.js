// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.KETO_BASE_URL || 'https://mariobustosjmz.github.io/keto-life-pro/';
const START_DATE = process.env.KETO_START_DATE || '2026-07-07';
const DAYS = Number(process.env.KETO_DAYS) || 15;

function addDays(isoDate, days) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function setSimDate(page, date) {
  await page.evaluate((d) => {
    localStorage.setItem('ketoSimDate', `${d}T12:00:00`);
  }, date);
  await page.reload({ waitUntil: 'networkidle' });
}

async function goToPanel(page, section) {
  await page.locator(`.nav-item[data-section="${section}"]`).click();
  await page.waitForSelector(`#panel-${section}.is-active`, { state: 'visible', timeout: 5000 });
}

async function addWaterFromDashboard(page) {
  await page.locator('#btn-add-water').click();
}

async function addMeal(page, { name, time, carbs, fiber, protein, fat }) {
  await page.locator('#panel-meals .btn--primary').first().click();
  await page.locator('#meal-modal').waitFor({ state: 'visible' });
  await page.locator('#meal-name').fill(name);
  await page.locator('#meal-time').fill(time);
  await page.locator('#meal-carbs').fill(String(carbs));
  await page.locator('#meal-fiber').fill(String(fiber));
  await page.locator('#meal-protein').fill(String(protein));
  await page.locator('#meal-fat').fill(String(fat));
  await page.locator('.meal-form button[type="submit"]').click();
  await page.locator('#meal-modal').waitFor({ state: 'hidden' });
}

async function completeFirstHabit(page) {
  const btn = page.locator('#panel-habits .habit-complete-btn').first();
  await btn.click();
  await page.locator('#panel-habits .habit-complete-btn.is-completed').first().waitFor({ state: 'visible', timeout: 5000 });
}

async function takeScreenshot(page, name, dir) {
  const path = `${dir}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

test('simulate 15 days of keto tracking', async ({ page }, testInfo) => {
  const screenshotDir = `${testInfo.outputDir}/screenshots`;
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  // Clear any previous simulation data for a clean run
  await page.evaluate(() => {
    localStorage.removeItem('ketoSimDate');
    indexedDB.deleteDatabase('KetoLifeDB');
  });
  await page.reload({ waitUntil: 'networkidle' });

  const summary = [];

  for (let i = 0; i < DAYS; i++) {
    const date = addDays(START_DATE, i);
    await setSimDate(page, date);

    // 1. Dashboard: add water
    await page.waitForSelector('#panel-today.is-active', { state: 'visible' });
    await addWaterFromDashboard(page);

    // 2. Meals: add a keto meal
    await goToPanel(page, 'meals');
    await addMeal(page, {
      name: `Keto meal day ${i + 1}`,
      time: '13:00',
      carbs: 8,
      fiber: 3,
      protein: 25,
      fat: 40
    });

    // 3. Habits: complete first habit
    await goToPanel(page, 'habits');
    await completeFirstHabit(page);

    // 4. Screenshot today summary
    await goToPanel(page, 'today');
    const screenshot = await takeScreenshot(page, `day-${String(i + 1).padStart(2, '0')}`, screenshotDir);
    summary.push({ day: i + 1, date, screenshot });
  }

  // Final verification: count meals and water logs across all days
  const counts = await page.evaluate(async () => {
    const meals = await window.db.getAll('meals');
    const water = await window.db.getAll('water');
    return { meals: meals.length, water: water.length };
  });
  expect(counts.meals).toBeGreaterThanOrEqual(DAYS);
  expect(counts.water).toBeGreaterThanOrEqual(DAYS);

  console.log(JSON.stringify({ days: DAYS, ...counts, summary }, null, 2));
});
