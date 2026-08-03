# Markdown Preview TOC

> 在 VSCode **原生** Markdown 预览页面内注入一个 **左侧或右侧** TOC 边栏（GitBook / VuePress 风格）：点击标题滚动到对应位置、滚动时高亮当前标题、支持折叠。

![icon](media/icon.png)

---

## ✨ 功能

- **预览内 TOC 边栏**：固定在 Markdown 预览（`Ctrl+Shift+V`）左侧或右侧，与正文并排，不遮挡内容。
- **点击跳转**：点击 TOC 项，正文平滑滚动到对应标题。
- **滚动高亮**：滚动正文时，TOC 自动高亮当前可见标题（`IntersectionObserver`），高亮项超出 TOC 视区时自动跟随滚动。
- **折叠 / 展开**：点击头部折叠，折叠后浮出 `☰` 按钮一键展开。
- **左右位置可配置**：`markdownToc.sidebarPosition`（`left` / `right`）。
- **层级缩进**：按 `h1`–`h6` 层级自动缩进。
- **主题适配**：全部使用 VSCode 主题变量，明暗 / 高对比度主题下颜色正确。
- **响应式**：窄屏自动浮动抽屉化，不挤压正文。
- **零侵入**：不改你的 `.md` 源文件；TOC 完全在预览 DOM 内生成。

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

## 🚀 使用

1. 安装本扩展。
2. 打开任意 `.md` 文件，按 `Ctrl+Shift+V`（macOS：`Cmd+Shift+V`）打开预览。
3. 预览左侧自动出现 TOC。

> 没看到 TOC？确认是「预览」而非源码编辑器；检查 `markdownToc.enabled` 是否为 `true`；文档需含标题。

---

## ⚙️ 配置

在 `settings.json` 中修改（改后预览**自动刷新**生效）：

| 配置项 | 类型 | 默认 | 说明 |
|--------|------|------|------|
| `markdownToc.enabled` | boolean | `true` | 是否在预览中显示 TOC 边栏 |
| `markdownToc.sidebarWidth` | number | `260` | 边栏宽度（像素，180–480） |
| `markdownToc.sidebarPosition` | `"left"` \| `"right"` | `"left"` | 边栏位置 |
| `markdownToc.defaultCollapsed` | boolean | `false` | 打开预览时是否默认收起 |
| `markdownToc.minDepth` | number | `2` | 最小层级（默认 2 隐藏 h1，1–6） |
| `markdownToc.maxDepth` | number | `6` | 最大层级（1–6） |
| `markdownToc.highlightOnScroll` | boolean | `true` | 滚动时高亮对应标题 |
| `markdownToc.autoExpandDepth` | number | `3` | 自动展开到第 N 层（0–6） |

示例：

```jsonc
{
  "markdownToc.sidebarPosition": "right",
  "markdownToc.sidebarWidth": 300,
  "markdownToc.minDepth": 2
}
```

---

## ❓ FAQ

**Q：TOC 会修改我的 markdown 文件吗？**
不会。TOC 完全在预览 DOM 里生成，源文件零改动。

**Q：点击后正文位置被遮挡？**
CSS 已设 `scroll-margin-top`。若仍有遮挡（如你自定义了固定头），可在 `markdown.styles` 加 `h1,h2,h3,h4,h5,h6{scroll-margin-top:60px}`。

**Q：标题 id 与 GitHub 不一致？**
原生预览用 `githubSlugifier`（移植自 github-slugger），与 GitHub 基本一致；CJK 标题直接保留字符。边缘差异可提 issue。

**Q：与我的 `markdown.styles` 冲突？**
优先级：内置样式 > 本插件 > 用户样式。本插件选择器用 `#mdtoc-` 前缀（高特异性），一般不冲突。

**Q：远程开发能用吗？**
能。`extensionKind: ["ui","workspace"]`，优先本地运行。

**Q：支持 vscode.dev 吗？**
不保证，面向桌面版。

**Q：大文档会卡吗？**
不会。TOC 生成是 O(n) 扫描，`IntersectionObserver` 只观察标题，滚动时不重算。

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

按 `F5` 启动扩展开发宿主，打开 `sample/sample.md` 预览验证。

调试预览脚本：`Ctrl+Shift+P` → `Developer: Open Webview Developer Tools`。

完整设计与实现文档见 [`dev/260803/`](./dev/260803/README.md)。

---

## 📄 许可证

[GPL-3.0-or-later](./LICENSE)
