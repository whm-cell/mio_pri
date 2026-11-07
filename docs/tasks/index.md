# 任务交付索引

按需求或模块查任务，再读取相关报告与必要证据；不默认展开全部历史。pending 是指定候选的待接受快照，不证明当前源码仍匹配；complete 保存最后接受的交付快照，reopened 表示已有新工作，旧报告不证明新候选通过。固定历史引用使用报告所在提交、路径和受验版本。

| 任务                                  | 功能                             | 模块                                           | 需求                            | 协作状态 | 待接受结果                                                                           | 最后接受结果 |
| ------------------------------------- | -------------------------------- | ---------------------------------------------- | ------------------------------- | -------- | ------------------------------------------------------------------------------------ | ------------ |
| agent-workflow-d298d07dba5afe60       | Agent 维护 PRD 子任务            | harness                                        | docs/foundation.md              | pending  | 无待接受报告                                                                         | 尚无接受结果 |
| delivery-closure-1f7a2cc763c2d412     | 任务交付闭环与 C1 命令检查       | harness/work                                   | docs/coordination.md            | pending  | [待接受报告](pending/delivery-closure-1f7a2cc763c2d412/report.md) · 0bb6bf88c50c     | 尚无接受结果 |
| dsh-alias-boundary-4e6a6d39e9923db1   | 生产 DSH 别名边界修复            | harness                                        | docs/foundation.md              | pending  | 无待接受报告                                                                         | 尚无接受结果 |
| foundation-guardrails                 | TS 插件底座与基础护栏            | harness                                        | docs/foundation.md              | pending  | 无待接受报告                                                                         | 尚无接受结果 |
| harness-layout-context                | 脚本职责与按动作读取             | harness                                        | docs/foundation.md              | pending  | 无待接受报告                                                                         | 尚无接受结果 |
| prd-guardrail-replay-2a92e668befcb4a1 | PRD 驱动护栏流转验证（隔离演练） | development-coordination、guardrail-acceptance | docs/prd-ai-drama-foundation.md | pending  | [待接受报告](pending/prd-guardrail-replay-2a92e668befcb4a1/report.md) · fafcc6248122 | 尚无接受结果 |
| task-delivery-87a50b174f7db211        | 任务验收报告、完成索引与重开恢复 | harness/work                                   | docs/coordination.md            | pending  | 无待接受报告                                                                         | 尚无接受结果 |
| work-coordination                     | 团队任务记录协调                 | harness                                        | docs/foundation.md              | pending  | 无待接受报告                                                                         | 尚无接受结果 |

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
      "id": "delivery-closure-1f7a2cc763c2d412",
      "title": "任务交付闭环与 C1 命令检查",
      "modules": [
        "harness/work"
      ],
      "requirement": "docs/coordination.md",
      "status": "pending",
      "review": {
        "path": "docs/tasks/pending/delivery-closure-1f7a2cc763c2d412/report.md",
        "sha256": "4ee01296b58a1740064beda6d1df633003a4befd0555e0857c757f7d6bdd0ef5",
        "candidate": "0bb6bf88c50cc63c632bb51bd580e0be80dd08635bc065c419f5b9e0bb36cb68"
      }
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
      "id": "prd-guardrail-replay-2a92e668befcb4a1",
      "title": "PRD 驱动护栏流转验证（隔离演练）",
      "modules": [
        "development-coordination",
        "guardrail-acceptance"
      ],
      "requirement": "docs/prd-ai-drama-foundation.md",
      "status": "pending",
      "review": {
        "path": "docs/tasks/pending/prd-guardrail-replay-2a92e668befcb4a1/report.md",
        "sha256": "de3aed92102cf4a77c2bd18b4d725b2f1c6b8fd3a746ac9b23f7d89a558d5ce9",
        "candidate": "fafcc6248122d951342674f89cf9a1d9932e593d65dca78c17610881ad6879f1"
      }
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
