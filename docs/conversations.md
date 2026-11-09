# 本地对话服务

本期实现只接收测试账号和测试内容，尚未接受，也没有真实模型或生产部署验收。真实用户内容的保留/删除、上线容量、供应商及费用另定；没有删除接口不代表无限保留授权。需求与接受条件见[对话 PRD](tasks/conversation-service/prd.md)，公开协议见[对话 HTTP](apis/conversations.md)。

## 配置与迁移

认证沿[认证底座](auth.md)，元数据使用独立池和显式的 `MIO_CONVERSATIONS_DATABASE_URL`，可指向同一专用 PostgreSQL/schema，但不借用认证内部池、表或登录会话 ID。原生内容沿 [DSH 契约](integrations/dsh.md)保存在独立 `DSH_HOME`。两处数据须成对保留和恢复。

| 配置                              | 行为                                                                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `MIO_CONVERSATIONS_DATABASE_URL`  | 显式 PostgreSQL URL；未设置时保留无对话数据库的 foundation 路径；设置时必须有完整认证与 DSH 内核                     |
| `MIO_MODEL_PROVIDER`、`MIO_MODEL` | 服务端一个固定路由，必须同时设置；不接受客户端模型或密钥。正式 Profile 可按 `deepseek-official` 装配固定版官方适配器 |
| `MIO_MODEL_API_KEY`               | 仅 DeepSeek 官方适配器从启动环境读取；启用其路由必须设置，不写入公共文件或响应                                       |

provider/model 均未设置时，可创建/查询测试对话，发送返回 `503 MODEL_UNAVAILABLE` 且不新增接收记录。未注册 provider 同样拒绝新输入；已注册 provider 下不支持的 model 由官方驱动在受理后校验，结算为 failed/MODEL_FAILED，不能把非空配置当作供应商可用证明。已有请求 ID 仍可查询/去重。启用真实路由是操作者行为，真实调用须先明确配置及预算授权；目前没有配置或费用授权。官方适配每请求输出上限为 1024 tokens、stream idle timeout 为 30 秒；取消是协作式，不承诺费用回滚或供应商立即停止。服务未提供计费总预算或生产容量保证。

```sh
pnpm conversations:migrate
pnpm conversations:migrate --apply
pnpm build
pnpm start
```

第一条只展示 SQL，第二条才建表/索引；普通启动只读检查列，不自动建表。先停止旧实例、审阅计划并按目标库责任备份，再显式迁移；本期迁移没有破坏性改名/删除或自动回滚。共享数据库约束沿 [PostgreSQL](integrations/postgres.md)。

## 归属、接收与持久化

应用服务接收认证解析的 `{userId,sessionId}`，每次经 owner 条件查对话。客户端不能自授 owner、DSH ID 或工具权限。conversationId、登录 sessionId 和内部 dshSessionId 各有职责，不混用。

PostgreSQL 保存归属、创建状态、request ID、输入 SHA-256 摘要与接收/结算状态，不保存第二份消息正文；正文以 DSH 原生日志为权威。先保存 creating 映射，再创建并 flush 原生 Session，最后标 ready；失败映射保持 unknown，可从所属用户列表定位，不伪报已持久创建。

同对话只接受一个活动请求。事务锁住归属行，先查原 request ID：同内容返回原回执，异内容冲突；不同 ID 遇忙拒绝。本地 request ID 随会话元数据保留。进程内仅保存同一用户在途接收 Promise，避免接收 ACK 不确定时误伤另一条已启动执行；持久去重仍由 PostgreSQL 唯一键负责。

回执层级为 accepted（仅 PG 已受理）、input-persisted（DSH 输入/inbox 屏障和 PG 状态已成功）、completed/cancelled/failed（检查真实 DSH 终态并 flush 后完成 PG 更新）。unknown 表示无法证明完整结算，错误码只含服务定义值。接收 COMMIT/ACK 不确定时，按原用户/对话/请求/内容摘要锁行核对，只将本进程未启动的待执行记录改 unknown 并释放 busy；不重发模型。结算 ACK 丢失时先读原回执，保留已提交的终态。无法完成对账时停止该实例后续操作，查询返回脱敏 503，操作者须停止并重启原实例核对，不能换 ID 重发未知输入。

取消绑定本次 active request ID；包括 PG 已受理但 adapter 尚未登记的窗口。取消回执只是 requested，实际 cancelled/其他结算通过原请求查询；延迟取消不能取消下一条请求。

## 实例与生命周期

每个本地 metadata schema 和 DSH_HOME 只运行一个实例。服务持有专用 PG advisory lock 连接，先取得锁再把旧 accepted/input-persisted 记录改 unknown、清理 busy；第二实例拒绝启动。持锁连接丢失后拒绝新操作，不自动重新取得锁、重放输入或恢复收费调用。操作者仍须确认旧进程和原生 writer 已停，再启动新实例；PG 租约不构成跨存储 fencing 或分布式部署协议。

普通元数据池最多 5 个连接，其中一个持有租约；连接、SQL 和查询等待上限各 5 秒。关闭先停止入口与流，等待已进入接收/创建的操作，取消并收敛全部 Agent/原生写入，再加入所有回执更新，最后关闭 PG 池。一个 Agent 打开失败不能跳过其他所有者清理；关闭失败保留错误。硬中断后保留已持久前缀，未结算 chunk 可能不存在；离线历史显示 interrupted，不自动续跑。

断网只释放订阅，已受理轮次继续。登录过期/撤销后新操作拒绝；SSE 每秒重新验证同一登录会话，失败时发送脱敏错误并关闭，已受理轮次可完成。服务端固定路由改动在下一次恢复的 setup 中通过公开 model.select 生效，保留原上下文；不暗中继续用旧路由。

## 验证及限制

`tests/conversations.test.ts` 经真实认证、PG、官方 loop、JSONL 和 HTTP/SSE 验证归属、多轮、忙时/去重、故障回执、订阅窗口、失效登录及断网；`tests/conversations-engine.test.ts` 验证多所有者异常关闭和无文本取消；`tests/conversations-profile.test.ts` 验证打包后的正式 Profile、多轮、正常重启及 SIGKILL。测试模型只安装在临时 Profile overlay，另有完全不含该 overlay 的正式装配验证，生产包不含测试夹具。

精确历史底层仍按单会话完整日志读取，公开分页不等于低成本存储查询。列表按 owner/id 索引有界返回，回执查询按复合主键；本地测试不推导生产吞吐、任意崩溃零丢失或真实供应商行为。完整检查、独立审查和真实接受分别判定；真实模型多轮/流式/取消保持待配置后验收。
