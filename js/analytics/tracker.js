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
  // Busuanzi is independent of GoatCounter and starts after the page load bootstrap.
  var path = location.pathname.replace(/\/index\.html$/, '/');
  var overview = path === '/' || path === '/games/' || path === '/games/childhood/';
  var counter = document.createElement(overview ? 'div' : 'details');
  counter.id = 'page-visit-counter';
  counter.style.cssText = 'font:12px/1.8 system-ui,sans-serif;color:#777;text-align:center;padding:6px 10px;';
  if (!overview) {
    counter.style.cssText += 'position:fixed;right:8px;bottom:env(safe-area-inset-bottom,0px);z-index:1000;border-radius:8px;background:rgba(255,255,255,.92);max-width:90vw;';
    var summary = document.createElement('summary');
    summary.textContent = '访问统计';
    summary.style.cursor = 'pointer';
    counter.appendChild(summary);
  }
  var label = path === '/' ? '首页浏览' : path === '/games/' ? '游戏页浏览' : path === '/games/childhood/' ? '合集浏览' : '本游戏页面浏览';
  var message = document.createElement('span');
  message.textContent = excluded ? '本机已排除统计' : !production ? '本地预览不计数' : '访问统计加载中…';
  counter.appendChild(message);
  function addCount(id, text, suffix) {
    var container = document.createElement('span');
    container.id = 'busuanzi_container_' + id;
    container.style.cssText = 'display:none;margin:0 7px;white-space:nowrap;';
    container.appendChild(document.createTextNode(text + ' '));
    var value = document.createElement('span');
    value.id = 'busuanzi_value_' + id;
    container.appendChild(value);
    container.appendChild(document.createTextNode(' ' + suffix));
    counter.appendChild(container);
  }
  addCount('page_pv', label, '次');
  if (overview) {
    addCount('site_pv', '全站累计浏览', '次');
    addCount('site_uv', '全站访客估算', '位');
  }
  var footer = document.querySelector('#footer .footer-inner') || (overview && document.querySelector('footer'));
  (footer || document.body).appendChild(counter);
  if (production && !excluded) {
    var observer = new MutationObserver(function () {
      var value = document.getElementById('busuanzi_value_page_pv');
      if (value && value.textContent.trim()) { message.style.display = 'none'; observer.disconnect(); }
    });
    observer.observe(counter, { childList: true, subtree: true, characterData: true });
    var busuanzi = document.createElement('script');
    busuanzi.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
    busuanzi.async = true;
    busuanzi.onerror = function () { message.textContent = '访问统计暂不可用'; };
    setTimeout(function () {
      if (message.style.display !== 'none') message.textContent = '访问统计暂不可用';
    }, 10000);
    document.head.appendChild(busuanzi);
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
