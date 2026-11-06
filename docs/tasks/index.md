# 任务交付索引

按需求或模块查任务，再读取相关报告与必要证据；不默认展开全部历史。complete 保存最后接受的交付快照，reopened 表示已有新工作，旧报告不证明新候选通过。固定历史引用使用报告所在提交、路径和受验版本。

| 任务                                | 功能                             | 模块         | 需求                 | 协作状态 | 最后接受结果 |
| ----------------------------------- | -------------------------------- | ------------ | -------------------- | -------- | ------------ |
| agent-workflow-d298d07dba5afe60     | Agent 维护 PRD 子任务            | harness      | docs/foundation.md   | pending  | 待接受       |
| dsh-alias-boundary-4e6a6d39e9923db1 | 生产 DSH 别名边界修复            | harness      | docs/foundation.md   | pending  | 待接受       |
| foundation-guardrails               | TS 插件底座与基础护栏            | harness      | docs/foundation.md   | pending  | 待接受       |
| harness-layout-context              | 脚本职责与按动作读取             | harness      | docs/foundation.md   | pending  | 待接受       |
| task-delivery-87a50b174f7db211      | 任务验收报告、完成索引与重开恢复 | harness/work | docs/coordination.md | pending  | 待接受       |
| work-coordination                   | 团队任务记录协调                 | harness      | docs/foundation.md   | pending  | 待接受       |

```mio-task-index
{
  "version": 1,
  "tasks": [
    {
      "id": "agent-workflow-d298d07dba5afe60",
      "title": "Agent 维护 PRD 子任务",
      "modules": [
        "harness"
      ],
      "requirement": "docs/foundation.md",
      "status": "pending"
    },
    {
      "id": "dsh-alias-boundary-4e6a6d39e9923db1",
      "title": "生产 DSH 别名边界修复",
      "modules": [
        "harness"
      ],
      "requirement": "docs/foundation.md",
      "status": "pending"
    },
    {
      "id": "foundation-guardrails",
      "title": "TS 插件底座与基础护栏",
      "modules": [
        "harness"
      ],
      "requirement": "docs/foundation.md",
      "status": "pending"
    },
    {
      "id": "harness-layout-context",
      "title": "脚本职责与按动作读取",
      "modules": [
        "harness"
      ],
      "requirement": "docs/foundation.md",
      "status": "pending"
    },
    {
      "id": "task-delivery-87a50b174f7db211",
      "title": "任务验收报告、完成索引与重开恢复",
      "modules": [
        "harness/work"
      ],
      "requirement": "docs/coordination.md",
      "status": "pending"
    },
    {
      "id": "work-coordination",
      "title": "团队任务记录协调",
      "modules": [
        "harness"
      ],
      "requirement": "docs/foundation.md",
      "status": "pending"
    }
  ]
}
```
