# DSH 对话内核接入

## 适用范围与接入事实

Mio 固定采用 `0.2.2-rc.1` 的官方公开 Agent、Agent Loop、LLM、Session、Session Projection、JSONL Persistence、Session Query 冷读接口，以及既有 System Prompt、Tools 和 Native Executor。[内核入口](../../src/dsh/kernel.ts)只管理公开 AgentHandle 和生命周期；模型请求、inbox、上下文与结算仍由官方 loop 负责。

[正式 Profile](../../cordis.patch.yml)逐项装配必要服务，不加载 SDK/Web 默认 Bundle、Shell、文件工具、MCP、自动重试或模拟模型。默认没有模型供应商；显式选择 deepseek-official 才加载固定版官方 API-key 适配。配置及当前路由选择见[本地对话服务](../conversations.md)，没有真实配置/授权不能执行真实模型验收。无对话数据库仍保留原 foundation 路径；能力查询的 sessions 只反映是否装载对话入口。

接入只用发布包，不依赖本机相邻源码。上游公开接口核对基线为提交 `66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`；升级时重新核对本文时序。

## 必须遵守的约束

- 框架依赖限于插件入口和有界 `src/dsh/`；普通业务模块不得导入框架包或反向依赖插件。分类、类型检查与构建见[源码护栏](../engineering/source-guardrails.md)。
- 原生持久根是独立 `DSH_HOME` 的 `sessions`；不得借用账号登录 Session、认证表、`.work`、其他运行实例或共享业务数据。
- create/resume 的 setup 在 Agent 发布前设置作用域全部拒绝工具的守卫；内核和基础服务也持有同一策略。后注册 allow 不得覆盖拒绝。测试模型、计数工具只在 `tests/`，不得进入生产包或 Profile。
- 普通输入使用 followup，steer 不自动成为公共入口。Handle 持有者负责释放，完成释放后可在同一内核恢复，释放中重开明确拒绝；DSH ID 不等于登录会话 ID，使用者须先完成可信身份与资源归属检查。
- assistant-stream chunk 是瞬态展示；assistant/message 或 assistant/attempt 是结算记录，也仍不等于已落盘。whenIdle 只证明排空，需检查真实 turn/end.reason 才判断 completed、aborted、error 或 interrupted。
- sessions.flush 必须等待成功且返回 true；无 listener 或失败不能发布持久成功。PostgreSQL 和原生日志不是原子事务。
- 正常显式关闭先停新入口，再 mioKernel.close：cancel、whenIdle、flush、Handle.dispose。根卸载 fallback 只加入公开 Handle.dispose，其内置写句柄关闭负责排空；required injection 保留驱动和持久化服务到消费者清理后，不在 detach 后再次 flush。
- resume 的 setup 清空恢复的 next-step/next-turn inbox 并 flush，再允许新输入，防止旧未知请求在未来 followup 时执行。恢复及读取不是重新调用付费模型的授权。

## 历史、恢复与错误

mioKernel.history 是可信内部读取，不是公共 DTO。活动 Session 先 flush，再通过公开持久化 read handle 读取真实前缀，finally 关闭句柄，不补终态。离线日志用公开 readColdSessionLog 并经官方 Session 重放验证；只在内存补 interrupted，不改原件。synthetic seq 不得作为活动流的持久水位。

原生日志可恢复未完成的最后一行；完整格式/结构损坏拒绝读取，不变成空历史。强杀可能只留下用户输入和运行边界，没有未结算 chunk。可恢复前缀不代表任意崩溃零丢失；未知请求不自动重发，不承诺撤销已发生动作。

精确读取会读、验证完整单会话日志，I/O、时间与内存随内容量增长；公开分页只限制返回体。本地开发不据此承诺上线容量，尚无证据支持 FTS、缓存或第二份消息库。外部必须白名单投影文本、状态与脱敏错误，不能透传系统提示、推理、工具参数/结果、路径或 trace。

## 验证入口与变更影响

`tests/kernel.test.ts` 经测试模型 → 官方 loop → Session → 隔离真实 JSONL，观察实际第二轮入模上下文、flush、恢复、取消、根关闭、SIGKILL、损坏尾部和工具拒绝。`tests/plugin.test.ts` 保留无守卫原生执行正控制及 HTTP/卸载回归。`pnpm test:smoke` 使用打包产物和官方 Profile，内核就绪是基础路由注册的依赖；测试模型和工具不打包。`pnpm check` 同时验证适配目录及临近非法目录、类型/别名导入反例。

调整版本、装配、scope、持久根、flush/关闭顺序或恢复策略时，重验受影响路径和打包。模拟模型、真实存储、正式 Profile、真实供应商、公共 API、生产及远端门禁分别报告；内核验证不等于公共对话服务已接受。
