# 游戏页面维护

访问入口：https://zmyymz.github.io/games/ 。全站导航中的“游戏”指向这里。
这是独立的游戏集合页；现有文章分类及其数量继续只统计博客文章。

## 添加已部署的游戏

编辑 `games/index.html`，第一次添加时删除 `.games-empty` 提示块，在同一位置放入下面的卡片。以后复制卡片继续添加即可，无需 JavaScript 或构建步骤。

```html
<section class="game-card" style="padding: 24px 0; border-bottom: 1px solid #eee;">
  <h2>游戏名称</h2>
  <p>一句话介绍玩法，以及支持手机触屏还是电脑键盘。</p>
  <p><a class="btn" href="https://你的游戏地址/" target="_blank" rel="noopener noreferrer">开始游戏 ↗</a></p>
</section>
```

使用真实的 HTTPS 游玩地址。游戏可以部署在独立的 GitHub Pages 仓库，或其他静态站点托管平台；这里保存链接即可。添加截图时，将图片放到 `images/games/`，添加有 `alt` 描述、宽高及 `loading="lazy"` 的图片标签。

## 游戏文件直接放在本仓库

如果游戏导出后是静态 HTML/CSS/JS/WASM 文件，也可以将完整导出目录放在 `games/游戏英文名/`，保留其中的 `index.html` 及所有资源文件。链接写成 `/games/游戏英文名/`。资源路径应支持子目录，避免 `/assets/` 之类的站点根路径导致资源丢失。

GitHub Pages 不能运行后端服务。需要账号、联机服务或数据库的游戏应另行部署后端。Godot Web 导出若启用线程，还需要核实跨源隔离响应头支持；在普通 GitHub Pages 上优先使用无线程导出，并实际测试浏览器兼容性。

## 发布与验证

在博客仓库中预览并确认游玩链接、手机操作和资源加载正常，再提交并推送 `master`，等待 Pages 部署成功。

当前仓库只有生成后的静态页面。如果未来恢复 Hexo 源项目，应把导航、社交链接和游戏页面同步到源项目，否则重新生成可能覆盖这些修改。
