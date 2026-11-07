# 自然语言短句任务入口

任务：natural-intent-entry-3081618733368d2f；实施者：coolm。本报告是指定候选的交付快照，当前规则以现行规格为准。

## 完成功能

维护AGENTS、README与协调协议：用户只需表达继续、验证或进入complete，Agent结合对话对象和实际阶段选择下一步。未完成先在授权内实施或补证，已交回且仍匹配的结果收到明确完成请求后直接complete；多个对象只问必要的短问题。共同规则随现有guide/context返回，无新增命令、解析器、依赖或后台机制。

## 必要决定

用户明确要求维护短入口并减少提示词负担。具体ID、候选、接受来源和交付读回由Agent处理；原有必需证据、候选一致性与真实接受门槛保持。咨询和引用示例不视为实际接受。重开仅针对本任务受验内容或契约的变化，日常简短沟通仍保留正式交付披露。

## 限制

本次为公共文档入口维护。已验证三个实际CLI读取路径及八情境独立语义审阅，未新增自然语言解析器，也未重新执行自然语言到实际complete的端到端实验；不保证任意宿主/模型都遵循语义。旧候选原件保留，初轮两处非阻断措辞建议已修订并以最终候选重新取证。当前结果待接受，不以本轮引用示例接受任何任务。

## 验收依据

- checks (automated, excerpt): [原件/摘录](evidence/checks.md)
- intent-review (review, excerpt): [原件/摘录](evidence/intent-review.md)

接受：待真实结果接受；草稿不能作为完成结论。

```mio-task-report
{
  "version": 1,
  "id": "natural-intent-entry-3081618733368d2f",
  "title": "自然语言短句任务入口",
  "author": "coolm",
  "modules": [
    "harness/work"
  ],
  "outcomes": "维护AGENTS、README与协调协议：用户只需表达继续、验证或进入complete，Agent结合对话对象和实际阶段选择下一步。未完成先在授权内实施或补证，已交回且仍匹配的结果收到明确完成请求后直接complete；多个对象只问必要的短问题。共同规则随现有guide/context返回，无新增命令、解析器、依赖或后台机制。",
  "decisions": "用户明确要求维护短入口并减少提示词负担。具体ID、候选、接受来源和交付读回由Agent处理；原有必需证据、候选一致性与真实接受门槛保持。咨询和引用示例不视为实际接受。重开仅针对本任务受验内容或契约的变化，日常简短沟通仍保留正式交付披露。",
  "limitations": "本次为公共文档入口维护。已验证三个实际CLI读取路径及八情境独立语义审阅，未新增自然语言解析器，也未重新执行自然语言到实际complete的端到端实验；不保证任意宿主/模型都遵循语义。旧候选原件保留，初轮两处非阻断措辞建议已修订并以最终候选重新取证。当前结果待接受，不以本轮引用示例接受任何任务。",
  "checkpoint": {
    "head": "3d3031e940a88c83b72421a35ade39f0b1397607",
    "branch": "codex/work-coordination",
    "files": {
      "AGENTS.md": "8dc27d949c45bb4dfc4ee0c7c942e00ce98ce66029fe15747c7e1dd0d51b7eab",
      "README.md": "2789c69736f6a203625e0ba2dd92dbec9dab44e74fff01e77c9ff4f1de8c8220",
      "docs/acceptance.md": "b93851845129e07fbcfde779b78a77cd91e12e6eca56587ecf1572b127455663",
      "docs/coordination.md": "fb580b351dc300ff559d386d24f73c18fdbcf734ad054fbd5226487c7f13e70e",
      "docs/work-records.md": "02a84fa18aad5cdca3a8e11642be4cca5511229cfcfad3b597a76d833fe853b0",
      "harness.config.json": "a9da9600e84861aecf57557c6e0c9abed8f795fd9dc1b7f4552c9f6bceef450f",
      "package.json": "530cde7c6d11881919423726183f5097dd32e2c6f2dd5bdb84b98ce17279498d",
      "scripts/harness/work/cli.ts": "5ed0e61419902577db9a5df78f68a26f9e6fe9c479a3bf654dde4d3f148846c6",
      "scripts/harness/work/context.ts": "ddab7dc7c0148adc7ce2638e68495d2306e57babad8c6cc6974f417e0101548d",
      "scripts/harness/work/delivery-store.ts": "a6bb0370974d5eac86d666e7b7160a8a189c2223af3bf2434d55a3917a7aa24d",
      "scripts/harness/work/delivery.ts": "d0fe45383607fdecb5be734a4b9b1c9bc510f0165ab2f7b676e463f717656628",
      "scripts/harness/work/guide.ts": "ac58173a41a53e372e5fccb391b6e12bd9514509692a502f757e556b79ca1808",
      "scripts/harness/work/handoff.ts": "04ba66846827331c9421ea0cbae00b56d6b2d85a1898277d80bce9b8e52c2d31",
      "scripts/harness/work/manage.ts": "8b9bb6b87ac6b527c9d27553a6d4e9a33fa2020c739c4cb8b6ff1edba35ae6fa",
      "scripts/harness/work/quality-review.ts": "4e069b3acaeee78df6d49b5657e61beac69c469d75ef607cacc0c3ddf1f08b99",
      "scripts/harness/work/records.ts": "282ea37ee5e2da850a57fd150b14a1bdf1bd220beec44cef5da23800f7ceaa35",
      "scripts/harness/work/reports.ts": "6e9c24b282f6e5f1d32391106fac84ca4ba6c88b5feabbded65a060104a1c4b7",
      "tests/delivery.test.ts": "fbf1b48c72ce77d158621937ec7a17cd742cfa2cd196bd27fb966dedfd6332b5",
      "tests/work.test.ts": "aec79adebfdbd280a1a81aaad83db22ed148690c9dc847c478c88caa8ded832b"
    },
    "contract": "030054420c7dc1f6e9affa804b51f15d772e3d587238e4cf895e22d0767600af",
    "candidate": "26736fd5955fa622d664e6b58bbdbf23336fbd5a0d8ee75164eb3aed58ae8363"
  },
  "contract": {
    "requirement": {
      "source": "docs/coordination.md",
      "section": "共同规则",
      "key": "natural-intent-entry"
    },
    "goal": "维护短句意图入口，让Agent根据当前任务、真实阶段和接受语义自主选择实施、验证、交付或必要澄清，用户无需长提示词",
    "scope": [
      "AGENTS.md",
      "README.md",
      "docs/coordination.md"
    ],
    "inputs": [
      "scripts/harness/work",
      "tests/work.test.ts",
      "tests/delivery.test.ts",
      "package.json",
      "harness.config.json"
    ],
    "sources": [
      "docs/coordination.md",
      "docs/work-records.md",
      "docs/acceptance.md"
    ],
    "nonGoals": [
      "不增加自然语言解析器、命令别名或第二套状态机",
      "不按关键词自动填充人类接受或将未完成目标视为已接受结果",
      "不接受旧pending、迁移已有证据或重跑既有整链业务演练",
      "不修改业务源码、个人Skills或Git远端"
    ],
    "acceptance": [
      {
        "id": "checks",
        "method": "automated",
        "criterion": "pnpm check通过；现有guide start与context resume/deliver实际输出均可取得短句规则，无需个人Skills或用户填写ID/哈希/JSON"
      },
      {
        "id": "intent-review",
        "method": "review",
        "criterion": "对照代表性短句和真实阶段独立审阅：就绪已交回对象可执行complete，未完成先推进/补证，多候选只问必要短问题，咨询/引用示例不触发交付，内容漂移不继承旧接受；无重复协议或新的后台机制"
      }
    ],
    "decisions": [
      {
        "status": "CONFIRMED",
        "text": "维护用户短句到最适合阶段动作的公共入口，由AI承接任务定位和执行细节",
        "source": "当前用户关于短入口及无需大量提示词的请求"
      },
      {
        "status": "AI_PROPOSED",
        "text": "复用AGENTS导航与每个guide/context共用的共同规则，文档层明确意图/状态判断，不新增CLI解析器；仅在已交回且仍匹配的结果上将明确完成请求视为接受",
        "source": "当前仓库guide实际读取结构及既有真实接受条件"
      }
    ],
    "dependencies": []
  },
  "evidence": [
    {
      "criterion": "checks",
      "method": "automated",
      "representation": "excerpt",
      "sourceSha256": "2c10c1b3024fe113791974f4f6d935d4dd4f8011351fe8817b0b0a8841816752",
      "path": "evidence/checks.md",
      "sha256": "5dc12622f07316e7673bc2f2bc244fb0c2b2a6637e95dc15b057cb96c3ca9dbe",
      "environment": "darwin/arm64; Node v24.22.2"
    },
    {
      "criterion": "intent-review",
      "method": "review",
      "representation": "excerpt",
      "sourceSha256": "ed3d281dc0b9fb66962f2d116f657dcc6d13a6d4f9772cf831e3a2f134846149",
      "path": "evidence/intent-review.md",
      "sha256": "cc00eeefff30d63add30999571feeb83442c1447ebbe8b189e80672b628180bc",
      "environment": "darwin/arm64; Node v24.22.2"
    }
  ]
}
```
