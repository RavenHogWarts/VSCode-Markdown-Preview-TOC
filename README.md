<div align="center">

# Markdown Preview TOC

在 VSCode **原生** Markdown 预览页面内注入一个 **左侧 / 右侧** TOC 边栏（GitBook / VuePress 风格）：点击标题滚动到对应位置、滚动时高亮当前标题、支持子树折叠与三种视觉风格。

![icon](media/icon.png)

[![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)](./CHANGELOG.md)
[![License](https://img.shields.io/badge/license-GPL--3.0--or--later-green.svg)](./LICENSE)
[![VSCode](https://img.shields.io/badge/VSCode-1.85+-37A4CF.svg)](https://code.visualstudio.com/)

</div>

<!-- 📷 截图占位：把顶部演示动图命名为 media/preview-hero.gif 后删除本注释。
     建议内容：一个长 .md 文档预览，展示「点击 TOC → 平滑跳转 + 滚动高亮跟随」的完整动线。 -->
<p align="center">
  <img src="media/preview-hero.gif" alt="Markdown Preview TOC 演示" width="880" />
</p>

---

## ✨ 功能

- **预览内 TOC 边栏**：固定在 Markdown 预览（`Ctrl+Shift+V`）左侧或右侧，与正文并排，不遮挡内容。
- **点击跳转**：点击 TOC 项，正文平滑滚动到对应标题（跳转期间挂起高亮跟随，避免抖动）。
- **滚动高亮**：滚动正文时，TOC 自动高亮当前可见标题（`IntersectionObserver`，视口顶部 30% 带内算「当前」）；高亮项超出 TOC 视区时自动滚入可见。
- **子树折叠 / 展开**：点击父项折叠其子树；按 `autoExpandDepth` 自动展开到第 N 层；点击位于折叠子树内的项时，其全部祖先自动展开并跟随。
- **整体折叠 / 浮出 FAB**：点击头部整体收起，折叠后浮出 `☰` 悬浮按钮一键展开。
- **左右位置可配置**：`markdownToc.sidebarPosition`（`left` / `right`），改后预览自动刷新。
- **层级缩进**：按 `h1`–`h6` 自动缩进；支持跨级父子（如 h2 直接跟 h4）。
- **三种视觉风格**：`indented`（缩进式，默认）/ `pill`（药丸式）/ `starlight`（星轨式），工具栏即时切换并记忆。
- **主题适配**：全部使用 `--vscode-*` 主题变量，明亮 / 暗黑 / 高对比度下颜色正确。
- **响应式**：窄屏（≤720px）自动浮动抽屉化，不挤压正文。
- **零侵入**：不改你的 `.md` 源文件；TOC 完全在预览 DOM 内生成。
- **大文档无压力**：TOC 生成是 O(n) 扫描，`IntersectionObserver` 只观察标题，滚动时不重算。

### 布局示意

```
左侧（默认）                      右侧（sidebarPosition:right）
┌──────────┬──────────────────┐   ┌──────────────────┬──────────┐
│ 目录  ▾  │ # 标题           │   │ # 标题           │ 目录  ▾  │
│ ├ 一     │ 正文段落……      │   │ 正文段落……      │ ├ 一     │
│ │ ├ 1.1  │                  │   │                  │ │ ├ 1.1  │
│ └ 二     │ ## 二            │   │ ## 二            │ └ 二     │
└──────────┴──────────────────┘   └──────────────────┴──────────┘
```

---

## 🎬 效果展示

<!-- 📷 截图占位：media/preview-highlight.gif —— 滚动正文时 TOC 高亮项随当前可见标题切换，并自动滚入 TOC 视区。 -->
<p align="center">
  <img src="docs/preview-highlight.gif" alt="滚动高亮演示" width="880" />
</p>

**滚动高亮**：边栏高亮始终跟随视口顶部 30% 带内的那个标题；高亮项即将滚出 TOC 视区时，列表自动把它带回视野。

---

<!-- 📷 截图占位：media/preview-collapse.gif —— 点击父项折叠子树、点击头部整体收起后浮出 ☰ FAB、再点开。 -->
<p align="center">
  <img src="docs/preview-collapse.gif" alt="折叠与展开演示" width="880" />
</p>

**子树折叠**：每个父项可独立折叠；打开预览时按 `autoExpandDepth` 自动展开到第 N 层；点击位于折叠子树内的项时，祖先会自动展开。

---

### 三种视觉风格

<!-- 📷 截图占位：media/preview-styles.gif —— 同一文档在 indented / pill / starlight 三种风格间切换（工具栏按钮）。 -->
<p align="center">
  <img src="docs/preview-styles.gif" alt="三种视觉风格切换" width="880" />
</p>

| 风格        | 说明                                                                     |
| ----------- | ------------------------------------------------------------------------ |
| `indented`  | **默认**。按层级缩进的经典目录（v1 视觉）。                              |
| `pill`      | 药丸式：active 项整行高亮为圆角条。                                      |
| `starlight` | 星轨式：左侧竖线 + 圆点，随阅读进度逐段点亮（仿 Starlight / Fumadocs）。 |

风格可通过边栏顶部工具栏即时切换，选择会持久化到 localStorage（覆盖 `markdownToc.style` 配置项）。

---

### 左右位置

<p align="center">
  <img src="docs/preview-position.gif" alt="左侧与右侧边栏对比" width="880" />
</p>

通过 `markdownToc.sidebarPosition`（`left` / `right`）切换；修改后预览自动刷新，正文让位方向、折叠滑出方向、FAB 位置随之变化。

---

## 🚀 使用

### 安装

- **方式一（推荐）**：在 VSCode 扩展面板搜索 **Markdown Preview TOC** 安装（已发布到 [Marketplace](https://marketplace.visualstudio.com/)）。
- **方式二**：从 [GitHub Releases](https://github.com/RavenHogWarts/VSCode-Markdown-Preview-TOC/releases) 下载 `.vsix`，执行：

  ```bash
  code --install-extension markdown-preview-toc-<版本>.vsix
  ```

  或扩展面板 → `...` → **Install from VSIX...** 选择下载文件。

### 开始使用

1. 打开任意 `.md` 文件，按 `Ctrl+Shift+V`（macOS：`Cmd+Shift+V`）打开预览。
2. 预览左侧自动出现 TOC 边栏。

> 没看到 TOC？确认是「预览」而非源码编辑器；检查 `markdownToc.enabled` 是否为 `true`；文档需含 `minDepth`–`maxDepth` 范围内的标题。

---

## ⚙️ 配置

在 `settings.json` 中修改（改后预览**自动刷新**生效）：

| 配置项                          | 类型    | 默认         | 取值范围                          | 说明                                      |
| ------------------------------- | ------- | ------------ | --------------------------------- | ----------------------------------------- |
| `markdownToc.enabled`           | boolean | `true`       | —                                 | 是否在预览中显示 TOC 边栏                 |
| `markdownToc.sidebarWidth`      | number  | `260`        | 180–480                           | 边栏宽度（像素）                          |
| `markdownToc.sidebarPosition`   | string  | `"left"`     | `left` / `right`                  | 边栏位置                                  |
| `markdownToc.defaultCollapsed`  | boolean | `false`      | —                                 | 打开预览时是否默认整体收起                |
| `markdownToc.minDepth`          | number  | `2`          | 1–6                               | 最小层级（默认 2 隐藏 h1）                |
| `markdownToc.maxDepth`          | number  | `6`          | 1–6                               | 最大层级                                  |
| `markdownToc.highlightOnScroll` | boolean | `true`       | —                                 | 滚动时高亮对应标题                        |
| `markdownToc.autoExpandDepth`   | number  | `3`          | 0–6                               | 自动展开到第 N 层（0=只见顶层，6=全展开） |
| `markdownToc.style`             | string  | `"indented"` | `indented` / `pill` / `starlight` | 视觉风格（工具栏切换会覆盖此项）          |

**关于 `autoExpandDepth`（相对深度）**：相对深度 = `level - min(全部标题 level) + 1`，取全局最小层级而非第一个标题的层级——这样当文档首个标题比后文更深（例如以 h3 开篇）时，相对深度依然正确。

配置示例：

```jsonc
{
  "markdownToc.sidebarPosition": "right",
  "markdownToc.sidebarWidth": 300,
  "markdownToc.minDepth": 2,
  "markdownToc.maxDepth": 4,
  "markdownToc.autoExpandDepth": 2,
  "markdownToc.style": "starlight"
}
```

---

## ❓ FAQ

**Q：TOC 会修改我的 markdown 文件吗？**
不会。TOC 完全在预览 DOM 里生成，源文件零改动。

**Q：点击后正文位置被遮挡？**
CSS 已设 `scroll-margin-top`。若仍有遮挡（如你自定义了固定头），可在 `markdown.styles` 加 `h1,h2,h3,h4,h5,h6{scroll-margin-top:60px}`。

**Q：标题 id 与 GitHub 不一致？**
原生预览用 `githubSlugifier`（移植自 github-slugger），与 GitHub 基本一致；CJK 标题直接保留字符，重复标题自动追加 `-1`/`-2`。边缘差异可提 issue。

**Q：与我的 `markdown.styles` 冲突？**
优先级：内置样式 > 本插件 > 用户样式。本插件选择器用 `#mdtoc-` 前缀（高特异性），一般不冲突。

**Q：远程开发能用吗？**
能。`extensionKind: ["ui","workspace"]`，优先本地运行。

**Q：支持 vscode.dev 吗？**
不保证，面向桌面版。

**Q：大文档会卡吗？**
不会。TOC 生成是 O(n) 扫描，`IntersectionObserver` 只观察标题，滚动时不重算。仓库内的 [`sample/sample.md`](./sample/sample.md) 是为此设计的综合验证文档（覆盖深嵌套、跨级、重复标题、特殊字符、大段可滚动正文等）。

---

## 📋 平台限制

- **配置即时生效依赖刷新预览**：配置在渲染期注入，改设置后由 `onDidChangeConfiguration` 自动触发 `markdown.preview.refresh`。
- **外部命令难触达预览**：本插件不提供外部命令，TOC 折叠用预览内的头部按钮。
- **预览 DOM 结构非契约**：本插件只依赖 `h1`–`h6` + `id`（稳定），布局选择器带兜底。

详见 [dev/260803/09-limitations-and-alternatives.md](./dev/260803/09-limitations-and-alternatives.md)。

---

## 🔧 开发

```bash
pnpm install
pnpm run build          # 生成 dist/extension.js + media/toc.js
# 或 pnpm run watch
```

按 `F5` 启动扩展开发宿主，打开 [`sample/sample.md`](./sample/sample.md) 预览验证。该 sample 是覆盖大文档 / 深嵌套 / 特殊标题等真实场景的综合验证文档。

调试预览脚本：`Ctrl+Shift+P` → `Developer: Open Webview Developer Tools`。

常用脚本：

| 命令                 | 说明                                                  |
| -------------------- | ----------------------------------------------------- |
| `pnpm run build`     | 构建扩展宿主 + 预览脚本两个 bundle                    |
| `pnpm run watch`     | 监听变更增量构建                                      |
| `pnpm run typecheck` | TypeScript 类型检查（不产出）                         |
| `pnpm test`          | 运行 `test/*.test.ts`（esbuild 编译 → `node --test`） |
| `pnpm run package`   | 打包为 `.vsix`                                        |

完整设计与实现文档见 [`dev/`](./dev)。

---

## 📄 许可证

[GPL-3.0-or-later](./LICENSE)
