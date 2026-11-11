#!/usr/bin/env python3
"""Copy the built Hand Guardian HTML into this blog; never commit or push."""
import argparse
import hashlib
from pathlib import Path
from analytics_hooks import install


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="游戏项目构建后的 outputs/index.html")
    args = parser.parse_args()
    source = args.source.expanduser().resolve(strict=True)
    target = Path(__file__).resolve().parents[1] / "games/hand-guardian/index.html"
    data = source.read_bytes()
    html = data.decode("utf-8")
    if '<canvas id="game"' not in html or "hand-guardian-campaign-v2" not in html:
        parser.error("源文件不是预期的手掌护田游戏，请检查路径。")
    if target.read_bytes() == data:
        print("已是最新版本，无需同步。")
        return
    target.write_bytes(data)
    assert target.read_bytes() == data
    print(f"已同步：{target}")
    print(f"SHA-256: {hashlib.sha256(data).hexdigest()}")
    print("仅更新本地文件。请预览、检查 git diff 后再提交部署。")


if __name__ == "__main__":
    main()
    install(Path(__file__).resolve().parents[1] / "games/hand-guardian/index.html")
