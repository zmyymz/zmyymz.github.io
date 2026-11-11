"""Shared, idempotent analytics injection for published copies only."""
from pathlib import Path

MARKER = '<!-- game-analytics -->'
SNIPPET = MARKER + '\n<script defer src="/js/analytics/config.js"></script>\n<script defer src="/js/analytics/tracker.js"></script>\n'

def install(page):
    page = Path(page)
    source = page.read_text()
    if MARKER in source:
        return
    if '</body>' not in source:
        raise ValueError(f'No body closing tag: {page}')
    page.write_text(source.replace('</body>', SNIPPET + '</body>', 1))
