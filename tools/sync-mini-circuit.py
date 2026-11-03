#!/usr/bin/env python3
"""Export mini-circuit with local Three.js dependencies. Does not publish."""
import argparse
import shutil
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path, help="mini-circuit 项目目录（已 npm ci）")
args = parser.parse_args()
source = args.source.expanduser().resolve(strict=True)
target = Path(__file__).resolve().parents[1] / "games/mini-circuit"
files = {name: name for name in ("index.html", "style.css", "game.mjs", "physics.mjs", "track.mjs")}
for name in ("build/three.module.js", "examples/jsm/loaders/GLTFLoader.js", "examples/jsm/utils/BufferGeometryUtils.js", "LICENSE"):
    files["node_modules/three/" + name] = "vendor/three/" + name
for asset in (source / "assets").iterdir():
    if asset.suffix == ".glb" or asset.name == "Kenney-License.txt":
        files[str(asset.relative_to(source))] = str(asset.relative_to(source))
for name in files:
    if not (source / name).is_file():
        parser.error(f"缺少文件：{name}，请先在原项目运行 npm ci。")
html = (source / "index.html").read_text()
if html.count("./node_modules/three/") != 2:
    parser.error("Three.js 导入映射发生变化，请检查同步脚本。")
for name, output in files.items():
    destination = target / output
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source / name, destination)
(target / "index.html").write_text(html.replace("./node_modules/three/", "./vendor/three/"))
game = (target / "game.mjs").read_text()
game = game.replace("请通过本地启动器打开游戏，并确认 assets 与 node_modules 文件夹完整。", "游戏资源未能加载，请检查网络后刷新重试。")
(target / "game.mjs").write_text(game)
print(f"已同步 {len(files)} 个文件到 {target}，未提交或部署。")
