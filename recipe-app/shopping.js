// shopping.js — Smart ingredient matching + shopping list logic
const Shopping = (() => {

  // ── Unit groups for quantity comparison ──────────────────────────────────
  // All values are conversion factors TO the base unit (g, ml, or count=1)

  const UNIT_GROUPS = {
    weight: { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 },
    volume: { ml: 1, l: 1000, tsp: 4.92892, tbsp: 14.7868, cup: 236.588, floz: 29.5735 },
    count:  { whole: 1, cloves: 1, slices: 1, sprigs: 1, head: 1, handful: 1, sprigs: 1 },
  };

  function _findGroup(unit) {
    const u = (unit || '').toLowerCase().trim();
    for (const [group, map] of Object.entries(UNIT_GROUPS)) {
      if (u in map) return { group, factor: map[u] };
    }
    return null;
  }

  function _toBase(quantity, unit) {
    const found = _findGroup(unit);
    if (!found) return null;
    return { group: found.group, base: quantity * found.factor, factor: found.factor };
  }

  // ── Name normalisation for fuzzy matching ────────────────────────────────

  function normalizeName(name) {
    return (name || '')
      .toLowerCase()
      .trim()
      .replace(/\b(fresh|dried|chopped|minced|ground|grated|sliced|packed|whole)\b/g, '')
      .replace(/s\b/g, '')    // naive depluralise trailing s
      .replace(/\s+/g, ' ')
      .trim();
  }

  function _findExisting(list, ingredientName) {
    const needle = normalizeName(ingredientName);
    return list.find(item => normalizeName(item.name) === needle) || null;
  }

  // ── ID generator ─────────────────────────────────────────────────────────

  function _genId() {
    return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ── Core: smart add ──────────────────────────────────────────────────────

  /**
   * Analyses recipe ingredients against the current shopping list + staples,
   * then mutates user.shoppingList in place.
   * Returns a result summary object.
   */
  function smartAdd(user, recipeId, ingredients) {
    const result = { added: [], increased: [], alreadySufficient: [], skipped: [] };

    for (const ing of ingredients) {
      // 1. Staple check — skip entirely
      const isStaple = user.staples.some(
        s => normalizeName(s.name) === normalizeName(ing.name)
      );
      if (isStaple) {
        result.skipped.push(ing.name);
        continue;
      }

      // 2. Look for existing item in the shopping list
      const existing = _findExisting(user.shoppingList, ing.name);

      if (!existing) {
        // 3a. Not in list — add new item
        user.shoppingList.push({
          id: _genId(),
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          checked: false,
          source: recipeId,
          addedAt: Date.now(),
          notes: ing.notes || '',
        });
        result.added.push(ing.name);
        continue;
      }

      // 3b. Already in list — check sufficiency
      const existingNorm = _toBase(existing.quantity, existing.unit);
      const neededNorm   = _toBase(ing.quantity, ing.unit);

      if (!existingNorm || !neededNorm || existingNorm.group !== neededNorm.group) {
        // Incomparable units — add as a separate line item with a note
        user.shoppingList.push({
          id: _genId(),
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          checked: false,
          source: recipeId,
          addedAt: Date.now(),
          notes: 'additional for this recipe',
        });
        result.added.push(ing.name);
        continue;
      }

      if (existingNorm.base >= neededNorm.base) {
        // Sufficient — nothing to do
        result.alreadySufficient.push(ing.name);
        continue;
      }

      // 3c. Insufficient — top up by the deficit (in the existing item's unit)
      const deficitBase = neededNorm.base - existingNorm.base;
      const existingFactor = _findGroup(existing.unit).factor;
      const deficitInExistingUnit = deficitBase / existingFactor;
      existing.quantity = parseFloat((existing.quantity + deficitInExistingUnit).toFixed(3));
      result.increased.push(ing.name);
    }

    return result;
  }

  // ── Human-readable summary ───────────────────────────────────────────────

  function buildSummary(result) {
    const parts = [];
    if (result.added.length)
      parts.push(result.added.length + ' item' + (result.added.length > 1 ? 's' : '') + ' added');
    if (result.increased.length)
      parts.push(result.increased.length + ' quantity increased');
    if (result.alreadySufficient.length)
      parts.push(result.alreadySufficient.length + ' already sufficient');
    if (result.skipped.length)
      parts.push(result.skipped.length + ' skipped (staples)');
    if (parts.length === 0) return 'Nothing to add.';
    return parts.join(', ') + '.';
  }

  // ── Shopping list helpers ────────────────────────────────────────────────

  function addManualItem(user, name, quantity, unit) {
    const trimmed = (name || '').trim();
    if (!trimmed) return false;
    user.shoppingList.push({
      id: _genId(),
      name: trimmed,
      quantity: parseFloat(quantity) || null,
      unit: (unit || '').trim() || null,
      checked: false,
      source: 'manual',
      addedAt: Date.now(),
      notes: '',
    });
    return true;
  }

  function removeItem(user, itemId) {
    user.shoppingList = user.shoppingList.filter(i => i.id !== itemId);
  }

  function toggleChecked(user, itemId) {
    const item = user.shoppingList.find(i => i.id === itemId);
    if (item) item.checked = !item.checked;
  }

  function clearChecked(user) {
    user.shoppingList = user.shoppingList.filter(i => !i.checked);
  }

  function clearAll(user) {
    user.shoppingList = [];
  }

  // ── Staple helpers ───────────────────────────────────────────────────────

  function addStaple(user, name, quantity, unit) {
    const trimmed = (name || '').trim();
    if (!trimmed) return false;
    user.staples.push({
      id: _genId(),
      name: trimmed,
      quantity: parseFloat(quantity) || null,
      unit: (unit || '').trim() || null,
    });
    return true;
  }

  function removeStaple(user, stapleId) {
    user.staples = user.staples.filter(s => s.id !== stapleId);
  }

  // ── Formatting helpers ───────────────────────────────────────────────────

  function formatQty(quantity, unit) {
    if (quantity === null || quantity === undefined) return unit || '';
    const q = Number.isInteger(quantity) ? quantity : parseFloat(quantity.toFixed(2));
    return unit ? q + ' ' + unit : String(q);
  }

  return {
    smartAdd,
    buildSummary,
    addManualItem,
    removeItem,
    toggleChecked,
    clearChecked,
    clearAll,
    addStaple,
    removeStaple,
    formatQty,
    normalizeName,
  };
})();
