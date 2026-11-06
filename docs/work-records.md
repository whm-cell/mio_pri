# 工作记录与命令

执行判断见 [协调协议](coordination.md)，工程检查见 [README](../README.md)。以下命令在仓库根运行，只使用本仓库脚本、Node 工具链和显式提供的数据，不读取宿主的个人技能目录。

## 从零开始

```sh
pnpm work init alice
pnpm work start api-probe "调整能力查询" docs/api.md
```

同一成员重复初始化保留原记录；其他成员 ID 或复制到另一目录的记录会被拒绝。每个成员使用自己的 checkout/worktree；同一目录不是多个成员共享写入的空间。成员 ID 与任务 ID 使用小写字母、数字、连字符或下划线，长度最多 80。

```text
.work/
  member.json
  tasks/<task>/
    state.json
    evidence/<独立原件>
    handoff-<内容摘要>.md
  inbox/<取回的共享交接>.md
```

原有 `.work/evidence/` 不迁移、不删除；新机制只写自己的文件。新 clone 不携带个人记录，开发时先初始化；公共 CI 无需初始化私人任务。所有记录与证据均被 Git 忽略，公共工具源码与协议随仓库交付。

`start` 创建草稿，不自动推断授权和验收。编辑其 `state.json`，以下是最小正常示例中的 `plan`（任务 ID 应与目录一致）：

```json
{
  "id": "api-probe",
  "goal": "调整能力查询并保持认证要求",
  "scope": ["src/http.ts", "tests/plugin.test.ts", "docs/api.md"],
  "inputs": [
    "src/contracts.ts",
    "src/plugin.ts",
    "package.json",
    "pnpm-lock.yaml",
    "harness.config.json"
  ],
  "sources": [
    "AGENTS.md",
    "docs/coordination.md",
    "docs/work-records.md",
    "docs/api.md",
    "docs/foundation.md"
  ],
  "authorization": "当前负责人的明确修改要求及其范围；填实际来源",
  "nonGoals": ["新增模型权限", "部署"],
  "acceptance": [
    { "id": "checks", "criterion": "工程检查及相关接口测试通过", "method": "automated" }
  ],
  "decisions": [],
  "dependencies": [],
  "blockers": [],
  "nextAction": "按已确认契约修改并验证",
  "stopCondition": "修改与验证完成，交回结果",
  "sharedRef": ""
}
```

示例不是修改业务的授权。填入真实目标与验收；删除不适用条目，而非保留虚构结论。仅讨论时 `authorization` 写明只读范围，下一步保持只读。

```sh
pnpm work sync api-probe "已核对需求、基线和写入范围"
pnpm work check api-probe
```

`sync` 后契约完整的草稿可进入 `C0_READY`；开始编码时由执行者将 `stage` 改为 `C1_IMPLEMENTATION`。同一任务反复更新同一记录，`status` 只列出本地任务摘要，不递归读取历史日志。

## 数据契约

`state.json` 使用 `version: 1`。命令读取时检查格式，未知版本、损坏 JSON、重复验收 ID、未知方法或状态返回非零；不自动覆盖或迁移损坏记录。

| 字段                                               | 作用与维护者                                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `member`、`workspace`、`plan.id`                   | 创建／接收时绑定成员、真实工作区和任务目录                                                                |
| `plan.goal/scope/nonGoals/authorization`           | 执行者从真实人类目标和公共契约填写；范围为仓库相对文件或目录                                              |
| `plan.inputs/sources`                              | 所读代码／配置与实际遵循的公共 Markdown 子文档；缺失输入报错，scope 可以包含尚未创建的目标                |
| `plan.acceptance`                                  | ID、可观察判据、方法 `automated/review/behavior`；实现前确定                                              |
| `plan.decisions`                                   | `{status, text, source}`；状态为 `CONFIRMED/AI_PROPOSED/OPEN/REJECTED`，`OPEN` 仅列影响当前动作的未决取舍 |
| `plan.dependencies`                                | `{task, ref, ready}`；来源须团队可访问，就绪由执行者实际核对，程序不查询他人私人目录                      |
| `plan.blockers/nextAction/stopCondition/sharedRef` | 当前阻塞、下一步、停止条件、共享契约／交接位置；只有事实变化时更新                                        |
| `stage/reviewDecision/releaseDisposition`          | 当前切片状态、人类结果 `PENDING/ACCEPT/REQUEST_CHANGES/HOLD` 与释放结论；命令不会自动生成 `ACCEPT`        |
| `checkpoint`                                       | `sync` 保存的 HEAD、分支、文件摘要、契约摘要和候选标识；目录自身不计入候选                                |
| `evidence`                                         | 每条的验收 ID、方法、结果、候选、原件相对位置与哈希、摘要、运行环境；历史追加保留                         |
| `notes/archived`                                   | 对账说明及历史标记；归档不删除文件                                                                        |

固定公共来源 `AGENTS.md`、本页及协调协议总会参与快照；其余相关子文档由执行者登记。`scope`、`inputs` 的目录会展开当前已分类文件；快照包含未提交／未跟踪内容，发现未分类文件或符号链接就报告错误。路径必须留在本工作区，不能通过 `..`、绝对路径或符号链接越界。私有目录、凭证、生成文件不能作为公共输入。

候选标识是所选文件及任务契约的内容摘要。它不包含工作区绝对路径、成员或 HEAD，因此接收方可以比较文件，单纯提交相同内容也不会使证据失效。下一步、阻塞、共享导航和阶段标签不改变候选；目标、范围、验收、来源、授权和决策改变会改变候选。哈希验证一致性，不证明代码正确。

## 检查、同步和证据

`work check <task>` 只读输出 JSON：`ready` 表示当前上下文与记录一致，可继续核对已授权动作；`evidence` 单独列出各验收的结果。`ready: true` 不能解释为任务已完成。契约缺失、未决依赖、归档、上下文变化或非法释放结论会返回非零。

文档或代码改变后先查看差异，更新来源与受影响的共享事实，再 `sync` 写明实际核对理由。`sync` 不运行测试，也不把旧证据重新标为当前通过。分支／HEAD 变化会要求核对，但只要文件和契约完全相同，重新核对后可保留同内容的证据。

```sh
pnpm work run api-probe checks -- pnpm check
```

`run` 只接受 `automated` 验收 ID，按 argv 直接启动命令，不经过 Shell。不执行字符串中的管道或重定向；需要额外命令时明确逐次运行。命令必须在当前授权内，记录器不扩大外部副作用权限。日志位于该任务的 `evidence` 中；每次生成新文件，不覆盖失败。失败、信号退出、前后候选变化或已有输入文件／源目录的身份与变更时间变化都不会记录为通过；后者用于发现修改后恢复的输入。它依赖文件系统元数据，不证明任意命令的全部中间行为。

对审查或业务观察，先在任务证据目录保存真实原件，或实际取回团队共享 Markdown，再执行：

```sh
pnpm work evidence api-probe review pass .work/tasks/api-probe/evidence/review.md "实际审查范围与结果"
```

这里 `review` 必须已经是该任务中方法为 `review` 的验收 ID。原件需包含实际观察环境和限制，命令只绑定原件哈希和本地 Node 环境，不提供审查独立性或业务真实性认证。证据原件删除、字节变化、候选变化会使相应条目缺失、损坏或 pending。

所需证据齐备后，等待实际人类结果；把真实接受记录为 `reviewDecision: ACCEPT`，并将 `stage` 设为 `C1_RELEASED`、`releaseDisposition` 设为 `RELEASED`。再运行 `check`，校验每项判据有同候选／同方法的最新通过证据及完整原件。脚本不会验证人工标签的真实来源，审阅仍需核对。实际代码或契约变化后的 `sync` 会撤回旧释放结论。

旧释放的原件缺失或损坏时，显式 `run/evidence` 允许补证；成功保存新结果后重新等待人类接受，不需要手工伪造旧证据或跳过完成校验。补证前的契约、授权、依赖与上下文检查继续有效。

单个任务只有一个写入者，包括直接编辑记录的编辑器。命令会在保存前检测运行期间的记录改动并拒绝覆盖，保留已经写出的原件；这不是跨进程原子事务或全局锁。同一任务串行执行命令；不同任务可使用独立记录并行，代码写入隔离按协调协议处理。进程中断后先查看保留的原件和当前状态，再核对，不能凭缺少结论自动重复外部操作。

## 交接和保留

```sh
pnpm work handoff api-probe
```

输出本地 `handoff-<内容摘要>.md` 路径；相同内容复用原件，候选或证据摘要变化产生另一份草稿，已有文件被人工修改时拒绝覆盖。共享前脱敏，提供固定代码提交或明确范围快照，以及需要保留的原件取得方式。工具不会上传、复制代码或同步他人的 `.work`。

接收者先取回所需代码和文档，初始化自己的成员记录，将共享 Markdown 保存到 `.work/inbox/` 或已有公共文档位置，再执行：

```sh
pnpm work receive .work/inbox/api-probe.md
```

文件中的 `mio-work-handoff` 区块按数据解析，不执行其中命令。候选文件不一致、格式损坏或本地已有同任务时拒绝创建／覆盖。接收者获得自己的草稿；授权清空、依赖等待重新核对、证据不自动导入。原报告保留为转述，接收者实际取得原件后登记或重跑检查，再按自身目标授权 `sync`。

共享渠道的正文可补充代码／原件的取得方式，机器区块需与生成候选一致。别人的 `.work` 不是共享入口；本机路径、哈希和“已发出”都不能证明材料已取得。任何交接和上传沿当前授权执行。

```sh
pnpm work archive api-probe "本切片已完成，结果见共享交接"
```

取消或暂缓也可归档，理由应如实说明未完成项。归档原地保留所有记录，不因任务完成自动删除、打包整仓库或创建备份任务。恢复归档任务先核对当前目标，再显式重开；公共检查持续禁止个人记录被跟踪或被公共本地链接依赖。
