#!/usr/bin/env python3
"""Sync the four 拾光童趣 games; never commit or publish."""
import argparse
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source_root", type=Path, help="包含四个原项目的 2026-11-07 目录")
root = parser.parse_args().source_root.expanduser().resolve(strict=True)
repo = Path(__file__).resolve().parents[1]
entries = [
    ("044bb774/index.html", "games/bie-mao-keng/index.html", "憋茅坑"),
    ("4fd73129/index.html", "games/childhood/sand-stick/index.html", "扒尿炕"),
    ("4a06dfee/index.html", "games/childhood/stone-catching/index.html", "竹筛接石"),
    ("06bea1c5/hopscotch-nostalgia/prototype/index.html", "games/childhood/hopscotch/index.html", "跳房子"),
]
pending = []
for source, target, title in entries:
    data = (root / source).read_bytes()
    if title not in data.decode("utf-8").split("</title>")[0]:
        parser.error(f"游戏标题不匹配：{source}")
    pending.append((repo / target, data))
for target, data in pending:
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    print(f"已同步：{target}")
print("已同步 4 个游戏，未提交或部署。")
