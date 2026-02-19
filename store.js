// store.js — Central state management + localStorage persistence
const Store = (() => {
  const LS_CURRENT = 'rapp_current_user';
  const LS_USER_PREFIX = 'rapp_user_';

  let _seedRecipes = [];

  let state = {
    currentUser: null,       // username string or null
    currentView: 'login',    // 'login' | 'library' | 'recipe' | 'shopping' | 'staples'
    activeRecipeId: null,
    searchQuery: '',
    filterCategory: 'all',
    recipes: [],
    users: {},
    notification: null,
    _notifTimer: null,
  };

  // ── Private helpers ──────────────────────────────────────────────────────

  function _mergeRecipes() {
    const user = getCurrentUser();
    const custom = (user && user.customRecipes) ? user.customRecipes : [];
    state.recipes = _seedRecipes.concat(custom);
  }

  function _genRecipeId() {
    return 'usr_' + state.currentUser + '_' + Date.now().toString(36)
      + '_' + Math.random().toString(36).slice(2, 7);
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  function _saveUser(username) {
    if (!state.users[username]) return;
    localStorage.setItem(LS_USER_PREFIX + username, JSON.stringify(state.users[username]));
  }

  function _loadAll() {
    const uname = localStorage.getItem(LS_CURRENT);
    if (uname) {
      state.currentUser = uname;
      state.currentView = 'library';
    }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LS_USER_PREFIX)) {
        const u = key.slice(LS_USER_PREFIX.length);
        try {
          state.users[u] = JSON.parse(localStorage.getItem(key));
        } catch (_) {}
      }
    }
  }

  // ── User management ──────────────────────────────────────────────────────

  function login(username) {
    const u = username.trim().toLowerCase();
    if (!u) return false;
    if (!state.users[u]) {
      state.users[u] = {
        username: u,
        createdAt: Date.now(),
        likedRecipes: [],
        shoppingList: [],
        staples: [],
        customRecipes: [],
      };
    } else if (!state.users[u].customRecipes) {
      state.users[u].customRecipes = [];
    }
    state.currentUser = u;
    state.currentView = 'library';
    localStorage.setItem(LS_CURRENT, u);
    _saveUser(u);
    _mergeRecipes();
    return true;
  }

  function logout() {
    state.currentUser = null;
    state.currentView = 'login';
    state.searchQuery = '';
    state.filterCategory = 'all';
    state.recipes = _seedRecipes.slice();
    localStorage.removeItem(LS_CURRENT);
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  function getState() {
    // Return a shallow copy so callers can't accidentally mutate private state
    return Object.assign({}, state);
  }

  function getCurrentUser() {
    return state.currentUser ? state.users[state.currentUser] : null;
  }

  function getRecipes() { return state.recipes; }

  function getKnownUsernames() { return Object.keys(state.users); }

  // ── Mutations ────────────────────────────────────────────────────────────

  function initRecipes(recipes) {
    _seedRecipes = recipes;
    _mergeRecipes(); // handles page-reload with existing logged-in user
  }

  function setView(view, recipeId) {
    state.currentView = view;
    state.activeRecipeId = recipeId || null;
  }

  function setSearch(query) {
    state.searchQuery = query;
  }

  function setFilter(category) {
    state.filterCategory = category;
  }

  function toggleLike(recipeId) {
    const user = getCurrentUser();
    if (!user) return;
    const idx = user.likedRecipes.indexOf(recipeId);
    if (idx === -1) {
      user.likedRecipes.push(recipeId);
    } else {
      user.likedRecipes.splice(idx, 1);
    }
    _saveUser(state.currentUser);
  }

  function updateShoppingList(newList) {
    const user = getCurrentUser();
    if (!user) return;
    user.shoppingList = newList;
    _saveUser(state.currentUser);
  }

  function updateStaples(newStaples) {
    const user = getCurrentUser();
    if (!user) return;
    user.staples = newStaples;
    _saveUser(state.currentUser);
  }

  // ── Notifications ────────────────────────────────────────────────────────

  function showNotification(message, type, duration) {
    type = type || 'success';
    duration = duration || 3500;
    clearTimeout(state._notifTimer);
    state.notification = { message, type };
    // Update the DOM notification element immediately
    const el = document.getElementById('notification');
    if (el) {
      el.textContent = message;
      el.className = 'notification ' + type;
      state._notifTimer = setTimeout(() => {
        state.notification = null;
        el.className = 'notification hidden';
      }, duration);
    }
  }

  // ── Custom recipes ───────────────────────────────────────────────────────

  function addCustomRecipe(recipeData) {
    const user = getCurrentUser();
    if (!user) return false;
    if (!user.customRecipes) user.customRecipes = [];
    user.customRecipes.push(Object.assign({}, recipeData, { id: _genRecipeId() }));
    _saveUser(state.currentUser);
    _mergeRecipes();
    return true;
  }

  function deleteCustomRecipe(recipeId) {
    const user = getCurrentUser();
    if (!user || !user.customRecipes) return;
    user.customRecipes = user.customRecipes.filter(function(r) { return r.id !== recipeId; });
    _saveUser(state.currentUser);
    _mergeRecipes();
  }

  // ── Computed helpers ─────────────────────────────────────────────────────

  function getLikeCount(recipeId) {
    return Object.values(state.users)
      .filter(u => u.likedRecipes.includes(recipeId))
      .length;
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  _loadAll();

  return {
    getState,
    getCurrentUser,
    getRecipes,
    getKnownUsernames,
    login,
    logout,
    initRecipes,
    setView,
    setSearch,
    setFilter,
    toggleLike,
    updateShoppingList,
    updateStaples,
    showNotification,
    getLikeCount,
    addCustomRecipe,
    deleteCustomRecipe,
  };
})();
