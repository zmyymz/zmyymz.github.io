#!/usr/bin/env python3
"""Install analytics hooks in published HTML copies, without changing original projects."""
from pathlib import Path

repo = Path(__file__).resolve().parents[1]
marker = '<!-- game-analytics -->'
snippet = marker + '\n<script defer src="/js/analytics/config.js"></script>\n<script defer src="/js/analytics/tracker.js"></script>\n'
pages = [repo / 'index.html', *sorted((repo / 'games').rglob('index.html'))]
for page in pages:
    source = page.read_text()
    if marker in source:
        continue
    if '</body>' not in source:
        raise SystemExit(f'No body closing tag: {page}')
    page.write_text(source.replace('</body>', snippet + '</body>', 1))
    print(page.relative_to(repo))
