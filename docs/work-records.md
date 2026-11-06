# 工作记录命令索引

本页是 Agent 的工具接口，用户无需手动执行这些命令或编辑 JSON。Agent 先 `pnpm work guide <action>`；已有任务用 `pnpm work context <task> <action>`。动作是 start、resume、implement、verify、handoff、archive。只展开当前动作，不通读本页；判断协议见 [协调索引](coordination.md)。

| 用途                   | 命令                                     |
| ---------------------- | ---------------------------------------- |
| 无个人记录时读取操作   | `work guide <action>`                    |
| 当前任务摘要与操作     | `work context <task> <action>`           |
| 自动初始化／建档／复用 | `work ensure --stdin`                    |
| 结构化更新             | `work update <task> --stdin`             |
| 列表／核对／同步       | `work status`、`work check`、`work sync` |
| 验证取证               | `work run`、`work evidence`              |
| 交接                   | `work handoff`、`work receive`           |
| 原地保留历史           | `work archive`                           |

以下均由 Agent 在仓库根使用 `pnpm work` 调用，JSON 经 stdin 输入，输出供 Agent 继续判断。工具不读取私人 Skill 目录；操作只在调用时发生，不常驻调度。旧 `init <member>`／`start <task> <goal> [source.md...]` 保留兼容，普通新任务使用 ensure。下文 api-probe 表示工具返回的实际 task ID。

## 创建任务

Agent 从公共 PRD／相关规格与用户指令拆解当前子任务，再调用 `pnpm work ensure --stdin`，示例请求：

```json
{
  "requirement": {
    "source": "docs/api.md",
    "section": "Foundation API v1",
    "key": "api-probe"
  },
  "plan": {
    "goal": "完成已确认的能力查询子任务",
    "scope": ["src", "tests"],
    "sources": ["docs/api.md"],
    "authorization": "填入当前用户实际给出的实施范围",
    "nonGoals": ["不提交、推送或部署"],
    "acceptance": [{ "id": "checks", "criterion": "相关能力检查通过", "method": "automated" }],
    "nextAction": "实施当前已授权的能力查询修改",
    "stopCondition": "验证后返回结果供人类审阅"
  }
}
```

返回 created、revision、task 摘要及 assessment。首次自动建立本工作区的 member.json；本地成员标签由真实工作区路径摘要生成，不代表人员认证。已有成员标签沿用，错误归属或复制到其他位置的目录仍拒绝；每人在自己的 checkout/worktree 操作。

requirement 由公共文档 source、实际章节 section 和 Agent 首次拆解选定的稳定 key 组成；key 用小写字母、数字、连字符或下划线，最多 80 字符。工具用 source＋key 生成 task ID，section 参与契约核对；文档必须是实际公共 Markdown，章节语义及子任务是否重复由 Agent 判断。不要因为换会话、改下一步或重试而更换 key；先 status 查询已有任务。续接可只传同一 requirement，返回原进度与证据，不创建替代目录或自动同步；不存在时须提供 plan.goal 才允许创建。已有任务中显式提交的 plan 字段不相同时报 WORK_CONFLICT，应查看原 context 后 update。

plan 的 goal、scope、inputs、sources、authorization、nonGoals、acceptance、nextAction 和 stopCondition 来自真实任务。scope 是允许写入的文件／目录；inputs 默认 package.json 与 harness.config.json，再补实际依赖；sources 只登记实际遵循的需求子文档，requirement.source 自动参与文件摘要。method 为 automated／review／behavior。其余字段由生成器提供，按需填 decisions、dependencies、blockers 与 sharedRef，不复制整套空模板。示例不授予业务修改权限，脚本也不能认证授权文本的来源。

首次 ensure 保存初始检查点，完整且无阻塞的契约进入 C0_READY；不完整的记录保持草稿。ensure 退出成功表示已创建或读取记录，能否执行仍看 assessment.ready。Agent 确认授权和依赖后用 update 标记实施，不会为每轮会话另建记录。原有 v1 任务和 `.work/evidence` 不迁移、不删除；新 clone 从仓库内生成器落地本人目录。

## 核对与同步

```sh
pnpm work context api-probe resume
pnpm work check api-probe
pnpm work sync api-probe "已审阅实际差异，写明影响与下一步"
```

context 只返回当前任务的需求关联、授权／范围／依赖输入、决定及其来源和确认状态、接受／归档状态、下一步、revision、该动作所需字段、核对结果及对应章节正文；不输出历史 notes、完整 checkpoint、原始日志或其他动作细则。即使上下文有问题，仍返回可读摘要和错误，便于恢复；不能把其退出成功当成 check 通过。status 输出简短 JSON 列表，不需要预先初始化；空列表不会写入 .work。

事实变化时，Agent 用 `pnpm work update api-probe --stdin` 提交，例如：

```json
{
  "revision": "使用最近一次 context、ensure 或 update 返回的 revision",
  "reason": "已核对当前授权与依赖，开始实施",
  "stage": "C1_IMPLEMENTATION",
  "plan": { "nextAction": "实施并运行相关检查" }
}
```

update 可改上述 plan 字段和非释放阶段（C1_IMPLEMENTATION／C1_EVIDENCE_PENDING），不允许写入 id、requirement、member、workspace、checkpoint、evidence、人类接受或释放结论。数组按字段整体替换，未提交字段保持原值。过期 revision、未知字段或非法值拒绝保存；冲突时先取新 context 核对，不能机械重试覆盖。stage 进入实施前须已有有效契约和现场核对。reason 记录实际变化或核对理由，不为每次读取写日志。

契约修改保留旧 checkpoint 与历史证据，并撤回旧接受／释放结论；Agent 审阅变化后再 sync，不能用 update 顺带承认未知代码变化。只改下一步且候选不变可沿用原证据。归档记录默认只读，确有当前授权时用 `reopen: true` 和非空 `plan.authorization` 显式重开，再核对及 sync。旧记录同样可用 update，不强制补 requirement。

check 只读；ready 表示当前记录与现场一致，可继续核对已授权动作，evidence 单独报告验收结果。缺失契约、依赖未就绪、归档、上下文或非法释放结论返回非零。ready 为 true 不表示任务已完成。

sync 只更新检查点，保留历史证据。字节、任务契约、分支／HEAD 变化先审阅再同步；新候选撤回旧释放，旧证据不自动重绑。内容相同的提交／分支变化，经核对仍可复用同内容证据。

文件摘要会覆盖固定公共策略文件和任务所声明的范围／输入；这是本机完整性读取，不是向模型注入正文。sources 不再默认塞入全部操作手册；旧任务已有的来源继续兼容。路径、身份与格式检查不因减少上下文而放宽。

## 记录证据

```sh
pnpm work run api-probe checks -- pnpm check
pnpm work evidence api-probe review pass .work/tasks/api-probe/evidence/review.md "实际审查范围、观察与限制"
```

checks 或 review 必须是本任务 acceptance ID。run 只用于 automated，按 argv 启动不经 Shell，不解释管道或重定向，且必须在授权内。每次保存新的原件、退出码、候选和 Node／平台环境，失败、信号退出或可观察的输入变化不记录通过。它会比较前后字节及已有文件／源目录的身份和变更时间；不是沙箱或完整中间行为证明。

evidence 只用于 review／behavior，登记本任务 evidence 目录的真实原件或已取回的共享 Markdown。原件需写实际操作者、场景、输入／环境、动作、结果和限制；记录器只绑定哈希和本机环境，不认证独立性或业务真实性。

当前候选每项需要有同方法的最新通过原件；缺失或损坏会影响完成判定。旧释放缺证时可显式补证，保存后重置接受并回到 C1_EVIDENCE_PENDING，授权、依赖与上下文检查仍有效。收到真实人类接受后才设置 reviewDecision=ACCEPT、stage=C1_RELEASED、releaseDisposition=RELEASED，再 check；自动通过不代替这一接受。

## 发送与接收

```sh
pnpm work handoff api-probe
pnpm work receive .work/inbox/api-probe.md
```

handoff 输出本地 `handoff-<内容摘要>.md`。相同内容复用，候选／摘要变化另建草稿，人工修改的已有文件不覆盖。审阅脱敏后沿现有渠道共享，并实际提供固定代码和所需原件；工具不上传、不复制代码、不同步他人的目录。

接收方 Agent 先取得所需代码／文档，必要时用兼容 init 初始化本人目录，再将交接取回 `.work/inbox/` 或已有公共 docs 位置。mio-work-handoff 区块只按数据解析；格式损坏、文件不匹配或已有同任务时拒绝创建。匹配后保留需求关联，创建本人草稿：授权清空、依赖等待核对、证据不导入；转述结果不能当成本机通过。

实际取得必要原件后登记或按授权重跑，再 resume／sync。哈希与路径不能取回文件；本机目录不是共享入口，发布和上传继续服从实际授权。

## 归档命令

```sh
pnpm work archive api-probe "完成、取消或暂缓的实际原因与未完成项"
```

原地标记历史，不移动或删除原件。status 给任务摘要，不展开日志；归档后执行命令会拒绝。重开沿核对与同步章节的 update 规则，由 Agent 操作。单任务串行写入；revision 拒绝过期请求，保存前再检测命令期间改动并拒绝覆盖，留下原始日志，但不提供多写入者事务或全局锁。

## 记录结构

仅在创建／调整格式或排查字段时读取本节。version=1；新入口保持旧任务兼容。损坏 JSON、未知版本、重复验收 ID、未知方法或状态返回非零，不自动迁移或覆盖原件。

| 字段                                                | 含义                                                                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| member／workspace／plan.id                          | 本人成员、真实工作区、任务目录绑定；成员只是本地标签                                                          |
| plan.requirement（可选）                            | `{source,section,key}`；公共 PRD／规格章节与个人拆解项关联；新任务由此生成稳定 ID，旧记录无需迁移             |
| plan.goal／scope／inputs／sources                   | 目标、写入范围、所读代码／配置、相关需求文件                                                                  |
| plan.authorization／nonGoals                        | 真实授权与非目标                                                                                              |
| plan.acceptance                                     | ID、可观察判据、automated／review／behavior                                                                   |
| plan.decisions                                      | `{status,text,source}`；CONFIRMED／AI_PROPOSED／OPEN／REJECTED，OPEN 仅列影响当前动作的取舍                   |
| plan.dependencies                                   | `{task,ref,ready}`；ref 为团队可访问的来源，ready 由执行者实际核对                                            |
| plan.blockers／nextAction／stopCondition／sharedRef | 当前阻塞、下一步、停止条件、同一共享权威来源                                                                  |
| stage／reviewDecision／releaseDisposition           | 当前切片状态、人类 PENDING／ACCEPT／REQUEST_CHANGES／HOLD、HOLD_FOR_EVIDENCE／HOLD_FOR_HUMAN_REVIEW／RELEASED |
| checkpoint                                          | HEAD、分支、所选文件哈希、契约哈希、候选标识                                                                  |
| evidence                                            | 验收 ID、方法、pass／fail／pending、候选、原件路径／哈希、摘要和环境；历史追加                                |
| notes／archived                                     | 对账说明与历史标记，不自动删除                                                                                |

固定策略文件 AGENTS.md、协调协议和本页仍完整参与摘要核对；不是默认阅读全文的清单。scope／inputs 的目录展开已分类文件，包含未提交与未跟踪内容；scope 可以有尚未创建的目标，sources／inputs 缺失则报错。绝对路径、..、符号链接、私有／凭证／生成目录不可作为公共输入。

候选绑定所选字节和契约；成员、绝对工作区、HEAD 不进入内容候选，单纯提交相同内容不使证据失效。下一步、阻塞、共享导航、阶段标签不改变候选；需求关联、目标、范围、来源、授权、验收和决策改变会改变候选。没有 requirement 的旧记录保持原候选算法。revision 是整份当前记录字节摘要，和候选用途不同：进度或 notes 更新也会改变 revision。

公共协议、源码和测试入库；member.json、tasks/<task>/state.json、evidence、handoff 和 inbox 位于忽略的 .work。公共 CI 不读取这些成员内容，也不替代本地 work check。备份和传输沿真实项目选择；原始历史仅在需要复现或交接时按引用取得。
