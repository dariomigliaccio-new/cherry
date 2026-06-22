document.addEventListener('DOMContentLoaded', function () {
  var TABS = [
    { key: 'site',   label: 'Site',         test: function (t) { return /^(Site$|Scrolling)/.test(t); } },
    { key: 'home',   label: 'Home',         test: function (t) { return /^Home/.test(t); } },
    { key: 'news',   label: 'About & News', test: function (t) { return /^(About|News)/.test(t); } },
    { key: 'footer', label: 'Footer',       test: function (t) { return /^Footer/.test(t); } },
    { key: 'pages',  label: 'Páginas',      test: function ()  { return true; } }
  ];

  var form = document.querySelector('.admin-form');
  if (!form) return;

  var allSections = Array.from(form.querySelectorAll(':scope > section'));
  var saveBtn = form.querySelector('.save-button');

  var groups = {};
  TABS.forEach(function (tab) { groups[tab.key] = []; });

  allSections.forEach(function (sec) {
    var h2 = sec.querySelector('h2');
    var title = h2 ? h2.textContent.trim() : '';
    var matched = TABS.find(function (tab) { return tab.test(title); });
    if (matched) groups[matched.key].push(sec);
  });

  var nav = document.createElement('div');
  nav.className = 'admin-tabs';

  var firstKey = null;
  TABS.forEach(function (tab) {
    if (!groups[tab.key].length) return;
    if (!firstKey) firstKey = tab.key;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'admin-tab';
    btn.dataset.tab = tab.key;
    btn.textContent = tab.label;
    nav.appendChild(btn);
  });

  form.before(nav);

  allSections.forEach(function (s) { s.remove(); });

  TABS.forEach(function (tab) {
    if (!groups[tab.key].length) return;
    var panel = document.createElement('div');
    panel.className = 'tab-panel admin-grid';
    panel.dataset.tab = tab.key;
    groups[tab.key].forEach(function (s) { panel.appendChild(s); });
    form.insertBefore(panel, saveBtn);
  });

  var storedTab = sessionStorage.getItem('adminTab') || firstKey;
  var stored = storedTab && nav.querySelector('[data-tab="' + storedTab + '"]');

  function activateTab(key) {
    sessionStorage.setItem('adminTab', key);
    nav.querySelectorAll('.admin-tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === key);
    });
    form.querySelectorAll('.tab-panel').forEach(function (panel) {
      panel.hidden = panel.dataset.tab !== key;
    });
  }

  activateTab(stored ? storedTab : firstKey);

  nav.addEventListener('click', function (e) {
    var btn = e.target.closest('.admin-tab');
    if (!btn) return;
    activateTab(btn.dataset.tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
