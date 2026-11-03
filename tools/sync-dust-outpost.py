#!/usr/bin/env python3
"""Sync Dust Outpost runtime files into the blog without publishing."""
import argparse
import shutil
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path, help="沙漠前哨项目目录，需已安装 Phaser")
source = parser.parse_args().source.expanduser().resolve(strict=True)
target = Path(__file__).resolve().parents[1] / "games/dust-outpost"
files = {"index.html": "index.html",
         "node_modules/phaser/dist/phaser.esm.min.js": "vendor/phaser.esm.min.js",
         "node_modules/phaser/LICENSE.md": "vendor/LICENSE.md"}
for folder, suffixes in (("src", {".js"}), ("assets", {".png"}), ("sounds", {".ogg"})):
    for path in (source / folder).rglob("*"):
        if path.is_file() and path.suffix in suffixes:
            name = str(path.relative_to(source))
            files[name] = name
for name in files:
    if not (source / name).is_file():
        parser.error(f"缺少 {name}，请先在原项目运行 npm ci。")
for name, output in files.items():
    dest = target / output
    dest.parent.mkdir(parents=True, exist_ok=True)
    if name.startswith("src/"):
        code = (source / name).read_text()
        dest.write_text(code.replace("node_modules/phaser/dist/phaser.esm.js", "vendor/phaser.esm.min.js"))
    else:
        shutil.copyfile(source / name, dest)
print(f"已同步 {len(files)} 个文件到 {target}，未提交或部署。")
