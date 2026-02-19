// store.js — Central state management + localStorage persistence
const Store = (() => {
  const LS_CURRENT = 'rapp_current_user';
  const LS_USER_PREFIX = 'rapp_user_';

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
      };
    }
    state.currentUser = u;
    state.currentView = 'library';
    localStorage.setItem(LS_CURRENT, u);
    _saveUser(u);
    return true;
  }

  function logout() {
    state.currentUser = null;
    state.currentView = 'login';
    state.searchQuery = '';
    state.filterCategory = 'all';
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
    state.recipes = recipes;
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
  };
})();
