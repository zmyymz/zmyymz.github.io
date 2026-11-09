#!/usr/bin/env python3
"""Copy 再来一骰 (formerly 五骰押注) into this blog without publishing."""
import argparse
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path, help="骰子押注.html 文件路径")
source = parser.parse_args().source.expanduser().resolve(strict=True)
data = source.read_bytes()
if "<title>再来一骰</title>" not in data.decode("utf-8"):
    parser.error("源文件不是预期的再来一骰页面，请检查路径。")
target = Path(__file__).resolve().parents[1] / "games/five-dice/index.html"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_bytes(data)
print(f"已同步：{target}，未提交或部署。")
