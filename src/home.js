import { initShell, categories, icon, setActiveCategory } from './shell.js';
import { t, translate, getLanguage, escapeHtml } from './i18n.js';

initShell({ content: `
  <section class="home-hero"><p class="eyebrow" data-i18n="heroEyebrow"></p><h1 data-i18n="heroTitle"></h1><p class="lead" data-i18n="heroDescription"></p>
    <div class="search-box">${icon('search')}<label for="calculator-search" class="sr-only" data-i18n="searchLabel"></label><input id="calculator-search" type="search" data-i18n-placeholder="searchPlaceholder" autocomplete="off"><button id="clear-search" class="text-button" type="button" data-i18n="clearSearch" hidden></button></div>
  </section>
  <section class="featured-calculator" aria-labelledby="featured-heading"><div class="feature-copy"><span class="status-pill available" data-i18n="firstRelease"></span><h2 id="featured-heading" data-i18n="featuredTitle"></h2><p data-i18n="featuredDescription"></p><a class="button primary" data-local-link="./calculators/home-loan/index.html"><span data-i18n="openSimulator"></span>${icon('arrow')}</a></div><div class="feature-illustration" aria-hidden="true"><div class="house-mark">${icon('home')}</div><div class="illustration-lines"><span></span><span></span><span></span></div><div class="illustration-check">${icon('check')}</div></div></section>
  <section class="directory-section" aria-labelledby="directory-heading"><div class="section-heading"><h2 id="directory-heading" data-i18n="categoryIntro"></h2><p class="muted" data-i18n="roadmapNote"></p></div><div id="category-grid" class="category-grid"></div>
    <div id="no-results" class="empty-state" hidden><h2 data-i18n="noResults"></h2><p data-i18n="noResultsHint"></p><button type="button" class="button" id="clear-filters" data-i18n="clearFilters"></button></div><p class="sr-only" id="search-status" aria-live="polite"></p>
  </section>` });

const input = document.querySelector('#calculator-search');
const requestedCategory = new URLSearchParams(location.search).get('category');
let active = categories.some(c => c.id === requestedCategory) ? requestedCategory : 'all';
const searchable = (category, key) => ['en', 'ms', 'zh'].map(lang => `${translate(category, lang)} ${translate(key, lang)}`).join(' ').toLowerCase();

function render() {
  const query = input.value.trim().toLocaleLowerCase();
  const visible = categories.filter(c => active === 'all' || c.id === active).map(c => ({ ...c, tools: c.tools.filter(key => !query || searchable(c.id, key).includes(query)) })).filter(c => c.tools.length);
  const loanUrl = `./calculators/home-loan/index.html?lang=${getLanguage()}`;
  document.querySelector('#category-grid').innerHTML = visible.map(c => `
    <section class="category-card"><div class="category-heading"><span class="category-icon">${icon(c.id)}</span><h3>${escapeHtml(t(c.id))}</h3></div><ul class="tool-list">
    ${c.tools.map(key => key === 'loanName'
    ? `<li class="ready-tool"><a href="${loanUrl}"><div><span class="tool-name">${escapeHtml(t(key))}</span><span class="tool-description">${escapeHtml(t('loanDescription'))}</span></div>${icon('arrow')}</a><span class="status-pill available">${escapeHtml(t('available'))}</span></li>`
    : `<li class="planned-tool"><span>${escapeHtml(t(key))}</span><span class="planned-label">${escapeHtml(t('planned'))}</span></li>`).join('')}</ul></section>`).join('');
  document.querySelector('#no-results').hidden = visible.length > 0;
  document.querySelector('#clear-search').hidden = !input.value;
  document.querySelector('.featured-calculator').hidden = Boolean(query) || !['all', 'home'].includes(active);
  document.querySelector('#search-status').textContent = visible.length ? visible.map(c => t(c.id)).join(', ') : t('noResults');
  setActiveCategory(active);
}

input.addEventListener('input', render);
document.querySelector('#clear-search').addEventListener('click', () => { input.value = ''; render(); input.focus(); });
document.querySelector('#clear-filters').addEventListener('click', () => { input.value = ''; selectCategory('all'); input.focus(); });
function selectCategory(id) {
  active = id;
  const url = new URL(location.href);
  if (id === 'all') url.searchParams.delete('category');
  else url.searchParams.set('category', id);
  history.replaceState(null, '', url);
  render();
}
document.querySelectorAll('[data-category-nav]').forEach(link => link.addEventListener('click', event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  selectCategory(link.dataset.categoryNav);
}));
document.addEventListener('mycalc:language', render);
render();
