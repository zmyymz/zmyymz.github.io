#!/usr/bin/env python3
"""Sync 憋茅坑 into the blog without publishing."""
import argparse
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path, help="憋茅坑 index.html 路径")
source = parser.parse_args().source.expanduser().resolve(strict=True)
data = source.read_bytes()
if "<title>憋茅坑" not in data.decode("utf-8"):
    parser.error("源文件不是预期的憋茅坑页面，请检查路径。")
target = Path(__file__).resolve().parents[1] / "games/bie-mao-keng/index.html"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_bytes(data)
print(f"已同步：{target}，未提交或部署。")
