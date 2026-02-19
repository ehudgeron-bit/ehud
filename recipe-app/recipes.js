// recipes.js — Filtering, searching and category helpers
const Recipes = (() => {

  function getAllCategories(recipes) {
    const cats = recipes.map(r => r.category);
    return ['all', ...new Set(cats)];
  }

  function getAllTags(recipes) {
    const tags = new Set();
    recipes.forEach(r => r.tags.forEach(t => tags.add(t)));
    return [...tags].sort();
  }

  function filter(recipes, query, category) {
    let result = recipes.slice();

    if (category && category !== 'all') {
      result = result.filter(r => r.category === category);
    }

    const q = (query || '').trim().toLowerCase();
    if (q.length > 0) {
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some(t => t.includes(q)) ||
        r.category.includes(q) ||
        r.ingredients.some(i => i.name.toLowerCase().includes(q))
      );
    }

    return result;
  }

  function getById(recipes, id) {
    return recipes.find(r => r.id === id) || null;
  }

  function formatTime(minutes) {
    if (!minutes || minutes === 0) return null;
    if (minutes < 60) return minutes + ' min';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? h + 'h ' + m + 'min' : h + 'h';
  }

  function totalTime(recipe) {
    return formatTime((recipe.prepTime || 0) + (recipe.cookTime || 0));
  }

  return { getAllCategories, getAllTags, filter, getById, formatTime, totalTime };
})();
