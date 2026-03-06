/**
 * Cleen — Background Service Worker
 * Tab activity tracking, auto-suspend, memory monitoring, session stats.
 */
'use strict';

const ALARM_NAME = 'cleen-check';
const CHECK_INTERVAL_MIN = 5;
const DEFAULT_THRESHOLD_MS = 30 * 60 * 1000;
const MEMORY_CACHE_TTL_MS = 30_000;
const MAX_TAB_ENTRIES = 500;

const HEAVY_SITES = [
  'youtube.com', 'youtu.be', 'claude.ai',
  'chat.openai.com', 'gemini.google.com',
  'notion.so', 'figma.com',
];

let siteExclusions = new Set();

async function loadExclusions() {
  const saved = await storageGet('siteExclusions');
  siteExclusions = new Set(saved || []);
}

function isHeavySite(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const h = new URL(url).hostname;
    return HEAVY_SITES.some((s) => h === s || h.endsWith('.' + s));
  } catch { return false; }
}

function isExcludedSite(url) {
  if (!url || typeof url !== 'string' || siteExclusions.size === 0) return false;
  try {
    const h = new URL(url).hostname;
    return siteExclusions.has(h) || siteExclusions.has(h.replace(/^www\./, ''));
  } catch { return false; }
}

// -- Storage helpers ---------------------------------------------------------

async function storageGet(key) {
  try {
    const d = await chrome.storage.local.get(key);
    if (d[key] !== undefined) return d[key];
  } catch (err) {
    console.warn('[Cleen] Storage read failed:', key, err.message);
  }
  return undefined;
}

async function storageSet(key, value) {
  try { 
    await chrome.storage.local.set({ [key]: value }); 
  } catch (err) { 
    console.warn('[Cleen] Storage write failed:', key, err.message);
    if (err.message?.includes('QUOTA_BYTES')) {
      console.warn('[Cleen] Storage quota exceeded, attempting cleanup');
      try {
        await chrome.storage.local.remove(['cleenTabTimestamps']);
      } catch { /* best effort */ }
    }
  }
}

// -- Tab Activity Tracker (persisted to survive SW restarts) -----------------

/** @type {Map<number, number>} tabId → lastAccessed timestamp */
let tabLastAccessed = new Map();

async function loadTabTimestamps() {
  const saved = await storageGet('cleenTabTimestamps');
  if (saved && typeof saved === 'object') {
    tabLastAccessed = new Map(Object.entries(saved).map(([k, v]) => [Number(k), v]));
  }
}

async function persistTabTimestamps() {
  // Cap map size to prevent unbounded growth
  if (tabLastAccessed.size > MAX_TAB_ENTRIES) {
    const sorted = [...tabLastAccessed.entries()].sort((a, b) => b[1] - a[1]);
    tabLastAccessed = new Map(sorted.slice(0, MAX_TAB_ENTRIES));
  }
  await storageSet('cleenTabTimestamps', Object.fromEntries(tabLastAccessed));
}

// Debounce timer as module-scoped variable (not function property)
let persistTimer = null;

function touchTab(tabId) {
  tabLastAccessed.set(tabId, Date.now());
  clearTimeout(persistTimer);
  persistTimer = setTimeout(persistTabTimestamps, 500);
}

// Persist immediately on tab activation (critical event)
chrome.tabs.onActivated.addListener((info) => {
  tabLastAccessed.set(info.tabId, Date.now());
  persistTabTimestamps();
});

chrome.tabs.onUpdated.addListener((id, change) => {
  if (change.status === 'complete') touchTab(id);
});

chrome.tabs.onRemoved.addListener((id) => {
  tabLastAccessed.delete(id);
  persistTabTimestamps();
});

// -- Session Stats -----------------------------------------------------------

const session = { totalSuspended: 0, peakMemoryMB: 0, estimatedSavedMB: 0 };

async function loadSession() {
  const saved = await storageGet('cleenSession');
  if (saved) Object.assign(session, saved);
}

async function persistSession() {
  await storageSet('cleenSession', { ...session });
}

// -- Memory Monitor ----------------------------------------------------------

let memCache = { map: new Map(), totalMB: 0, time: 0, isEstimate: false };

async function pollProcesses() {
  if (!chrome.processes?.getProcessInfo) {
    return null;
  }
  try {
    const info = await Promise.race([
      new Promise((resolve, reject) => {
        chrome.processes.getProcessInfo([], true, (data) => {
          if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
          else resolve(data);
        });
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ]);

    if (!info) return null;

    const map = new Map();
    let total = 0;
    const processTypes = {};
    
    for (const [procId, proc] of Object.entries(info)) {
      const type = proc.type || 'unknown';
      processTypes[type] = (processTypes[type] || 0) + 1;
      
      let mb = 0;
      if (proc.privateMemory) {
        mb = Math.round(proc.privateMemory / 1_048_576);
      } else if (proc.jsHeapSizeUsed) {
        mb = Math.round(proc.jsHeapSizeUsed / 1_048_576);
      } else if (proc.memory) {
        mb = Math.round(proc.memory / 1_048_576);
      }
      
      total += mb;
      
      if (proc.tasks && proc.tasks.length > 0) {
        const memPerTask = proc.tasks.length > 1 ? Math.floor(mb / proc.tasks.length) : mb;
        for (const t of proc.tasks) {
          if (t.tabId > 0) {
            const prev = map.get(t.tabId) || 0;
            map.set(t.tabId, prev + memPerTask);
          }
        }
      }
    }
    
    return { map, totalMB: total, isEstimate: false, processTypes };
  } catch (err) {
    return null;
  }
}

async function pollFallback() {
  let gotActualMemory = false;
  try {
    const tabs = await chrome.tabs.query({});
    const map = new Map();
    let total = 0;
    
    for (const tab of tabs) {
      let mb = tab.discarded ? 5 : (isHeavySite(tab.url) ? 200 : 100);
      
      if (!tab.discarded && tab.id && !tab.url.startsWith('chrome://')) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              if (performance.memory) {
                return Math.round(performance.memory.usedJSHeapSize / 1048576);
              }
              return null;
            },
          });
          if (results?.[0]?.result && results[0].result > 0) {
            mb = results[0].result;
            gotActualMemory = true;
          }
        } catch { /* script injection failed - use estimate */ }
      }
      
      map.set(tab.id, mb);
      total += mb;
    }
    return { map, totalMB: total, isEstimate: !gotActualMemory };
  } catch { return { map: new Map(), totalMB: 0, isEstimate: true }; }
}

async function getMemorySnapshot() {
  if (Date.now() - memCache.time < MEMORY_CACHE_TTL_MS) return memCache;
  const result = (await pollProcesses()) || (await pollFallback());
  memCache = { ...result, time: Date.now() };
  return memCache;
}

// -- Auto-Suspend Logic ------------------------------------------------------

async function getSuspendThreshold() {
  return (await storageGet('suspendThreshold')) ?? DEFAULT_THRESHOLD_MS;
}

async function isAutoDiscardEnabled() {
  const enabled = await storageGet('autoDiscardEnabled');
  return enabled !== false;
}

async function runSuspendCheck() {
  try {
    if (!(await isAutoDiscardEnabled())) return;
    
    await loadTabTimestamps();
    await loadSession();
    await loadExclusions();

    const threshold = await getSuspendThreshold();
    
    if (threshold === 0) return;
    
    const now = Date.now();
    const tabs = await chrome.tabs.query({});
    const { map: memMap } = await getMemorySnapshot();

    for (const tab of tabs) {
      if (tab.active || tab.pinned || tab.audible || tab.discarded) continue;
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) continue;
      if (tab.incognito) continue;
      if (isExcludedSite(tab.url)) continue;

      const last = tabLastAccessed.get(tab.id);
      if (!last) { touchTab(tab.id); continue; }
      if (now - last < threshold) continue;

      try {
        await chrome.tabs.discard(tab.id);
        session.totalSuspended += 1;
        session.estimatedSavedMB += memMap.get(tab.id) || 0;
      } catch (err) {
        // Tab may have been closed or cannot be discarded - log and continue
        if (!err.message?.includes('No tab with id')) {
          console.debug('[Cleen] Could not discard tab:', tab.id, err.message);
        }
      }
    }

    memCache.time = 0;
    const { totalMB } = await getMemorySnapshot();
    if (totalMB > session.peakMemoryMB) session.peakMemoryMB = totalMB;
    await persistSession();
  } catch (err) {
    console.error('[Cleen] Suspend check failed:', err);
  }
}

// -- Alarm & Init ------------------------------------------------------------

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) runSuspendCheck();
});

async function initialize() {
  try {
    await loadTabTimestamps();
    await loadSession();
    await loadExclusions();

    if ((await storageGet('suspendThreshold')) === undefined) {
      await storageSet('suspendThreshold', DEFAULT_THRESHOLD_MS);
    }

    // Seed timestamps for tabs we haven't seen, clean up stale entries
    const tabs = await chrome.tabs.query({});
    const activeTabIds = new Set(tabs.map((t) => t.id));
    const now = Date.now();

    // Remove entries for tabs that no longer exist
    for (const id of tabLastAccessed.keys()) {
      if (!activeTabIds.has(id)) tabLastAccessed.delete(id);
    }

    // Add new tabs
    for (const tab of tabs) {
      if (!tabLastAccessed.has(tab.id)) tabLastAccessed.set(tab.id, now);
    }
    await persistTabTimestamps();

    await chrome.alarms.create(ALARM_NAME, { periodInMinutes: CHECK_INTERVAL_MIN });
    await getMemorySnapshot();
    await persistSession();
  } catch (err) {
    console.error('[Cleen] Init failed:', err);
  }
}

initialize();

// -- Message handler (popup communication) -----------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'getStatus') {
    handleGetStatus().then(sendResponse).catch(() => sendResponse({ success: false }));
    return true;
  }
  if (msg.type === 'getAllTabs') {
    chrome.tabs.query({}).then(tabs => sendResponse(tabs)).catch(() => sendResponse([]));
    return true;
  }
  if (msg.type === 'suspendTab') {
    handleSuspendTab(msg.tabId).then(sendResponse).catch(() => sendResponse({ success: false }));
    return true;
  }
  if (msg.type === 'clearStats') {
    session.totalSuspended = 0;
    session.estimatedSavedMB = 0;
    session.peakMemoryMB = 0;
    persistSession().then(() => sendResponse({ success: true })).catch(() => sendResponse({ success: false }));
    return true;
  }
  return false;
});

async function handleGetStatus() {
  const { map: memMap, totalMB, isEstimate } = await getMemorySnapshot();
  const tabs = await chrome.tabs.query({});

  const tabInfos = tabs
    .filter((tab) => !tab.incognito)
    .map((tab) => ({
      id: tab.id,
      title: tab.title || 'Untitled',
      url: tab.url || '',
      favIconUrl: tab.favIconUrl || '',
      memoryMB: memMap.get(tab.id) || 0,
      isHeavy: isHeavySite(tab.url),
      active: tab.active,
      pinned: tab.pinned,
      audible: tab.audible,
      discarded: tab.discarded,
    }))
    .sort((a, b) => b.memoryMB - a.memoryMB);

  return { success: true, totalMB, isEstimate, tabs: tabInfos, session: { ...session } };
}

async function handleSuspendTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab) {
      return { success: false, error: 'Tab not found' };
    }
    if (tab.discarded) {
      return { success: false, error: 'Tab already discarded' };
    }
    if (tab.active) {
      return { success: false, error: 'Cannot discard active tab' };
    }
    
    const { map } = await getMemorySnapshot();
    await chrome.tabs.discard(tabId);
    session.totalSuspended += 1;
    session.estimatedSavedMB += map.get(tabId) || 0;
    await persistSession();
    memCache.time = 0;
    return { success: true };
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes('cannot be discarded') || msg.includes('No tab with id')) {
      return { success: false, error: 'Tab cannot be discarded' };
    }
    return { success: false, error: msg };
  }
}
