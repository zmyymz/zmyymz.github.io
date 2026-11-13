(function () {
  'use strict';
  var cfg = window.GAME_LIKES;
  if (!cfg) return;
  var demo = ['127.0.0.1', 'localhost'].includes(location.hostname) && new URLSearchParams(location.search).get('likes-preview') === '1';
  var status = document.createElement('p');
  status.className = 'likes-status';
  status.setAttribute('role', 'status');
  status.textContent = demo ? '点赞效果预览 · 仅保存在本机，不代表真实点赞数' : '点赞按浏览器记录，无需登录。';
  var grid = document.querySelector('.game-grid');
  if (!grid) return;
  grid.before(status);
  var visitor, saved, storageOK = true;
  var storageKey = demo ? 'game-likes-demo-v1' : 'game-likes-v1';
  try {
    visitor = localStorage.getItem('game-likes-visitor');
    if (!visitor) { visitor = crypto.randomUUID(); localStorage.setItem('game-likes-visitor', visitor); }
    saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
  } catch (_) { saved = {}; storageOK = false; }
  async function rpc(name, data) {
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 8000);
    try {
      var res = await fetch(cfg.url + '/rest/v1/rpc/' + name, {
        method: 'POST', headers: { apikey: cfg.key, 'Content-Type': 'application/json' },
        body: JSON.stringify(data), signal: controller.signal
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } finally { clearTimeout(timeout); }
  }
  var entries = [];
  grid.querySelectorAll('.game-card').forEach(function (card) {
    if (card.hidden) return;
    var play = card.querySelector('.game-play');
    if (!play) return;
    var id = new URL(play.href).pathname;
    var title = card.querySelector('h2').textContent.trim();
    var actions = document.createElement('div');
    actions.className = 'game-actions';
    play.replaceWith(actions); actions.appendChild(play);
    var button = document.createElement('button');
    button.type = 'button'; button.className = 'game-like'; button.disabled = !demo || !storageOK;
    actions.appendChild(button);
    var entry = { id: id, button: button, liked: !!saved[id], count: demo ? (saved[id] ? 1 : 0) : null };
    entries.push(entry);
    function render() {
      button.setAttribute('aria-pressed', String(entry.liked));
      button.setAttribute('aria-label', (entry.liked ? '取消点赞：' : '点赞：') + title + (entry.count === null ? '' : '，' + entry.count + ' 赞'));
      button.textContent = (entry.liked ? '♥ ' : '♡ ') + (entry.count === null ? '—' : entry.count);
      button.title = entry.liked ? '已点赞，点击取消' : '喜欢这个游戏？点个赞';
    }
    entry.render = render; render();
    button.onclick = async function () {
      button.disabled = true;
      var liked = !entry.liked;
      try {
        if (demo) entry.count = liked ? 1 : 0;
        else {
          var rows = await rpc('set_game_like', { p_game_id: id, p_visitor: visitor, p_liked: liked });
          entry.count = Number(rows[0].likes);
        }
        entry.liked = liked;
        saved[id] = liked;
        try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch (_) { status.textContent = '已提交，但浏览器未能保存本机点赞状态。'; }
        render();
      } catch (_) { status.textContent = '点赞未完成，请检查网络后重试。'; }
      finally { button.disabled = false; }
    };
  });
  if (!storageOK) status.textContent = '浏览器无法保存点赞标识，请允许本地存储后刷新。';
  if (demo) return;
  rpc('get_game_likes', {}).then(function (rows) {
    entries.forEach(function (entry) {
      var row = rows.find(function (r) { return r.game_id === entry.id; });
      if (!row) return;
      entry.count = Number(row.likes); entry.render(); entry.button.disabled = !storageOK;
    });
  }).catch(function () {
    status.textContent = '点赞服务尚未就绪或暂时无法连接，游戏可正常游玩。';
  });
}());
