'use strict';

const $ = (id) => document.getElementById(id);

const memoryRing = $('memoryRing');
const memoryValue = $('memoryValue');
const memoryUnit = $('memoryUnit');
const memoryDetail = $('memoryDetail');
const activeValue = $('activeValue');
const suspendedValue = $('suspendedValue');
const heavyValue = $('heavyValue');
const tabList = $('tabList');

const TAB_LIMIT = 8;
let currentTabs = [];
let allTabs = [];
let currentFilter = 'all';

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function createTabItem(tab) {
  const div = document.createElement('div');
  div.className = 'tab-item';
  if (tab.discarded) {
    div.classList.add('tab-item--discarded');
  }
  if (tab.active) {
    div.classList.add('tab-item--active');
  }

  const statusIcon = document.createElement('span');
  statusIcon.className = 'tab-status-icon';
  if (tab.discarded) {
    statusIcon.innerHTML = '🌙';
    statusIcon.title = 'Suspended';
  } else if (tab.active) {
    statusIcon.innerHTML = '☀️';
    statusIcon.title = 'Active';
  }
  div.appendChild(statusIcon);

  const favicon = tab.favIconUrl
    ? Object.assign(document.createElement('img'), {
        className: 'tab-favicon', src: tab.favIconUrl, alt: '',
        onerror() { this.replaceWith(Object.assign(document.createElement('div'), { className: 'tab-favicon-placeholder' })); },
      })
    : Object.assign(document.createElement('div'), { className: 'tab-favicon-placeholder' });
  div.appendChild(favicon);

  const info = document.createElement('div');
  info.className = 'tab-info';
  
  const title = document.createElement('span');
  title.className = 'tab-title';
  title.textContent = tab.title || 'Untitled';
  title.title = tab.title || 'Untitled';
  info.appendChild(title);
  
  const domain = document.createElement('span');
  domain.className = 'tab-domain';
  domain.textContent = getDomain(tab.url);
  info.appendChild(domain);
  
  div.appendChild(info);

  if (tab.memoryMB > 0 && !tab.discarded) {
    const mem = document.createElement('span');
    mem.className = 'tab-memory';
    mem.textContent = tab.memoryMB + ' MB';
    div.appendChild(mem);
  }

  const btn = document.createElement('button');
  btn.className = 'tab-suspend-btn';
  if (tab.discarded) {
    btn.textContent = 'Restore';
    btn.classList.add('tab-suspend-btn--discarded');
  } else if (tab.active || tab.pinned || tab.audible) {
    btn.disabled = true;
    btn.textContent = 'Active';
  } else {
    btn.textContent = 'Suspend';
  }

  if (tab.memoryMB > 0 && !tab.discarded) {
    const mem = document.createElement('span');
    mem.className = 'tab-memory';
    mem.textContent = tab.memoryMB + ' MB';
    div.appendChild(mem);
  }

  if (tab.discarded) {
    const zzz = document.createElement('span');
    zzz.className = 'tab-zzz';
    zzz.textContent = 'zzz';
    div.appendChild(zzz);
  }
  btn.addEventListener('click', () => tab.discarded ? restoreTab(tab.id, btn) : suspendTab(tab.id, btn));
  div.appendChild(btn);

  return div;
}

function updateMemoryRing(totalMB) {
  const maxMB = 4000;
  const circumference = 2 * Math.PI * 42;
  const percent = Math.min(totalMB / maxMB, 1);
  const offset = circumference * (1 - percent);
  
  memoryRing.style.strokeDashoffset = offset;
  memoryRing.classList.remove('state-warning', 'state-danger');
  if (totalMB >= 3000) memoryRing.classList.add('state-danger');
  else if (totalMB >= 2000) memoryRing.classList.add('state-warning');
}

function getFilteredTabs(tabs) {
  switch (currentFilter) {
    case 'active':
      return tabs.filter(t => !t.discarded);
    case 'discarded':
      return tabs.filter(t => t.discarded);
    default:
      return tabs;
  }
}

function renderAll(status) {
  if (!status?.success) return;
  
  const { totalMB = 0, isEstimate, tabs = [] } = status;
  currentTabs = tabs;
  
  requestAnimationFrame(() => {
    const activeTabs = tabs.filter(t => !t.discarded);
    const suspendedTabs = tabs.filter(t => t.discarded);
    const heavyTabs = activeTabs.filter(t => t.isHeavy || t.memoryMB > 150);
    
    if (totalMB > 0) {
      if (totalMB >= 1000) {
        memoryValue.textContent = (totalMB / 1000).toFixed(1);
        memoryUnit.textContent = 'GB';
      } else {
        memoryValue.textContent = totalMB;
        memoryUnit.textContent = 'MB';
      }
    } else {
      memoryValue.textContent = '0';
      memoryUnit.textContent = 'MB';
    }
    memoryDetail.textContent = isEstimate ? `${activeTabs.length} tabs (est)` : `${totalMB} MB`;
    updateMemoryRing(totalMB);
    
    activeValue.textContent = activeTabs.length;
    suspendedValue.textContent = suspendedTabs.length;
    heavyValue.textContent = heavyTabs.length;
    
    const filteredTabs = getFilteredTabs(tabs);
    const sortedTabs = [...filteredTabs].sort((a, b) => b.memoryMB - a.memoryMB);
    const displayTabs = currentFilter === 'all' ? sortedTabs.slice(0, TAB_LIMIT) : sortedTabs;
    
    tabList.replaceChildren();
    if (displayTabs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'tab-item tab-item--empty';
      empty.textContent = currentFilter === 'discarded' ? 'No suspended tabs' : (currentFilter === 'active' ? 'No active tabs' : 'No tabs');
      tabList.appendChild(empty);
    } else {
      for (const tab of displayTabs) {
        tabList.appendChild(createTabItem(tab));
      }
    }
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
      btn.textContent = 'Failed';
      setTimeout(() => {
        btn.textContent = 'Suspend';
        btn.disabled = false;
      }, 1000);
    }
  } catch {
    btn.textContent = 'Error';
  }
}

async function restoreTab(tabId, btn) {
  btn.disabled = true;
  btn.textContent = '...';
  try {
    const res = await chrome.runtime.sendMessage({ type: 'restoreTab', tabId });
    if (res?.success) {
      btn.textContent = 'Done';
      setTimeout(loadFreshData, 300);
    } else {
      btn.textContent = 'Failed';
      setTimeout(() => {
        btn.textContent = 'Restore';
        btn.disabled = false;
      }, 1000);
    }
  } catch {
    btn.textContent = 'Error';
  }
}

async function loadCachedData() {
  try {
    const d = await chrome.storage.local.get('cleenPopupCache');
    if (d?.cleenPopupCache) renderAll(d.cleenPopupCache);
  } catch { }
}

async function loadFreshData() {
  document.body.classList.add('loading');
  try {
    const [status, tabs] = await Promise.all([
      chrome.runtime.sendMessage({ type: 'getStatus' }),
      chrome.runtime.sendMessage({ type: 'getAllTabs' })
    ]);
    allTabs = tabs || [];
    if (status?.success) {
      renderAll(status);
      try { await chrome.storage.local.set({ cleenPopupCache: status }); } catch { }
    }
  } catch (err) {
    console.error('[Cleen] Failed to load:', err);
  } finally {
    document.body.classList.remove('loading');
  }
}

async function init() {
  setupFilterButtons();
  setupSettingsPanel();
  await loadCachedData();
  await loadFreshData();
}

function setupFilterButtons() {
  document.querySelectorAll('.card--stat').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const filter = card.dataset.filter;
      currentFilter = currentFilter === filter ? 'all' : filter;
      if (currentTabs.length > 0) {
        renderAll({ success: true, totalMB: 0, isEstimate: true, tabs: currentTabs });
      }
    });
  });
}

function setupSettingsPanel() {
  const settingsBtn = $('settingsBtn');
  const settingsPanel = $('settingsPanel');
  const settingsClose = $('settingsClose');
  const thresholdSelect = $('thresholdSelect');

  settingsBtn?.addEventListener('click', () => {
    settingsPanel.classList.add('settings-panel--open');
  });

  settingsClose?.addEventListener('click', () => {
    settingsPanel.classList.remove('settings-panel--open');
  });

  thresholdSelect?.addEventListener('change', async (e) => {
    const value = parseInt(e.target.value, 10);
    await chrome.storage.local.set({ suspendThreshold: value });
  });

  chrome.storage.local.get('suspendThreshold', (d) => {
    if (d?.suspendThreshold !== undefined) {
      thresholdSelect.value = d.suspendThreshold;
    }
  });
}

init();

const suspendAllBtn = $('suspendAllBtn');
const suspendLeftBtn = $('suspendLeftBtn');
const suspendRightBtn = $('suspendRightBtn');
const suspendOthersBtn = $('suspendOthersBtn');

async function suspendMultiple(tabIds) {
  for (const tabId of tabIds) {
    try {
      await chrome.runtime.sendMessage({ type: 'suspendTab', tabId });
    } catch { }
  }
  setTimeout(loadFreshData, 500);
}

function getActiveTabId() {
  const active = currentTabs.find(t => t.active);
  return active?.id || (allTabs.length > 0 ? allTabs[0].id : null);
}

suspendAllBtn?.addEventListener('click', async () => {
  const ids = currentTabs.filter(t => !t.discarded && !t.active).map(t => t.id);
  await suspendMultiple(ids);
});

suspendLeftBtn?.addEventListener('click', async () => {
  const currentId = getActiveTabId();
  if (!currentId || allTabs.length === 0) return;
  const idx = allTabs.findIndex(t => t.id === currentId);
  if (idx <= 0) return;
  const ids = allTabs.slice(0, idx).filter(t => !t.discarded && !t.active).map(t => t.id);
  await suspendMultiple(ids);
});

suspendRightBtn?.addEventListener('click', async () => {
  const currentId = getActiveTabId();
  if (!currentId || allTabs.length === 0) return;
  const idx = allTabs.findIndex(t => t.id === currentId);
  if (idx < 0 || idx >= allTabs.length - 1) return;
  const ids = allTabs.slice(idx + 1).filter(t => !t.discarded && !t.active).map(t => t.id);
  await suspendMultiple(ids);
});

suspendOthersBtn?.addEventListener('click', async () => {
  const currentId = getActiveTabId();
  if (!currentId) return;
  const ids = allTabs.filter(t => t.id !== currentId && !t.discarded && !t.active).map(t => t.id);
  await suspendMultiple(ids);
});
