(function () {
  'use strict';
  if (window.__gameAnalyticsLoaded) return;
  window.__gameAnalyticsLoaded = true;
  var config = window.GAME_ANALYTICS || {};
  var key = 'game-analytics-disabled';
  var excluded = false;
  try {
    excluded = localStorage.getItem(key) === '1' || localStorage.getItem('umami.disabled') === '1';
  } catch (_) { excluded = true; }
  var production = location.hostname === config.hostname;
  var ready = Boolean(config.scriptUrl && config.endpoint);
  var button = document.getElementById('analytics-toggle');
  var status = document.getElementById('analytics-status');
  if (button && status) {
    button.textContent = excluded ? '恢复本机统计' : '排除本机访问';
    status.textContent = excluded ? '本机已排除统计' : !production ? '本地预览不计数' : !ready ? '统计尚未启用' : '页面访问统计已启用';
    button.onclick = function () {
      try {
        if (excluded) { localStorage.removeItem(key); localStorage.removeItem('umami.disabled'); }
        else localStorage.setItem(key, '1');
        location.reload();
      } catch (_) { status.textContent = '无法保存设置，请允许浏览器使用本地存储'; }
    };
  }
  if (!production || excluded || !ready) return;
  try {
    if (new URL(config.scriptUrl).protocol !== 'https:' || new URL(config.endpoint).protocol !== 'https:') return;
  } catch (_) { return; }
  // One pageview per document, no click event. Ignore query/hash and normalize index.html.
  window.goatcounter = {
    path: function () { return location.pathname.replace(/\/index\.html$/, '/'); }
  };
  var script = document.createElement('script');
  script.src = config.scriptUrl;
  script.async = true;
  script.setAttribute('data-goatcounter', config.endpoint);
  script.onerror = function () { if (status) status.textContent = '统计服务未加载，游戏可正常使用'; };
  document.head.appendChild(script);
}());
