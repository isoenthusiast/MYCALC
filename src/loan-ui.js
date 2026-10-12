import { initShell, icon } from './shell.js';
import { t, getLanguage, money, duration, formatDate, escapeHtml } from './i18n.js';
import { calculateLoan, validateLoan } from './calculations/home-loan.js';
import { ASSUMPTION_KEYS, scheduleTable, snapshotHTML, printReportHTML, createLoanCsv } from './reports/loan-report.js';

function nextMonthDate() {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: 'numeric' }).formatToParts(new Date());
  const year = Number(parts.find(p => p.type === 'year').value);
  const month = Number(parts.find(p => p.type === 'month').value);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}
const defaults = { amount: 450000, annualRate: 4, years: 30, extraPayment: 0, firstPaymentDate: nextMonthDate() };
const field = (key, { prefix = '', suffix = '', min, max, step = 'any', hint = '', full = false, type = 'number' } = {}) => `
  <div class="field${full ? ' full' : ''}"><label for="${key}" data-i18n="${key}"></label>
  <div class="input-wrap">${prefix ? `<span class="prefix">${prefix}</span>` : ''}<input id="${key}" name="${key}" type="${type}"${type === 'number' ? ` inputmode="${key === 'years' ? 'numeric' : 'decimal'}" step="${step}"` : ''} min="${min}" max="${max}" value="${defaults[key]}" required aria-describedby="${key}-error${hint ? ` ${key}-hint` : ''}" autocomplete="off">${suffix ? `<span class="suffix"${suffix === '%' ? '' : ` data-i18n="${suffix}"`}>${suffix === '%' ? '%' : ''}</span>` : ''}</div>
  ${hint ? `<p class="field-hint" id="${key}-hint" data-i18n="${hint}"></p>` : ''}<p class="field-error" id="${key}-error" hidden></p></div>`;

initShell({ page: 'loan', content: `
  <p class="breadcrumb no-print" data-i18n="loanBreadcrumb"></p>
  <div class="page-heading loan-main-heading"><div><h1 id="page-title" data-i18n="loanTitle"></h1><p id="page-subtitle" data-i18n="loanSubtitle"></p></div><div class="page-actions no-print"><button class="button" id="toggle-report" type="button">${icon('file')}<span data-i18n="reportPreview"></span></button><button class="button primary" id="export-csv" type="button" data-i18n="exportCsv"></button></div></div>
  <p id="invalid-summary" class="invalid-summary" role="alert" data-i18n="invalidSummary" hidden></p>
  <section id="report-snapshot" class="panel report-snapshot" hidden><h2 data-i18n="inputsSnapshot"></h2><div id="snapshot-content"></div><p class="notice" data-i18n="reportPrintNote"></p></section>
  <div class="workspace-grid">
    <section class="panel loan-inputs" aria-labelledby="input-heading"><h2 id="input-heading" data-i18n="yourLoan"></h2>
    <form id="loan-form" novalidate><div class="field-grid">
      ${field('amount', { prefix: 'RM', min: 1000, max: 100000000, step: '0.01', full: true })}
      ${field('annualRate', { suffix: '%', min: 0, max: 30 })}
      ${field('years', { suffix: 'yearsUnit', min: 1, max: 40, step: 1 })}
      ${field('extraPayment', { prefix: 'RM', min: 0, max: 1000000, step: '0.01', hint: 'extraHint', full: true })}
      ${field('firstPaymentDate', { type: 'date', min: '1900-01-01', max: '2199-12-31', hint: 'dateHint', full: true })}
    </div><p class="input-note" data-i18n="illustrative"></p><div class="reset-row"><button type="button" id="reset-example" class="text-button" data-i18n="resetExample"></button></div></form></section>
    <section class="panel loan-results" data-i18n-aria="results"><div class="result-label" data-i18n="scheduledPayment"></div><div class="main-result" id="monthly-payment"></div><p class="result-note" data-i18n="excludingExtra"></p>
      <div class="result-facts">
        ${[['totalInterest', 'total-interest'], ['totalRepayment', 'total-repayment'], ['paidOffIn', 'payoff-duration'], ['payoffDate', 'payoff-date'], ['monthlyOutflow', 'monthly-outflow'], ['extraPayment', 'extra-result']].map(([key, id]) => `<div><div class="result-label" data-i18n="${key}"></div><strong id="${id}"></strong></div>`).join('')}
      </div><div class="payment-composition" id="composition" role="img"><span id="principal-share"></span><span id="interest-share"></span></div><div class="composition-legend"><span><span class="legend-dot"></span><span data-i18n="principalLegend"></span></span><span><span class="legend-dot interest"></span><span data-i18n="interestLegend"></span></span></div>
      <div class="savings-callout" id="extra-savings" hidden><div class="result-facts"><div><div class="result-label" data-i18n="interestSaved"></div><strong id="interest-saved"></strong></div><div><div class="result-label" data-i18n="timeSaved"></div><strong id="time-saved"></strong></div></div><p data-i18n="comparedWith"></p></div>
    </section>
  </div>
  <section class="table-panel screen-schedule" aria-labelledby="schedule-heading"><div class="table-toolbar"><div><h2 id="schedule-heading" data-i18n="schedule"></h2><p data-i18n="scheduleNote"></p></div><div class="segmented" data-i18n-aria="grouping"><button type="button" data-group="monthly" aria-pressed="true" data-i18n="monthly"></button><button type="button" data-group="annual" aria-pressed="false" data-i18n="annual"></button></div></div>
    <p class="table-note" id="annual-note" data-i18n="annualNote" hidden></p><div class="table-scroll" id="schedule-container" role="region" tabindex="0" data-i18n-aria="scheduleRegion"></div>
    <div class="table-footer"><span id="page-info" aria-live="polite"></span><div class="table-paging"><label for="page-size" data-i18n="rowsPerPage"></label><select id="page-size"><option value="12">12</option><option value="24">24</option><option value="60">60</option><option value="all" data-i18n="allRows"></option></select><button type="button" class="button" id="previous-page" data-i18n="previous"></button><button type="button" class="button" id="next-page" data-i18n="next"></button></div></div><p class="table-note" data-i18n="principalHint"></p>
  </section>
  <details class="assumptions" id="assumptions"><summary data-i18n="assumptions"></summary><ul>${ASSUMPTION_KEYS.map(key => `<li data-i18n="${key}"></li>`).join('')}</ul><div class="formula"><p data-i18n="formula"></p><code>M = P × r ÷ (1 − (1 + r)<sup>−n</sup>)</code><p data-i18n="formulaExplanation"></p></div></details>
  <div class="loan-bottom-actions no-print"><button type="button" class="button" id="print-report" data-i18n="printReport"></button><button type="button" class="button" id="export-csv-bottom" data-i18n="exportCsv"></button></div>
  <p id="download-status" class="download-status" role="status"></p><p id="result-status" class="sr-only" role="status" aria-live="polite"></p><div id="print-root" class="print-only"></div>
` });

let result;
let reportMode = false;
let group = 'monthly';
let page = 0;
let pageSize = '12';
let previousTableState;
let inputTimer;
const q = selector => document.querySelector(selector);
const inputKeys = Object.keys(defaults);
const readInputs = () => Object.fromEntries(inputKeys.map(key => [key, key === 'firstPaymentDate' ? q(`#${key}`).value : q(`#${key}`).valueAsNumber]));

function updateTable() {
  if (!result) return;
  const rows = group === 'annual' ? result.annualRows : result.rows;
  const size = pageSize === 'all' ? rows.length : Number(pageSize);
  const pages = Math.ceil(rows.length / size);
  page = Math.max(0, Math.min(page, pages - 1));
  const first = page * size;
  q('#schedule-container').innerHTML = scheduleTable(result, getLanguage(), { annual: group === 'annual', rows: rows.slice(first, first + size), id: 'repayment-table' });
  q('#page-info').textContent = t('pageInfo', { from: first + 1, to: Math.min(first + size, rows.length), count: rows.length });
  q('#previous-page').disabled = page === 0;
  q('#next-page').disabled = page >= pages - 1;
  q('#page-size').value = pageSize;
  q('#annual-note').hidden = group !== 'annual';
  document.querySelectorAll('[data-group]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.group === group)));
}

function updateResults({ announce = false } = {}) {
  const inputs = readInputs();
  const errors = validateLoan(inputs);
  const valid = Object.keys(errors).length === 0;
  for (const key of inputKeys) {
    q(`#${key}`).setAttribute('aria-invalid', String(Boolean(errors[key])));
    q(`#${key}-error`).textContent = errors[key] ? t(errors[key]) : '';
    q(`#${key}-error`).hidden = !errors[key];
  }
  q('#invalid-summary').hidden = valid;
  q('.loan-results').hidden = !valid;
  q('.screen-schedule').hidden = !valid;
  for (const id of ['toggle-report', 'export-csv', 'export-csv-bottom', 'print-report']) q(`#${id}`).disabled = !valid;
  q('#download-status').textContent = '';
  q('#print-root').innerHTML = '';
  if (!valid) { result = null; q('#result-status').textContent = ''; return; }
  result = calculateLoan(inputs);
  q('#monthly-payment').textContent = money(result.scheduledPaymentSen);
  q('#total-interest').textContent = money(result.totals.interestSen);
  q('#total-repayment').textContent = money(result.totals.totalPaymentSen);
  q('#payoff-duration').textContent = duration(result.months);
  q('#payoff-date').textContent = formatDate(result.payoffDate);
  q('#monthly-outflow').textContent = money(result.rows[0].totalPaymentSen);
  q('#extra-result').textContent = money(Math.round(inputs.extraPayment * 100));
  q('#principal-share').style.width = `${result.principalSen / result.totals.totalPaymentSen * 100}%`;
  q('#interest-share').style.width = `${result.totals.interestSen / result.totals.totalPaymentSen * 100}%`;
  q('#composition').setAttribute('aria-label', t('shareDescription', { principal: money(result.principalSen), interest: money(result.totals.interestSen) }));
  q('#extra-savings').hidden = inputs.extraPayment <= 0;
  q('#interest-saved').textContent = money(result.interestSavedSen);
  q('#time-saved').textContent = duration(result.monthsSaved);
  q('#snapshot-content').innerHTML = snapshotHTML(result, getLanguage());
  q('#page-title').textContent = t(reportMode ? 'reportTitle' : 'loanTitle');
  q('#page-subtitle').textContent = t(reportMode ? 'reportSubtitle' : 'loanSubtitle');
  q('#toggle-report span').textContent = t(reportMode ? 'backToCalculator' : 'reportPreview');
  updateTable();
  if (announce) q('#result-status').textContent = `${t('resultsUpdated')} ${t('scheduledPayment')}: ${money(result.scheduledPaymentSen)}.`;
}

q('#loan-form').addEventListener('submit', event => { event.preventDefault(); clearTimeout(inputTimer); updateResults({ announce: true }); });
q('#loan-form').addEventListener('input', () => {
  clearTimeout(inputTimer);
  // Disable actions immediately so a rapid export cannot use stale inputs.
  for (const id of ['toggle-report', 'export-csv', 'export-csv-bottom', 'print-report']) q(`#${id}`).disabled = true;
  inputTimer = setTimeout(() => { page = 0; updateResults({ announce: true }); }, 180);
});
q('#reset-example').addEventListener('click', () => {
  if (!window.confirm(t('resetConfirm'))) return;
  clearTimeout(inputTimer);
  for (const key of inputKeys) q(`#${key}`).value = defaults[key];
  page = 0;
  updateResults({ announce: true });
});
document.querySelectorAll('[data-group]').forEach(button => button.addEventListener('click', () => { group = button.dataset.group; page = 0; updateTable(); }));
q('#page-size').addEventListener('change', event => { pageSize = event.target.value; page = 0; updateTable(); });
q('#previous-page').addEventListener('click', () => { page -= 1; updateTable(); });
q('#next-page').addEventListener('click', () => { page += 1; updateTable(); });
q('#toggle-report').addEventListener('click', () => {
  if (!result) return;
  reportMode = !reportMode;
  q('#main').classList.toggle('report-mode', reportMode);
  q('.loan-inputs').hidden = reportMode;
  q('#report-snapshot').hidden = !reportMode;
  q('#assumptions').open = reportMode;
  if (reportMode) { previousTableState = { group, page, pageSize }; group = 'monthly'; page = 0; pageSize = 'all'; }
  else ({ group, page, pageSize } = previousTableState);
  updateResults();
});
function downloadCsv() {
  clearTimeout(inputTimer);
  updateResults();
  if (!result) return;
  const now = new Date();
  const blob = new Blob([createLoanCsv(result, getLanguage(), now)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mycalc-home-loan-${getLanguage()}-${now.toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  q('#download-status').textContent = t('csvDownloaded');
}
q('#export-csv').addEventListener('click', downloadCsv);
q('#export-csv-bottom').addEventListener('click', downloadCsv);
function preparePrint() {
  clearTimeout(inputTimer);
  updateResults();
  q('#print-root').innerHTML = result ? printReportHTML(result, getLanguage()) : `<p>${escapeHtml(t('invalidSummary'))}</p>`;
}
q('#print-report').addEventListener('click', () => { preparePrint(); if (result) window.print(); });
window.addEventListener('beforeprint', preparePrint);
document.addEventListener('mycalc:language', () => { clearTimeout(inputTimer); updateResults(); });
updateResults();
