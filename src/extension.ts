// src/extension.ts
// 扩展宿主入口（Node 环境，可 import 'vscode'）。
// 职责（M0 脚手架阶段）：
//   1. activate：注册 onDidChangeConfiguration，配置变化时刷新预览。
//   2. extendMarkdownIt：把 markdownToc 配置序列化进 <meta id="mdtoc-config">，
//      供 preview/toc.js 读取。
//
// 完整实现见 dev/260803/04-implementation.md §5。
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
      // M0 阶段：仅注入配置 meta，不做其它 markdown-it 改造。
      // 在最终 HTML 输出前加 <meta>，最简单可靠（见 04 §5.1）。
      const render = md.render.bind(md);
      md.render = (...args: any[]) => {
        const html = render(...args);
        return injectConfigMeta() + html;
      };
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
