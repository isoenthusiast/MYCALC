import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLoan } from '../src/calculations/home-loan.js';
import { createLoanCsv, csvCell, printReportHTML } from '../src/reports/loan-report.js';
import { translations, translate } from '../src/i18n.js';

const loan = calculateLoan({ amount: 450000, annualRate: 4, years: 30, extraPayment: 0, firstPaymentDate: '2026-01-01' });
const now = new Date('2026-10-13T00:00:00Z');

test('all languages have matching keys and interpolation variables', () => {
  for (const lang of ['ms', 'zh']) {
    assert.deepEqual(Object.keys(translations[lang]).sort(), Object.keys(translations.en).sort());
    for (const [key, value] of Object.entries(translations.en)) {
      assert.ok(translations[lang][key].trim());
      const placeholders = s => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
      assert.deepEqual(placeholders(value), placeholders(translations[lang][key]), `${lang}/${key}`);
    }
  }
});

for (const lang of ['en', 'ms', 'zh']) {
  test(`${lang}: CSV has BOM, metadata, all 360 monthly rows and all 30 annual rows`, () => {
    const csv = createLoanCsv(loan, lang, now);
    assert.equal(csv.charCodeAt(0), 0xfeff);
    assert.ok(csv.includes(translate('reportTitle', lang)));
    assert.ok(csv.includes(translate('assumptionExclusions', lang)));
    assert.ok(csv.includes(translate('currency', lang)));
    const monthlyRows = csv.split('\r\n').filter(line => /^"\d+","\d{4}-\d{2}-\d{2}"/.test(line));
    assert.equal(monthlyRows.length, 360);
    assert.ok(monthlyRows[0].startsWith('"1","2026-01-01","450000.00","2148.37","1500.00","648.37"'));
    assert.ok(monthlyRows.at(-1).endsWith(',"0.00"'));
    const annual = csv.split(translate('csvAnnual', lang))[1];
    assert.equal(annual.split('\r\n').filter(line => /^"\d{4}","\d+\.\d{2}"/.test(line)).length, 30);
  });
  test(`${lang}: print report includes every period and translated assumptions`, () => {
    const html = printReportHTML(loan, lang, now);
    assert.ok(html.includes(translate('reportTitle', lang)));
    assert.ok(html.includes(translate('assumptionRounding', lang)));
    assert.equal((html.match(/<th scope="row"/g) || []).length, 392); // 360 + 30 + two totals
    assert.ok(html.includes('2026-10-13T00:00:00.000Z'));
  });
}

test('CSV quotes punctuation, embedded lines and spreadsheet formulas safely', () => {
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"');
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
  assert.equal(csvCell('  @SUM(A1)'), '"\'  @SUM(A1)"');
  assert.equal(csvCell(12.5), '"12.5"');
});
