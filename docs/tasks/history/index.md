# 任务交付索引

按需求或模块查任务，再读取相关报告与必要证据；不默认展开全部历史。pending 是指定候选的待接受快照，不证明当前源码仍匹配；complete 保存最后接受的交付快照，reopened 表示已有新工作，旧报告不证明新候选通过。固定历史引用使用报告所在提交、路径和受验版本。

| 任务                                          | 功能                                 | 模块                                           | 需求                                                                                   | 协作状态 | 待接受结果   | 最后接受结果                                                                            |
| --------------------------------------------- | ------------------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------------------- | -------- | ------------ | --------------------------------------------------------------------------------------- |
| agent-workflow-d298d07dba5afe60               | Agent 维护 PRD 子任务与中断续接      | harness/work                                   | docs/foundation.md                                                                     | complete | 无待接受报告 | [报告](complete/agent-workflow-d298d07dba5afe60/report.md) · 9bb2ae774afd               |
| auth-registration-foundation-ac88ccd0f34f1c0c | 邮箱密码注册、持久会话与可信身份底座 | auth、plugin、service/auth-migration           | docs/prd-ai-drama-foundation.md                                                        | complete | 无待接受报告 | [报告](complete/auth-registration-foundation-ac88ccd0f34f1c0c/report.md) · 54b01395a4f8 |
| delivery-closure-1f7a2cc763c2d412             | 任务交付闭环与 C1 命令检查           | harness/work                                   | docs/coordination.md                                                                   | complete | 无待接受报告 | [报告](complete/delivery-closure-1f7a2cc763c2d412/report.md) · 5c347bc26d18             |
| dsh-alias-boundary-4e6a6d39e9923db1           | 生产 DSH 别名边界修复                | harness/source-boundary                        | docs/foundation.md                                                                     | complete | 无待接受报告 | [报告](complete/dsh-alias-boundary-4e6a6d39e9923db1/report.md) · a123aaedbe89           |
| foundation-guardrails                         | TypeScript 插件底座与基础护栏        | foundation、harness、service-profile           | docs/foundation.md, docs/api.md, docs/acceptance.md                                    | complete | 无待接受报告 | [报告](complete/foundation-guardrails/report.md) · dec07b6a78b0                         |
| harness-layout-context                        | 脚本职责隔离与按动作读取             | harness、service-tools、work-guide             | AGENTS.md, docs/coordination.md, docs/work-records.md, docs/foundation.md              | complete | 无待接受报告 | [报告](complete/harness-layout-context/report.md) · e13041f8ec95                        |
| natural-intent-entry-3081618733368d2f         | 自然语言短句任务入口                 | harness/work                                   | docs/coordination.md                                                                   | complete | 无待接受报告 | [报告](complete/natural-intent-entry-3081618733368d2f/report.md) · 26736fd5955f         |
| prd-guardrail-replay-2a92e668befcb4a1         | PRD 驱动护栏流转验证（隔离演练）     | development-coordination、guardrail-acceptance | docs/prd-ai-drama-foundation.md                                                        | complete | 无待接受报告 | [报告](complete/prd-guardrail-replay-2a92e668befcb4a1/report.md) · 45a1b34b2f95         |
| task-delivery-87a50b174f7db211                | 任务交付报告、完成索引与重开恢复     | harness/work、task-delivery                    | docs/coordination.md                                                                   | complete | 无待接受报告 | [报告](complete/task-delivery-87a50b174f7db211/report.md) · 37ff80e92841                |
| work-coordination                             | 团队任务记录、证据恢复与跨成员交接   | harness/work                                   | AGENTS.md, docs/coordination.md, docs/work-records.md, docs/foundation.md, docs/api.md | complete | 无待接受报告 | [报告](complete/work-coordination/report.md) · 90ac522dc049                             |

```mio-task-index
{
  "version": 1,
  "tasks": [
    {
      "id": "agent-workflow-d298d07dba5afe60",
      "title": "Agent 维护 PRD 子任务与中断续接",
      "modules": [
        "harness/work"
      ],
      "requirement": "docs/foundation.md",
      "status": "complete",
      "report": {
        "path": "docs/tasks/complete/agent-workflow-d298d07dba5afe60/report.md",
        "sha256": "075ac384e7e9f4ae70883b048d7665d9a6fab03d448001c9dbad8e42ce932c1d",
        "candidate": "9bb2ae774afdab1886ca9704054fa83b34f0c06082d9a63719f66e382c5ad041"
      }
    },
    {
      "id": "auth-registration-foundation-ac88ccd0f34f1c0c",
      "title": "邮箱密码注册、持久会话与可信身份底座",
      "modules": [
        "auth",
        "plugin",
        "service/auth-migration"
      ],
      "requirement": "docs/prd-ai-drama-foundation.md",
      "status": "complete",
      "report": {
        "path": "docs/tasks/complete/auth-registration-foundation-ac88ccd0f34f1c0c/report.md",
        "sha256": "7387bb56148d62bd96cbcb5e0363cbedbaee7cbaee3aa9e8e96c89a7492bcf0b",
        "candidate": "54b01395a4f817c1ca00af268c97f27a297df1abb14ec43d8fe55127e81eb18a"
      }
    },
    {
      "id": "delivery-closure-1f7a2cc763c2d412",
      "title": "任务交付闭环与 C1 命令检查",
      "modules": [
        "harness/work"
      ],
      "requirement": "docs/coordination.md",
      "status": "complete",
      "report": {
        "path": "docs/tasks/complete/delivery-closure-1f7a2cc763c2d412/report.md",
        "sha256": "83a0ced2f85b223e591c13eb61a23dc66aad17be69c799a9f89bd3366c37bf60",
        "candidate": "5c347bc26d18ee793280eed0cc6c271c27fe8d92f02da89cd217390a3a4c5f16"
      }
    },
    {
      "id": "dsh-alias-boundary-4e6a6d39e9923db1",
      "title": "生产 DSH 别名边界修复",
      "modules": [
        "harness/source-boundary"
      ],
      "requirement": "docs/foundation.md",
      "status": "complete",
      "report": {
        "path": "docs/tasks/complete/dsh-alias-boundary-4e6a6d39e9923db1/report.md",
        "sha256": "07a4cb0db06d7066a0ec730d9dad28a7fee3a1b4ce25f940e78d0a300ed4f3ba",
        "candidate": "a123aaedbe89145c1cb7bac9c5d877062f52133591b3ea2a1159fd1e3621b432"
      }
    },
    {
      "id": "foundation-guardrails",
      "title": "TypeScript 插件底座与基础护栏",
      "modules": [
        "foundation",
        "harness",
        "service-profile"
      ],
      "requirement": "docs/foundation.md, docs/api.md, docs/acceptance.md",
      "status": "complete",
      "report": {
        "path": "docs/tasks/complete/foundation-guardrails/report.md",
        "sha256": "361d9c33da7546aecd9ed5f16dfaa6d667698f92ba92162cd76c1203aa34b17e",
        "candidate": "dec07b6a78b05b0e3e4ec3c0720c1ab79941ddd241b1de7716ba104f27f0fc51"
      }
    },
    {
      "id": "harness-layout-context",
      "title": "脚本职责隔离与按动作读取",
      "modules": [
        "harness",
        "service-tools",
        "work-guide"
      ],
      "requirement": "AGENTS.md, docs/coordination.md, docs/work-records.md, docs/foundation.md",
      "status": "complete",
      "report": {
        "path": "docs/tasks/complete/harness-layout-context/report.md",
        "sha256": "9d71ffc7eae33d18f07aa91dc3248195c2d6b61735edb176bcd8ced00a851774",
        "candidate": "e13041f8ec9550f47b9422b94838ce5085069d6d17e970bfaaca0c5c2ad275df"
      }
    },
    {
      "id": "natural-intent-entry-3081618733368d2f",
      "title": "自然语言短句任务入口",
      "modules": [
        "harness/work"
      ],
      "requirement": "docs/coordination.md",
      "status": "complete",
      "report": {
        "path": "docs/tasks/complete/natural-intent-entry-3081618733368d2f/report.md",
        "sha256": "76a5d0fdc5a9703992ccbf0117a701c77e97ad45464af07de4d64eaad2ebe054",
        "candidate": "26736fd5955fa622d664e6b58bbdbf23336fbd5a0d8ee75164eb3aed58ae8363"
      }
    },
    {
      "id": "prd-guardrail-replay-2a92e668befcb4a1",
      "title": "PRD 驱动护栏流转验证（隔离演练）",
      "modules": [
        "development-coordination",
        "guardrail-acceptance"
      ],
      "requirement": "docs/prd-ai-drama-foundation.md",
      "status": "complete",
      "report": {
        "path": "docs/tasks/complete/prd-guardrail-replay-2a92e668befcb4a1/report.md",
        "sha256": "37479180989590b368a9c7914abc2c4b733f25557fbebe963fae853a87c6b203",
        "candidate": "45a1b34b2f95ffd7516838ecf60486371127f4b7f406103d927ac0ea4e5a747e"
      }
    },
    {
      "id": "task-delivery-87a50b174f7db211",
      "title": "任务交付报告、完成索引与重开恢复",
      "modules": [
        "harness/work",
        "task-delivery"
      ],
      "requirement": "docs/coordination.md",
      "status": "complete",
      "report": {
        "path": "docs/tasks/complete/task-delivery-87a50b174f7db211/report.md",
        "sha256": "4ff55870075c31e8f62d772ebaecfe18cbf1ed738e83c25f497d488df8b8de45",
        "candidate": "37ff80e92841bd7d676ae7490cf6af35cb9013fad61839fa7c871c655d2893d2"
      }
    },
    {
      "id": "work-coordination",
      "title": "团队任务记录、证据恢复与跨成员交接",
      "modules": [
        "harness/work"
      ],
      "requirement": "AGENTS.md, docs/coordination.md, docs/work-records.md, docs/foundation.md, docs/api.md",
      "status": "complete",
      "report": {
        "path": "docs/tasks/complete/work-coordination/report.md",
        "sha256": "c61ab17995f85acb6b80dc503117e761b4711a2bddc5e1ccdb735be9a35a879e",
        "candidate": "90ac522dc0496465817b0a920cffe53b94946e6ff1a617cd2d47e0d0e8b67c92"
      }
    }
  ]
}
```
