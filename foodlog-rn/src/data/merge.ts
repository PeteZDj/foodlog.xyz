/** Pick Breakfast / Lunch / Dinner / Snacks from the device clock. */
export function mealForCurrentTime(d = new Date()): 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks' {
  const h = d.getHours();
  if (h < 11) return 'Breakfast';
  if (h < 15) return 'Lunch';
  if (h < 20) return 'Dinner';
  return 'Snacks';
}

/** Merge two Foodlog state blobs so phone + web don't erase each other. */
export function mergeFoodlogState(existing: any, incoming: any): any {
  const a = existing && typeof existing === 'object' ? existing : {};
  const b = incoming && typeof incoming === 'object' ? incoming : {};

  const itemKey = (it: any) => String(it?.entryId || it?.id || '');
  const newer = (x: any, y: any) => {
    if (!x) return y;
    if (!y) return x;
    const at = Date.parse(x.loggedAt || x.updatedAt || 0) || 0;
    const bt = Date.parse(y.loggedAt || y.updatedAt || 0) || 0;
    return bt >= at ? y : x;
  };
  const mergeDay = (da: any, db: any) => {
    const map = new Map<string, any>();
    const push = (it: any) => {
      if (!it || typeof it !== 'object') return;
      const key = itemKey(it) || `${it.name}|${it.meal}|${it.loggedAt || ''}|${it.calories || 0}`;
      map.set(key, newer(map.get(key), { ...it, entryId: it.entryId || it.id, id: it.id || it.entryId }));
    };
    (da?.items || []).forEach(push);
    (db?.items || []).forEach(push);
    return {
      water: Math.max(Number(da?.water) || 0, Number(db?.water) || 0),
      notes: db?.notes && String(db.notes).trim() ? db.notes : da?.notes || '',
      items: Array.from(map.values()),
    };
  };
  const mergeById = (listA: any[], listB: any[], idKey = 'id') => {
    const map = new Map<string, any>();
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
  };

  const dates = new Set([...Object.keys(a.entries || {}), ...Object.keys(b.entries || {})]);
  const entries: Record<string, any> = {};
  dates.forEach((d) => {
    entries[d] = mergeDay(a.entries?.[d], b.entries?.[d]);
  });

  const recentFoodIds: string[] = [];
  const seen = new Set<string>();
  [...(b.recentFoodIds || []), ...(a.recentFoodIds || [])].forEach((id: string) => {
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
  };
}
