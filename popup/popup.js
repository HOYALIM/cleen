/**
 * Cleen Popup — Dashboard rendering & controls
 * Renders cached data instantly, then refreshes from service worker.
 */
'use strict';

const $ = (id) => document.getElementById(id);
const memoryBarFill = $('memoryBarFill');
const memoryValue = $('memoryValue');
const memoryUnit = $('memoryUnit');
const estimateBanner = $('estimateBanner');
const tabList = $('tabList');
const heavySection = $('heavySection');
const heavyTabList = $('heavyTabList');
const footerStats = $('footerStats');

const TOP_TAB_COUNT = 5;
let freshDataLoaded = false;

function createTabItem(tab) {
  const li = document.createElement('li');
  li.className = 'tab-item';

  const favicon = tab.favIconUrl
    ? Object.assign(document.createElement('img'), {
        className: 'tab-favicon', src: tab.favIconUrl, alt: '',
        onerror() { this.replaceWith(Object.assign(document.createElement('div'), { className: 'tab-favicon-placeholder' })); },
      })
    : Object.assign(document.createElement('div'), { className: 'tab-favicon-placeholder' });
  li.appendChild(favicon);

  const info = document.createElement('div');
  info.className = 'tab-info';
  const title = document.createElement('span');
  title.className = 'tab-title';
  title.textContent = tab.title || 'Untitled';
  title.title = tab.title || 'Untitled'; // Hover tooltip for truncated titles
  info.appendChild(title);
  li.appendChild(info);

  const mem = document.createElement('span');
  mem.className = 'tab-memory';
  mem.textContent = tab.memoryMB + ' MB';
  li.appendChild(mem);

  const btn = document.createElement('button');
  btn.className = 'tab-suspend-btn';
  btn.textContent = 'Suspend';
  btn.setAttribute('aria-label', 'Suspend ' + (tab.title || 'tab'));
  if (tab.active || tab.pinned || tab.audible || tab.discarded) btn.disabled = true;
  btn.addEventListener('click', () => suspendTab(tab.id, btn));
  li.appendChild(btn);

  return li;
}

function renderAll(status) {
  if (!status?.success) return;
  const { totalMB = 0, isEstimate, tabs = [], session: sess = {} } = status;

  requestAnimationFrame(() => {
    // Estimate banner
    if (estimateBanner) estimateBanner.hidden = !isEstimate;

    // Memory bar
    const pct = Math.min((totalMB / 4000) * 100, 100);
    memoryBarFill.style.width = pct + '%';
    memoryBarFill.setAttribute('aria-valuenow', totalMB);
    memoryBarFill.className = 'memory-bar-fill' +
      (isEstimate ? ' state-estimate' : '') +
      (totalMB >= 2000 ? ' state-red' : totalMB >= 1000 ? ' state-yellow' : '');

    if (totalMB >= 1000) {
      memoryValue.textContent = '~' + (totalMB / 1000).toFixed(1);
      memoryUnit.textContent = 'GB';
    } else if (isEstimate) {
      memoryValue.textContent = '~' + totalMB;
      memoryUnit.textContent = 'MB';
    } else {
      memoryValue.textContent = totalMB;
      memoryUnit.textContent = 'MB';
    }

    // Top 5 tabs (exclude heavy — shown separately)
    const heavyIds = new Set();
    const heavy = tabs.filter((t) => t.isHeavy && !t.discarded);
    heavy.forEach((t) => heavyIds.add(t.id));

    const top = tabs.filter((t) => !t.discarded && !heavyIds.has(t.id)).slice(0, TOP_TAB_COUNT);

    tabList.replaceChildren();
    if (top.length === 0 && heavy.length === 0) {
      const li = document.createElement('li');
      li.className = 'tab-item tab-item--empty';
      li.textContent = 'No active tabs';
      tabList.appendChild(li);
    } else {
      for (const tab of top) tabList.appendChild(createTabItem(tab));
    }

    // Heavy tabs section
    if (heavy.length === 0) {
      heavySection.hidden = true;
    } else {
      heavySection.hidden = false;
      heavyTabList.replaceChildren();
      for (const tab of heavy) heavyTabList.appendChild(createTabItem(tab));
    }

    // Footer — qualify stats when in estimate mode
    const n = sess.totalSuspended || 0;
    const saved = sess.estimatedSavedMB || 0;
    const peak = sess.peakMemoryMB || 0;

    let footerText = `${n} tab${n !== 1 ? 's' : ''} suspended`;
    if (saved > 0 && !isEstimate) {
      footerText += ` · ${saved} MB saved`;
    }
    if (peak > 0) {
      footerText += ` · Peak: ${peak >= 1000 ? (peak / 1000).toFixed(1) + ' GB' : peak + ' MB'}`;
    }
    footerStats.textContent = footerText;
  });
}

async function suspendTab(tabId, btn) {
  btn.disabled = true;
  btn.textContent = '...';
  try {
    const res = await chrome.runtime.sendMessage({ type: 'suspendTab', tabId });
    if (res?.success) {
      btn.textContent = 'Done';
      setTimeout(loadFreshData, 300);
    } else {
      resetBtn(btn, 'Failed');
    }
  } catch {
    resetBtn(btn, 'Error');
  }
}

function resetBtn(btn, label) {
  btn.textContent = label;
  setTimeout(() => { btn.textContent = 'Suspend'; btn.disabled = false; }, 1500);
}

// -- Data loading (sequential to avoid race condition) -----------------------

async function loadCachedData() {
  try {
    const d = await chrome.storage.local.get('cleenPopupCache');
    if (d?.cleenPopupCache) renderAll(d.cleenPopupCache);
  } catch { /* no cache */ }
}

async function loadFreshData() {
  try {
    const status = await chrome.runtime.sendMessage({ type: 'getStatus' });
    if (status?.success) {
      freshDataLoaded = true;
      renderAll(status);
      try { await chrome.storage.local.set({ cleenPopupCache: status }); } catch { /* noop */ }
    }
  } catch (err) {
    console.error('[Cleen] Failed to load:', err);
  }
}

// Sequential: cache first, then fresh (no race condition)
async function init() {
  await loadCachedData();
  await loadFreshData();
}

init();
