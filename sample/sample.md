---
title: Markdown Preview TOC · 综合示例
description: 用于开发验证 TOC 边栏的样例文档，覆盖大文档、深层嵌套、特殊标题等真实场景。
date: 2026-08-04
---

<!-- 本文件是 TOC 边栏的综合验证文档。覆盖以下场景：
     1. YAML frontmatter（不应被识别为标题）
     2. 全 h1–h6 层级 + 深层嵌套（验证 autoExpandDepth / 子树折叠）
     3. 跨级嵌套（h2→h4、h3→h6，验证 markTree）
     4. 重复标题（github-slugger 追加 -1/-2，验证 id 唯一）
     5. 代码块内的 # 行（不应成为标题）
     6. CJK / 特殊字符 / emoji / 行内代码 标题（验证 slug）
     7. 大段正文（验证 IntersectionObserver 滚动高亮）
     8. 首个标题比后文更深（验证 initialCollapsedNodes 取全局最小 level）
     9. 表格 / 引用 / 嵌套列表 / 图片 等真实富文本
     10. 末尾乱序标题（验证 maxDepth 与自然排序） -->

# Markdown Preview TOC · 综合示例工作区

> 这是 `Markdown Preview TOC` 扩展的**综合验证文档**。打开预览（`Ctrl+Shift+V`）后，左侧应出现可滚动、可折叠、随滚动高亮的 TOC 边栏。DevTools Console 应出现 `[mdtoc] ...` 日志。

本 H1 在默认配置（`minDepth: 2`）下**不会**出现在 TOC 中——它正是用来验证「minDepth 过滤」的。若你把 `markdownToc.minDepth` 改为 `1`，本标题会进入 TOC 顶层。

下面是一段较长的导言正文，目的是让本节具备可滚动的高度。Markdown Preview TOC 在 VSCode 原生预览页面内注入一个 GitBook / VuePress 风格的目录边栏：点击标题滚动到对应位置、滚动时高亮当前标题、支持折叠与展开。它不修改你的 `.md` 源文件，TOC 完全在预览 DOM 内生成。TOC 的生成是 O(n) 扫描，`IntersectionObserver` 只观察标题节点，滚动时不重算，因此即便面对很长的文档也不会卡顿。边栏固定在正文一侧，与正文并排，不遮挡内容；窄屏时会自动浮动抽屉化，避免挤压正文。

边栏支持三种视觉风格——`indented`（缩进式，默认）、`pill`（药丸式）、`starlight`（星轨式）——可通过工具栏循环切换并持久化到 localStorage。子树折叠按相对深度自动展开到第 N 层（`autoExpandDepth`，默认 3），点击某项时若它位于折叠子树内，其祖先会被自动展开并跟随。

---

## 一、安装 Installation

本节演示「中英混合标题」：slug 会变成 `一安装-installation`（CJK 直接保留，英文转小写、空格转连字符）。

### 1.1 系统要求 (System Requirements)

Markdown Preview TOC 面向 VSCode 桌面版，无额外运行时依赖。

#### 1.1.1 支持的编辑器版本

- VSCode 1.70+（依赖原生 Markdown 预览的 `extendMarkdownIt` 钩子）
- VSCodium（同源，理论兼容）
- Cursor / Windsurf 等 Fork（未官方保证，但通常可用）

#### 1.1.2 操作系统

| 平台 | 状态 | 备注 |
| --- | --- | --- |
| Windows | ✅ 完全支持 | 主要开发与测试平台 |
| macOS | ✅ 完全支持 | `Cmd+Shift+V` 打开预览 |
| Linux | ✅ 完全支持 | 各发行版一致 |

##### 1.1.2.1 远程开发与 Web 版

远程开发（SSH / WSL / Dev Container）可用：`extensionKind: ["ui","workspace"]`，优先本地运行。`vscode.dev` 不保证支持，本插件面向桌面版。

###### 1.1.2.1.1 第六级标题（验证 maxDepth=6 的下界）

这是 H6 的正文。在默认 `maxDepth: 6` 下它仍会出现；若把 `maxDepth` 调到 5，本标题及其所在子树会从 TOC 消失。本小节同时验证了「h2→h3→h4→h5→h6 的完整六级深嵌套」——这是测试 `autoExpandDepth` 折叠与子树展开跟随最直接的用例。

### 1.2 通过市场安装

在 VSCode 扩展面板搜索 **Markdown Preview TOC** 安装，或访问 [Marketplace](https://marketplace.visualstudio.com/) 页面。

### 1.3 通过 VSIX 离线安装

从 [GitHub Releases](https://github.com/RavenHogWarts/VSCode-Markdown-Preview-TOC/releases) 下载 `.vsix`，执行：

```bash
code --install-extension markdown-toc-<version>.vsix
```

或在扩展面板点击 `...` → **Install from VSIX...** 选择下载文件。

---

## 二、使用

### 2.1 打开预览

打开任意 `.md` 文件，按 `Ctrl+Shift+V`（macOS：`Cmd+Shift+V`）打开预览，TOC 自动出现在边栏。

> 没看到 TOC？确认是「预览」而非源码编辑器；检查 `markdownToc.enabled` 是否为 `true`；文档需含标题（`minDepth` 范围内的标题）。

### 2.2 点击跳转

点击 TOC 中任意一项，正文平滑滚动到对应标题。跳转期间高亮跟随会被短暂挂起（`scrollend` 或 600ms 兜底恢复），避免平滑滚动掠过中间标题时高亮反复跳变、TOC 列表抖动。

### 2.3 滚动高亮

滚动正文时，TOC 自动高亮当前可见标题（`IntersectionObserver`，视口顶部 30% 带内算「当前在读的」）。高亮项超出 TOC 视区时自动跟随滚动入视。

### 2.4 切换 TOC 位置

修改 `markdownToc.sidebarPosition`（`left` / `right`）后预览自动刷新，边栏换到另一侧。配合 `markdownToc.sidebarWidth`（180–480 像素）可调整宽度。

---

## 三、标题边界用例

本节集中放置各种「标题识别」的边界场景。

### 3.1 代码块内的 # 行不是标题

下面这段代码块里有多行以 `#` 开头，它们**不应该**出现在 TOC 中——代码块内容不参与标题扫描。

```bash
# 这是一行注释，不是 H1
## 也不是 H2
### 更不是 H3
echo "## 这只是 shell 字符串"
```

```js
// # JS 注释里的井号也不会变成标题
function example() {
  return '# 纯文本';
}
```

### 3.2 行内代码与格式化标题 `code` *em* **strong**

标题里混入了行内代码（`` `code` ``）、斜体（`*em*`）、粗体（`**strong**`）。TOC 取标题的 `textContent`，因此显示为去标签后的纯文本；slug 由原生 slugifier 对文本处理后生成。

### 3.3 特殊字符与标点标题！@#%

标题含 `!@#%`、括号、`&` 等标点。slug 规则：转小写 → 去标点（保留字母/数字/CJK/空格/连字符）→ 空格与下划线转连字符 → 折叠重复连字符 → 去首尾连字符。例如 `Q&A Section` → `qa-section`，`Title (with parens)!` → `title-with-parens`。

### 3.4 带 Emoji 的标题 🚀✨

标题含 emoji（🚀 ✨）。emoji 是否进入 slug 取决于原生 slugifier 对非字母数字字符的处理；本插件不自行生成 id，行为与 GitHub 基本一致。

### 3.5 重复标题（slug 去重）

下面三个标题文本完全相同，`github-slugger` 会为重复项追加序号保证 id 唯一：`duplicate`、`duplicate-1`、`duplicate-2`。这是验证「id 唯一性 / 跳转目标正确」的关键用例——点击 TOC 中每一项都应跳到**对应的那一个**标题，而非全部跳到第一个。

#### 重复标题

第一节。

#### 重复标题

第二节。注意它与上一节标题文本完全相同，但 id 不同（`duplicate-1`）。

#### 重复标题

第三节，id 为 `duplicate-2`。

### 3.6 跨级嵌套（h3 直接到 h6）

本节是 H3，下一个标题直接跳到 H6，验证「跨级父子」：`markTree` 中 level 递增即为父子，不要求逐级。

###### 从 H3 直接跳到 H6

这个 H6 是上面 H3 的「子项」。再下面回到 H4，它既闭合了 H6，又成为 H3 的另一个子项。

#### 回到 H4

H4 正文。这验证了「跳级下降」后层级的正确恢复。

### 3.7 Setext 标题（下划线语法）

Setext 标题用 `===`（H1）或 `---`（H2）下划线表示。VSCode 原生预览会将其渲染为对应 `h1`/`h2`，因此它们同样会进入 TOC（受 `minDepth`/`maxDepth` 过滤）。

Setext H2 标题
--------------

这是 Setext 风格的 H2 正文。注意它上方需要留空行与正文分隔，否则 `---` 会被当作上一段的一部分。

---

## 四、大文档滚动测试

> 本节包含大量正文段落，目的是产生真实可滚动的高度，用来验证 `IntersectionObserver` 滚动高亮、高亮项跟随、以及点击跳转的平滑滚动。请在本节内上下滚动，观察 TOC 高亮是否随当前可见标题正确切换。

### 4.1 段落群组 A

Markdown Preview TOC 把目录边栏直接注入 VSCode 原生 Markdown 预览页面。它与正文并排显示，固定在左侧或右侧，不遮挡内容。点击 TOC 中的任意一项，正文会平滑滚动到对应标题位置；滚动正文时，TOC 自动高亮当前可见的标题。当高亮项滚出 TOC 视区时，TOC 列表会自动跟随滚动，把高亮项带回视野。

边栏可以整体折叠，折叠后浮出一个 `☰` 悬浮按钮，点击即可重新展开。边栏位置可配置为左侧或右侧，宽度可在 180–480 像素之间调节。打开预览时是否默认收起、是否在滚动时高亮、最小与最大层级、自动展开到第几层，都可通过设置项配置，修改后预览自动刷新生效。

TOC 的层级缩进按 `h1`–`h6` 自动处理，子项相对父项缩进。主题适配完全使用 VSCode 主题变量，因此在明亮、暗黑、高对比度主题下颜色都正确。窄屏时边栏自动浮动为抽屉，避免挤压正文。整个过程不修改你的 `.md` 源文件——TOC 完全在预览 DOM 内生成。

边栏支持三种视觉风格。`indented` 是默认的缩进式，按层级缩进并标注层级；`pill` 是药丸式，把每一项渲染为圆角药丸；`starlight` 是星轨式，左侧有一条随阅读进度点亮的轨道（类似 Starlight / Fumadocs 文档站的「当前读到哪」指示）。风格可通过工具栏循环切换，选择会持久化到 localStorage，下次打开依然生效。

子树折叠按相对深度自动展开到第 N 层（`autoExpandDepth`，默认 3）。所谓「相对深度」= `level - min(全部 level) + 1`，而不是相对第一个标题——这样当文档首个标题比后文更深（例如以 H3 开篇）时，相对深度依然正确。当点击的 TOC 项位于某个折叠子树内，其全部祖先会被自动展开，并且高亮跟随会聚焦到该项。

### 4.2 段落群组 B

下面继续填充正文以保证滚动高度。你可以把这一段当作「正文很长」的模拟：真实的长文档（如 API 参考、设计文档、教程）往往单节就有数千字。TOC 只观察标题节点，正文多长都不影响性能——`IntersectionObserver` 是浏览器原生 API，标题进入或离开观察带时才触发回调，滚动时不做任何重算。

点击跳转时，插件会短暂挂起「滚动高亮跟随」。原因：平滑滚动会依次掠过中间的若干标题，若不挂起，`IntersectionObserver` 会把掠过的每个标题逐个置为 active，导致 TOC 高亮来回跳变、列表上下抖动。挂起在 `scrollend` 事件触发时恢复，或 600ms 兜底恢复。这保证了「点了哪条就稳稳停在哪条」的跟手感。

高亮检测用的是 `IntersectionObserver` + `rootMargin: 0px 0px -70% 0px`——即视口底部 70% 不算「当前在读的」，只有当标题进入视口顶部 30% 带内时才算当前。这套阈值对绝大多数文档都合适；若你的文档标题间距很密或很稀，可参考 FAQ 调整 `rootMargin`（需要自定义 CSS）。

### 4.3 段落群组 C

星轨式（starlight）风格的轨道高亮与 active 检测是**解耦**的两套计算。active 检测只看视口顶部 30%，语义是「当前正在读哪一条标题」；轨道高亮看的是顶部 60% 的阅读带，语义是「阅读区正显示着哪些章节」。两者的区别在短文档上最明显：当整篇文档都在屏幕上时，active 只会是当前顶部那一条，而轨道会点亮整个阅读区覆盖的所有章节区间。

章节区间定义为：标题 i 的章节 = 从标题 i 到下一个标题 i+1 之间的全部内容。只要某标题的内容仍盖住阅读带（顶部 60%），该标题对应的轨道段就保持点亮；标题一旦滚出阅读带上方，对应段才熄灭。这种「逐段点亮」的视觉与 Starlight、Fumadocs 等现代文档站一致。

轨道计算在滚动时高频触发，因此做了 `requestAnimationFrame` 节流 + 签名去重：只有当点亮的章节集合真正变化时才触发重渲染，避免无谓的 React 更新。

### 4.4 段落群组 D

继续滚动，下面还有若干小节。每一节都带真实长度的正文，确保你从本节滚动到下一节时，TOC 的高亮能够平滑且正确地切换。请在滚动过程中留意：高亮项是否始终对应视口顶部 30% 带内的那个标题；当高亮项即将滚出 TOC 视区时，TOC 列表是否自动跟随把它带回视野。

边栏的 DOM 结构使用了 `#mdtoc-` 前缀的高特异性选择器，优先级高于用户自定义的 `markdown.styles`，因此一般不会与用户样式冲突。同时布局选择器都带兜底，即便未来 VSCode 调整原生预览的 DOM 结构，只要 `h1`–`h6` 仍带 `id`，TOC 就能继续工作。

### 4.5 段落群组 E（深嵌套验证）

本小节回到一个较深的嵌套，用来在「大文档」语境下再次验证深嵌套与折叠展开。

#### 4.5.1 第二层

##### 4.5.1.1 第三层

这是 H5 正文。配合 `autoExpandDepth`（默认 3），第 4 层及更深的父项在初次打开时应处于折叠状态。展开本节后，其子项可见。

###### 4.5.1.1.1 第四层

这是 H6。它在默认配置下仍可见（`maxDepth=6`），但作为第 4 相对深度的父项……不过 H6 不可能有子项（没有 H7），所以它本身不可折叠，只是作为最深层的叶子出现。

---

## 五、配置详解

### 5.1 启用与位置

- `markdownToc.enabled`（默认 `true`）：是否在预览中显示 TOC 边栏。设为 `false` 后 TOC 完全移除。
- `markdownToc.sidebarPosition`（默认 `"left"`）：边栏位置，`"left"` 或 `"right"`。
- `markdownToc.sidebarWidth`（默认 `260`）：边栏宽度，像素，范围 180–480。

### 5.2 层级与折叠

- `markdownToc.minDepth`（默认 `2`）：最小层级。默认 2 表示隐藏 H1——这就是本文件顶部那个 H1 不出现在 TOC 里的原因。改为 1 即可让 H1 进入顶层。
- `markdownToc.maxDepth`（默认 `6`）：最大层级。改为 3 则 H4–H6 全部从 TOC 消失。
- `markdownToc.defaultCollapsed`（默认 `false`）：打开预览时是否默认整体收起（只剩头部 + 浮出 `☰` 按钮）。
- `markdownToc.autoExpandDepth`（默认 `3`）：自动展开到第 N 层。0 = 只见顶层；1 = 顶层 + 直接子层；6 = 全展开。

### 5.3 高亮

- `markdownToc.highlightOnScroll`（默认 `true`）：滚动时高亮对应标题。关闭后仅点击跳转时高亮。

### 5.4 风格

- `markdownToc.style`（默认 `"indented"`）：视觉风格，`"indented"` / `"pill"` / `"starlight"`。

一个完整的配置示例：

```jsonc
{
  "markdownToc.enabled": true,
  "markdownToc.sidebarPosition": "right",
  "markdownToc.sidebarWidth": 300,
  "markdownToc.minDepth": 2,
  "markdownToc.maxDepth": 4,
  "markdownToc.defaultCollapsed": false,
  "markdownToc.autoExpandDepth": 2,
  "markdownToc.highlightOnScroll": true,
  "markdownToc.style": "starlight"
}
```

---

## 六、富文本混合

本节把表格、引用、嵌套列表、图片等真实富文本混在一起，验证它们不会干扰标题识别，同时让文档更接近真实长文。

### 6.1 表格

| 配置项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `enabled` | boolean | `true` | 是否显示边栏 |
| `sidebarWidth` | number | `260` | 边栏宽度（180–480） |
| `minDepth` | number | `2` | 最小层级 |
| `autoExpandDepth` | number | `3` | 自动展开到第 N 层 |

### 6.2 引用与嵌套列表

> 这是一段引用。
>
> > 这是嵌套引用。引用内的 `## 看似标题` 不会被识别为标题，因为引用块内的 `##` 需要特殊上下文。
>
> - 引用内的列表项一
> - 列表项二
>   - 嵌套列表项 2.1
>     - 更深的嵌套 2.1.1

普通嵌套列表：

1. 第一项
   1. 1.1 子项
      - 1.1.1 混合无序
2. 第二项
   - 2.1
   - 2.2

### 6.3 分隔线与段落

上面的多组内容之间用 `---` 分隔。分隔线不会出现在 TOC 中（它不是标题），但要注意 Setext 标题的 `---` 与分隔线的 `---` 的区分——前者紧跟在一段文本下一行、构成 H2；后者通常前后都有空行。

本节正文到这里就足够丰富了。你可以再次滚动回顶部，观察 TOC 的整体行为：高亮随滚动切换、点击跳转平滑、折叠展开跟随、风格切换生效。

---

## 七、FAQ

### 7.1 TOC 会修改我的 markdown 文件吗？

不会。TOC 完全在预览 DOM 里生成，源文件零改动。

### 7.2 点击后正文位置被遮挡？

CSS 已设 `scroll-margin-top`。若仍有遮挡（如你自定义了固定头），可在 `markdown.styles` 加 `h1,h2,h3,h4,h5,h6{scroll-margin-top:60px}`。

### 7.3 标题 id 与 GitHub 不一致？

原生预览用 `githubSlugifier`（移植自 github-slugger），与 GitHub 基本一致；CJK 标题直接保留字符。

### 7.4 与我的 `markdown.styles` 冲突？

优先级：内置样式 > 本插件 > 用户样式。本插件选择器用 `#mdtoc-` 前缀（高特异性），一般不冲突。

### 7.5 大文档会卡吗？

不会。TOC 生成是 O(n) 扫描，`IntersectionObserver` 只观察标题，滚动时不重算。本文件就是为此设计的验证样本。

---

## 八、以 H3 开篇的相对深度验证

### 这个 H3 是本节的第一个标题

注意：本节刻意**不以 H2 起头**——`## 八、…` 之下直接是本 H3。但更关键的验证在下一节：那里整节都以 H3 起头、全节没有 H2，用来测试 `initialCollapsedNodes` 用「全局最小 level」而非「第一个标题 level」计算相对深度。

---

## 九、首个标题比后文更深的用例

本节是 H2，但它的**第一个子标题直接是 H3**，并且本节之内不再有 H2 级别的子标题。配合上一节（也是以 H3 起），全局最小 level 的计算会被考验：若错误地用 `items[0].level`，当文档首个标题是 H3（如本文件若 `minDepth=3`）时会把相对深度算错一层。

### 九点一：H3 作为本节首项

正文。下面再接一个 H4，构成 H3→H4 的父子。

#### 九点一点一：H4

正文。这组结构在 `autoExpandDepth` 折叠下应当正确：H3 为顶层（相对深度 1，因 H2 也在场则相对深度按全局最小 H2 计算），H4 为第二层。

---

## 深度过滤验证（乱序标题）

下面的标题刻意**从深到浅**排列（H6 → H5 → H4），验证 TOC 仍按文档顺序自然展示、以及 `maxDepth` 的下界过滤。默认配置下它们都可见；把 `maxDepth` 调小可逐层裁掉它们。

###### H6 示例标题（验证 maxDepth 上界）

H6 正文。

##### H5 示例标题

H5 正文。

#### H4 示例标题

H4 正文。到此综合验证文档结束。如你在滚动本文件的过程中观察到 TOC 的高亮、跳转、折叠、展开、风格切换均符合预期，则说明 TOC 边栏在「大文档 + 复杂标题」真实场景下工作正常。
