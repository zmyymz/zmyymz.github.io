#!/usr/bin/env python3
"""Sync an already-built Rustline HTML; do not build or publish."""
import argparse
from pathlib import Path
from analytics_hooks import install

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path, help='Rustline project folder (run npm run build first)')
source = parser.parse_args().source.expanduser().resolve(strict=True)
data = (source / 'rustline.html').read_bytes()
if '<title>RUSTLINE</title>' not in data.decode('utf-8'):
    parser.error('不是预期的 Rustline 构建产物')
target = Path(__file__).resolve().parents[1] / 'games/rustline/index.html'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_bytes(data)
install(target)
print('已同步 Rustline 并保留统计接入，未提交或部署。')
