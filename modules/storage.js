const KEYS = {
  students: 'students',
  theme: 'theme',
  filters: 'filters',
  sortPreferences: 'sortPreferences',
  activity: 'activityLogs',
  prefs: 'userPreferences',
  version: 'datasetVersion'
};

const DEFAULT_THEME = 'dark';

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getTheme() {
  return loadJSON(KEYS.theme, DEFAULT_THEME);
}

export function setTheme(theme) {
  saveJSON(KEYS.theme, theme);
}

export function getStudents() {
  return loadJSON(KEYS.students, []);
}

export function setStudents(students) {
  saveJSON(KEYS.students, students);
}

export function getFilters() {
  return loadJSON(KEYS.filters, null);
}

export function setFilters(filters) {
  saveJSON(KEYS.filters, filters);
}

export function getSortPreferences() {
  return loadJSON(KEYS.sortPreferences, null);
}

export function setSortPreferences(sortPreferences) {
  saveJSON(KEYS.sortPreferences, sortPreferences);
}

export function getActivityLogs() {
  return loadJSON(KEYS.activity, []);
}

export function setActivityLogs(logs) {
  saveJSON(KEYS.activity, logs);
}

export function getUserPreferences() {
  return loadJSON(KEYS.prefs, null);
}

export function setUserPreferences(prefs) {
  saveJSON(KEYS.prefs, prefs);
}

export function ensureDatasetSeeded(seedFn) {
  // Seed if we have never seeded (no version) OR if the students array is empty.
  // This ensures the dashboard always has data even if a previous run left
  // the datasetVersion key set without actually storing any students.
  const hasSeed = localStorage.getItem(KEYS.datasetVersion);
  const existing = getStudents();
  if (hasSeed && Array.isArray(existing) && existing.length > 0) return false;
  const seeded = seedFn();
  setStudents(seeded);
  localStorage.setItem(KEYS.datasetVersion, String(Date.now()));
  return true;
}

export function updateActivity(action, meta = {}) {
  const logs = getActivityLogs();
  const entry = {
    id: crypto.randomUUID?.() ?? String(Date.now()) + Math.random(),
    ts: new Date().toISOString(),
    action,
    meta
  };
  logs.unshift(entry);
  // keep last 100
  setActivityLogs(logs.slice(0, 100));
}
