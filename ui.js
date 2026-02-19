// ui.js — All rendering + event wiring + app bootstrap
const UI = (() => {

  const root = () => document.getElementById('app-root');

  // ── Helper: create element ────────────────────────────────────────────────

  function el(tag, attrs) {
    const node = document.createElement(tag);
    const children = Array.prototype.slice.call(arguments, 2);
    if (attrs) {
      Object.keys(attrs).forEach(function(k) {
        const v = attrs[k];
        if (k === 'className') node.className = v;
        else if (k === 'innerHTML') node.innerHTML = v;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v !== null && v !== undefined) node.setAttribute(k, v);
      });
    }
    children.forEach(function(c) {
      if (c === null || c === undefined) return;
      if (typeof c === 'string') node.appendChild(document.createTextNode(c));
      else node.appendChild(c);
    });
    return node;
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ── Shared: nav header ────────────────────────────────────────────────────

  function buildHeader(user, activeView) {
    const navItems = [
      { view: 'library',  label: '📚 Library' },
      { view: 'shopping', label: '🛒 Shopping List' },
      { view: 'staples',  label: '🏠 Staples' },
    ];

    const nav = el('nav', { className: 'nav' });
    navItems.forEach(function(item) {
      nav.appendChild(el('button', {
        className: 'nav-btn' + (activeView === item.view ? ' active' : ''),
        onClick: function() { Store.setView(item.view); render(); },
      }, item.label));
    });

    const userMenu = el('div', { className: 'user-menu' },
      el('span', { className: 'username-badge' }, '\uD83D\uDC64 ' + user.username),
      el('button', { className: 'btn-ghost sign-out-btn', onClick: function() { Auth.handleLogout(); } }, 'Sign out')
    );

    return el('header', { className: 'app-header' },
      el('div', { className: 'header-logo', onClick: function() { Store.setView('library'); render(); } },
        el('span', { className: 'logo-icon' }, '\uD83C\uDF7D\uFE0F'),
        el('span', { className: 'logo-text' }, 'RecipeBox')
      ),
      nav,
      userMenu
    );
  }

  // ── View: Login ───────────────────────────────────────────────────────────

  function renderLogin() {
    const usernames = Store.getKnownUsernames();

    const input = el('input', {
      type: 'text',
      className: 'login-input',
      placeholder: 'Choose a username\u2026',
      maxlength: '32',
    });

    const submitBtn = el('button', { className: 'btn-primary', onClick: function() { Auth.handleLogin(input.value); } },
      'Start Cooking \u2192'
    );

    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') Auth.handleLogin(input.value);
    });

    const wrap = el('div', { className: 'login-page' },
      el('div', { className: 'login-card' },
        el('div', { className: 'login-logo' }, '\uD83C\uDF7D\uFE0F'),
        el('h1', { className: 'login-title' }, 'RecipeBox'),
        el('p', { className: 'login-subtitle' },
          'Your public recipe library, liked recipes and shopping list \u2014 all in one place.'
        ),
        el('div', { className: 'login-form' }, input, submitBtn),
        el('p', { className: 'login-hint' }, '\uD83D\uDD12 No password needed. Your data is stored locally on this device.')
      )
    );

    if (usernames.length > 0) {
      const chipWrap = el('div', { className: 'existing-users' },
        el('p', { className: 'existing-label' }, 'Or continue as:')
      );
      const chips = el('div', { className: 'user-chips' });
      usernames.forEach(function(u) {
        chips.appendChild(el('button', { className: 'user-chip', onClick: function() { Auth.handleSwitchUser(u); } }, u));
      });
      chipWrap.appendChild(chips);
      wrap.querySelector('.login-card').appendChild(chipWrap);
    }

    root().innerHTML = '';
    root().appendChild(wrap);
    input.focus();
  }

  // ── View: Library ─────────────────────────────────────────────────────────

  function buildRecipeCard(recipe, user) {
    const isLiked = user.likedRecipes.indexOf(recipe.id) !== -1;
    const likeCount = Store.getLikeCount(recipe.id);
    const totalTime = Recipes.totalTime(recipe);

    const card = el('div', { className: 'recipe-card' });

    const cover = el('div', { className: 'card-cover', onClick: function() { Store.setView('recipe', recipe.id); render(); } },
      el('span', { className: 'card-emoji' }, recipe.coverEmoji)
    );
    card.appendChild(cover);

    const info = el('div', { className: 'card-info' });

    const titleEl = el('h3', { className: 'card-title', onClick: function() { Store.setView('recipe', recipe.id); render(); } }, recipe.title);
    info.appendChild(titleEl);

    info.appendChild(el('p', { className: 'card-desc' }, recipe.description));

    const meta = el('div', { className: 'card-meta' });
    if (totalTime) meta.appendChild(el('span', null, '\u23F1 ' + totalTime));
    meta.appendChild(el('span', null, '\uD83C\uDF7D\uFE0F ' + recipe.servings + ' servings'));
    info.appendChild(meta);

    const tagRow = el('div', { className: 'card-tags' });
    recipe.tags.slice(0, 3).forEach(function(t) {
      tagRow.appendChild(el('span', { className: 'tag' }, t));
    });
    info.appendChild(tagRow);

    if (recipe.isCustom && recipe.createdBy === user.username) {
      info.appendChild(el('span', { className: 'custom-badge' }, '\u270F\uFE0F Mine'));
      info.appendChild(el('button', { className: 'custom-delete-btn', onClick: function(e) {
        e.stopPropagation();
        if (confirm('Delete "' + recipe.title + '"? This cannot be undone.')) {
          Store.deleteCustomRecipe(recipe.id);
          render();
        }
      }}, '\uD83D\uDDD1 Delete'));
    }

    const likeBtn = el('button', {
      className: 'like-btn' + (isLiked ? ' liked' : ''),
      onClick: function(e) {
        e.stopPropagation();
        Store.toggleLike(recipe.id);
        render();
      },
    }, (isLiked ? '\u2665' : '\u2661') + (likeCount > 0 ? ' ' + likeCount : ''));
    info.appendChild(likeBtn);

    card.appendChild(info);
    return card;
  }

  function renderLibrary(state, user) {
    const allRecipes = Store.getRecipes();
    const categories = Recipes.getAllCategories(allRecipes);
    const filtered = Recipes.filter(allRecipes, state.searchQuery, state.filterCategory);

    const searchInput = el('input', {
      type: 'search',
      className: 'search-input',
      placeholder: 'Search recipes, ingredients, tags\u2026',
      value: state.searchQuery,
    });
    searchInput.addEventListener('input', function(e) {
      Store.setSearch(e.target.value);
      render();
    });

    const pills = el('div', { className: 'category-pills' });
    categories.forEach(function(cat) {
      pills.appendChild(el('button', {
        className: 'pill' + (state.filterCategory === cat ? ' active' : ''),
        onClick: function() { Store.setFilter(cat); render(); },
      }, cat === 'all' ? 'All' : capitalize(cat)));
    });

    const grid = el('div', { className: 'recipe-grid' });
    if (filtered.length > 0) {
      filtered.forEach(function(recipe) { grid.appendChild(buildRecipeCard(recipe, user)); });
    } else {
      const empty = el('div', { className: 'empty-state' },
        el('div', { className: 'empty-icon' }, '\uD83D\uDD0D'),
        el('p', null, 'No recipes match your search.'),
        el('button', { className: 'btn-ghost', onClick: function() { Store.setSearch(''); Store.setFilter('all'); render(); } }, 'Clear filters')
      );
      grid.appendChild(empty);
    }

    const addRecipeBtn = el('button', {
      className: 'btn-primary add-recipe-btn',
      onClick: function() { Store.setView('create-recipe'); render(); },
    }, '+ Add Recipe');

    root().innerHTML = '';
    root().appendChild(
      el('div', { className: 'page' },
        buildHeader(user, 'library'),
        el('div', { className: 'library-toolbar' },
          el('div', { className: 'toolbar-top-row' }, searchInput, addRecipeBtn),
          pills
        ),
        el('main', { className: 'library-main' }, grid)
      )
    );
  }

  // ── View: Recipe Detail ───────────────────────────────────────────────────

  function renderRecipe(state, user) {
    const recipe = Recipes.getById(Store.getRecipes(), state.activeRecipeId);
    if (!recipe) { Store.setView('library'); render(); return; }

    const isLiked = user.likedRecipes.indexOf(recipe.id) !== -1;
    const likeCount = Store.getLikeCount(recipe.id);

    const likeBtn = el('button', {
      className: 'detail-like-btn' + (isLiked ? ' liked' : ''),
      onClick: function() { Store.toggleLike(recipe.id); render(); },
    }, isLiked ? '\u2665 Liked' : '\u2661 Like');

    const addBtn = el('button', { className: 'btn-primary add-shopping-btn', onClick: function() {
      const currentUser = Store.getCurrentUser();
      const result = Shopping.smartAdd(currentUser, recipe.id, recipe.ingredients);
      Store.updateShoppingList(currentUser.shoppingList);
      Store.showNotification('\uD83D\uDED2 ' + Shopping.buildSummary(result), 'success');
    }}, '+ Add to Shopping List');

    const ingList = el('ul', { className: 'ingredients-list' });
    recipe.ingredients.forEach(function(ing) {
      const li = el('li', { className: 'ingredient-item' },
        el('span', { className: 'ing-qty' }, Shopping.formatQty(ing.quantity, ing.unit)),
        el('span', { className: 'ing-name' }, ing.name)
      );
      if (ing.notes) li.appendChild(el('span', { className: 'ing-notes' }, '(' + ing.notes + ')'));
      ingList.appendChild(li);
    });

    const stepsList = el('ol', { className: 'steps-list' });
    recipe.steps.forEach(function(step) {
      stepsList.appendChild(el('li', { className: 'step-item' }, step));
    });

    const metaRow = el('div', { className: 'detail-meta' });
    metaRow.appendChild(el('span', { className: 'meta-chip' }, '\uD83D\uDCC1 ' + capitalize(recipe.category)));
    if (recipe.prepTime) metaRow.appendChild(el('span', { className: 'meta-chip' }, '\u26A1 Prep: ' + Recipes.formatTime(recipe.prepTime)));
    if (recipe.cookTime) metaRow.appendChild(el('span', { className: 'meta-chip' }, '\uD83D\uDD25 Cook: ' + Recipes.formatTime(recipe.cookTime)));
    metaRow.appendChild(el('span', { className: 'meta-chip' }, '\uD83C\uDF7D\uFE0F ' + recipe.servings + ' servings'));

    const tagRow = el('div', { className: 'detail-tags' });
    recipe.tags.forEach(function(t) { tagRow.appendChild(el('span', { className: 'tag' }, t)); });

    const sectionHeader = el('div', { className: 'section-header' },
      el('h2', null, '\uD83E\uDDFE Ingredients'),
      addBtn
    );

    root().innerHTML = '';
    root().appendChild(
      el('div', { className: 'page' },
        buildHeader(user, 'library'),
        el('div', { className: 'detail-container' },
          el('button', { className: 'back-btn', onClick: function() { Store.setView('library'); render(); } }, '\u2190 Back to Library'),
          el('div', { className: 'detail-card' },
            el('div', { className: 'detail-cover' },
              el('span', { className: 'detail-emoji' }, recipe.coverEmoji)
            ),
            el('div', { className: 'detail-body' },
              el('div', { className: 'detail-title-row' },
                el('h1', { className: 'detail-title' }, recipe.title),
                el('div', { className: 'detail-actions' },
                  likeBtn,
                  likeCount > 0 ? el('span', { className: 'like-count' }, likeCount + ' likes') : el('span', null, '')
                )
              ),
              metaRow,
              tagRow,
              el('p', { className: 'detail-desc' }, recipe.description),
              el('section', { className: 'detail-section' }, sectionHeader, ingList),
              el('section', { className: 'detail-section' },
                el('h2', null, '\uD83D\uDCCB Instructions'),
                stepsList
              )
            )
          )
        )
      )
    );
  }

  // ── View: Shopping List ───────────────────────────────────────────────────

  function renderShopping(state, user) {
    const list = user.shoppingList;
    const unchecked = list.filter(function(i) { return !i.checked; });
    const checked   = list.filter(function(i) { return i.checked; });
    const allRecipes = Store.getRecipes();

    const nameInput = el('input', { type: 'text', className: 'add-item-input', placeholder: 'Item name\u2026' });
    const qtyInput  = el('input', { type: 'number', className: 'add-qty-input', placeholder: 'Qty', min: '0', step: 'any' });
    const unitInput = el('input', { type: 'text', className: 'add-unit-input', placeholder: 'Unit' });

    const addItemBtn = el('button', { className: 'btn-primary', onClick: function() {
      const ok = Shopping.addManualItem(user, nameInput.value, qtyInput.value, unitInput.value);
      if (ok) { Store.updateShoppingList(user.shoppingList); render(); }
      else { Store.showNotification('Please enter an item name.', 'warning'); }
    }}, '+ Add');

    nameInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') addItemBtn.click(); });

    const addRow = el('div', { className: 'add-item-row' }, nameInput, qtyInput, unitInput, addItemBtn);

    function buildBuyLinks(itemName) {
      const q = encodeURIComponent(itemName);
      const stores = [
        { label: '\u05E8\u05DE\u05D9 \u05DC\u05D5\u05D9', url: 'https://www.rami-levy.co.il/he/marketing/search?q=' + q },
        { label: '\u05E9\u05D5\u05E4\u05E8\u05E1\u05DC', url: 'https://www.shufersal.co.il/online/he/search?q=' + q },
        { label: '\u05D0\u05D5\u05E9\u05E8 \u05E2\u05D3', url: 'https://www.osherad.co.il/search?q=' + q },
      ];
      const panel = el('div', { className: 'buy-links hidden' });
      stores.forEach(function(store) {
        panel.appendChild(el('a', {
          href: store.url,
          target: '_blank',
          rel: 'noopener noreferrer',
          className: 'buy-link',
        }, store.label));
      });
      return panel;
    }

    function buildItem(item) {
      const sourceRecipe = (item.source && item.source !== 'manual') ? Recipes.getById(allRecipes, item.source) : null;
      const checkbox = el('input', { type: 'checkbox', className: 'item-checkbox' });
      if (item.checked) checkbox.setAttribute('checked', 'checked');
      checkbox.addEventListener('change', function() {
        Shopping.toggleChecked(user, item.id);
        Store.updateShoppingList(user.shoppingList);
        render();
      });
      const details = el('div', { className: 'item-details' },
        el('span', { className: 'item-name' }, item.name),
        el('span', { className: 'item-qty' }, Shopping.formatQty(item.quantity, item.unit))
      );
      if (sourceRecipe) {
        details.appendChild(el('span', { className: 'item-source' }, '\uD83D\uDCD6 ' + sourceRecipe.title));
      } else {
        details.appendChild(el('span', { className: 'item-source manual' }, '\u270F\uFE0F manual'));
      }
      if (item.notes) details.appendChild(el('span', { className: 'item-notes' }, item.notes));

      const buyLinksPanel = buildBuyLinks(item.name);

      const buyToggleBtn = el('button', {
        className: 'buy-toggle-btn',
        title: 'Buy online',
        onClick: function(e) {
          e.stopPropagation();
          buyLinksPanel.classList.toggle('hidden');
        },
      }, '\uD83D\uDED2');

      const delBtn = el('button', { className: 'item-delete-btn', title: 'Remove', onClick: function() {
        Shopping.removeItem(user, item.id);
        Store.updateShoppingList(user.shoppingList);
        render();
      }}, '\u2715');

      return el('div', { className: 'shopping-item-wrapper' },
        el('div', { className: 'shopping-item' + (item.checked ? ' checked' : '') },
          checkbox, details, buyToggleBtn, delBtn
        ),
        buyLinksPanel
      );
    }

    const listActions = el('div', { className: 'list-actions' });
    if (checked.length > 0) {
      listActions.appendChild(el('button', { className: 'btn-ghost danger', onClick: function() {
        Shopping.clearChecked(user); Store.updateShoppingList(user.shoppingList); render();
      }}, '\u2715 Clear checked (' + checked.length + ')'));
    }
    if (list.length > 0) {
      listActions.appendChild(el('button', { className: 'btn-ghost danger', onClick: function() {
        if (confirm('Clear entire shopping list?')) {
          Shopping.clearAll(user); Store.updateShoppingList(user.shoppingList); render();
        }
      }}, '\uD83D\uDDD1 Clear all'));
    }

    const container = el('div', { className: 'list-container' },
      el('div', { className: 'list-header' }, el('h1', null, '\uD83D\uDED2 Shopping List'), listActions),
      addRow
    );

    if (list.length === 0) {
      container.appendChild(el('div', { className: 'empty-state' },
        el('div', { className: 'empty-icon' }, '\uD83D\uDED2'),
        el('p', null, 'Your shopping list is empty.'),
        el('p', { className: 'empty-hint' }, 'Open a recipe and click \u201CAdd to Shopping List\u201D to get started.')
      ));
    }

    if (unchecked.length > 0) {
      const group = el('div', { className: 'items-group' }, el('h3', { className: 'group-label' }, 'To buy (' + unchecked.length + ')'));
      unchecked.forEach(function(i) { group.appendChild(buildItem(i)); });
      container.appendChild(group);
    }

    if (checked.length > 0) {
      const group = el('div', { className: 'items-group checked-group' }, el('h3', { className: 'group-label' }, 'Done (' + checked.length + ')'));
      checked.forEach(function(i) { group.appendChild(buildItem(i)); });
      container.appendChild(group);
    }

    root().innerHTML = '';
    root().appendChild(el('div', { className: 'page' }, buildHeader(user, 'shopping'), container));
  }

  // ── View: Staples ─────────────────────────────────────────────────────────

  function renderStaples(state, user) {
    const staples = user.staples;

    const nameInput = el('input', { type: 'text', className: 'add-item-input', placeholder: 'Item name\u2026' });
    const qtyInput  = el('input', { type: 'number', className: 'add-qty-input', placeholder: 'Qty (optional)', min: '0', step: 'any' });
    const unitInput = el('input', { type: 'text', className: 'add-unit-input', placeholder: 'Unit' });

    const addBtn = el('button', { className: 'btn-primary', onClick: function() {
      const ok = Shopping.addStaple(user, nameInput.value, qtyInput.value, unitInput.value);
      if (ok) { Store.updateStaples(user.staples); render(); }
      else { Store.showNotification('Please enter a staple name.', 'warning'); }
    }}, '+ Add');

    nameInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') addBtn.click(); });

    const addRow = el('div', { className: 'add-item-row' }, nameInput, qtyInput, unitInput, addBtn);

    const container = el('div', { className: 'list-container' },
      el('div', { className: 'list-header' }, el('h1', null, '\uD83C\uDFE0 My Staples')),
      el('p', { className: 'staples-hint' },
        'Items here are things you always have at home. They are automatically skipped when adding recipe ingredients to your shopping list.'
      ),
      addRow
    );

    if (staples.length === 0) {
      container.appendChild(el('div', { className: 'empty-state' },
        el('div', { className: 'empty-icon' }, '\uD83C\uDFE0'),
        el('p', null, 'No staples added yet.'),
        el('p', { className: 'empty-hint' }, 'Try adding: salt, olive oil, garlic, black pepper\u2026')
      ));
    } else {
      const group = el('div', { className: 'items-group' });
      staples.forEach(function(staple) {
        const details = el('div', { className: 'item-details' },
          el('span', { className: 'item-name' }, staple.name),
          staple.quantity
            ? el('span', { className: 'item-qty' }, Shopping.formatQty(staple.quantity, staple.unit))
            : el('span', { className: 'item-qty muted' }, 'always have')
        );
        const delBtn = el('button', { className: 'item-delete-btn', title: 'Remove', onClick: function() {
          Shopping.removeStaple(user, staple.id); Store.updateStaples(user.staples); render();
        }}, '\u2715');
        group.appendChild(el('div', { className: 'shopping-item staple-item' },
          el('span', { className: 'staple-icon' }, '\u2713'),
          details, delBtn
        ));
      });
      container.appendChild(group);
    }

    root().innerHTML = '';
    root().appendChild(el('div', { className: 'page' }, buildHeader(user, 'staples'), container));
  }

  // ── View: Create Recipe ───────────────────────────────────────────────────

  function renderCreateRecipe(state, user) {
    // ── Dynamic ingredient rows ──────────────────────────────────────────────
    const ingredientsContainer = el('div', { className: 'form-dynamic-list' });

    function buildIngredientRow() {
      const row = el('div', { className: 'dynamic-row ingredient-row' },
        el('input', { type: 'text',   className: 'form-input ing-name-input',  placeholder: 'Ingredient name' }),
        el('input', { type: 'number', className: 'form-input ing-qty-input',   placeholder: 'Qty', min: '0', step: 'any' }),
        el('input', { type: 'text',   className: 'form-input ing-unit-input',  placeholder: 'Unit' }),
        el('input', { type: 'text',   className: 'form-input ing-notes-input', placeholder: 'Notes (optional)' }),
        el('button', { className: 'remove-row-btn', title: 'Remove', onClick: function() {
          if (ingredientsContainer.children.length > 1) ingredientsContainer.removeChild(row);
        }}, '\u2715')
      );
      return row;
    }
    ingredientsContainer.appendChild(buildIngredientRow());

    const addIngBtn = el('button', { className: 'btn-ghost add-row-btn', onClick: function() {
      ingredientsContainer.appendChild(buildIngredientRow());
    }}, '+ Add ingredient');

    // ── Dynamic step rows ────────────────────────────────────────────────────
    const stepsContainer = el('div', { className: 'form-dynamic-list' });

    function buildStepRow() {
      const stepNum = el('span', { className: 'step-number' }, (stepsContainer.children.length + 1) + '.');
      const row = el('div', { className: 'dynamic-row step-row' },
        stepNum,
        el('textarea', { className: 'form-textarea step-textarea', placeholder: 'Describe this step\u2026', rows: '2' }),
        el('button', { className: 'remove-row-btn', title: 'Remove', onClick: function() {
          if (stepsContainer.children.length > 1) stepsContainer.removeChild(row);
        }}, '\u2715')
      );
      return row;
    }
    stepsContainer.appendChild(buildStepRow());

    const addStepBtn = el('button', { className: 'btn-ghost add-row-btn', onClick: function() {
      stepsContainer.appendChild(buildStepRow());
    }}, '+ Add step');

    // ── Static fields ────────────────────────────────────────────────────────
    const titleInput    = el('input', { type: 'text',   className: 'form-input', placeholder: 'Recipe title *', maxlength: '100' });
    const descInput     = el('textarea', { className: 'form-textarea', placeholder: 'Short description\u2026', rows: '3' });
    const categoryInput = el('input', { type: 'text',   className: 'form-input', placeholder: 'Category (e.g. pasta, dessert, soup\u2026)' });
    const emojiInput    = el('input', { type: 'text',   className: 'form-input emoji-input', placeholder: '\uD83C\uDF7D\uFE0F', maxlength: '4' });
    const tagsInput     = el('input', { type: 'text',   className: 'form-input', placeholder: 'Tags, comma-separated (e.g. quick, vegetarian)' });
    const servingsInput = el('input', { type: 'number', className: 'form-input', placeholder: 'Servings', min: '1' });
    const prepTimeInput = el('input', { type: 'number', className: 'form-input', placeholder: 'Prep time (min)', min: '0' });
    const cookTimeInput = el('input', { type: 'number', className: 'form-input', placeholder: 'Cook time (min)', min: '0' });

    // ── Collect + validate + save ────────────────────────────────────────────
    function collectIngredients() {
      const rows = ingredientsContainer.querySelectorAll('.ingredient-row');
      const result = [];
      rows.forEach(function(row) {
        const name = row.querySelector('.ing-name-input').value.trim();
        if (!name) return;
        const qty  = parseFloat(row.querySelector('.ing-qty-input').value) || null;
        const unit = row.querySelector('.ing-unit-input').value.trim() || null;
        const notes = row.querySelector('.ing-notes-input').value.trim() || undefined;
        result.push({ name: name, quantity: qty, unit: unit, notes: notes });
      });
      return result;
    }

    function collectSteps() {
      const textareas = stepsContainer.querySelectorAll('.step-textarea');
      const result = [];
      textareas.forEach(function(ta) {
        const text = ta.value.trim();
        if (text) result.push(text);
      });
      return result;
    }

    const saveBtn = el('button', { className: 'btn-primary', onClick: function() {
      const title       = titleInput.value.trim();
      const ingredients = collectIngredients();
      const steps       = collectSteps();

      if (!title) {
        Store.showNotification('Please enter a recipe title.', 'warning'); return;
      }
      if (ingredients.length === 0) {
        Store.showNotification('Please add at least one ingredient.', 'warning'); return;
      }
      if (steps.length === 0) {
        Store.showNotification('Please add at least one step.', 'warning'); return;
      }

      const tags = tagsInput.value.split(',')
        .map(function(t) { return t.trim().toLowerCase(); })
        .filter(Boolean);

      Store.addCustomRecipe({
        title: title,
        description: descInput.value.trim(),
        category: categoryInput.value.trim().toLowerCase() || 'custom',
        coverEmoji: emojiInput.value.trim() || '\uD83C\uDF7D\uFE0F',
        tags: tags,
        servings: parseInt(servingsInput.value) || 1,
        prepTime: parseInt(prepTimeInput.value) || 0,
        cookTime: parseInt(cookTimeInput.value) || 0,
        ingredients: ingredients,
        steps: steps,
        isCustom: true,
        createdBy: user.username,
      });

      Store.showNotification('\u2705 Recipe saved!', 'success');
      Store.setView('library');
      render();
    }}, 'Save Recipe');

    const cancelBtn = el('button', { className: 'btn-ghost', onClick: function() {
      Store.setView('library'); render();
    }}, 'Cancel');

    // ── Assemble form ────────────────────────────────────────────────────────
    const form = el('div', { className: 'create-recipe-form' },
      el('div', { className: 'form-section' },
        el('h2', null, 'Basic Info'),
        el('label', { className: 'form-label' }, 'Title *', titleInput),
        el('label', { className: 'form-label' }, 'Description', descInput),
        el('div', { className: 'form-row' },
          el('label', { className: 'form-label' }, 'Category', categoryInput),
          el('label', { className: 'form-label form-label-emoji' }, 'Cover Emoji', emojiInput)
        ),
        el('label', { className: 'form-label' }, 'Tags (comma-separated)', tagsInput),
        el('div', { className: 'form-row' },
          el('label', { className: 'form-label' }, 'Servings', servingsInput),
          el('label', { className: 'form-label' }, 'Prep time (min)', prepTimeInput),
          el('label', { className: 'form-label' }, 'Cook time (min)', cookTimeInput)
        )
      ),
      el('div', { className: 'form-section' },
        el('h2', null, 'Ingredients *'),
        ingredientsContainer,
        addIngBtn
      ),
      el('div', { className: 'form-section' },
        el('h2', null, 'Steps *'),
        stepsContainer,
        addStepBtn
      ),
      el('div', { className: 'form-actions' }, saveBtn, cancelBtn)
    );

    root().innerHTML = '';
    root().appendChild(
      el('div', { className: 'page' },
        buildHeader(user, 'library'),
        el('div', { className: 'create-recipe-container' },
          el('button', { className: 'back-btn', onClick: function() { Store.setView('library'); render(); } }, '\u2190 Back to Library'),
          el('h1', { className: 'create-recipe-title' }, 'Create New Recipe'),
          form
        )
      )
    );
  }

  // ── Main render dispatcher ────────────────────────────────────────────────

  function render() {
    const state = Store.getState();
    const user  = Store.getCurrentUser();

    if (!user || state.currentView === 'login') {
      renderLogin();
      return;
    }

    switch (state.currentView) {
      case 'library':        renderLibrary(state, user);       break;
      case 'recipe':         renderRecipe(state, user);        break;
      case 'shopping':       renderShopping(state, user);      break;
      case 'staples':        renderStaples(state, user);       break;
      case 'create-recipe':  renderCreateRecipe(state, user);  break;
      default:               renderLibrary(state, user);
    }
  }

  return { render: render };
})();

// ── App init ──────────────────────────────────────────────────────────────────
(function() {
  Store.initRecipes(RECIPES);
  UI.render();
})();
