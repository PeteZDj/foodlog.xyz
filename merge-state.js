/**
 * Shared Foodlog state merge — used by the API so phone + website never
 * clobber each other with last-write-wins full replaces.
 */

function itemKey(it) {
  return String(it?.entryId || it?.id || '');
}

function newerItem(a, b) {
  if (!a) return b;
  if (!b) return a;
  const at = Date.parse(a.loggedAt || a.updatedAt || 0) || 0;
  const bt = Date.parse(b.loggedAt || b.updatedAt || 0) || 0;
  return bt >= at ? b : a;
}

function mergeDay(a, b) {
  const map = new Map();
  const push = (it) => {
    if (!it || typeof it !== 'object') return;
    const key = itemKey(it) || `${it.name}|${it.meal}|${it.loggedAt || ''}|${it.calories || 0}`;
    map.set(key, newerItem(map.get(key), { ...it, entryId: it.entryId || it.id, id: it.id || it.entryId }));
  };
  (a?.items || []).forEach(push);
  (b?.items || []).forEach(push);
  return {
    water: Math.max(Number(a?.water) || 0, Number(b?.water) || 0),
    notes: (b?.notes && String(b.notes).trim()) ? b.notes : (a?.notes || ''),
    items: Array.from(map.values()),
  };
}

function mergeById(listA, listB, idKey = 'id') {
  const map = new Map();
  [...(listA || []), ...(listB || [])].forEach((row) => {
    if (!row || typeof row !== 'object') return;
    const key = String(row[idKey] || JSON.stringify(row));
    const prev = map.get(key);
    if (!prev) map.set(key, row);
    else {
      const at = Date.parse(prev.loggedAt || prev.date || prev.updatedAt || 0) || 0;
      const bt = Date.parse(row.loggedAt || row.date || row.updatedAt || 0) || 0;
      map.set(key, bt >= at ? { ...prev, ...row } : { ...row, ...prev });
    }
  });
  return Array.from(map.values());
}

export function mergeFoodlogState(existing, incoming) {
  const a = existing && typeof existing === 'object' ? existing : {};
  const b = incoming && typeof incoming === 'object' ? incoming : {};
  const dates = new Set([
    ...Object.keys(a.entries || {}),
    ...Object.keys(b.entries || {}),
  ]);
  const entries = {};
  dates.forEach((d) => {
    entries[d] = mergeDay(a.entries?.[d], b.entries?.[d]);
  });

  const recentFoodIds = [];
  const seen = new Set();
  [...(b.recentFoodIds || []), ...(a.recentFoodIds || [])].forEach((id) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    recentFoodIds.push(id);
  });

  return {
    ...a,
    ...b,
    goals: { ...(a.goals || {}), ...(b.goals || {}) },
    profile: { ...(a.profile || {}), ...(b.profile || {}) },
    entries,
    weights: mergeById(a.weights, b.weights, 'date'),
    exercises: mergeById(a.exercises, b.exercises, 'id'),
    customFoods: mergeById(a.customFoods, b.customFoods, 'id'),
    importedFoods: mergeById(a.importedFoods, b.importedFoods, 'id'),
    foodOverrides: { ...(a.foodOverrides || {}), ...(b.foodOverrides || {}) },
    recentFoodIds: recentFoodIds.slice(0, 40),
    onboarded: b.onboarded !== false && a.onboarded !== false
      ? (b.onboarded ?? a.onboarded ?? true)
      : (b.onboarded === true || a.onboarded === true),
    _mergedAt: new Date().toISOString(),
  };
}
