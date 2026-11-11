"""Analytics bootstrap starts only after window.load; updates old hooks too."""
from pathlib import Path

MARKER = '<!-- game-analytics -->'
OLD = MARKER + '\n<script defer src="/js/analytics/config.js"></script>\n<script defer src="/js/analytics/tracker.js"></script>\n'
SNIPPET = MARKER + '''
<script>
(function () {
  function startAnalytics() {
    setTimeout(function () {
      var config = document.createElement('script');
      config.src = '/js/analytics/config.js';
      config.async = true;
      config.onload = function () {
        var tracker = document.createElement('script');
        tracker.src = '/js/analytics/tracker.js';
        tracker.async = true;
        document.head.appendChild(tracker);
      };
      document.head.appendChild(config);
    }, 0);
  }
  if (document.readyState === 'complete') startAnalytics();
  else window.addEventListener('load', startAnalytics, { once: true });
}());
</script>
'''

def install(page):
    page = Path(page)
    source = page.read_text()
    if OLD in source:
        page.write_text(source.replace(OLD, SNIPPET, 1))
        return
    if MARKER in source:
        return
    if '</body>' not in source:
        raise ValueError(f'No body closing tag: {page}')
    page.write_text(source.replace('</body>', SNIPPET + '</body>', 1))
