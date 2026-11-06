#!/usr/bin/env python3
"""Sync STACKED runtime and assets into the blog without publishing."""
import argparse
import shutil
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path, help="叠码项目目录")
source = parser.parse_args().source.expanduser().resolve(strict=True)
target = Path(__file__).resolve().parents[1] / "games/stacked"
files = ["index.html", "styles.css"]
for folder, extensions in (("src", {".js"}), ("assets", {".png", ".xml", ".ogg", ".txt"})):
    if not (source / folder).is_dir():
        parser.error(f"缺少目录：{folder}")
    files += [str(p.relative_to(source)) for p in (source / folder).rglob("*") if p.is_file() and p.suffix in extensions]
for name in files:
    if not (source / name).is_file():
        parser.error(f"缺少文件：{name}")
for name in files:
    dest = target / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source / name, dest)
print(f"已同步 {len(files)} 个文件到 {target}，未提交或部署。")
