#!/usr/bin/env python3
"""Install/update analytics bootstrap in published copies only."""
from pathlib import Path
from analytics_hooks import install

repo = Path(__file__).resolve().parents[1]
for page in [repo / 'index.html', *sorted((repo / 'games').rglob('index.html'))]:
    install(page)
    print(page.relative_to(repo))
