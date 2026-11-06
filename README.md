# Mio 插件服务底座

独立 TypeScript 插件包，由官方 DeepSeek Harness Profile 启动。当前交付是工程护栏、HTTP 探针、受认证保护的能力查询与全部拒绝的工具策略；还没有 AI 漫剧业务和对话接口。

- [底座范围、边界与规则](docs/foundation.md)
- [AI 漫剧技术底座 PRD（待评审）](docs/prd-ai-drama-foundation.md)
- [HTTP API](docs/api.md)
- [验收标准与入口](docs/acceptance.md)
- [任务交付索引](docs/tasks/index.md)
- [开发入口](AGENTS.md)
- [团队任务协调](docs/coordination.md)

## 安装与检查

使用 Node 24.22.2（DSH 最低要求 24.9）及 pnpm 11.6.0。版本固定在 package.json 和锁文件；公共安装、构建和 CI 不需要相邻源码仓库、全局 Skills 或成员的个人记录。

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
```

`check` 执行格式、类型、lint、文档/结构/索引护栏、测试、构建和官方 Profile 产物 smoke。安装不执行依赖构建脚本；当前最小 Profile 不使用需要额外原生构建的运行能力。

## 本地运行

```sh
pnpm build
pnpm profile:prepare
export MIO_API_TOKEN="$(node -p 'require("node:crypto").randomBytes(32).toString("hex")')"
pnpm start
```

在同一受信任终端验证：

```sh
curl http://127.0.0.1:4310/readyz
curl -H "Authorization: Bearer $MIO_API_TOKEN" http://127.0.0.1:4310/api/v1/capabilities
```

准备命令创建本项目专用的 `.runtime/dsh/profiles/mio` 并链接当前插件用于本地开发；保留已有 Profile 配置。修改源码后重新构建并重启。`pnpm test:smoke` 则用打包产物、独立临时配置与官方 DSH 启动路径验证，结束后清理自己的进程与临时目录。

配置：`MIO_HOST` 默认 `127.0.0.1`，`MIO_PORT` 默认 `4310`，`MIO_ALLOWED_ORIGINS` 默认 `[]`。DSH 当前不接受 `0.0.0.0` 通配绑定；远程部署使用明确的接口地址和已配置的 TLS 终止/反向代理。当前没有公网部署验收。

按 Ctrl+C 关闭，启动命令负责把终止信号交给 DSH 并等候退出。配置不完整时先修复，不以端口可连通判断就绪。

## 日常维护

使用能读取仓库指令、编辑文件和运行命令的 Agent 时，成员只需说“按这份 PRD 推进”或“继续当前任务”。Agent 从 [开始任务](docs/coordination.md#开始任务) 取得拆解方法和 C0/C1 定义，再按动作建档、执行、验证与续接；成员无需指定 Skills、填写 ID 或编辑 JSON。协议与 CLI 随仓库提供；没有正在执行的 Agent 就不会自行推进。

开发脚本按职责分为 `scripts/harness/`（工程护栏与任务协调）和 `scripts/service/`（Profile、启动、产物 smoke）。目录归属与开发模块依赖均由 `harness.config.json` 声明；`pnpm check` 组合公共检查与服务装载验证，生产代码保持独立。

一般修改执行相关测试与检查，交付前运行 `pnpm check`。业务工具/权限变化必须测试真实执行链；接口变化更新同一份 API 契约。新增源文件自动继承所属模块规则，新模块需要在护栏配置中说明允许依赖。体量报告是审阅信号，不是自动拆分指令。

源码任务自动登记 `quality-review`，Agent 在 verify 阶段实际审阅算法成本、未使用公共函数/方法和未复用的已有实现，再记录当前候选原件。交付缺少匹配审查不能通过；普通检查不会自行调用模型。判据与执行边界见 [验证协议](docs/coordination.md#验证与接受)。

公共协议、需求、源码、测试和检查配置入库；每人的 `.work/` 内容、运行资料 `.runtime/`、凭证 `.env*`、依赖与构建产物忽略。本地开发遵守统一记录协议；公共检查不要求任何成员的私人记录存在。忽略规则不提供备份或清除已跟踪内容，跨人交接需要单独提供代码与必要证据。

升级 DSH 时修改固定版本、审阅公开接口与 Profile 组成差异，再运行完整检查和产物装载。远端 CI/分支保护须在实际接入后单独验证。
