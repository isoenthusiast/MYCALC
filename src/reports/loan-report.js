import { translate, money, formatDate, duration, escapeHtml, LOCALES } from '../i18n.js';

export const ASSUMPTION_KEYS = ['assumptionRate', 'assumptionMethod', 'assumptionRounding', 'assumptionExtra', 'assumptionExclusions', 'assumptionDates'];
export const MONEY_COLUMNS = [
  ['opening', 'openingBalanceSen'], ['regularPayment', 'regularPaymentSen'], ['interestColumn', 'interestSen'],
  ['principal', 'principalSen'], ['extra', 'extraPaymentSen'], ['payment', 'totalPaymentSen'], ['closing', 'closingBalanceSen'],
];

export function scheduleTable(result, lang, { annual = false, rows = annual ? result.annualRows : result.rows, id = '' } = {}) {
  const tr = key => escapeHtml(translate(key, lang));
  return `<table class="schedule-table"${id ? ` id="${id}"` : ''}><caption class="sr-only">${tr('tableCaption')}</caption><thead><tr><th scope="col">${tr(annual ? 'year' : 'month')}</th>${annual ? '' : `<th scope="col">${tr('date')}</th>`}${MONEY_COLUMNS.map(([key]) => `<th scope="col">${tr(key)}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(row => `<tr><th scope="row">${row.period}</th>${annual ? '' : `<td>${escapeHtml(formatDate(row.date, lang))}</td>`}${MONEY_COLUMNS.map(([, key]) => `<td>${money(row[key], lang, false)}</td>`).join('')}</tr>`).join('')}
    </tbody><tfoot><tr><th scope="row"${annual ? '' : ' colspan="2"'}>${tr('total')}</th><td>—</td>${['regularPaymentSen', 'interestSen', 'principalSen', 'extraPaymentSen', 'totalPaymentSen'].map(key => `<td>${money(result.totals[key], lang, false)}</td>`).join('')}<td>${money(0, lang, false)}</td></tr></tfoot></table>`;
}

export function snapshotEntries(result, lang) {
  const tr = key => translate(key, lang);
  return [
    [tr('amount'), money(result.principalSen, lang)],
    [tr('annualRate'), `${new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: 20 }).format(result.input.annualRate)}%`],
    [tr('years'), `${result.input.years} ${tr('yearsUnit')}`],
    [tr('extraPayment'), money(Math.round(result.input.extraPayment * 100), lang)],
    [tr('firstPaymentDate'), formatDate(result.input.firstPaymentDate, lang)],
    [tr('calculationBasis'), tr('monthlyReducing')],
    [tr('rateSource'), tr('manualRate')],
  ];
}

export function snapshotHTML(result, lang) {
  return `<dl class="snapshot-grid">${snapshotEntries(result, lang).map(([label, value], index) => `<div${index === 6 ? ' class="wide"' : ''}><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>`;
}

export function summaryEntries(result, lang) {
  const tr = key => translate(key, lang);
  return [
    [tr('scheduledPayment'), money(result.scheduledPaymentSen, lang)],
    [tr('totalInterest'), money(result.totals.interestSen, lang)],
    [tr('totalRepayment'), money(result.totals.totalPaymentSen, lang)],
    [tr('paidOffIn'), duration(result.months, lang)],
    [tr('payoffDate'), formatDate(result.payoffDate, lang)],
    [tr('interestSaved'), money(result.interestSavedSen, lang)],
  ];
}

export function printReportHTML(result, lang, generatedAt = new Date()) {
  const tr = key => escapeHtml(translate(key, lang));
  return `<article class="print-report"><div class="print-brand">MYCALC</div><h1>${tr('reportTitle')}</h1><p class="print-meta">${tr('generatedOn')}: ${generatedAt.toISOString()} · RM</p>
    <section class="print-summary"><h2>${tr('inputsSnapshot')}</h2>${snapshotHTML(result, lang)}<h2>${tr('results')}</h2><dl class="snapshot-grid">${summaryEntries(result, lang).map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl></section>
    <section><h2>${tr('assumptions')}</h2><ul>${ASSUMPTION_KEYS.map(key => `<li>${tr(key)}</li>`).join('')}</ul></section>
    <section><h2>${tr('csvMonthly')}</h2><p class="print-meta">${tr('principalHint')}</p>${scheduleTable(result, lang)}</section>
    <section><h2>${tr('csvAnnual')}</h2>${scheduleTable(result, lang, { annual: true })}</section></article>`;
}

/** Quote every cell and neutralize spreadsheet formulas in textual content. */
export function csvCell(value) {
  let string = String(value ?? '');
  if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(string)) string = `'${string}`;
  return `"${string.replaceAll('"', '""')}"`;
}

export function createLoanCsv(result, lang, generatedAt = new Date()) {
  const tr = key => translate(key, lang);
  const numeric = sen => (sen / 100).toFixed(2);
  const rows = [
    [tr('reportTitle')], [tr('generatedOn'), generatedAt.toISOString()], [tr('currency'), 'MYR (RM)'], [],
    [tr('inputsSnapshot')], ...snapshotEntries(result, lang), [], [tr('results')], ...summaryEntries(result, lang), [],
    [tr('assumptions')], ...ASSUMPTION_KEYS.map(key => [tr(key)]), [],
    [tr('csvMonthly')], [tr('month'), tr('date'), ...MONEY_COLUMNS.map(([key]) => tr(key))],
    ...result.rows.map(row => [row.period, row.date, ...MONEY_COLUMNS.map(([, key]) => numeric(row[key]))]),
    [tr('total'), '', '', ...['regularPaymentSen', 'interestSen', 'principalSen', 'extraPaymentSen', 'totalPaymentSen'].map(key => numeric(result.totals[key])), '0.00'], [],
    [tr('csvAnnual')], [tr('year'), ...MONEY_COLUMNS.map(([key]) => tr(key))],
    ...result.annualRows.map(row => [row.period, ...MONEY_COLUMNS.map(([, key]) => numeric(row[key]))]),
    [tr('total'), '', ...['regularPaymentSen', 'interestSen', 'principalSen', 'extraPaymentSen', 'totalPaymentSen'].map(key => numeric(result.totals[key])), '0.00'],
  ];
  // UTF-8 BOM preserves BM/Chinese labels when opened directly in Excel.
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
