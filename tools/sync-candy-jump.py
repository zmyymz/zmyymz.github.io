#!/usr/bin/env python3
"""Sync 跳跳糖 into the blog without publishing."""
import argparse
import re
import shutil
from pathlib import Path
from analytics_hooks import install

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path, help="跳跳糖项目目录")
source = parser.parse_args().source.expanduser().resolve(strict=True)
target = Path(__file__).resolve().parents[1] / "games/candy-jump"
files = ("index.html", "style.css", "game.js", "assets/tilemap-standard.png", "assets/LICENSE.txt")
for name in files:
    if not (source / name).is_file():
        parser.error(f"缺少文件：{name}")
for name in files:
    dest = target / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    if name == "style.css":
        css = (source / name).read_text()
        css = re.sub(r"@import url\('https://fonts\.googleapis\.com/[^']+'\);\s*", "", css)
        dest.write_text(css)
    else:
        shutil.copyfile(source / name, dest)
print(f"已同步 {len(files)} 个文件到 {target}，未提交或部署。")

install(target if target.suffix == ".html" else target / "index.html")
