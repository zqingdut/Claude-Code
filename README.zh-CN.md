# Claude Code 源码快照

语言： [English](./README.md) | **简体中文**

这个仓库是一个大型 TypeScript/Bun CLI 应用的源码快照。当前可见代码表明，它围绕交互式 REPL/TUI、工具调用、slash commands、后台任务、agent 工作流、MCP 集成以及多个按 feature gate 控制的运行模式构建。

> 状态说明：当前工作区快照里没有根级 `package.json`、lockfile，也没有顶层测试或 lint 配置。下面的文档只记录能从当前源码中直接验证的信息，不补充未确认的构建命令。

## 这个项目是什么

从现有源码可以确认，这个项目是一个具备以下能力的 CLI 应用源码：

- 基于 Ink/React 风格组件的交互式终端 UI
- 支持多步工具调用的 assistant turn 执行
- slash commands 与基于 skill 的命令扩展
- shell、本地 agent、远程 agent 等后台任务执行
- MCP 集成与资源/工具加载
- 插件系统与 bundled skills
- worktree、bridge/remote-control、daemon、background sessions 等流程

## 已验证的运行前提

以下前提可以直接从源码确认：

- **要求 Node.js 18+**（`setup.ts` 会在版本过低时退出）
- **大量使用 Bun 感知的构建/运行路径**（全仓库广泛使用 `bun:bundle` feature gates）

由于当前快照缺少根级 manifest / config 文件，这里**不把任何项目级 build、lint、test 命令写成已验证命令**。

## 入口与启动流程

启动链路主要分为三个文件：

- `entrypoints/cli.tsx`
  - 启动引导入口
  - 处理 `--version`、bridge/remote-control、daemon、background session、worktree/tmux 等 fast path
  - 只有在没有匹配 fast path 时才加载完整 CLI
- `main.tsx`
  - CLI 主组合入口
  - 初始化 config、telemetry、permissions、plugins、skills、MCP 状态、session 状态、migrations，以及交互/非交互执行路径
  - 负责把命令加载、渲染、会话恢复和运行时状态连接起来
- `setup.ts`
  - 每个 session 的 setup 层
  - 校验运行前提、设置 cwd/project root、初始化 hooks/watchers、处理 worktree、启动后台服务，并对 bypass 权限模式做安全约束

## 核心架构

### 1. Query 与 assistant 执行

- `query.ts`
  - assistant 单轮执行的核心循环
  - 负责消息规范化、token budget、compact/recovery、工具执行编排，以及多步 turn continuation
- `context.ts`
  - 构建注入到每轮对话中的缓存 system/user context
  - 会把 git 快照信息以及发现到的 `CLAUDE.md` / memory 内容注入上下文
- `Tool.ts`
  - 定义工具协议与 `ToolUseContext`
  - 是工具运行时共享上下文的核心类型定义

### 2. Commands

- `commands.ts`
  - 内建命令的中心注册表
  - 会把 built-in commands、bundled skills、skill 目录命令以及插件命令合并起来
- `commands/`
  - 用户命令和内部命令实现目录
  - 包含 auth、config、review、plan、resume、MCP、plugin、tasks、session、terminal workflow 等功能区

命令注册表显示，这个 CLI 暴露了很大的 slash command 面，包括 `help`、`config`、`mcp`、`plugin`、`resume`、`review`、`tasks`、`status`、`vim`、`plan`、`permissions` 等多个领域。

### 3. Tools

- `tools.ts`
  - 当前环境下工具可用性的事实来源
  - 负责组装核心工具、feature-gated 工具、计划/任务工具、MCP/resource 工具和平台相关工具
- `tools/`
  - 每个工具一个实现目录

主要工具类别包括：

- 文件与搜索工具
- shell 执行工具
- Agent、Skill、plan/worktree/task 等编排工具
- Web 与 MCP/resource 工具

工具可用性是动态的，会受到 feature gates、运行环境、permission mode 以及 MCP / task 状态影响。

### 4. 后台任务

- `tasks.ts`
  - task type 注册表
- `tasks/`
  - 本地 shell、本地 agent、远程 agent 及其他任务类型实现

后台执行是这个代码库的一等运行时概念，不应假设所有工作都只在主 REPL turn 中同步完成。

### 5. 交互式 UI

- `main.tsx`、`interactiveHelpers.tsx`、`replLauncher.tsx`
  - 负责交互启动与 REPL 生命周期
- `components/`、`screens/`、`hooks/`、`ink/`
  - 终端 UI 基础组件、全屏流程、UI/session hooks，以及底层 Ink 终端封装

`main.tsx` 是一个很大的集成枢纽。调试行为时，通常更适合从具体功能出发，沿 imports 反向追踪，而不是线性通读整文件。

### 6. Skills、插件与扩展

- `skills/`
  - 负责动态 skills 加载和 bundled skills 注册
- `plugins/` 与 `services/plugins/`
  - 负责插件发现、安装、缓存、CLI 集成与热更新

Skill 和 plugin 是相关但不同的两套扩展系统。想看它们如何进入运行时，可优先阅读 `commands.ts` 与 `tools.ts`。

### 7. MCP、remote 与 bridge 流程

- `services/mcp/`、`commands/mcp/`、`entrypoints/mcp.ts`
  - MCP 配置、client、命令/资源加载及相关命令入口
- `bridge/`、`remote/`、`server/`
  - remote-control、transport/session 基础设施，以及 direct-connect / remote execution 相关流程

`entrypoints/cli.tsx` 中包含多个基于 argv 的 specialized fast path，因此 CLI 的启动行为会随着调用方式发生明显变化。

## 仓库结构速览

这个快照按子系统组织，而不是放在单一的 `src/` 目录下。主要顶层区域包括：

- `commands/` — slash 与本地命令实现
- `tools/` — 工具实现及工具专属 UI / helper
- `tasks/` — 后台任务实现
- `components/`、`screens/`、`hooks/`、`ink/` — 终端 UI
- `skills/` — bundled 与动态 skill 加载
- `plugins/`、`services/plugins/` — 插件系统
- `services/` — 更大的运行时服务（analytics、MCP、API、policy 等）
- `bridge/`、`remote/`、`server/` — remote-control 与 session 基础设施
- `bootstrap/`、`state/`、`context/` — 共享运行时/session 状态与 prompt context
- `migrations/` — 启动与设置迁移

## 如何在这个快照里定位代码

如果你要理解或修改行为，建议从拥有该行为的层开始：

- 启动 / argv 分发：`entrypoints/cli.tsx`、`main.tsx`、`setup.ts`
- 命令行为：`commands.ts` 与 `commands/` 中对应文件
- 工具行为：`tools.ts`、`Tool.ts` 与 `tools/` 中对应文件
- assistant 单轮执行：`query.ts`
- prompt / context 注入：`context.ts`
- 后台执行：`tasks.ts` 与 `tasks/`
- 终端 UI 流程：`components/`、`screens/`、`interactiveHelpers.tsx`
- MCP / remote 流程：`services/mcp/`、`bridge/`、`remote/`、`server/`

## 仓库内文档

- English: `README.md`
- 简体中文：`README.zh-CN.md`
- Claude Code 仓库指导：`CLAUDE.md`
