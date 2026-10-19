// src/extension.ts
// 扩展宿主入口（Node 环境，可 import 'vscode'）。
// 职责：
//   1. activate：注册 onDidChangeConfiguration，配置变化时刷新预览。
//   2. extendMarkdownIt：把 markdownToc 配置序列化进 <meta id="mdtoc-config">，
//      供 preview/toc.js 读取。
//
// 注入方式（issue #6）：「parse 阶段塞标记 token + render 规则现生成 meta」，
// 两个环节都不能少，也别换成单点覆盖：
//   - 不要覆盖 md.render：VSCode 引擎直接调 md.renderer.render(tokens, opts, env)，
//     绕过 md.render(text)，该覆盖是死代码（这正是 issue #6 的根因）。
//   - 不要在 parse 阶段生成 meta 内容（如塞 html_block token 携带内容）：
//     VSCode 的 TokenCache 按 (uri, version, breaks, linkify) 缓存 parse 结果，
//     markdownToc.* 变更不命中任何失效条件，预览刷新会复用旧 token，改配置不生效。
//     token 只做占位（与配置无关），meta 在 render 期现生成——render 不走缓存。
//   - 也不要覆盖 md.renderer.render：共享同一 md 实例的第三方若调 md.renderInline
//     （其内部同样经 renderer.render），会被误注入 meta。
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
      // parse 阶段：往 token 流最前面塞一个占位 token（与配置值无关，被缓存也无所谓）。
      // 'normalize' 是 core 链首条规则，before 它即最早执行；block 解析后续 push，
      // 本 token 恒居首位。md.renderInline 也走 core 链（inlineMode=true），
      // 必须跳过，否则共享实例的第三方 inline 渲染被误注入 meta。
      md.core.ruler.before('normalize', 'mdtoc_config', (state: any) => {
        if (state.inlineMode) return;
        const token = new state.Token('mdtoc_config', '', 0);
        token.block = true;
        // 双保险：若 render 规则被第三方删掉，未知类型会走 renderToken 兜底，
        // hidden=true 让其返回空串，避免输出 <mdtoc_config> 伪标签。
        token.hidden = true;
        state.tokens.unshift(token);
      });
      // render 期：现生成 meta（render 不经 TokenCache），改配置 → preview 刷新即生效。
      md.renderer.rules.mdtoc_config = () => injectConfigMeta();
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
