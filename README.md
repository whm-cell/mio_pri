# Mio 插件服务底座

独立 TypeScript 插件包，由官方 DeepSeek Harness Profile 启动。当前交付是工程护栏、HTTP 探针、受认证保护的能力查询与全部拒绝的工具策略；还没有 AI 漫剧业务和对话接口。

- [底座范围、边界与规则](docs/foundation.md)
- [HTTP API](docs/api.md)
- [本阶段验收记录](docs/acceptance.md)
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

每位成员开始开发时执行 `pnpm work init <member>`，再按 [协调协议](docs/coordination.md) 创建或恢复自己的任务。`pnpm work help` 列出仓库内的记录、核对、验证和交接命令；详细示例见 [记录和命令](docs/work-records.md)。这些命令只在显式执行时运行，开发者或当前 Agent 承担任务推进。

一般修改执行相关测试与检查，交付前运行 `pnpm check`。业务工具/权限变化必须测试真实执行链；接口变化更新同一份 API 契约。新增源文件自动继承所属模块规则，新模块需要在护栏配置中说明允许依赖。体量报告是审阅信号，不是自动拆分指令。

公共协议、需求、源码、测试和检查配置入库；每人的 `.work/` 内容、运行资料 `.runtime/`、凭证 `.env*`、依赖与构建产物忽略。本地开发遵守统一记录协议；公共检查不要求任何成员的私人记录存在。忽略规则不提供备份或清除已跟踪内容，跨人交接需要单独提供代码与必要证据。

升级 DSH 时修改固定版本、审阅公开接口与 Profile 组成差异，再运行完整检查和产物装载。远端 CI/分支保护须在实际接入后单独验证。
