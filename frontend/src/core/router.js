export function createRouter(onChange) {
  function currentView() {
    const hash = window.location.hash.replace('#', '');
    return hash || 'workspace';
  }

  function navigate(view) {
    if (currentView() === view) {
      onChange(view);
      return;
    }
    window.location.hash = view;
  }

  window.addEventListener('hashchange', () => onChange(currentView()));

  return {
    currentView,
    navigate
  };
}
