import { initLanguage, applyTranslations, setLanguage, t } from './i18n.js';

export const categories = [
  { id: 'makan', tools: ['equalSplit', 'sharedItems', 'settleUp'] },
  { id: 'salary', tools: ['takeHome', 'epf', 'tax', 'retirement'] },
  { id: 'home', tools: ['eligibility', 'loanName', 'ownershipCost'] },
  { id: 'ev', tools: ['journey', 'consumption', 'charging'] },
  { id: 'savings', tools: ['savingsGoal', 'interest', 'contributions'] },
];
const paths = {
  all: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  makan: '<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v19M20 22V3c-5 0-5 12 0 12"/>',
  salary: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12c5 4 13 4 18 0M12 12v4"/>',
  home: '<path d="m3 10 9-7 9 7v11H3V10Z"/><path d="M9 21v-8h6v8"/>',
  ev: '<path d="M7 3v5m8-5v5M5 8h12v3a6 6 0 0 1-12 0V8Zm6 9v5m9-10-2 4h4l-2 4"/>',
  savings: '<path d="M5 10a7 7 0 0 1 12-5l4-1v6l2 2-2 5h-3l-1 4h-3v-3H9v3H6l-1-5H2v-5h3Zm3-4h5"/><circle cx="17" cy="10" r=".5"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  file: '<path d="M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8M8 16h8"/>',
};
export function icon(name, className = '') {
  return `<svg class="icon ${className}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.all}</svg>`;
}

export function initShell({ page = 'home', content }) {
  initLanguage();
  const base = page === 'loan' ? '../../' : './';
  let theme = 'system';
  try { theme = localStorage.getItem('mycalc-theme') || 'system'; } catch { /* Optional preference. */ }
  if (!['light', 'dark', 'system'].includes(theme)) theme = 'system';
  document.documentElement.dataset.theme = theme;
  const directoryLink = id => `${base}index.html${id === 'all' ? '' : `?category=${id}`}`;
  document.querySelector('#app').innerHTML = `
    <a class="skip-link" href="#main" data-i18n="skip"></a>
    <header class="site-header"><div class="brand-group"><a class="brand" data-local-link="${base}index.html" aria-label="MYCALC">MY<span>CALC</span></a><span class="tagline" data-i18n="tagline"></span></div>
      <div class="header-controls"><label class="select-label"><span data-i18n="language"></span><select id="language" data-i18n-aria="language"><option value="ms" lang="ms">BM</option><option value="en" lang="en">EN</option><option value="zh" lang="zh-Hans">中文</option></select></label>
      <label class="select-label theme-control"><span data-i18n="theme"></span><select id="theme" data-i18n-aria="theme"><option value="system" data-i18n="themeSystem"></option><option value="light" data-i18n="themeLight"></option><option value="dark" data-i18n="themeDark"></option></select></label></div>
    </header>
    <div class="app-layout"><aside class="sidebar no-print"><div class="nav-label" data-i18n="calculators"></div><nav data-i18n-aria="navigation">
      <a data-category-nav="all" data-local-link="${directoryLink('all')}">${icon('all')}<span data-i18n="allCalculators"></span></a>
      ${categories.map(c => `<a data-category-nav="${c.id}" data-local-link="${directoryLink(c.id)}">${icon(c.id)}<span data-i18n="${c.id}"></span></a>`).join('')}
      </nav><div class="sidebar-bottom"><a class="source-link" href="https://github.com/isoenthusiast/MYCALC" target="_blank" rel="noopener noreferrer"><span data-i18n="openSource"></span> ↗</a></div></aside>
    <div class="content-column"><div class="mobile-navigation no-print"><label class="sr-only" for="mobile-category" data-i18n="navigation"></label><select id="mobile-category"><option value="all" data-i18n="allCalculators"></option>${categories.map(c => `<option value="${c.id}" data-i18n="${c.id}"></option>`).join('')}</select></div>
      <main id="main">${content}</main>
      <footer class="site-footer no-print"><div><span data-i18n="privacy"></span><span class="footer-dot" aria-hidden="true">·</span><span data-i18n="noAccount"></span></div><span data-i18n="footerNote"></span><details class="privacy-details"><summary data-i18n="privacy"></summary><p data-i18n="privacyDetail"></p></details></footer>
    </div></div>`;
  document.querySelector('#language').addEventListener('change', event => setLanguage(event.target.value));
  document.querySelector('#theme').value = theme;
  document.querySelector('#theme').addEventListener('change', event => {
    document.documentElement.dataset.theme = event.target.value;
    try { localStorage.setItem('mycalc-theme', event.target.value); } catch { /* Optional preference. */ }
  });
  document.querySelector('#mobile-category').addEventListener('change', event => {
    const link = document.querySelector(`[data-category-nav="${event.target.value}"]`);
    if (page === 'home') link.click();
    else location.assign(link.href);
  });
  applyTranslations();
  setActiveCategory(page === 'loan' ? 'home' : 'all');
  const updateTitle = () => { document.title = t(page === 'loan' ? 'loanPageTitle' : 'appTitle'); };
  updateTitle();
  document.addEventListener('mycalc:language', updateTitle);
}

export function setActiveCategory(category) {
  document.querySelectorAll('[data-category-nav]').forEach(link => {
    if (link.dataset.categoryNav === category) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.querySelector('#mobile-category').value = category;
}
