#!/usr/bin/env python3
"""Sync 跃跃小蓝 into the blog without committing or publishing."""
import argparse
import shutil
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path, help="跃跃小蓝项目目录")
source = parser.parse_args().source.expanduser().resolve(strict=True)
target = Path(__file__).resolve().parents[1] / "games/hop-and-pop"
files = ("index.html", "style.css", "game.js", "assets/sprites.png")
for name in files:
    if not (source / name).is_file():
        parser.error(f"缺少文件：{name}")
for name in files:
    destination = target / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source / name, destination)
print(f"已同步 {len(files)} 个文件到 {target}，未提交或部署。")
