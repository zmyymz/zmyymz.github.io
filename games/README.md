# 游戏页面维护

访问入口：https://zmyymz.github.io/games/ 。全站导航中的“游戏”指向这里。
这是独立的游戏集合页；现有文章分类及其数量继续只统计博客文章。

## 添加已部署的游戏

《叠码 / STACKED》位于 `games/stacked/`，源项目为 `/Users/zhangmeiyue.zmy/Documents/Qoder/2026-11-06/f8f7b774`。虚拟筹码卡牌策略游戏，通过牌型计分与刻印强化挑战六层关卡，横屏 Canvas 界面。脚本、PNG 牌面、XML 图集、OGG 音效与素材许可均随站点托管，无外部引擎。手机操作及 OGG 音效兼容性需实机确认。

后续在博客仓库运行 `python3 tools/sync-stacked.py /Users/zhangmeiyue.zmy/Documents/Qoder/2026-11-06/f8f7b774`，预览 `/games/stacked/`。脚本只更新本地运行文件，不会提交或部署；新增其他格式资源时需更新同步清单。

《五骰押注》位于 `games/five-dice/index.html`，是虚拟筹码骰子策略游戏：选择牌型、投掷锁骰、应对十关任务牌。原样复制单文件 HTML，图片和概率数据均内嵌，无外部运行依赖。

更新后在博客仓库运行 `python3 tools/sync-five-dice.py /Users/zhangmeiyue.zmy/.qwenworkcn/workspace/2026-11-06/mw4d265fybrxh0ui/outputs/骰子押注.html`，预览 `/games/five-dice/`。脚本只更新本地文件，不会提交或部署。段位保存在当前浏览器站点下，不会从原地址自动迁移。

《跳跳糖》位于 `games/candy-jump/`，源项目为 `/Users/zhangmeiyue.zmy/Documents/Qoder/2026-11-03/bf80d4e3`。三关像素平台冒险，支持移动、跳跃、踩怪及触屏控制。保留素材 CC0 许可；发布副本移除 Google 字体导入，使用 CSS 字体回退，玩法不改动。

更新后在博客仓库运行 `python3 tools/sync-candy-jump.py /Users/zhangmeiyue.zmy/Documents/Qoder/2026-11-03/bf80d4e3`，再预览 `/games/candy-jump/`。脚本只同步五个运行及许可文件，不会提交推送；新增资源时需更新文件清单。

《跃跃小蓝》位于 `games/hop-and-pop/`，源项目为 `/Users/zhangmeiyue.zmy/Documents/Qoder/2026-11-03/c86d47e0`。自动奔跑、自动射击，通过空格或点击控制跳跃和二段跳，共三关。原样同步 HTML、CSS、JS 和 sprites.png，无外部引擎依赖。

更新后在博客仓库运行 `python3 tools/sync-hop-and-pop.py /Users/zhangmeiyue.zmy/Documents/Qoder/2026-11-03/c86d47e0`，再预览 `/games/hop-and-pop/`。命令只同步本地文件，不会提交或部署；新增资源时需更新脚本文件清单。游戏进度按站点保存在浏览器中，不会从原地址自动迁移。

《沙漠前哨 / DUST OUTPOST》位于 `games/dust-outpost/`，源项目为 `/Users/zhangmeiyue.zmy/Documents/Qoder/2026-11-03/f5055838`。Phaser 像素射击游戏，支持 WASD 移动、鼠标瞄准射击、空格冲刺、E 闸门，以及手机横屏双摇杆。引擎压缩版、图片及声音均随站点托管，保留 Phaser MIT 许可。音频沿用原项目 OGG 格式，手机音效兼容性需实机确认。

在原项目完成修改后，从博客仓库运行 `python3 tools/sync-dust-outpost.py /Users/zhangmeiyue.zmy/Documents/Qoder/2026-11-03/f5055838`。脚本只同步 index.html、src、PNG 素材、OGG 声音和 Phaser 压缩版，将模块导入改到 vendor；不复制调试页、开发工具或完整 node_modules，不会提交推送。新增其他资源格式时需更新同步清单。同步后预览 `/games/dust-outpost/` 再部署。

《迷你赛车场》位于 `games/mini-circuit/`，源项目为 `/Users/zhangmeiyue.zmy/Documents/workspace/mini-circuit`。包含长风回环、俱乐部环线两关，按住加速、松手减速，三圈完赛。所有 Three.js 引擎文件和 GLB 模型随站点托管，无外部 CDN。保留 Three.js MIT 和 Kenney CC0 许可。

后续在原项目修改并运行 `npm test` 后，从博客仓库运行：

```sh
python3 tools/sync-mini-circuit.py /Users/zhangmeiyue.zmy/Documents/workspace/mini-circuit
```

同步脚本复制运行文件、模型和必要的 Three.js 模块，将导入路径改为 `vendor/three/`，并替换仅适用于本地启动器的加载失败提示；不会复制完整 node_modules、测试、预览截图或 Git 目录，也不会提交或推送。源项目依赖缺失时先运行 `npm ci`。如新增模块或其他格式资源，需要更新脚本的文件清单。预览 `/games/mini-circuit/` 后再部署。成绩按访问地址保存，本地成绩不会自动迁移到线上。

《轨迹 / SLOT RUN》位于 `games/slot-run/`，复制自本地 slot-run 项目。保留 `index.html` 的 Three.js CDN 加载及内置备用版本，并随附可选的 `diagnostics.mjs`；正常游玩不启用诊断。游戏、工坊与存档逻辑未改动，迁移访问地址后不会自动带入旧地址存档。

《手掌护田》位于 `games/hand-guardian/index.html`，为原单文件 Canvas/WebAudio 游戏的副本，未修改玩法。包含 6 个关卡，按住蓄力、松手张掌，支持高清渲染、移动端横屏适配和旋转触摸映射。

### 从其他对话同步手掌护田

游戏源码继续在原项目维护，博客只保存发布副本。对话之间不会自动同步文件；在原项目完成修改、构建和测试后，从博客仓库运行：

```sh
python3 tools/sync-hand-guardian.py /Users/zhangmeiyue.zmy/Documents/Codex/2026-10-19/html5-2d-hand-guardian-canvas-webaudio/outputs/index.html
git diff -- games/hand-guardian/index.html
```

该命令只复制指定 HTML，不会构建源码、提交或推送。原项目路径移动后修改命令参数即可。当前游戏无外部资源，无需复制 `hand-poses.png` 等检查图片；以后新增资源时应一并调整同步范围。

本地预览 `/games/hand-guardian/`，确认后再提交并推送博客仓库。请勿同时在发布副本中修改玩法，否则下次同步会覆盖这些改动。也可以在游戏开发对话中明确要求“构建测试后，同步到博客仓库，先不要推送”，并提供上述命令。

《泡泡滚筒》位于 `games/bubble-laundry/`，是 Godot 4.7.2 单线程 Web 导出。此目录为生成产物，应从 `/Users/zhangmeiyue.zmy/Documents/workspace/games/godot-demo` 运行 `python3 tools/export_web.py --output /Users/zhangmeiyue.zmy/Documents/workspace/zmyymz.github.io/games/bubble-laundry` 更新，不要单独手改导出脚本。完整目录都需保留，首次加载包含较大的 WASM 引擎文件。导出命令只写本地文件，不会发布。

已收录《弑君者 · 极简记血》（`games/regicide-lite/index.html`）：这是配合实体牌局使用的辅助工具，卡片需明确标注用途。发布副本仅将原“完整版”链接改成了返回游戏页，记血逻辑保持原样。进度按浏览器与站点保存在本地，从原文件迁移到博客地址不会自动迁移旧进度。

编辑 `games/index.html`，在 `.game-grid` 内复制一整个 `.game-card`，修改封面、名称、简介、操作方式和两个游玩链接即可。最新游戏可放在最前面；桌面双列、手机单列，无需 JavaScript 或构建步骤。当前已收录《拔萝卜 · 30秒》，位于 `games/pull-radish/index.html`。

```html
<article class="game-card">
  <a class="game-cover" href="/games/游戏英文名/" target="_blank" rel="noopener noreferrer" aria-label="开始玩游戏名称，打开新标签页">
    <img src="/images/games/封面.webp" alt="游戏画面" width="600" height="420" loading="lazy" style="width:100%;height:100%;object-fit:cover;border:0;padding:0;">
  </a>
  <div class="game-card-content">
    <div class="game-tags"><span>类型</span><span>单人</span></div>
    <h2>游戏名称</h2>
    <p class="game-description" title="一句话介绍玩法。">一句话介绍玩法。</p>
    <p class="game-controls">鼠标 / 触屏拖拽</p>
    <a class="game-play" href="/games/游戏英文名/" target="_blank" rel="noopener noreferrer">开始游戏 ↗</a>
  </div>
</article>
```

使用真实的 HTTPS 游玩地址。游戏可以部署在独立的 GitHub Pages 仓库，或其他静态站点托管平台；这里保存链接即可。添加截图时，将图片放到 `images/games/`，添加有 `alt` 描述、宽高及 `loading="lazy"` 的图片标签。

## 游戏文件直接放在本仓库

如果游戏导出后是静态 HTML/CSS/JS/WASM 文件，也可以将完整导出目录放在 `games/游戏英文名/`，保留其中的 `index.html` 及所有资源文件。链接写成 `/games/游戏英文名/`。资源路径应支持子目录，避免 `/assets/` 之类的站点根路径导致资源丢失。

GitHub Pages 不能运行后端服务。需要账号、联机服务或数据库的游戏应另行部署后端。Godot Web 导出若启用线程，还需要核实跨源隔离响应头支持；在普通 GitHub Pages 上优先使用无线程导出，并实际测试浏览器兼容性。

## 发布与验证

在博客仓库中预览并确认游玩链接、手机操作和资源加载正常，再提交并推送 `master`，等待 Pages 部署成功。

当前仓库只有生成后的静态页面。如果未来恢复 Hexo 源项目，应把导航、社交链接和游戏页面同步到源项目，否则重新生成可能覆盖这些修改。
