// src/extension.ts
// 扩展宿主入口（Node 环境，可 import 'vscode'）。
// 职责：
//   1. activate：注册 onDidChangeConfiguration，配置变化时刷新预览。
//   2. extendMarkdownIt：把 markdownToc 配置序列化进 <meta id="mdtoc-config">，
//      供 preview/toc.js 读取。
//
// 注入点选 markdown-it 的 core.ruler（parse 阶段），不要覆盖 md.render ——
// VSCode 的 markdown 引擎直接调 md.renderer.render(tokens, opts, env)，绕过
// md.render(text)，覆盖 md.render 等于死代码（issue #6 根因）。
import * as vscode from 'vscode';

/** 与 preview/toc.ts 的 MdtocConfig 保持一致。 */
interface MdtocConfig {
  enabled: boolean;
  width: number;
  position: 'left' | 'right';
  defaultCollapsed: boolean;
  minDepth: number;
  maxDepth: number;
  highlightOnScroll: boolean;
  autoExpandDepth: number;
  style: 'indented' | 'pill' | 'starlight';
}

export function activate(context: vscode.ExtensionContext) {
  // 配置变化时刷新预览（meta 在渲染期写入，必须刷新才能再生效）。
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('markdownToc')) {
        vscode.commands.executeCommand('markdown.preview.refresh');
      }
    })
  );

  return {
    extendMarkdownIt(md: any) {
      // core.ruler 在 parse 阶段往 token 流最前面塞一个 html_block token，
      // markdown-it 默认 html_block 渲染规则原样输出 token.content（renderer.js
      // 的 default_rules.html_block）。对 md.render 与 VSCode 的 md.renderer.render
      // 两条路径都生效 —— 旧的「覆盖 md.render」只对前者生效，导致 meta 永不注入
      // 预览 DOM（issue #6）。
      md.core.ruler.before('normalize', 'mdtoc_config', (state: any) => {
        const token = new state.Token('html_block', '', 0);
        token.content = injectConfigMeta();
        token.hidden = true; // 不进入 AST 语义层，仅作 HTML 注入
        state.tokens.unshift(token);
      });
      return md;
    },
  };
}

/** 读取用户配置并序列化为 <meta>，供预览脚本 readConfig() 解析。 */
function injectConfigMeta(): string {
  const cfg = vscode.workspace.getConfiguration('markdownToc');
  const data: MdtocConfig = {
    enabled:           cfg.get('enabled', true),
    width:             cfg.get('sidebarWidth', 260),
    position:          cfg.get('sidebarPosition', 'left'),
    defaultCollapsed:  cfg.get('defaultCollapsed', false),
    minDepth:          cfg.get('minDepth', 2),
    maxDepth:          cfg.get('maxDepth', 6),
    highlightOnScroll: cfg.get('highlightOnScroll', true),
    autoExpandDepth:   cfg.get('autoExpandDepth', 3),
    style:             cfg.get('style', 'indented'),
  };
  return `<meta id="mdtoc-config" data-config="${escapeAttr(JSON.stringify(data))}">`;
}

/** 转义 HTML 属性值（用于 data-config="..."）。 */
function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

export function deactivate() {}
