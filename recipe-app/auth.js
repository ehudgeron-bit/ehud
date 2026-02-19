// auth.js — Login / logout event handlers
const Auth = (() => {

  function handleLogin(username) {
    const success = Store.login(username.trim());
    if (!success) {
      Store.showNotification('Please enter a valid username.', 'warning');
      return;
    }
    UI.render();
  }

  function handleLogout() {
    Store.logout();
    UI.render();
  }

  function handleSwitchUser(username) {
    Store.login(username);
    UI.render();
  }

  return { handleLogin, handleLogout, handleSwitchUser };
})();
