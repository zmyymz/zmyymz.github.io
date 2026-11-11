#!/usr/bin/env python3
"""Sync SLOT RUN runtime files and analytics; never publish."""
import argparse
import shutil
from pathlib import Path
from analytics_hooks import install

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
source = parser.parse_args().source.expanduser().resolve(strict=True)
target = Path(__file__).resolve().parents[1] / 'games/slot-run'
files = ['index.html', 'diagnostics.mjs', 'scene-batching.mjs']
for name in files:
    if not (source / name).is_file():
        parser.error(f'缺少文件：{name}')
target.mkdir(parents=True, exist_ok=True)
for name in files:
    shutil.copyfile(source / name, target / name)
install(target / 'index.html')
print('已同步轨迹并保留统计接入，未提交或部署。')
