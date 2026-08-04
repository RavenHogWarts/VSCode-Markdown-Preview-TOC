# Changelog

本文件记录 Markdown Preview TOC 的版本变更。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，遵循 [SemVer](https://semver.org/lang/zh-CN/)。

---

## [1.1.0](https://github.com/RavenHogWarts/VSCode-Markdown-Preview-TOC/compare/v1.0.1...v1.1.0) (2026-08-04)


### Features

* TOC 风格变体 ([ef20dae](https://github.com/RavenHogWarts/VSCode-Markdown-Preview-TOC/commit/ef20daec6fdffe19c0a96753cf0e3ad23674c3d4))
* 双层状态基础设施 + 工具栏 ([f8caf39](https://github.com/RavenHogWarts/VSCode-Markdown-Preview-TOC/commit/f8caf39d3aa1ed29fc28402e2def33e2e8ab76c0))
* 子树折叠 + autoExpandDepth 落地 ([fb80ccc](https://github.com/RavenHogWarts/VSCode-Markdown-Preview-TOC/commit/fb80cccba128d71494317b3640758a5f34839734))


### Performance Improvements

* 使用 react 框架替换当前实现 ([ba0f5c5](https://github.com/RavenHogWarts/VSCode-Markdown-Preview-TOC/commit/ba0f5c53df07da4b48e95a88fe80671320911107))

## [1.0.1](https://github.com/RavenHogWarts/VSCode-Markdown-Preview-TOC/compare/v1.0.0...v1.0.1) (2026-08-04)


### Bug Fixes

* 滚动高亮跟随 ([6e62020](https://github.com/RavenHogWarts/VSCode-Markdown-Preview-TOC/commit/6e62020835f81be989ce95cbae4e186430f03500))

## 1.0.0 (2026-08-04)


### Features

* 完成插件框架 ([5bfa8ba](https://github.com/RavenHogWarts/VSCode-Markdown-Preview-TOC/commit/5bfa8ba1d2a25af9b93dbabc8e6e897f36d5d9f7))
* 完成核心 TOC ([174bb5d](https://github.com/RavenHogWarts/VSCode-Markdown-Preview-TOC/commit/174bb5d48faea33768e14d1c9653f3e1d795c28a))
* 测试、文档、发布 ([f5dc171](https://github.com/RavenHogWarts/VSCode-Markdown-Preview-TOC/commit/f5dc171796315d4cd53ad67817772dd3bbecddff))
* 滚动高亮 + 折叠 ([66828d3](https://github.com/RavenHogWarts/VSCode-Markdown-Preview-TOC/commit/66828d3208677627a27bb58cbbf7068380092879))
* 配置 + 主题 + 响应式 + 左右位置 ([22b5f66](https://github.com/RavenHogWarts/VSCode-Markdown-Preview-TOC/commit/22b5f669c99bd6c8ad11eef5e5cfa3220e797baf))


### Bug Fixes

* TOC 列表抖动 ([810773d](https://github.com/RavenHogWarts/VSCode-Markdown-Preview-TOC/commit/810773dc2289cda9a962a3fca659bede70866d8a))

## [1.0.0] — 2026-08-04

首次发布。

### ✨ 新增

- **预览内 TOC 边栏**：在原生 Markdown 预览（`Ctrl+Shift+V`）页面注入固定边栏（GitBook / VuePress 风格）。
- **点击跳转**：点击 TOC 项，正文平滑滚动（`scrollIntoView`）到对应标题。
- **滚动高亮**：`IntersectionObserver` 检测视口顶部 30% 的标题，自动高亮对应 TOC 项；高亮项超出 TOC 视区时自动滚入可见。
- **折叠 / 展开**：点击头部折叠（左/右滑出），折叠后浮出 `☰` FAB 一键展开（支持键盘）。
- **左右位置可配置**：`markdownToc.sidebarPosition`（`left` / `right`），CSS 由 `body.mdtoc-right` 切换布局、正文让位方向、折叠滑出方向、FAB 位置。
- **层级缩进**：按 `h1`–`h6` 自动缩进。
- **配置注入**：`extendMarkdownIt` 将 `markdownToc.*` 配置序列化进 `<meta id="mdtoc-config">`，预览脚本读取生效。
- **配置自动刷新**：`onDidChangeConfiguration` 监听 `markdownToc.*`，变更后 `markdown.preview.refresh`。
- **主题适配**：全部使用 `--vscode-*` CSS 变量；`@media(forced-colors:active)` 高对比度兜底。
- **响应式**：`@media(max-width:720px)` 窄屏浮动抽屉化（正文不再让位、TOC 默认滑出）；`@media(min-width:1400px)` 宽屏限正文最大宽度。
- **空状态**：无标题时显示「暂无可跳转的标题」。
- **防重入与防抖**：`__mdtoc_cleanup__` 清理旧 observer / sidebar；`MutationObserver` 100ms 防抖 + 标题签名比对避免无谓重绘与无限循环。

### 🛠 技术实现

- 双 bundle（esbuild）：`dist/extension.js`（cjs/node）+ `media/toc.js`（iife/browser）。
- 极简 manifest：`markdown.previewScripts` + `markdown.previewStyles` + `markdown.markdownItPlugins`，无侧边栏视图、无通信桥。
- 零运行时依赖（仅 `@types/*`、`esbuild`、`typescript`、`@vscode/vsce` 等开发依赖）。

---

[1.0.0]: https://github.com/RavenHogWarts/VSCode-Markdown-Preview-TOC/releases/tag/v1.0.0
