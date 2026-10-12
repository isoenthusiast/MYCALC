import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const locales = {
  en: { home: 'What would you like to calculate?', loan: 'Plan your home loan', link: 'Open loan simulator', report: 'Home loan amortization report', invalid: 'Enter an annual rate from 0% to 30%.' },
  ms: { home: 'Apa yang ingin anda kira?', loan: 'Rancang pinjaman rumah anda', link: 'Buka simulator pinjaman', report: 'Laporan pelunasan pinjaman perumahan', invalid: 'Masukkan kadar tahunan antara 0% hingga 30%.' },
  zh: { home: '今天想算些什么？', loan: '规划你的房屋贷款', link: '打开房贷模拟器', report: '房贷摊还报告', invalid: '请输入 0% 至 30% 的年利率。' },
};

for (const [lang, labels] of Object.entries(locales)) {
  test(`${lang}: homepage, loan, complete report, CSV and print`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`/?lang=${lang}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(labels.home);
    await expect(page.locator('.category-card')).toHaveCount(5);
    await page.getByRole('link', { name: labels.link, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(labels.loan);
    await expect(page.locator('#monthly-payment')).toContainText('2,148.37');
    await page.locator('#firstPaymentDate').fill('2026-01-31');
    await expect(page.locator('#export-csv')).toBeEnabled();
    await expect(page.locator('#repayment-table tbody tr')).toHaveCount(12);
    await page.locator('#next-page').click();
    await expect(page.locator('#repayment-table tbody tr').first().locator('th')).toHaveText('13');
    // Export while on page 2: every period must still be present.
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-csv').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(`-${lang}-`);
    const bytes = await readFile(await download.path());
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const csv = bytes.toString('utf8');
    expect(csv).toContain(labels.report);
    expect(csv.split('\r\n').filter(line => /^"\d+","\d{4}-\d{2}-\d{2}"/.test(line))).toHaveLength(360);
    expect(csv).toContain('"2","2026-02-28"');
    expect(csv).toContain('"3","2026-03-31"');
    await page.locator('#toggle-report').click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(labels.report);
    await expect(page.locator('#repayment-table tbody tr')).toHaveCount(360);
    await expect(page.locator('#report-snapshot')).toBeVisible();
    await expect(page.locator('.loan-inputs')).toBeHidden();
    await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
    await expect(page.locator('#print-root .schedule-table').first().locator('tbody tr')).toHaveCount(360);
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#print-root')).toBeVisible();
    await expect(page.locator('.site-header')).toBeHidden();
    expect(errors).toEqual([]);
  });
}

test('locale switching preserves loan inputs, updates errors, and persists across navigation', async ({ page }) => {
  await page.goto('/calculators/home-loan/?lang=en');
  await page.locator('#amount').fill('600000');
  await page.locator('#extraPayment').fill('500');
  await expect(page.locator('#extra-savings')).toBeVisible();
  await page.locator('#language').selectOption('zh');
  await expect(page.locator('#amount')).toHaveValue('600000');
  await expect(page.locator('#extraPayment')).toHaveValue('500');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
  await page.locator('#annualRate').fill('-1');
  await expect(page.locator('#annualRate-error')).toHaveText(locales.zh.invalid);
  await expect(page.locator('#export-csv')).toBeDisabled();
  await expect(page.locator('.loan-results')).toBeHidden();
  await page.locator('#language').selectOption('ms');
  await expect(page.locator('#annualRate-error')).toHaveText(locales.ms.invalid);
  await page.locator('.brand').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(locales.ms.home);
  await page.goto('/');
  await expect(page.locator('#language')).toHaveValue('ms');
  const stored = await page.evaluate(() => ({ ...localStorage }));
  expect(Object.keys(stored)).toEqual(['mycalc-language']);
});

test('extra payments, zero rate, invalid money precision and annual view', async ({ page }) => {
  await page.goto('/calculators/home-loan/?lang=en');
  await page.locator('#firstPaymentDate').fill('2026-11-01');
  await page.locator('#extraPayment').fill('500');
  await expect(page.locator('#payoff-duration')).toHaveText('21y 0m');
  await expect(page.locator('#extra-savings')).toBeVisible();
  await page.locator('[data-group=annual]').click();
  await expect(page.locator('#annual-note')).toBeVisible();
  await expect(page.locator('#repayment-table tbody tr').first().locator('th')).toHaveText('2026');
  await page.locator('#amount').fill('1000.001');
  await expect(page.locator('#amount-error')).toBeVisible();
  await page.locator('#amount').fill('1000');
  await page.locator('#annualRate').fill('0');
  await page.locator('#extraPayment').fill('0');
  await page.locator('#years').fill('1');
  await expect(page.locator('#total-interest')).toHaveText('RM 0.00');
  await expect(page.locator('#total-repayment')).toHaveText('RM 1,000.00');
  await page.locator('#page-size').selectOption('all');
  await expect(page.locator('#repayment-table tbody tr')).toHaveCount(2);
});

test('search recognises all three languages and planned tools have no dead links', async ({ page }) => {
  await page.goto('/?lang=en');
  await page.locator('#calculator-search').fill('公积金');
  await expect(page.locator('.category-card')).toHaveCount(1);
  await expect(page.locator('.planned-tool')).toContainText('EPF');
  await expect(page.locator('.planned-tool a')).toHaveCount(0);
  await page.locator('#calculator-search').fill('nonexistent-tool');
  await expect(page.locator('#no-results')).toBeVisible();
  await page.locator('#clear-filters').click();
  await expect(page.locator('.category-card')).toHaveCount(5);
  await page.locator('[data-category-nav=ev]').click();
  await expect(page.locator('.category-card')).toHaveCount(1);
  await expect(page).toHaveURL(/category=ev/);
});

for (const width of [320, 390, 768, 1440]) {
  test(`responsive ${width}px: homepage and simulator fit without page overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/?lang=ms');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/calculators/home-loan/?lang=ms');
    await expect(page.locator('#monthly-payment')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width <= 390) await expect(page.locator('#mobile-category')).toBeVisible();
    await page.locator('#theme').selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
}

test('no calculation data is sent to a third party', async ({ page }) => {
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/calculators/home-loan/?lang=en');
  await page.locator('#amount').fill('750000');
  await expect(page.locator('#export-csv')).toBeEnabled();
  expect(requests.every(url => url.startsWith('http://127.0.0.1:4310/'))).toBe(true);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
